// 获取许愿池数据的云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { action } = event
  
  try {
    if (action === 'getWishData') {
      console.log('🔍 开始获取许愿池数据...')
      
      // 获取所有许愿记录
      const wishResult = await db.collection('wishes')
        .where({
          status: 'active'
        })
        .orderBy('wishCount', 'desc')
        .orderBy('createdAt', 'desc')
        .get()
      
      console.log(`许愿记录总数: ${wishResult.data.length}`)
      
      // 获取所有点赞记录
      const likeResult = await db.collection('wish_likes')
        .get()
      
      console.log(`点赞记录总数: ${likeResult.data.length}`)
      
      // 统计每个许愿的点赞数量
      const wishLikeCount = new Map()
      likeResult.data.forEach(like => {
        const wishId = like.wishId
        if (!wishLikeCount.has(wishId)) {
          wishLikeCount.set(wishId, 0)
        }
        wishLikeCount.set(wishId, wishLikeCount.get(wishId) + 1)
      })
      
      // 合并许愿数据和点赞统计
      const wishData = wishResult.data.map(wish => {
        const likeCount = wishLikeCount.get(wish._id) || 0
        return {
          ...wish,
          supportCount: wish.wishCount, // 使用愿力数量作为助力数量
          likeCount: likeCount,
          // 格式化时间
          createTimeFormatted: new Date(wish.createdAt).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })
        }
      })
      
      // 按愿力数量倒序排列
      wishData.sort((a, b) => b.wishCount - a.wishCount)
      
      console.log('✅ 许愿池数据获取完成')
      
      return {
        code: 0,
        message: '获取许愿池数据成功',
        data: {
          wishes: wishData,
          totalWishes: wishData.length,
          totalSupports: likeResult.data.length
        }
      }
    }
    
    if (action === 'getWishStats') {
      console.log('📊 开始获取许愿池统计信息...')
      
      // 获取许愿总数
      const wishCountResult = await db.collection('wishes')
        .where({
          status: 'active'
        })
        .count()
      
      // 获取点赞总数
      const likeCountResult = await db.collection('wish_likes').count()
      
      // 获取今日许愿数
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayWishResult = await db.collection('wishes')
        .where({
          status: 'active',
          createdAt: db.command.gte(today)
        })
        .count()
      
      // 获取今日点赞数
      const todayLikeResult = await db.collection('wish_likes')
        .where({
          createdAt: db.command.gte(today)
        })
        .count()
      
      // 获取最热门的许愿（愿力数最多的前5个）
      const allWishes = await db.collection('wishes')
        .where({
          status: 'active'
        })
        .orderBy('wishCount', 'desc')
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get()
      
      const topWishes = allWishes.data.map(wish => ({
        ...wish,
        supportCount: wish.wishCount,
        createTimeFormatted: new Date(wish.createdAt).toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      }))
      
      return {
        code: 0,
        message: '获取许愿池统计信息成功',
        data: {
          totalWishes: wishCountResult.total,
          totalSupports: likeCountResult.total,
          todayWishes: todayWishResult.total,
          todaySupports: todayLikeResult.total,
          topWishes: topWishes
        }
      }
    }
    
    return {
      code: 1,
      message: '未知的操作类型'
    }
    
  } catch (error) {
    console.error('获取许愿池数据失败:', error)
    return {
      code: -1,
      message: '获取许愿池数据失败',
      error: error.message
    }
  }
}
