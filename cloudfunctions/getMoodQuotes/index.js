const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const { mood, category } = event
  
  try {
    let query = db.collection('mood_quotes')
    
    // 如果指定了心情，返回该心情的所有变体
    if (mood) {
      query = query.where({
        mood: mood
      })
    }
    
    // 如果指定了分类，添加分类筛选
    if (category) {
      query = query.where({
        category: category
      })
    }
    
    const result = await query.get()
    
    if (mood && result.data.length === 0) {
      return {
        code: 1,
        message: `未找到心情 ${mood} 的数据`,
        data: null
      }
    }
    
    // 如果指定了心情，直接返回数组
    if (mood) {
      return {
        code: 0,
        message: '获取成功',
        data: result.data
      }
    }
    
    // 如果没有指定心情，按心情分组返回
    const groupedData = {}
    result.data.forEach(item => {
      if (!groupedData[item.mood]) {
        groupedData[item.mood] = []
      }
      groupedData[item.mood].push(item)
    })
    
    return {
      code: 0,
      message: '获取成功',
      data: groupedData
    }
    
  } catch (error) {
    console.error('获取心情数据失败:', error)
    return {
      code: 1,
      message: '获取心情数据失败',
      data: null
    }
  }
}