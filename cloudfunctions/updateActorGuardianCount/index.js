// 更新演员守护者计数云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloud1-2gyb3dkq4c474fe4'
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { actorId } = event
  
  try {
    console.log('🔄 开始更新演员守护者计数，actorId:', actorId)
    
    if (!actorId) {
      return {
        code: -1,
        message: '演员ID不能为空'
      }
    }
    
    // 1. 获取该演员的所有语音包ID
    const voicePacksResult = await db.collection('voicePacks')
      .where({
        actorId: actorId,
        isActive: true
      })
      .field({
        _id: true
      })
      .get()
    
    const packIds = voicePacksResult.data.map(pack => pack._id)
    console.log('📦 找到语音包ID列表:', packIds)
    
    if (packIds.length === 0) {
      console.log('⚠️ 该演员没有语音包，守护者计数设为0')
      await db.collection('actors').doc(actorId).update({
        data: {
          'stats.guardianCount': 0
        }
      })
      return {
        code: 0,
        data: { guardianCount: 0 },
        message: '更新成功'
      }
    }
    
    // 2. 统计购买了该演员语音包的不同用户数量
    const uniqueUsers = new Set()
    
    // 查询新集合的购买记录
    const newPurchasesResult = await db.collection('user_purchases')
      .where({
        packId: db.command.in(packIds),
        status: 'completed'
      })
      .field({
        _openid: true
      })
      .get()
    
    console.log('📊 新集合购买记录:', newPurchasesResult.data.length, '条')
    newPurchasesResult.data.forEach(purchase => {
      uniqueUsers.add(purchase._openid)
    })
    
    // 查询旧集合的购买记录
    const oldPurchasesResult = await db.collection('userPurchases')
      .where({
        actorId: actorId
      })
      .field({
        _openid: true,
        voicePackId: true
      })
      .get()
    
    // 过滤出属于该演员语音包的购买记录
    const filteredOldPurchases = oldPurchasesResult.data.filter(purchase => 
      packIds.includes(purchase.voicePackId)
    )
    
    console.log('📊 旧集合购买记录:', oldPurchasesResult.data.length, '条')
    console.log('📊 过滤后的旧集合购买记录:', filteredOldPurchases.length, '条')
    filteredOldPurchases.forEach(purchase => {
      uniqueUsers.add(purchase._openid)
    })
    
    const guardianCount = uniqueUsers.size
    console.log('👥 统计到的唯一用户数（守护者）:', guardianCount)
    console.log('👥 用户列表:', Array.from(uniqueUsers))
    
    // 3. 更新演员的守护者计数
    await db.collection('actors').doc(actorId).update({
      data: {
        'stats.guardianCount': guardianCount
      }
    })
    
    console.log('✅ 守护者计数更新成功:', actorId, '->', guardianCount)
    
    return {
      code: 0,
      data: { 
        actorId: actorId,
        guardianCount: guardianCount,
        uniqueUsers: Array.from(uniqueUsers)
      },
      message: '更新成功'
    }
    
  } catch (error) {
    console.error('❌ 更新守护者计数失败:', error)
    return {
      code: -1,
      message: error.message || '更新守护者计数失败'
    }
  }
}
