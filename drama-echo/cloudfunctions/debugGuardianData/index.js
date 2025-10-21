// 调试守护者数据云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    console.log('🔍 开始调试守护者数据...')
    
    // 1. 获取所有演员
    const actorsResult = await db.collection('actors').get()
    console.log('演员数量:', actorsResult.data.length)
    
    // 2. 获取所有语音包
    const voicePacksResult = await db.collection('voicePacks').get()
    console.log('语音包数量:', voicePacksResult.data.length)
    
    // 3. 获取新集合购买记录
    const newPurchasesResult = await db.collection('user_purchases').get()
    console.log('新集合购买记录数量:', newPurchasesResult.data.length)
    
    // 4. 获取旧集合购买记录
    const oldPurchasesResult = await db.collection('userPurchases').get()
    console.log('旧集合购买记录数量:', oldPurchasesResult.data.length)
    
    // 5. 获取粉丝排行榜
    const fanRankingResult = await db.collection('fanRanking').get()
    console.log('粉丝排行榜记录数量:', fanRankingResult.data.length)
    
    // 6. 计算每个演员的守护者数量
    const actorGuardianCounts = []
    for (const actor of actorsResult.data) {
      const actorPackIds = voicePacksResult.data
        .filter(pack => pack.actorId === actor._id)
        .map(pack => pack._id)
      
      if (actorPackIds.length > 0) {
        const $ = db.command
        const [newPurchasesRes, oldPurchasesRes] = await Promise.all([
          db.collection('user_purchases').where({ packId: $.in(actorPackIds), status: 'completed' }).get(),
          db.collection('userPurchases').where({ voicePackId: $.in(actorPackIds) }).get()
        ])
        
        const uniqueUsers = new Set()
        ;(newPurchasesRes.data || []).forEach(r => r._openid && uniqueUsers.add(r._openid))
        ;(oldPurchasesRes.data || []).forEach(r => r._openid && uniqueUsers.add(r._openid))
        
        actorGuardianCounts.push({
          actorId: actor._id,
          actorName: actor.name,
          packIds: actorPackIds,
          newPurchases: newPurchasesRes.data.length,
          oldPurchases: oldPurchasesRes.data.length,
          uniqueUsers: uniqueUsers.size,
          currentGuardianCount: actor.stats?.guardianCount || 0
        })
      }
    }
    
    return {
      code: 0,
      data: {
        actors: actorsResult.data.length,
        voicePacks: voicePacksResult.data.length,
        newPurchases: newPurchasesResult.data.length,
        oldPurchases: oldPurchasesResult.data.length,
        fanRanking: fanRankingResult.data.length,
        actorGuardianCounts,
        sampleNewPurchases: newPurchasesResult.data.slice(0, 3),
        sampleOldPurchases: oldPurchasesResult.data.slice(0, 3),
        sampleFanRanking: fanRankingResult.data.slice(0, 3)
      },
      message: '调试数据获取成功'
    }
    
  } catch (error) {
    console.error('❌ 调试守护者数据失败:', error)
    return {
      code: -1,
      message: error.message || '调试失败'
    }
  }
}
