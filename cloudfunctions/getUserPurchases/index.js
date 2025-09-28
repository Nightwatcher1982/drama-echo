const cloud = require('wx-server-sdk')

// 初始化云开发环境
cloud.init({
  env: 'cloud1-2gyb3dkq4c474fe4'
})

const db = cloud.database()

// 主函数
exports.main = async (event, context) => {
  const { userId } = event
  
  try {
    console.log('获取用户购买记录:', { userId })
    
    if (!userId) {
      return {
        code: -1,
        message: '用户ID不能为空'
      }
    }
    
    // 查询用户购买记录
    const result = await db.collection('user_purchases')
      .where({
        userId: userId,
        status: 'active' // 只获取有效的购买记录
      })
      .orderBy('purchaseTime', 'desc')
      .get()
    
    // 获取语音包详细信息
    const purchases = []
    for (const purchase of result.data) {
      try {
        // 获取语音包信息
        const packResult = await db.collection('voicePacks').doc(purchase.packId).get()
        if (packResult.data) {
          purchases.push({
            purchaseId: purchase._id,
            packId: purchase.packId,
            packName: packResult.data.name,
            packIcon: packResult.data.icon,
            purchaseTime: purchase.purchaseTime,
            status: purchase.status
          })
        }
      } catch (error) {
        console.error('获取语音包信息失败:', purchase.packId, error)
      }
    }
    
    return {
      code: 0,
      message: '获取购买记录成功',
      data: {
        purchases: purchases
      }
    }
    
  } catch (error) {
    console.error('获取用户购买记录失败:', error)
    return {
      code: -1,
      message: '获取用户购买记录失败: ' + error.message
    }
  }
}
