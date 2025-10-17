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

// 读取商户私钥
function getMerchantPrivateKey() {
  try {
    const privateKeyPath = path.join(__dirname, '../cert/apiclient_key.pem')
    const privateKey = fs.readFileSync(privateKeyPath, 'utf8')
    return privateKey
  } catch (error) {
    console.error('读取商户私钥失败:', error)
    return null
  }
}

// 生成随机字符串
function generateNonceStr() {
  return Math.random().toString(36).substr(2, 15)
}

// 生成APIv3签名
function generateApiV3Signature(method, url, timestamp, nonce, body, privateKey) {
  const message = `${method}\n${url}\n${timestamp}\n${nonce}\n${body}\n`
  
  const signer = crypto.createSign('RSA-SHA256')
  signer.update(message, 'utf8')
  const signature = signer.sign(privateKey, 'base64')
  
  return `WECHATPAY2-SHA256-RSA2048 mchid="${WECHAT_PAY_CONFIG.mch_id}",nonce_str="${nonce}",timestamp="${timestamp}",serial_no="${WECHAT_PAY_CONFIG.public_key_id}",signature="${signature}"`
}

// 生成订单号
function generateOrderNo() {
  const now = new Date()
  const timestamp = now.getTime()
  const random = Math.random().toString(36).substr(2, 6)
  return `order_${timestamp}_${random}`
}

// 调用微信支付APIv3统一下单接口
async function createWechatOrderV3(orderData) {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const nonce = generateNonceStr()
  const orderNo = generateOrderNo()
  
  const requestBody = {
    appid: WECHAT_PAY_CONFIG.appid,
    mchid: WECHAT_PAY_CONFIG.mch_id,
    description: orderData.description,
    out_trade_no: orderNo,
    notify_url: 'https://cloud1-2gyb3dkq4c474fe4.tcb.qcloud.la/tcb-http-trigger/payCallback',
    amount: {
      total: orderData.amount,
      currency: 'CNY'
    },
    payer: {
      openid: orderData.openid
    }
  }
  
  const body = JSON.stringify(requestBody)
  const url = '/v3/pay/transactions/jsapi'
  const method = 'POST'
  
  // 获取商户私钥
  const privateKey = getMerchantPrivateKey()
  if (!privateKey) {
    throw new Error('无法获取商户私钥')
  }
  
  // 生成签名
  const authorization = generateApiV3Signature(method, url, timestamp, nonce, body, privateKey)
  
  try {
    const response = await cloud.callFunction({
      name: 'httpRequest',
      data: {
        url: `https://api.mch.weixin.qq.com${url}`,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': authorization,
          'Wechatpay-Serial': WECHAT_PAY_CONFIG.public_key_id
        },
        body: body
      }
    })
    
    return {
      orderNo: orderNo,
      response: response.result
    }
  } catch (error) {
    console.error('调用微信支付APIv3接口失败:', error)
    throw error
  }
}

// 主函数
exports.main = async (event, context) => {
  const { packId, userId, openid } = event
  
  try {
    console.log('开始创建订单(APIv3):', { packId, userId, openid })
    
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
    
    // 3. 创建订单数据
    const orderData = {
      _id: generateOrderNo(),
      userId: userId,
      openid: openid,
      packId: packId,
      packName: packData.name,
      actorId: packData.actorId,
      actorName: actorData.name || '未知演员',
      amount: packData.price,
      status: 'pending',
      createTime: new Date(),
      payTime: null,
      refundTime: null,
      transactionId: null,
      refundId: null,
      description: `${actorData.name || '演员'} - ${packData.name}`
    }
    
    // 4. 保存订单到数据库
    await db.collection('orders').add({
      data: orderData
    })
    
    console.log('订单创建成功:', orderData)
    
    // 5. 调用微信支付APIv3统一下单
    const wechatOrderResult = await createWechatOrderV3({
      amount: packData.price,
      description: orderData.description,
      openid: openid
    })
    
    console.log('微信支付APIv3响应:', wechatOrderResult)
    
    // 6. 解析微信支付响应
    const wechatData = wechatOrderResult.response
    
    if (wechatData && wechatData.prepay_id) {
      // 7. 生成支付参数
      const payParams = {
        timeStamp: Math.floor(Date.now() / 1000).toString(),
        nonceStr: generateNonceStr(),
        package: `prepay_id=${wechatData.prepay_id}`,
        signType: 'RSA'
      }
      
      // 8. 生成支付签名（使用商户私钥）
      const privateKey = getMerchantPrivateKey()
      const signMessage = `${WECHAT_PAY_CONFIG.appid}\n${payParams.timeStamp}\n${payParams.nonceStr}\n${payParams.package}\n`
      
      const signer = crypto.createSign('RSA-SHA256')
      signer.update(signMessage, 'utf8')
      payParams.paySign = signer.sign(privateKey, 'base64')
      
      return {
        code: 0,
        message: '订单创建成功',
        data: {
          orderId: orderData._id,
          payParams: payParams
        }
      }
    } else {
      console.error('微信支付APIv3下单失败:', wechatData)
      return {
        code: -1,
        message: wechatData.message || '微信支付下单失败'
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
