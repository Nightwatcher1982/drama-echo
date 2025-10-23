// 更新粉丝排行榜云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { actorId } = event
  
  try {
    if (!actorId) {
      return {
        code: -1,
        message: '演员ID不能为空'
      }
    }
    
    // 先获取该演员的所有语音包ID
    const voicePacksResult = await db.collection('voicePacks')
      .where({
        actorId: actorId
      })
      .get()
    
    const actorVoicePackIds = voicePacksResult.data.map(pack => pack._id)
    
    if (actorVoicePackIds.length === 0) {
      return {
        code: 0,
        message: '该演员暂无语音包',
        data: {
          rankings: [],
          totalCount: 0
        }
      }
    }
    
    // 并行查询两个集合的购买记录，提高性能
    const [newPurchasesResult, oldPurchasesResult] = await Promise.all([
      db.collection('user_purchases')
        .where({
          packId: db.command.in(actorVoicePackIds),
          status: 'completed'
        })
        .get(),
      db.collection('userPurchases')
        .where({
          voicePackId: db.command.in(actorVoicePackIds)
        })
        .get()
    ])
    
    // 合并两个集合的数据
    const allPurchases = [...newPurchasesResult.data, ...oldPurchasesResult.data]
    const userPurchasesResult = { data: allPurchases }
    
    
    // 2. 统计每个用户对该演员的购买情况
    const userStats = new Map()
    
    for (const purchase of userPurchasesResult.data) {
      const packId = purchase.packId || purchase.voicePackId
      const userId = purchase._openid
      
      
      // 只统计该演员的语音包
      if (actorVoicePackIds.includes(packId)) {
        if (!userStats.has(userId)) {
          userStats.set(userId, {
            userId: userId,
            purchaseCount: 0,
            totalSpent: 0,
            lastPurchaseTime: null
          })
        }
        
        const stats = userStats.get(userId)
        stats.purchaseCount += 1
        stats.totalSpent += (purchase.amount || 0)
        
        // 更新最后购买时间
        const purchaseTime = new Date(purchase.purchaseTime)
        if (!stats.lastPurchaseTime || purchaseTime > stats.lastPurchaseTime) {
          stats.lastPurchaseTime = purchaseTime
        }
      }
    }
    
    
    
    // 4. 批量获取用户信息并生成排行榜数据
    const rankings = []
    const userIds = Array.from(userStats.keys())
    
    // 批量获取用户信息，减少数据库查询次数
    let userDataMap = new Map()
    if (userIds.length > 0) {
      try {
        const userResults = await db.collection('users')
          .where({
            _id: db.command.in(userIds)
          })
          .field({
            _id: true,
            'userInfo.nickName': true,
            'userInfo.avatarUrl': true
          })
          .get()
        
        userResults.data.forEach(user => {
          userDataMap.set(user._id, user)
        })
        console.log('批量获取用户信息成功:', userDataMap.size, '个用户')
      } catch (error) {
        console.error('批量获取用户信息失败:', error)
      }
    }
    
    // 生成排行榜数据
    for (const [userId, stats] of userStats) {
      const userData = userDataMap.get(userId) || {}
      
      // 计算等级和星级
      const level = calculateLevel(stats.purchaseCount, stats.totalSpent)
      const starCount = calculateStarCount(stats.purchaseCount, stats.totalSpent)
      
      rankings.push({
        _id: `ranking_${userId}_${actorId}`,
        userId: userId,
        actorId: actorId,
        userNickName: userData.userInfo?.nickName || '匿名用户',
        userAvatar: userData.userInfo?.avatarUrl || '',
        purchaseCount: stats.purchaseCount,
        totalSpent: stats.totalSpent,
        level: level,
        starCount: starCount,
        lastPurchaseTime: stats.lastPurchaseTime,
        updateTime: new Date()
      })
    }
    
    // 5. 按购买数量排序
    rankings.sort((a, b) => {
      if (b.purchaseCount !== a.purchaseCount) {
        return b.purchaseCount - a.purchaseCount
      }
      return b.totalSpent - a.totalSpent
    })
    
    // 6. 添加排名
    rankings.forEach((ranking, index) => {
      ranking.rank = index + 1
    })
    
    
    // 7. 更新数据库中的排行榜数据
    
    // 先删除该演员的旧排行榜数据
    const existingRankings = await db.collection('fanRanking')
      .where({
        actorId: actorId
      })
      .get()
    
    if (existingRankings.data.length > 0) {
      // 批量删除旧数据
      const deletePromises = existingRankings.data.map(existing => 
        db.collection('fanRanking').doc(existing._id).remove()
      )
      await Promise.all(deletePromises)
      console.log('删除了', existingRankings.data.length, '条旧排行榜记录')
    }
    
    // 批量插入新的排行榜数据
    if (rankings.length > 0) {
      // 分批插入，避免单次插入数据过多
      const batchSize = 20
      for (let i = 0; i < rankings.length; i += batchSize) {
        const batch = rankings.slice(i, i + batchSize)
        await db.collection('fanRanking').add({
          data: batch
        })
      }
    }
    
    return {
      code: 0,
      message: '排行榜更新成功',
      data: {
        rankings: rankings.slice(0, 3), // 只返回前3名
        totalCount: rankings.length
      }
    }
    
  } catch (error) {
    return {
      code: -1,
      message: '更新排行榜失败: ' + error.message
    }
  }
}

// 计算用户等级
function calculateLevel(purchaseCount, totalSpent) {
  if (purchaseCount >= 10 || totalSpent >= 50000) {
    return '钻石守护者'
  } else if (purchaseCount >= 7 || totalSpent >= 35000) {
    return '黄金支持者'
  } else if (purchaseCount >= 5 || totalSpent >= 25000) {
    return '白银粉丝'
  } else if (purchaseCount >= 3 || totalSpent >= 15000) {
    return '忠实听众'
  } else {
    return '声音收藏家'
  }
}

// 计算星级
function calculateStarCount(purchaseCount, totalSpent) {
  if (purchaseCount >= 10 || totalSpent >= 50000) {
    return 5
  } else if (purchaseCount >= 7 || totalSpent >= 35000) {
    return 4
  } else if (purchaseCount >= 5 || totalSpent >= 25000) {
    return 4
  } else if (purchaseCount >= 3 || totalSpent >= 15000) {
    return 3
  } else {
    return 3
  }
}
