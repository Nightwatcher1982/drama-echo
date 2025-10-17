const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const { wishId, userId } = event
    
    // 验证参数
    if (!wishId || !userId) {
      return {
        code: -1,
        message: '参数不完整',
        data: null
      }
    }
    
    // 检查许愿是否存在
    const wishResult = await db.collection('wishes')
      .doc(wishId)
      .get()
    
    if (!wishResult.data) {
      return {
        code: -1,
        message: '许愿不存在',
        data: null
      }
    }
    
    // 检查用户是否已经点赞过这个许愿
    const existingLike = await db.collection('wish_likes')
      .where({
        wishId: wishId,
        userId: userId
      })
      .get()
    
    if (existingLike.data.length > 0) {
      return {
        code: -1,
        message: '已经点过赞了',
        data: null
      }
    }
    
    // 开始事务
    const transaction = await db.startTransaction()
    
    try {
      // 添加点赞记录
      await transaction.collection('wish_likes').add({
        data: {
          wishId: wishId,
          userId: userId,
          createdAt: new Date()
        }
      })
      
      // 更新许愿的愿力数量
      await transaction.collection('wishes').doc(wishId).update({
        data: {
          wishCount: db.command.inc(1)
        }
      })
      
      // 提交事务
      await transaction.commit()
      
      return {
        code: 0,
        message: '点赞成功',
        data: {
          wishId: wishId,
          newWishCount: wishResult.data.wishCount + 1
        }
      }
      
    } catch (transactionError) {
      // 回滚事务
      await transaction.rollback()
      throw transactionError
    }
    
  } catch (error) {
    console.error('点赞许愿失败:', error)
    return {
      code: -1,
      message: '点赞许愿失败: ' + error.message,
      data: null
    }
  }
}



