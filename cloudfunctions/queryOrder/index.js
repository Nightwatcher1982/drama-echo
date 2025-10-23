const cloud = require('wx-server-sdk')
const crypto = require('crypto')
const https = require('https')

cloud.init({
  env: 'cloud1-2gyb3dkq4c474fe4'
})

const db = cloud.database()

// 微信支付配置
const WECHAT_PAY_CONFIG = {
  appid: 'wxa7e86bc1f0369892',
  mch_id: '1728007358',
  api_key: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'
}

// 生成随机字符串
function generateNonceStr() {
  return Math.random().toString(36).substr(2, 15)
}

// 生成签名
function generateSign(params) {
  const keys = Object.keys(params).sort()
  const stringA = keys.map(key => `${key}=${params[key]}`).join('&')
  const stringSignTemp = `${stringA}&key=${WECHAT_PAY_CONFIG.api_key}`
  return crypto.createHash('md5').update(stringSignTemp, 'utf8').digest('hex').toUpperCase()
}

// 查询微信支付订单状态
async function queryWechatOrder(outTradeNo) {
  return new Promise((resolve, reject) => {
    const params = {
      appid: WECHAT_PAY_CONFIG.appid,
      mch_id: WECHAT_PAY_CONFIG.mch_id,
      out_trade_no: outTradeNo,
      nonce_str: generateNonceStr()
    }
    
    params.sign = generateSign(params)
    
    const xmlData = `<xml>
      <appid>${params.appid}</appid>
      <mch_id>${params.mch_id}</mch_id>
      <out_trade_no>${params.out_trade_no}</out_trade_no>
      <nonce_str>${params.nonce_str}</nonce_str>
      <sign>${params.sign}</sign>
    </xml>`
    
    const options = {
      hostname: 'api.mch.weixin.qq.com',
      port: 443,
      path: '/pay/orderquery',
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        'Content-Length': Buffer.byteLength(xmlData)
      }
    }
    
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        try {
          // 简单的XML解析
          const result = {}
          const matches = data.match(/<(\w+)><!\[CDATA\[(.*?)\]\]><\/\1>/g)
          if (matches) {
            matches.forEach(match => {
              const keyMatch = match.match(/<(\w+)>/)
              const valueMatch = match.match(/<!\[CDATA\[(.*?)\]\]>/)
              if (keyMatch && valueMatch) {
                result[keyMatch[1]] = valueMatch[1]
              }
            })
          }
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })
    })
    
    req.on('error', (error) => {
      reject(error)
    })
    
    req.write(xmlData)
    req.end()
  })
}

exports.main = async (event, context) => {
  try {
    const { orderId } = event
    
    if (!orderId) {
      return {
        code: -1,
        message: '缺少订单ID'
      }
    }
    
    console.log('查询订单状态:', orderId)
    
    // 获取订单信息
    const orderResult = await db.collection('orders').doc(orderId).get()
    
    if (!orderResult.data) {
      return {
        code: -1,
        message: '订单不存在'
      }
    }
    
    const orderData = orderResult.data
    
    // 查询微信支付订单状态
    try {
      const wechatResult = await queryWechatOrder(orderId)
      console.log('微信支付查询结果:', wechatResult)
      
      if (wechatResult.trade_state === 'SUCCESS') {
        // 支付成功，创建购买记录
        const existingPurchase = await db.collection('user_purchases')
          .where({
            orderId: orderId
          })
          .get()
        
        if (!existingPurchase.data || existingPurchase.data.length === 0) {
          // 创建购买记录
          await db.collection('user_purchases').add({
            data: {
              _openid: orderData.openid,
              userId: orderData.userId || orderData.openid,
              packId: orderData.packId,
              orderId: orderId,
              purchaseTime: new Date(),
              status: 'completed',
              purchaseType: 'package',
              amount: orderData.amount,
              quantity: orderData.quantity || 1
            }
          })
          
          // 更新订单状态
          await db.collection('orders').doc(orderId).update({
            data: {
              status: 'paid',
              payTime: new Date()
            }
          })
          
          console.log('购买记录创建成功')
        }
        
        return {
          code: 0,
          message: '支付成功',
          data: {
            orderId: orderId,
            status: 'paid',
            tradeState: wechatResult.trade_state
          }
        }
      } else {
        return {
          code: 0,
          message: '支付未完成',
          data: {
            orderId: orderId,
            status: orderData.status,
            tradeState: wechatResult.trade_state
          }
        }
      }
    } catch (error) {
      console.error('查询微信支付状态失败:', error)
      return {
        code: -1,
        message: '查询支付状态失败: ' + error.message
      }
    }
    
  } catch (error) {
    console.error('查询订单失败:', error)
    return {
      code: -1,
      message: error.message || '查询订单失败'
    }
  }
}

