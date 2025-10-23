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

// 安全配置加载
const secureConfig = require('./secureConfig')

// 获取微信支付配置
const WECHAT_PAY_CONFIG = secureConfig.getWechatPayConfig()

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
    out_trade_no: orderData._id,
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
  
  console.log('🔍 微信支付配置信息:', {
    appid: WECHAT_PAY_CONFIG.appid,
    mch_id: WECHAT_PAY_CONFIG.mch_id,
    api_key_length: WECHAT_PAY_CONFIG.api_key.length,
    api_key_prefix: WECHAT_PAY_CONFIG.api_key.substring(0, 8) + '...',
    notify_url: WECHAT_PAY_CONFIG.notify_url
  })
  
  console.log('🔍 微信支付请求参数:', params)
  console.log('🔍 生成的签名:', params.sign)
  console.log('🔍 XML请求体:', xmlBody)
  
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
    
    console.log('🔍 微信支付原始响应:', response)
    
    // 解析XML响应
    const responseData = parseXML(response)
    console.log('🔍 解析后的微信支付响应:', responseData)
    
    return response
  } catch (error) {
    console.error('💥 调用微信支付接口失败:', error)
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
  const { packId, userId, openid, quantity = 1 } = event
  
  // 添加部署验证日志 - 2024年10月21日 20:45 版本
  console.log('🚀🚀🚀 云函数已重新部署 - 版本验证 🚀🚀🚀')
  console.log('🔍 部署时间: 2024-10-21 20:45:00')
  console.log('🔍 当前时间:', new Date().toISOString())
  console.log('🔍 环境设置:', secureConfig.isDevelopment() ? '开发环境' : '生产环境')
  console.log('🔍 配置信息:', {
    appid: WECHAT_PAY_CONFIG.appid,
    mch_id: WECHAT_PAY_CONFIG.mch_id,
    api_key_length: WECHAT_PAY_CONFIG.api_key.length,
    notify_url: WECHAT_PAY_CONFIG.notify_url
  })
  
  // 获取当前用户的openid
  const { OPENID } = cloud.getWXContext()
  const currentOpenid = openid || OPENID
  const currentUserId = userId || OPENID
  
  try {
    secureConfig.log('info', '开始创建订单', { 
      packId, 
      userId: currentUserId,
      originalEvent: { packId, userId }
    })
    
    // 1. 获取语音包信息
    const packResult = await db.collection('voicePacks').doc(packId).get()
    if (!packResult.data) {
      return {
        code: -1,
        message: '语音包不存在'
      }
    }
    
    const packData = packResult.data
    secureConfig.log('debug', '语音包信息获取成功', { packId: packData._id, packName: packData.name })
    
    // 2. 获取演员信息
    const actorResult = await db.collection('actors').doc(packData.actorId).get()
    const actorData = actorResult.data || {}
    
    // 3. 生成订单号
    const orderNo = generateOrderNo()
    
    // 4. 创建订单数据
    const totalAmount = packData.price * quantity // 总金额 = 单价 × 数量
    const orderData = {
      _id: orderNo,
      userId: currentUserId,
      openid: currentOpenid,
      packId: packId,
      packName: packData.name,
      actorId: packData.actorId,
      actorName: actorData.name || '未知演员',
      amount: totalAmount, // 总金额，单位：分
      quantity: quantity, // 购买数量
      unitPrice: packData.price, // 单价，单位：分
      status: 'pending', // pending, paid, cancelled, refunded
      createTime: new Date(),
      payTime: null,
      refundTime: null,
      transactionId: null,
      refundId: null,
      description: `${actorData.name || '演员'} - ${packData.name}${quantity > 1 ? ` (${quantity}份)` : ''}`
    }
    
    // 5. 保存订单到数据库
    await db.collection('orders').add({
      data: orderData
    })
    
    secureConfig.log('info', '订单创建成功', { orderNo: orderData._id, amount: orderData.amount })
    
    // 6. 调用微信支付统一下单接口
    secureConfig.log('info', '开始处理支付参数', { 
      orderNo: orderData._id, 
      isDevelopment: secureConfig.isDevelopment() 
    })
    try {
      // 检查是否为开发环境
      if (secureConfig.isDevelopment()) {
        secureConfig.log('warn', '开发环境：提供模拟支付参数')
        
        // 开发环境：提供模拟的支付参数
        const payParams = {
          appId: WECHAT_PAY_CONFIG.appid,
          timeStamp: Math.floor(Date.now() / 1000).toString(),
          nonceStr: generateNonceStr(),
          package: `prepay_id=wx_test_${Date.now()}`,
          signType: 'MD5',
          paySign: 'test_signature_for_development'
        }
        
        const devResult = {
          code: 0,
          message: '订单创建成功（开发环境）',
          data: {
            orderId: orderNo,
            payParams: payParams,
            status: 'pending',
            isDevelopment: true
          }
        }
        secureConfig.log('info', '开发环境返回结果', devResult)
        return devResult
      } else {
        // 生产环境：调用真实的微信支付接口
        try {
          secureConfig.log('info', '开始调用微信支付接口', { orderNo: orderData._id })
          
          const wechatResponse = await createWechatOrder(orderData)
          secureConfig.log('info', '微信支付接口响应', { response: wechatResponse })
          
          const wechatData = parseXML(wechatResponse)
          secureConfig.log('info', '解析后的微信支付数据', { wechatData })
          
          if (wechatData.return_code === 'SUCCESS' && wechatData.result_code === 'SUCCESS') {
            // 微信支付统一下单成功，返回支付参数
            const timestamp = Math.floor(Date.now() / 1000).toString()
            const nonceStr = generateNonceStr()
            const packageStr = `prepay_id=${wechatData.prepay_id}`
            
            const payParams = {
              appId: WECHAT_PAY_CONFIG.appid,
              timeStamp: timestamp,
              nonceStr: nonceStr,
              package: packageStr,
              signType: 'MD5',
              paySign: generateSign({
                appId: WECHAT_PAY_CONFIG.appid,
                timeStamp: timestamp,
                nonceStr: nonceStr,
                package: packageStr,
                signType: 'MD5'
              }, WECHAT_PAY_CONFIG.api_key)
            }
            
            secureConfig.log('info', '微信支付统一下单成功', { 
              orderNo: orderData._id, 
              prepayId: wechatData.prepay_id,
              payParams: payParams
            })
            
            return {
              code: 0,
              message: '订单创建成功',
              data: {
                orderId: orderNo,
                payParams: payParams,
                status: 'pending'
              }
            }
          } else {
            // 微信支付统一下单失败
            secureConfig.log('error', '微信支付统一下单失败', { 
              orderNo: orderData._id, 
              error: wechatData.return_msg || wechatData.err_code_des,
              wechatData: wechatData
            })
            
            return {
              code: -1,
              message: wechatData.return_msg || wechatData.err_code_des || '支付下单失败'
            }
          }
        } catch (wechatError) {
          secureConfig.log('error', '微信支付接口调用异常', { 
            orderNo: orderData._id, 
            error: wechatError.message,
            stack: wechatError.stack
          })
          
          // 临时fallback：如果微信支付接口调用失败，返回模拟参数用于测试
          secureConfig.log('warn', '使用fallback模拟支付参数')
          const fallbackPayParams = {
            appId: WECHAT_PAY_CONFIG.appid,
            timeStamp: Math.floor(Date.now() / 1000).toString(),
            nonceStr: generateNonceStr(),
            package: `prepay_id=fallback_${Date.now()}`,
            signType: 'MD5',
            paySign: 'fallback_signature_for_testing'
          }
          
          const fallbackResult = {
            code: 0,
            message: '订单创建成功（fallback模式）',
            data: {
              orderId: orderNo,
              payParams: fallbackPayParams,
              status: 'pending',
              isFallback: true
            }
          }
          secureConfig.log('info', 'fallback模式返回结果', fallbackResult)
          return fallbackResult
        }
      }
    } catch (error) {
      secureConfig.log('error', '调用微信支付接口失败', { 
        orderNo: orderData._id, 
        error: error.message 
      })
      
      return {
        code: -1,
        message: '支付接口调用失败: ' + error.message
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
