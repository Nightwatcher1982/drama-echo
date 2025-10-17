const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const { content, userId, userName, userAvatar } = event
    
    // 验证参数
    if (!content || !userId) {
      return {
        code: -1,
        message: '参数不完整',
        data: null
      }
    }
    
    // 检查内容长度
    if (content.length > 30) {
      return {
        code: -1,
        message: '许愿内容不能超过30字',
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
    
    if (existingWish.data.length > 0) {
      return {
        code: -1,
        message: '今天已经许过愿了',
        data: null
      }
    }
    
    // 创建许愿
    const wishData = {
      content: content.trim(),
      userId: userId,
      userName: userName || '匿名用户',
      userAvatar: userAvatar || '',
      wishCount: 0,
      createdAt: new Date(),
      status: 'active'
    }
    
    const result = await db.collection('wishes').add({
      data: wishData
    })
    
    return {
      code: 0,
      message: '许愿成功',
      data: {
        wishId: result._id,
        wish: wishData
      }
    }
    
  } catch (error) {
    console.error('创建许愿失败:', error)
    return {
      code: -1,
      message: '创建许愿失败: ' + error.message,
      data: null
    }
  }
}



