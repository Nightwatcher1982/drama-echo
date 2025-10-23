const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const { userId } = event
    
    // 验证参数
    if (!userId) {
      return {
        code: -1,
        message: '用户ID不能为空',
        data: null
      }
    }
    
    // 检查用户今天是否已经许愿
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const existingWish = await db.collection('wishes')
      .where({
        userId: userId,
        createdAt: db.command.gte(today).and(db.command.lt(tomorrow))
      })
      .get()
    
    const canWish = existingWish.data.length === 0
    
    return {
      code: 0,
      message: '检查许愿权限成功',
      data: {
        canWish: canWish,
        todayWishCount: existingWish.data.length
      }
    }
    
  } catch (error) {
    console.error('检查许愿权限失败:', error)
    return {
      code: -1,
      message: '检查许愿权限失败: ' + error.message,
      data: null
    }
  }
}



