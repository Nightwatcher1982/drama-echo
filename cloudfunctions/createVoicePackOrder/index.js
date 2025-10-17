// 创建语音包订单并调用微信支付云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloud1-2gyb3dkq4c474fe4'
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { actorId, voicePackIds } = event
  
  try {
    console.log('创建语音包订单，用户:', OPENID, '演员:', actorId, '语音包:', voicePackIds)
    
    if (!actorId || !voicePackIds || voicePackIds.length === 0) {
      return {
        code: -1,
        message: '参数不完整'
      }
    }
    
    // 1. 验证语音包存在并获取价格信息
    const voicePacksResult = await db.collection('voicePacks')
      .where({
        _id: db.command.in(voicePackIds),
        actorId: actorId,
        isActive: true
      })
      .get()
    
    if (voicePacksResult.data.length !== voicePackIds.length) {
      return {
        code: -1,
        message: '部分语音包不存在或已下架'
      }
    }
    
    // 2. 检查用户是否已购买过
    const userPurchasesResult = await db.collection('userPurchases')
      .where({
        _openid: OPENID,
        voicePackId: db.command.in(voicePackIds)
      })
      .get()
    
    if (userPurchasesResult.data.length > 0) {
      return {
        code: -1,
        message: '部分语音包已购买，请勿重复购买'
      }
    }
    
    // 3. 计算总金额
    const totalAmount = voicePacksResult.data.reduce((sum, pack) => sum + pack.price, 0)
    
    // 4. 创建订单记录
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const orderData = {
      _id: orderId,
      _openid: OPENID,
      actorId: actorId,
      voicePackIds: voicePackIds,
      voicePacks: voicePacksResult.data.map(pack => ({
        _id: pack._id,
        name: pack.name,
        price: pack.price
      })),
      totalAmount: totalAmount,
      status: 'pending',
      createTime: new Date()
    }
    
    await db.collection('orders').add({
      data: orderData
    })
    
    // 5. 开发环境：模拟支付成功，直接完成购买
    console.log('开发环境：跳过支付，直接完成购买')
    
    // 更新订单状态为已支付
    await db.collection('orders').doc(orderId).update({
      data: {
        status: 'paid',
        payTime: new Date()
      }
    })
    
    // 添加用户购买记录
    const purchasePromises = voicePackIds.map(packId => {
      return db.collection('userPurchases').add({
        data: {
          _openid: OPENID,
          actorId: actorId,
          voicePackId: packId,
          orderId: orderId,
          purchaseTime: new Date()
        }
      })
    })
    
    await Promise.all(purchasePromises)
    
    // 更新演员销量统计
    const salesPromises = voicePackIds.map(packId => {
      return db.collection('voicePacks').doc(packId).update({
        data: {
          sales: db.command.inc(1)
        }
      })
    })
    
    await Promise.all(salesPromises)
    
    console.log('模拟支付完成，订单号:', orderId)
    
    return {
      code: 0,
      data: {
        orderId: orderId,
        totalAmount: totalAmount,
        simulatedPayment: true,
        message: '开发环境：支付模拟成功'
      },
      message: '购买成功！'
    }
    
  } catch (error) {
    console.error('createVoicePackOrder error:', error)
    return {
      code: -1,
      message: error.message || '创建订单失败'
    }
  }
}