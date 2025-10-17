const cloud = require('wx-server-sdk')
const crypto = require('crypto')
const https = require('https')
const fs = require('fs')
const path = require('path')

// 初始化云开发环境
cloud.init({
  env: 'cloud1-2gyb3dkq4c474fe4'
})

const db = cloud.database()

// 微信支付配置
const WECHAT_PAY_CONFIG = {
  appid: 'wxa7e86bc1f0369892', // 您的小程序AppID
  mch_id: '1728007358', // 您的商户号
  api_key: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6', // 请替换为您的APIv2密钥（32位字符串）
  notify_url: 'https://cloud1-2gyb3dkq4c474fe4.tcb.qcloud.la/tcb-http-trigger/payCallback'
}

// 生成随机字符串
function generateNonceStr() {
  return Math.random().toString(36).substr(2, 15)
}

// 生成签名
function generateSign(params, apiKey) {
  // 1. 参数名ASCII码从小到大排序
  const sortedKeys = Object.keys(params).sort()
  
  // 2. 拼接参数
  let stringA = ''
  sortedKeys.forEach(key => {
    if (params[key] && key !== 'sign') {
      stringA += `${key}=${params[key]}&`
    }
  })
  
  // 3. 拼接API密钥
  const stringSignTemp = stringA + `key=${apiKey}`
  
  // 4. MD5加密并转大写
  return crypto.createHash('md5').update(stringSignTemp, 'utf8').digest('hex').toUpperCase()
}

// 生成订单号
function generateOrderNo() {
  const now = new Date()
  const timestamp = now.getTime()
  const random = Math.random().toString(36).substr(2, 6)
  return `order_${timestamp}_${random}`
}

// 调用微信支付统一下单接口
async function createWechatOrder(orderData) {
  const params = {
    appid: WECHAT_PAY_CONFIG.appid,
    mch_id: WECHAT_PAY_CONFIG.mch_id,
    nonce_str: generateNonceStr(),
    body: orderData.description,
    out_trade_no: orderData.orderNo,
    total_fee: orderData.amount, // 金额，单位：分
    spbill_create_ip: '127.0.0.1',
    notify_url: WECHAT_PAY_CONFIG.notify_url,
    trade_type: 'JSAPI',
    openid: orderData.openid
  }
  
  // 生成签名
  params.sign = generateSign(params, WECHAT_PAY_CONFIG.api_key)
  
  // 构建XML请求体
  let xmlBody = '<xml>'
  Object.keys(params).forEach(key => {
    xmlBody += `<${key}><![CDATA[${params[key]}]]></${key}>`
  })
  xmlBody += '</xml>'
  
  console.log('微信支付请求参数:', params)
  console.log('XML请求体:', xmlBody)
  
  try {
    // 使用 Node.js 的 https 模块发送请求
    const response = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.mch.weixin.qq.com',
        port: 443,
        path: '/pay/unifiedorder',
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
          'Content-Length': Buffer.byteLength(xmlBody)
        }
      }
      
      const req = https.request(options, (res) => {
        let data = ''
        res.on('data', (chunk) => {
          data += chunk
        })
        res.on('end', () => {
          resolve(data)
        })
      })
      
      req.on('error', (error) => {
        reject(error)
      })
      
      req.write(xmlBody)
      req.end()
    })
    
    console.log('微信支付响应:', response)
    return response
  } catch (error) {
    console.error('调用微信支付接口失败:', error)
    throw error
  }
}

// 解析XML响应
function parseXML(xmlString) {
  const result = {}
  const regex = /<(\w+)><!\[CDATA\[(.*?)\]\]><\/\1>/g
  let match
  
  while ((match = regex.exec(xmlString)) !== null) {
    result[match[1]] = match[2]
  }
  
  return result
}

// 主函数
exports.main = async (event, context) => {
  const { packId, userId, openid } = event
  
  try {
    console.log('开始创建订单:', { packId, userId, openid })
    
    // 1. 获取语音包信息
    const packResult = await db.collection('voicePacks').doc(packId).get()
    if (!packResult.data) {
      return {
        code: -1,
        message: '语音包不存在'
      }
    }
    
    const packData = packResult.data
    console.log('语音包信息:', packData)
    
    // 2. 获取演员信息
    const actorResult = await db.collection('actors').doc(packData.actorId).get()
    const actorData = actorResult.data || {}
    
    // 3. 生成订单号
    const orderNo = generateOrderNo()
    
    // 4. 创建订单数据
    const orderData = {
      _id: orderNo,
      userId: userId,
      openid: openid,
      packId: packId,
      packName: packData.name,
      actorId: packData.actorId,
      actorName: actorData.name || '未知演员',
      amount: packData.price, // 金额，单位：分
      status: 'pending', // pending, paid, cancelled, refunded
      createTime: new Date(),
      payTime: null,
      refundTime: null,
      transactionId: null,
      refundId: null,
      description: `${actorData.name || '演员'} - ${packData.name}`
    }
    
    // 5. 保存订单到数据库
    await db.collection('orders').add({
      data: orderData
    })
    
    console.log('订单创建成功:', orderData)
    
    // 6. 调用微信支付统一下单
    const wechatOrderResult = await createWechatOrder({
      orderNo: orderNo,
      amount: packData.price,
      description: orderData.description,
      openid: openid
    })
    
    console.log('微信支付响应:', wechatOrderResult)
    
    // 7. 解析微信支付响应
    const wechatData = parseXML(wechatOrderResult)
    
    if (wechatData.return_code === 'SUCCESS' && wechatData.result_code === 'SUCCESS') {
      // 8. 生成支付参数
      const payParams = {
        appId: WECHAT_PAY_CONFIG.appid,
        timeStamp: Math.floor(Date.now() / 1000).toString(),
        nonceStr: generateNonceStr(),
        package: `prepay_id=${wechatData.prepay_id}`,
        signType: 'MD5'
      }
      
      // 9. 生成支付签名
      payParams.paySign = generateSign(payParams, WECHAT_PAY_CONFIG.api_key)
      
      return {
        code: 0,
        message: '订单创建成功',
        data: {
          orderId: orderNo,
          payParams: payParams
        }
      }
    } else {
      console.error('微信支付下单失败:', wechatData)
      return {
        code: -1,
        message: wechatData.return_msg || '微信支付下单失败'
      }
    }
    
  } catch (error) {
    console.error('创建订单失败:', error)
    return {
      code: -1,
      message: '创建订单失败: ' + error.message
    }
  }
}
