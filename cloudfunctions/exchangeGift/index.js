// 积分兑换商品云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { giftId, giftName, pointsCost, userAddress } = event
  
  try {
    console.log('兑换商品，OpenID:', OPENID, 'giftId:', giftId)
    
    // 验证必要参数
    if (!giftId || !giftName || !pointsCost) {
      return {
        code: -1,
        message: '商品信息不完整'
      }
    }
    
    if (!userAddress || !userAddress.name || !userAddress.phone) {
      return {
        code: -1,
        message: '收货地址信息不完整'
      }
    }
    
    const now = new Date()
    
    // 获取用户数据
    const user = await db.collection('users').doc(OPENID).get()
    if (!user.data) {
      return {
        code: -1,
        message: '用户不存在'
      }
    }
    
    const currentPoints = user.data.pointsData?.points || 0
    
    // 检查积分是否足够
    if (currentPoints < pointsCost) {
      return {
        code: -2,
        message: `积分不足，当前积分：${currentPoints}，需要：${pointsCost}`
      }
    }
    
    // 检查商品库存
    const gift = await db.collection('mall_gifts').doc(giftId).get()
    if (!gift.data) {
      return {
        code: -1,
        message: '商品不存在'
      }
    }
    
    if (gift.data.stock <= 0) {
      return {
        code: -3,
        message: '商品库存不足'
      }
    }
    
    // 开始事务处理
    try {
      // 扣除用户积分
      await db.collection('users').doc(OPENID).update({
        data: {
          'pointsData.points': _.inc(-pointsCost)
        }
      })
      
      // 减少商品库存
      await db.collection('mall_gifts').doc(giftId).update({
        data: {
          stock: _.inc(-1)
        }
      })
      
      // 创建兑换记录
      const exchangeRecord = {
        _openid: OPENID,
        giftId,
        giftName,
        pointsCost,
        status: 'pending', // pending: 待处理, shipped: 已发货, completed: 已完成
        timestamp: now,
        address: {
          name: userAddress.name,
          phone: userAddress.phone,
          province: userAddress.province || '',
          city: userAddress.city || '',
          district: userAddress.district || '',
          detail: userAddress.detail || ''
        }
      }
      
      await db.collection('exchange_records').add({
        data: exchangeRecord
      })
      
      // 同时更新用户的兑换记录
      const userExchangeRecord = {
        giftId,
        giftName,
        pointsCost,
        status: 'pending',
        timestamp: now.getTime(),
        address: userAddress
      }
      
      await db.collection('users').doc(OPENID).update({
        data: {
          exchangeRecords: _.push(userExchangeRecord)
        }
      })
      
      console.log('商品兑换成功')
      return {
        code: 0,
        message: '兑换成功！我们会尽快为您安排发货。',
        remainingPoints: currentPoints - pointsCost,
        exchangeRecord: userExchangeRecord
      }
      
    } catch (transactionError) {
      console.error('兑换事务失败:', transactionError)
      return {
        code: -1,
        message: '兑换失败，请稍后重试'
      }
    }
    
  } catch (error) {
    console.error('exchangeGift error:', error)
    return {
      code: -1,
      message: error.message || '兑换商品失败'
    }
  }
} 