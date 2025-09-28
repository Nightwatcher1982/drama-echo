const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const { zodiac } = event
  
  try {
    // 如果指定了星座，返回该星座的所有变体
    if (zodiac) {
      const result = await db.collection('zodiac_quotes')
        .where({
          zodiac: zodiac
        })
        .get()
      
      if (result.data.length === 0) {
        return {
          code: 1,
          message: `未找到星座 ${zodiac} 的数据`,
          data: null
        }
      }
      
      return {
        code: 0,
        message: '获取成功',
        data: result.data
      }
    }
    
    // 如果没有指定星座，返回所有星座数据
    const result = await db.collection('zodiac_quotes')
      .orderBy('zodiac', 'asc')
      .get()
    
    // 按星座分组
    const groupedData = {}
    result.data.forEach(item => {
      if (!groupedData[item.zodiac]) {
        groupedData[item.zodiac] = []
      }
      groupedData[item.zodiac].push(item)
    })
    
    return {
      code: 0,
      message: '获取成功',
      data: groupedData
    }
    
  } catch (error) {
    console.error('获取星座数据失败:', error)
    return {
      code: 1,
      message: '获取星座数据失败',
      data: null
    }
  }
}