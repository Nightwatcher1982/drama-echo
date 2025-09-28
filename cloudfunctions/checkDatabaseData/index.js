const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const { collection, action, collectionName, limit } = event
  
  try {
    let result = {}
    
    if (collection === 'zodiac_quotes' || !collection) {
      // 检查星座数据
      const zodiacCount = await db.collection('zodiac_quotes').count()
      const zodiacSample = await db.collection('zodiac_quotes').limit(3).get()
      
      result.zodiac_quotes = {
        total_count: zodiacCount.total,
        sample_data: zodiacSample.data,
        zodiac_distribution: {}
      }
      
      // 统计每个星座的数量
      const zodiacSigns = ['白羊座', '金牛座', '双子座', '巨蟹座', '狮子座', '处女座', 
                          '天秤座', '天蝎座', '射手座', '摩羯座', '水瓶座', '双鱼座']
      
      for (let zodiac of zodiacSigns) {
        const count = await db.collection('zodiac_quotes')
          .where({ zodiac: zodiac })
          .count()
        result.zodiac_quotes.zodiac_distribution[zodiac] = count.total
      }
    }
    
    if (collection === 'mood_quotes' || !collection) {
      // 检查心情数据
      const moodCount = await db.collection('mood_quotes').count()
      const moodSample = await db.collection('mood_quotes').limit(3).get()
      
      result.mood_quotes = {
        total_count: moodCount.total,
        sample_data: moodSample.data,
        mood_distribution: {}
      }
      
      // 统计每个心情的数量
      const allMoods = await db.collection('mood_quotes')
        .field({ mood: true })
        .get()
      
      const moodCounts = {}
      allMoods.data.forEach(item => {
        moodCounts[item.mood] = (moodCounts[item.mood] || 0) + 1
      })
      result.mood_quotes.mood_distribution = moodCounts
    }
    
    // 支持查询指定集合
    if (action === 'queryCollection' && collectionName) {
      try {
        const queryResult = await db.collection(collectionName).limit(limit || 10).get()
        return {
          code: 0,
          message: '集合查询完成',
          data: queryResult.data
        }
      } catch (error) {
        return {
          code: -1,
          message: `查询集合 ${collectionName} 失败: ${error.message}`,
          data: null
        }
      }
    }
    
    // 检查数据库连接状态
    const dbStats = {
      timestamp: new Date().toISOString(),
      env: cloud.DYNAMIC_CURRENT_ENV
    }
    
    return {
      code: 0,
      message: '数据库检查完成',
      data: {
        ...result,
        database_info: dbStats
      }
    }
    
  } catch (error) {
    console.error('检查数据库失败:', error)
    return {
      code: 1,
      message: '检查数据库失败: ' + error.message,
      data: null
    }
  }
}