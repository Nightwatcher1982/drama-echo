const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloud1-2gyb3dkq4c474fe4'
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const { orderId, packId } = event
    
    console.log('完成购买记录创建:', { orderId, packId })
    
    if (!orderId || !packId) {
      return {
        code: -1,
        message: '缺少必要参数'
      }
    }
    
    // 获取订单信息
    const orderResult = await db.collection('orders').doc(orderId).get()
    
    if (!orderResult.data) {
      return {
        code: -1,
        message: '订单不存在'
      }
    }
    
    const orderData = orderResult.data
    
    // 检查订单状态
    if (orderData.status !== 'paid' && orderData.status !== 'pending') {
      console.log('订单状态异常:', orderData.status)
    }
    
    // 检查是否已经创建过购买记录
    const existingPurchase = await db.collection('user_purchases')
      .where({
        orderId: orderId
      })
      .get()
    
    if (existingPurchase.data && existingPurchase.data.length > 0) {
      console.log('购买记录已存在，跳过创建')
      return {
        code: 0,
        message: '购买记录已存在',
        data: existingPurchase.data[0]
      }
    }
    
    // 创建购买记录
    const purchaseResult = await db.collection('user_purchases').add({
      data: {
        _openid: orderData.openid,
        userId: orderData.userId || orderData.openid,
        packId: packId,
        orderId: orderId,
        purchaseTime: new Date(),
        status: 'completed',
        purchaseType: 'package',
        amount: orderData.amount,
        quantity: orderData.quantity || 1
      }
    })
    
    console.log('购买记录创建成功:', purchaseResult._id)
    
    // 更新订单状态为已支付
    await db.collection('orders').doc(orderId).update({
      data: {
        status: 'paid',
        payTime: new Date()
      }
    })
    
    // 更新语音包销量
    try {
      await db.collection('voicePacks').doc(packId).update({
        data: {
          sales: db.command.inc(orderData.quantity || 1)
        }
      })
    } catch (error) {
      console.error('更新销量失败:', error)
    }
    
    return {
      code: 0,
      message: '购买记录创建成功',
      data: {
        purchaseId: purchaseResult._id,
        orderId: orderId,
        packId: packId
      }
    }
    
  } catch (error) {
    console.error('创建购买记录失败:', error)
    return {
      code: -1,
      message: error.message || '创建购买记录失败'
    }
  }
}


