const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    console.log('开始数据库性能分析和优化建议...')
    
    const optimizationResults = []
    const performanceStats = {}
    
    // 1. 分析用户购买记录集合性能
    try {
      const userPurchasesCount = await db.collection('user_purchases').count()
      const oldPurchasesCount = await db.collection('userPurchases').count()
      
      performanceStats.userPurchases = {
        newCollection: userPurchasesCount.total,
        oldCollection: oldPurchasesCount.total,
        total: userPurchasesCount.total + oldPurchasesCount.total
      }
      
      optimizationResults.push('✅ user_purchases 集合分析完成')
      optimizationResults.push(`   - 新集合记录数: ${userPurchasesCount.total}`)
      optimizationResults.push(`   - 旧集合记录数: ${oldPurchasesCount.total}`)
      optimizationResults.push(`   - 建议: 为 _openid, packId, purchaseTime 字段创建复合索引`)
    } catch (error) {
      optimizationResults.push('❌ user_purchases 集合分析失败: ' + error.message)
    }
    
    // 2. 分析语音包集合性能
    try {
      const voicePacksCount = await db.collection('voicePacks').count()
      
      performanceStats.voicePacks = {
        total: voicePacksCount.total
      }
      
      optimizationResults.push('✅ voicePacks 集合分析完成')
      optimizationResults.push(`   - 语音包总数: ${voicePacksCount.total}`)
      optimizationResults.push(`   - 建议: 为 actorId, isActive, isHot, sales 字段创建复合索引`)
    } catch (error) {
      optimizationResults.push('❌ voicePacks 集合分析失败: ' + error.message)
    }
    
    // 3. 分析演员集合性能
    try {
      const actorsCount = await db.collection('actors').count()
      
      performanceStats.actors = {
        total: actorsCount.total
      }
      
      optimizationResults.push('✅ actors 集合分析完成')
      optimizationResults.push(`   - 演员总数: ${actorsCount.total}`)
      optimizationResults.push(`   - 建议: 为 isActive, createTime 字段创建复合索引`)
    } catch (error) {
      optimizationResults.push('❌ actors 集合分析失败: ' + error.message)
    }
    
    // 4. 分析粉丝排行榜集合性能
    try {
      const fanRankingCount = await db.collection('fanRanking').count()
      
      performanceStats.fanRanking = {
        total: fanRankingCount.total
      }
      
      optimizationResults.push('✅ fanRanking 集合分析完成')
      optimizationResults.push(`   - 排行榜记录数: ${fanRankingCount.total}`)
      optimizationResults.push(`   - 建议: 为 actorId, purchaseCount, totalSpent 字段创建复合索引`)
    } catch (error) {
      optimizationResults.push('❌ fanRanking 集合分析失败: ' + error.message)
    }
    
    // 5. 分析用户集合性能
    try {
      const usersCount = await db.collection('users').count()
      
      performanceStats.users = {
        total: usersCount.total
      }
      
      optimizationResults.push('✅ users 集合分析完成')
      optimizationResults.push(`   - 用户总数: ${usersCount.total}`)
      optimizationResults.push(`   - 建议: 为 _id 字段创建索引（通常已自动创建）`)
    } catch (error) {
      optimizationResults.push('❌ users 集合分析失败: ' + error.message)
    }
    
    // 6. 生成优化建议
    const recommendations = [
      '📋 数据库索引优化建议:',
      '',
      '1. 用户购买记录优化:',
      '   - 集合: user_purchases',
      '   - 索引字段: _openid + packId + purchaseTime',
      '   - 用途: 快速查询用户购买历史和语音包购买记录',
      '',
      '2. 语音包查询优化:',
      '   - 集合: voicePacks',
      '   - 索引字段: actorId + isActive + isHot + sales',
      '   - 用途: 快速查询演员的活跃语音包和热门排序',
      '',
      '3. 粉丝排行榜优化:',
      '   - 集合: fanRanking',
      '   - 索引字段: actorId + purchaseCount + totalSpent',
      '   - 用途: 快速生成和排序粉丝排行榜',
      '',
      '4. 演员查询优化:',
      '   - 集合: actors',
      '   - 索引字段: isActive + createTime',
      '   - 用途: 快速查询活跃演员和按时间排序',
      '',
      '⚠️ 注意: 微信云开发需要在控制台手动创建索引',
      '   请访问云开发控制台 -> 数据库 -> 索引管理进行创建'
    ]
    
    return {
      code: 0,
      message: '数据库性能分析完成',
      data: {
        analysis: optimizationResults,
        performanceStats: performanceStats,
        recommendations: recommendations,
        totalCollections: Object.keys(performanceStats).length,
        note: '微信云开发需要在控制台手动创建索引，此分析提供了具体的索引建议'
      }
    }
    
  } catch (error) {
    console.error('数据库性能分析失败:', error)
    return {
      code: -1,
      message: '数据库性能分析失败: ' + error.message
    }
  }
}
