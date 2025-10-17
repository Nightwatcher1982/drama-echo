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
    
    // 如果userId是'current'，使用当前用户的openid
    let targetUserId = userId
    if (userId === 'current') {
      // 使用标准的获取openid方法
      const { OPENID } = cloud.getWXContext()
      targetUserId = OPENID
      console.log('获取当前用户openid:', targetUserId)
    }
    
    if (!targetUserId) {
      console.log('❌ 无法获取用户openid')
      return {
        code: -1,
        message: '无法获取用户身份信息，请重新登录'
      }
    }
    
    // 查询用户购买记录
    // 先尝试从新集合查询
    let result = await db.collection('user_purchases')
      .where({
        _openid: targetUserId, // 使用 _openid 字段
        status: 'completed' // 只获取已完成的购买记录
      })
      .orderBy('purchaseTime', 'desc')
      .get()
    
    console.log('新集合用户购买记录:', result.data.length, '条')
    
    // 如果新集合没有数据，从旧集合查询
    if (result.data.length === 0) {
      console.log('新集合无数据，从旧集合查询')
      result = await db.collection('userPurchases')
        .where({
          _openid: targetUserId
        })
        .orderBy('purchaseTime', 'desc')
        .get()
      console.log('旧集合用户购买记录:', result.data.length, '条')
    }
    
    // 获取语音包详细信息
    const purchases = []
    for (const purchase of result.data) {
      try {
        // 根据集合类型获取语音包ID
        const packId = purchase.packId || purchase.voicePackId
        if (!packId) continue
        
        // 获取语音包信息
        const packResult = await db.collection('voicePacks').doc(packId).get()
        
        if (packResult.data) {
          purchases.push({
            purchaseId: purchase._id,
            packId: packId,
            packName: packResult.data.name,
            packIcon: packResult.data.icon,
            purchaseTime: purchase.purchaseTime,
            status: purchase.status
          })
        }
      } catch (error) {
        console.error('获取语音包信息失败:', purchase.packId || purchase.voicePackId, error)
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
