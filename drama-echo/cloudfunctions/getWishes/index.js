const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const { page = 1, pageSize = 10 } = event
    
    // 计算跳过的数量
    const skip = (page - 1) * pageSize
    
    // 获取许愿列表，按愿力降序排列
    const result = await db.collection('wishes')
      .where({
        status: 'active'
      })
      .orderBy('wishCount', 'desc')
      .orderBy('createdAt', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get()
    
    // 获取总数
    const countResult = await db.collection('wishes')
      .where({
        status: 'active'
      })
      .count()
    
    const total = countResult.total
    const totalPages = Math.ceil(total / pageSize)
    
    return {
      code: 0,
      message: '获取许愿列表成功',
      data: {
        wishes: result.data,
        total: total,
        totalPages: totalPages,
        currentPage: page
      }
    }
    
  } catch (error) {
    console.error('获取许愿列表失败:', error)
    return {
      code: -1,
      message: '获取许愿列表失败: ' + error.message,
      data: null
    }
  }
}



