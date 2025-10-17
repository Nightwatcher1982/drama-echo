const cloud = require('wx-server-sdk')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

// 初始化云开发环境
cloud.init({
  env: 'cloud1-2gyb3dkq4c474fe4'
})

const db = cloud.database()

// 微信支付配置
const WECHAT_PAY_CONFIG = {
  appid: 'wxa7e86bc1f0369892',
  mch_id: '1728007358',
  api_key: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6', // 请替换为您的APIv2密钥
  public_key_id: 'PUB_KEY_ID_0117280073582025092700191817002800' // 微信支付公钥ID
}

// 读取微信支付公钥
function getWechatPayPublicKey() {
  try {
    const publicKeyPath = path.join(__dirname, '../cert/pub_key.pem')
    const publicKey = fs.readFileSync(publicKeyPath, 'utf8')
    return publicKey
  } catch (error) {
    console.error('读取微信支付公钥失败:', error)
    return null
  }
}

// 解析XML数据
function parseXML(xmlString) {
  const result = {}
  const regex = /<(\w+)><!\[CDATA\[(.*?)\]\]><\/\1>/g
  let match
  
  while ((match = regex.exec(xmlString)) !== null) {
    result[match[1]] = match[2]
  }
  
  return result
}

// 生成XML响应
function generateXML(returnCode, returnMsg) {
  return `<xml>
    <return_code><![CDATA[${returnCode}]]></return_code>
    <return_msg><![CDATA[${returnMsg}]]></return_msg>
  </xml>`
}

// 验证签名（支持微信支付公钥和APIv2密钥两种方式）
function verifySign(params, headers) {
  // 检查是否使用微信支付公钥
  const wechatpaySerial = headers['wechatpay-serial'] || headers['Wechatpay-Serial']
  
  if (wechatpaySerial && wechatpaySerial.startsWith('PUB_KEY_ID_')) {
    // 使用微信支付公钥验证（APIv3方式）
    return verifyWechatPaySignature(params, headers)
  } else {
    // 使用APIv2密钥验证（传统方式）
    return verifyApiV2Signature(params)
  }
}

// 验证微信支付公钥签名（APIv3）
function verifyWechatPaySignature(params, headers) {
  try {
    const signature = headers['wechatpay-signature'] || headers['Wechatpay-Signature']
    const timestamp = headers['wechatpay-timestamp'] || headers['Wechatpay-Timestamp']
    const nonce = headers['wechatpay-nonce'] || headers['Wechatpay-Nonce']
    const serial = headers['wechatpay-serial'] || headers['Wechatpay-Serial']
    
    if (!signature || !timestamp || !nonce || !serial) {
      console.error('缺少微信支付签名参数')
      return false
    }
    
    // 构建验签字符串
    const body = JSON.stringify(params)
    const message = `${timestamp}\n${nonce}\n${body}\n`
    
    // 获取微信支付公钥
    const publicKey = getWechatPayPublicKey()
    if (!publicKey) {
      console.error('无法获取微信支付公钥')
      return false
    }
    
    // 验证签名
    const verifier = crypto.createVerify('RSA-SHA256')
    verifier.update(message, 'utf8')
    
    return verifier.verify(publicKey, signature, 'base64')
  } catch (error) {
    console.error('微信支付公钥验证失败:', error)
    return false
  }
}

// 验证APIv2签名（传统方式）
function verifyApiV2Signature(params) {
  const { sign, ...otherParams } = params
  
  // 生成签名
  const sortedKeys = Object.keys(otherParams).sort()
  let stringA = ''
  sortedKeys.forEach(key => {
    if (otherParams[key]) {
      stringA += `${key}=${otherParams[key]}&`
    }
  })
  
  const stringSignTemp = stringA + `key=${WECHAT_PAY_CONFIG.api_key}`
  const calculatedSign = crypto.createHash('md5').update(stringSignTemp, 'utf8').digest('hex').toUpperCase()
  
  return calculatedSign === sign
}

// 更新订单状态
async function updateOrderStatus(orderNo, transactionId, payTime) {
  try {
    // 更新订单状态
    await db.collection('orders').doc(orderNo).update({
      data: {
        status: 'paid',
        transactionId: transactionId,
        payTime: new Date(payTime)
      }
    })
    
    // 获取订单信息
    const orderResult = await db.collection('orders').doc(orderNo).get()
    const orderData = orderResult.data
    
    if (orderData) {
      // 创建用户购买记录
      await db.collection('user_purchases').add({
        data: {
          _openid: orderData.openid, // 使用 _openid 字段
          userId: orderData.userId,
          packId: orderData.packId,
          orderId: orderNo,
          purchaseTime: new Date(payTime),
          status: 'completed', // 使用 completed 状态
          purchaseType: 'package', // 添加购买类型
          amount: orderData.amount
        }
      })
      
      // 更新语音包销量
      try {
        await db.collection('voicePacks').doc(orderData.packId).update({
          data: {
            sales: db.command.inc(1)
          }
        })
        console.log('销量更新成功:', orderData.packId)
      } catch (error) {
        console.error('销量更新失败:', error.message)
      }
      
      // 更新演员守护者计数
      try {
        console.log('🔄 更新演员守护者计数...')
        await wx.cloud.callFunction({
          name: 'updateActorGuardianCount',
          data: { actorId: orderData.actorId }
        })
        console.log('✅ 演员守护者计数更新完成')
      } catch (error) {
        console.error('❌ 更新演员守护者计数失败:', error.message)
      }
      
      console.log('订单状态更新成功:', orderNo)
    }
    
  } catch (error) {
    console.error('更新订单状态失败:', error)
    throw error
  }
}

// 主函数
exports.main = async (event, context) => {
  try {
    console.log('收到支付回调:', event)
    
    // 获取请求体（XML格式）
    const xmlData = event.body || event.xmlData
    
    if (!xmlData) {
      console.error('未收到支付回调数据')
      return {
        statusCode: 400,
        body: generateXML('FAIL', '未收到支付回调数据')
      }
    }
    
    // 解析XML数据
    const callbackData = parseXML(xmlData)
    console.log('解析后的回调数据:', callbackData)
    
    // 验证必要字段
    if (!callbackData.out_trade_no || !callbackData.transaction_id) {
      console.error('回调数据缺少必要字段')
      return {
        statusCode: 400,
        body: generateXML('FAIL', '回调数据缺少必要字段')
      }
    }
    
    // 验证签名（支持微信支付公钥和APIv2两种方式）
    if (!verifySign(callbackData, event.headers || {})) {
      console.error('签名验证失败')
      return {
        statusCode: 400,
        body: generateXML('FAIL', '签名验证失败')
      }
    }
    
    // 检查支付结果
    if (callbackData.return_code === 'SUCCESS' && callbackData.result_code === 'SUCCESS') {
      // 支付成功，更新订单状态
      await updateOrderStatus(
        callbackData.out_trade_no,
        callbackData.transaction_id,
        callbackData.time_end
      )
      
      console.log('支付成功处理完成:', callbackData.out_trade_no)
      
      return {
        statusCode: 200,
        body: generateXML('SUCCESS', 'OK')
      }
    } else {
      console.error('支付失败:', callbackData)
      return {
        statusCode: 200,
        body: generateXML('SUCCESS', 'OK') // 即使支付失败也要返回SUCCESS，避免微信重复通知
      }
    }
    
  } catch (error) {
    console.error('处理支付回调失败:', error)
    return {
      statusCode: 500,
      body: generateXML('FAIL', '处理支付回调失败')
    }
  }
}