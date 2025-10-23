// 获取管理后台数据云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloud1-2gyb3dkq4c474fe4'
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { dataType, actorId, page = 1, pageSize = 20 } = event
  
  try {
    console.log('获取管理后台数据:', { dataType, actorId, page, pageSize })
    
    switch (dataType) {
      case 'purchaseRecords':
        return await getPurchaseRecords(page, pageSize)
      case 'fanRankings':
        return await getFanRankings(actorId, page, pageSize)
      case 'salesStats':
        return await getSalesStats()
      case 'userStats':
        return await getUserStats()
      case 'voicePackSales':
        return await getVoicePackSales(page, pageSize)
      default:
        return {
          code: -1,
          message: '不支持的数据类型'
        }
    }
    
  } catch (error) {
    console.error('获取管理后台数据失败:', error)
    return {
      code: -1,
      message: '获取数据失败: ' + error.message
    }
  }
}

// 获取用户购买记录
async function getPurchaseRecords(page, pageSize) {
  try {
    const skip = (page - 1) * pageSize
    
    // 获取购买记录
    let purchaseResult = await db.collection('user_purchases')
      .orderBy('purchaseTime', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get()
    
    // 如果新集合没有数据，从旧集合查询
    if (purchaseResult.data.length === 0) {
      purchaseResult = await db.collection('userPurchases')
        .orderBy('purchaseTime', 'desc')
        .skip(skip)
        .limit(pageSize)
        .get()
    }
    
    // 获取总数
    let totalResult = await db.collection('user_purchases').count()
    if (totalResult.total === 0) {
      totalResult = await db.collection('userPurchases').count()
    }
    
    // 批量获取相关数据，减少数据库查询次数
    const packIds = [...new Set(purchaseResult.data.map(p => p.packId || p.voicePackId).filter(Boolean))]
    const userIds = [...new Set(purchaseResult.data.map(p => p._openid).filter(Boolean))]
    
    // 批量获取语音包信息
    const packDataMap = new Map()
    if (packIds.length > 0) {
      try {
        const packResults = await db.collection('voicePacks')
          .where({
            _id: db.command.in(packIds)
          })
          .field({
            _id: true,
            name: true,
            actorId: true
          })
          .get()
        
        packResults.data.forEach(pack => {
          packDataMap.set(pack._id, pack)
        })
      } catch (error) {
        console.error('批量获取语音包信息失败:', error)
      }
    }
    
    // 批量获取演员信息
    const actorDataMap = new Map()
    const actorIds = [...new Set(Array.from(packDataMap.values()).map(p => p.actorId).filter(Boolean))]
    if (actorIds.length > 0) {
      try {
        const actorResults = await db.collection('actors')
          .where({
            _id: db.command.in(actorIds)
          })
          .field({
            _id: true,
            name: true
          })
          .get()
        
        actorResults.data.forEach(actor => {
          actorDataMap.set(actor._id, actor)
        })
      } catch (error) {
        console.error('批量获取演员信息失败:', error)
      }
    }
    
    // 批量获取用户信息
    const userDataMap = new Map()
    if (userIds.length > 0) {
      try {
        const userResults = await db.collection('users')
          .where({
            _id: db.command.in(userIds)
          })
          .field({
            _id: true,
            'userInfo.nickName': true
          })
          .get()
        
        userResults.data.forEach(user => {
          userDataMap.set(user._id, user)
        })
      } catch (error) {
        console.error('批量获取用户信息失败:', error)
      }
    }
    
    // 组装数据
    const enrichedRecords = purchaseResult.data.map(purchase => {
      const packId = purchase.packId || purchase.voicePackId
      const packData = packDataMap.get(packId)
      const actorData = packData ? actorDataMap.get(packData.actorId) : null
      const userData = userDataMap.get(purchase._openid)
      
      return {
        _id: purchase._id,
        userId: purchase._openid,
        userNickName: userData?.userInfo?.nickName || '匿名用户',
        packId: packId,
        packName: packData?.name || '未知语音包',
        actorName: actorData?.name || '未知演员',
        amount: purchase.amount || 0,
        purchaseTime: purchase.purchaseTime,
        status: purchase.status || 'completed',
        purchaseType: purchase.purchaseType || 'package',
        purchaseCount: purchase.purchaseCount || 1
      }
    })
    
    return {
      code: 0,
      data: {
        records: enrichedRecords,
        total: totalResult.total,
        page: page,
        pageSize: pageSize,
        totalPages: Math.ceil(totalResult.total / pageSize)
      },
      message: '获取购买记录成功'
    }
    
  } catch (error) {
    console.error('获取购买记录失败:', error)
    throw error
  }
}

// 获取粉丝排行榜数据
async function getFanRankings(actorId, page, pageSize) {
  try {
    const skip = (page - 1) * pageSize
    
    let query = db.collection('fanRanking')
    if (actorId) {
      query = query.where({ actorId: actorId })
    }
    
    const rankingResult = await query
      .orderBy('rank', 'asc')
      .skip(skip)
      .limit(pageSize)
      .get()
    
    const totalResult = await query.count()
    
    return {
      code: 0,
      data: {
        rankings: rankingResult.data,
        total: totalResult.total,
        page: page,
        pageSize: pageSize,
        totalPages: Math.ceil(totalResult.total / pageSize)
      },
      message: '获取粉丝排行榜成功'
    }
    
  } catch (error) {
    console.error('获取粉丝排行榜失败:', error)
    throw error
  }
}

// 获取销售统计
async function getSalesStats() {
  try {
    // 获取总购买记录数和总销售额（一次查询完成）
    let purchaseResult = await db.collection('user_purchases')
      .field({ amount: true, purchaseTime: true })
      .get()
    
    if (purchaseResult.data.length === 0) {
      purchaseResult = await db.collection('userPurchases')
        .field({ amount: true, purchaseTime: true })
        .get()
    }
    
    const totalPurchases = purchaseResult.data.length
    const totalSales = purchaseResult.data.reduce((sum, purchase) => {
      return sum + (purchase.amount || 0)
    }, 0)
    
    // 计算今日销售
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const todayPurchases = purchaseResult.data.filter(purchase => {
      const purchaseTime = new Date(purchase.purchaseTime)
      return purchaseTime >= today
    }).length
    
    return {
      code: 0,
      data: {
        totalPurchases: totalPurchases,
        totalSales: totalSales,
        todayPurchases: todayPurchases,
        averageOrderValue: totalPurchases > 0 ? Math.round(totalSales / totalPurchases) : 0
      },
      message: '获取销售统计成功'
    }
    
  } catch (error) {
    console.error('获取销售统计失败:', error)
    throw error
  }
}

// 获取用户统计
async function getUserStats() {
  try {
    // 获取总用户数
    const totalUsers = await db.collection('users').count()
    
    // 获取有购买记录的用户数（使用聚合查询优化）
    let purchaseUsers = await db.collection('user_purchases')
      .field({ _openid: true })
      .get()
    
    if (purchaseUsers.data.length === 0) {
      purchaseUsers = await db.collection('userPurchases')
        .field({ _openid: true })
        .get()
    }
    
    const uniqueUsers = new Set(purchaseUsers.data.map(p => p._openid))
    
    return {
      code: 0,
      data: {
        totalUsers: totalUsers.total,
        purchasingUsers: uniqueUsers.size,
        conversionRate: totalUsers.total > 0 ? Math.round((uniqueUsers.size / totalUsers.total) * 100) : 0
      },
      message: '获取用户统计成功'
    }
    
  } catch (error) {
    console.error('获取用户统计失败:', error)
    throw error
  }
}

// 获取语音包销售明细
async function getVoicePackSales(page, pageSize) {
  try {
    const skip = (page - 1) * pageSize
    
    // 获取所有语音包 - 同时查询两个集合并合并
    let voicePacksResult1 = await db.collection('voicePacks').get()
    let voicePacksResult2 = await db.collection('voice_packs').get()
    
    // 合并两个集合的数据
    const allVoicePacks = [...voicePacksResult1.data, ...voicePacksResult2.data]
    
    // 按销量排序并分页
    const sortedPacks = allVoicePacks.sort((a, b) => (b.sales || 0) - (a.sales || 0))
    const voicePacksResult = {
      data: sortedPacks.slice(skip, skip + pageSize)
    }
    
    // 获取总数
    const totalResult = { total: allVoicePacks.length }
    
    // 获取购买记录统计 - 同时查询两个集合并合并
    let purchaseResult1 = await db.collection('user_purchases')
      .field({ packId: true, voicePackId: true, amount: true, purchaseTime: true })
      .get()
    
    let purchaseResult2 = await db.collection('userPurchases')
      .field({ packId: true, voicePackId: true, amount: true, purchaseTime: true })
      .get()
    
    // 合并两个集合的购买记录
    const allPurchases = [...purchaseResult1.data, ...purchaseResult2.data]
    const purchaseResult = { data: allPurchases }
    
    console.log('合并后的购买记录数量:', allPurchases.length)
    
    // 统计每个语音包的销售数据
    const salesMap = new Map()
    purchaseResult.data.forEach(purchase => {
      const packId = purchase.packId || purchase.voicePackId
      if (!packId) return
      
      if (!salesMap.has(packId)) {
        salesMap.set(packId, {
          packId: packId,
          totalSales: 0,
          totalRevenue: 0,
          purchaseCount: 0,
          lastSaleTime: null
        })
      }
      
      const sales = salesMap.get(packId)
      sales.totalSales += 1
      sales.totalRevenue += (purchase.amount || 0)
      sales.purchaseCount += 1
      
      const purchaseTime = new Date(purchase.purchaseTime)
      if (!sales.lastSaleTime || purchaseTime > sales.lastSaleTime) {
        sales.lastSaleTime = purchaseTime
      }
    })
    
    console.log('销售统计结果:', Array.from(salesMap.entries()).slice(0, 5))
    
    // 获取演员信息
    const actorIds = [...new Set(voicePacksResult.data.map(pack => pack.actorId).filter(Boolean))]
    const actorDataMap = new Map()
    if (actorIds.length > 0) {
      try {
        const actorResults = await db.collection('actors')
          .where({
            _id: db.command.in(actorIds)
          })
          .field({
            _id: true,
            name: true
          })
          .get()
        
        actorResults.data.forEach(actor => {
          actorDataMap.set(actor._id, actor)
        })
      } catch (error) {
        console.error('批量获取演员信息失败:', error)
      }
    }
    
    // 组装销售明细数据
    const salesDetails = voicePacksResult.data.map(pack => {
      const sales = salesMap.get(pack._id) || {
        totalSales: 0,
        totalRevenue: 0,
        purchaseCount: 0,
        lastSaleTime: null
      }
      
      const actorData = actorDataMap.get(pack.actorId)
      
      console.log(`语音包 ${pack.name} (${pack._id}) 销售数据:`, {
        packSales: pack.sales,
        actualSales: sales.totalSales,
        revenue: sales.totalRevenue,
        purchaseCount: sales.purchaseCount
      })
      
      return {
        _id: pack._id,
        packName: pack.name,
        actorName: actorData?.name || '未知演员',
        actorId: pack.actorId,
        price: pack.price || 0,
        sales: pack.sales || 0, // 语音包本身的销量字段
        totalSales: sales.totalSales, // 实际购买记录统计的销量
        totalRevenue: sales.totalRevenue,
        purchaseCount: sales.purchaseCount,
        lastSaleTime: sales.lastSaleTime,
        createTime: pack.createTime,
        status: pack.status || 'active'
      }
    })
    
    return {
      code: 0,
      data: {
        salesDetails: salesDetails,
        total: totalResult.total,
        page: page,
        pageSize: pageSize,
        totalPages: Math.ceil(totalResult.total / pageSize)
      },
      message: '获取语音包销售明细成功'
    }
    
  } catch (error) {
    console.error('获取语音包销售明细失败:', error)
    throw error
  }
}
