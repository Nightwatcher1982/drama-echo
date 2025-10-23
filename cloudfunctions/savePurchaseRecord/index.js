const cloud = require('wx-server-sdk')

// 初始化云开发环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { packId, purchaseType, amount, voiceId } = event
  const openid = cloud.getWXContext().OPENID
  
  try {
    console.log('保存购买记录:', { packId, purchaseType, amount, voiceId, openid })
    
    if (!openid) {
      return {
        code: -1,
        message: '用户未登录'
      }
    }

    if (!packId || !purchaseType || amount === undefined) {
      return {
        code: -1,
        message: '缺少必要参数'
      }
    }

    // 检查是否已存在相同的购买记录
    const existingQuery = {
      _openid: openid,
      packId: packId,
      purchaseType: purchaseType
    }
    
    if (purchaseType === 'individual' && voiceId) {
      existingQuery.voiceId = voiceId
    }
    
    const existingResult = await db.collection('user_purchases')
      .where(existingQuery)
      .get()
    
    if (existingResult.data.length > 0) {
      return {
        code: 0,
        message: '购买记录已存在'
      }
    }

    // 创建购买记录
    const purchaseRecord = {
      _openid: openid,
      packId: packId,
      purchaseType: purchaseType, // 'package' 或 'individual'
      voiceId: voiceId || null, // 单个购买时的语音ID
      amount: amount,
      purchaseTime: new Date(),
      status: 'completed' // 'pending', 'completed', 'refunded'
    }
    
    const result = await db.collection('user_purchases')
      .add({
        data: purchaseRecord
      })
    
    // 更新语音包销量
    if (purchaseType === 'package') {
      try {
        await db.collection('voicePacks')
          .doc(packId)
          .update({
            data: {
              sales: db.command.inc(1)
            }
          })
        console.log('销量更新成功:', packId)
      } catch (error) {
        console.error('销量更新失败:', error.message)
      }
    }
    
    return {
      code: 0,
      data: {
        _id: result._id,
        ...purchaseRecord
      },
      message: '购买记录保存成功'
    }
    
  } catch (error) {
    console.error('保存购买记录失败:', error)
    return {
      code: -1,
      message: error.message || '保存失败'
    }
  }
}
