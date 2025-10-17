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
  
  // 获取当前用户的openid
  const { OPENID } = cloud.getWXContext()
  const currentOpenid = openid || OPENID
  const currentUserId = userId || OPENID
  
  try {
    console.log('开始创建订单:', { 
      packId, 
      userId: currentUserId, 
      openid: currentOpenid,
      originalEvent: { packId, userId, openid }
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
    console.log('语音包信息:', packData)
    
    // 2. 获取演员信息
    const actorResult = await db.collection('actors').doc(packData.actorId).get()
    const actorData = actorResult.data || {}
    
    // 3. 生成订单号
    const orderNo = generateOrderNo()
    
    // 4. 创建订单数据
    const orderData = {
      _id: orderNo,
      userId: currentUserId,
      openid: currentOpenid,
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
    
    // 开发环境：跳过支付，直接完成购买
    console.log('开发环境：跳过支付，直接完成购买')
    
    // 更新订单状态为已支付
    await db.collection('orders').doc(orderNo).update({
      data: {
        status: 'paid',
        payTime: new Date(),
        transactionId: `dev_${Date.now()}`
      }
    })
    
    // 创建用户购买记录
    await db.collection('user_purchases').add({
      data: {
        _openid: currentOpenid,
        userId: currentUserId,
        packId: packId,
        orderId: orderNo,
        purchaseTime: new Date(),
        status: 'completed',
        purchaseType: 'package',
        amount: packData.price
      }
    })
    
    // 更新语音包销量
    console.log('🔄 开始更新语音包销量，packId:', packId)
    
    // 先检查当前销量
    try {
      const currentPackResult = await db.collection('voicePacks').doc(packId).get()
      if (currentPackResult.data) {
        console.log('📊 当前销量:', currentPackResult.data.sales, '类型:', typeof currentPackResult.data.sales)
      }
    } catch (error) {
      console.log('未找到语音包:', error.message)
    }
    
    // 更新语音包销量
    try {
      const packResult = await db.collection('voicePacks').doc(packId).get()
      if (packResult.data) {
        const currentSales = packResult.data.sales || 0
        const newSales = currentSales + 1
        
        await db.collection('voicePacks').doc(packId).update({
          data: {
            sales: newSales
          }
        })
        console.log('✅ 销量更新成功:', packId, '从', currentSales, '到', newSales)

        // 验证更新结果
        const updatedPackResult = await db.collection('voicePacks').doc(packId).get()
        if (updatedPackResult.data) {
          console.log('📊 更新后销量:', updatedPackResult.data.sales)
        }
      } else {
        console.error('❌ 未找到语音包，无法更新销量')
      }
    } catch (error) {
      console.error('❌ 销量更新失败:', error.message)
    }
    
    console.log('开发环境：模拟支付完成，订单号:', orderNo)
    
    // 更新粉丝排行榜
    try {
      console.log('🔄 更新粉丝排行榜...')
      await wx.cloud.callFunction({
        name: 'updateFanRanking',
        data: { actorId: packData.actorId }
      })
      console.log('✅ 粉丝排行榜更新完成')
    } catch (error) {
      console.error('❌ 更新粉丝排行榜失败:', error.message)
    }
    
    // 更新演员守护者计数
    try {
      console.log('🔄 更新演员守护者计数...')
      await wx.cloud.callFunction({
        name: 'updateActorGuardianCount',
        data: { actorId: packData.actorId }
      })
      console.log('✅ 演员守护者计数更新完成')
    } catch (error) {
      console.error('❌ 更新演员守护者计数失败:', error.message)
    }
    
    return {
      code: 0,
      message: '开发环境：购买成功！',
      data: {
        orderId: orderNo,
        simulatedPayment: true,
        message: '开发环境：支付模拟成功'
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
