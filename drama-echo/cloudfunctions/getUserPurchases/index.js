const cloud = require('wx-server-sdk')

// 初始化云开发环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 主函数
exports.main = async (event, context) => {
  const { userId } = event
  
  try {
    // 如果userId是'current'，使用当前用户的openid
    let targetUserId = userId
    if (userId === 'current') {
      const { OPENID } = cloud.getWXContext()
      targetUserId = OPENID
    }
    
    if (!targetUserId) {
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
    
    // 如果新集合没有数据，从旧集合查询
    if (result.data.length === 0) {
      result = await db.collection('userPurchases')
        .where({
          _openid: targetUserId
        })
        .orderBy('purchaseTime', 'desc')
        .get()
    }
    
    // 获取语音包详细信息并合并相同语音包的购买记录
    const packMap = new Map() // 用于合并相同语音包的购买记录
    
    // 先收集所有需要查询的ID，避免循环查询
    const packIds = [...new Set(result.data.map(p => p.packId || p.voicePackId).filter(Boolean))]
    const packDataMap = new Map()
    const actorDataMap = new Map()
    
    // 批量查询语音包信息
    if (packIds.length > 0) {
      try {
        const packResults = await db.collection('voicePacks')
          .where({
            _id: db.command.in(packIds)
          })
          .field({
            _id: true,
            name: true,
            actorId: true,
            images: true,
            coverImage: true,
            icon: true,
            imageUrl: true
          })
          .get()
        
        packResults.data.forEach(pack => {
          packDataMap.set(pack._id, pack)
        })
        
        // 批量查询演员信息
        const actorIds = [...new Set(packResults.data.map(p => p.actorId).filter(Boolean))]
        if (actorIds.length > 0) {
          const actorResults = await db.collection('actors')
            .where({
              _id: db.command.in(actorIds)
            })
            .field({
              _id: true,
              name: true,
              avatar: true
            })
            .get()
          
          actorResults.data.forEach(actor => {
            actorDataMap.set(actor._id, actor)
          })
        }
      } catch (error) {
        // 批量查询失败，继续处理
      }
    }
    
    for (const purchase of result.data) {
      try {
        // 根据集合类型获取语音包ID
        const packId = purchase.packId || purchase.voicePackId
        if (!packId) continue
        
        // 如果已经处理过这个语音包，直接增加购买份数
        if (packMap.has(packId)) {
          const existingPack = packMap.get(packId)
          existingPack.purchaseCount += 1
          // 更新最新购买时间
          if (new Date(purchase.purchaseTime) > new Date(existingPack.purchaseTime)) {
            existingPack.purchaseTime = purchase.purchaseTime
          }
          continue
        }
        
        // 从批量查询结果中获取语音包信息
        const packData = packDataMap.get(packId)
        
        if (packData) {
          // 从批量查询结果中获取演员信息
          let actorName = '未知演员'
          let actorAvatar = '🎭'
          
          if (packData.actorId) {
            const actorData = actorDataMap.get(packData.actorId)
            if (actorData) {
              actorName = actorData.name || '未知演员'
              actorAvatar = actorData.avatar || '🎭'
            }
          }
          
          // 获取语音包的第一个图片
          let packImage = null
          console.log('语音包数据:', {
            name: packData.name,
            images: packData.images,
            coverImage: packData.coverImage,
            icon: packData.icon,
            imageUrl: packData.imageUrl
          })
          
          // 按优先级获取图片
          if (packData.images && Array.isArray(packData.images) && packData.images.length > 0) {
            packImage = packData.images[0]
            console.log('使用images数组第一张图片:', packImage)
          } else if (packData.imageUrl && typeof packData.imageUrl === 'string' && packData.imageUrl.length > 0) {
            packImage = packData.imageUrl
            console.log('使用imageUrl字段:', packImage)
          } else if (packData.coverImage && typeof packData.coverImage === 'string' && packData.coverImage.length > 0) {
            packImage = packData.coverImage
            console.log('使用coverImage字段:', packImage)
          } else if (packData.icon && typeof packData.icon === 'string' && packData.icon.startsWith('http')) {
            packImage = packData.icon
            console.log('使用icon字段(HTTP):', packImage)
          } else if (packData.icon && typeof packData.icon === 'string' && packData.icon.startsWith('cloud://')) {
            packImage = packData.icon
            console.log('使用icon字段(云存储):', packImage)
          }
          
          console.log('最终选择的图片:', packImage)
          
          packMap.set(packId, {
            purchaseId: purchase._id,
            packId: packId,
            packName: packData.name,
            packIcon: packData.icon,
            packImage: packImage, // 语音包的第一个图片
            actorName: actorName,
            actorAvatar: actorAvatar,
            purchaseTime: purchase.purchaseTime,
            status: purchase.status,
            purchaseCount: 1 // 购买份数
          })
        }
      } catch (error) {
        console.error('获取语音包信息失败:', purchase.packId || purchase.voicePackId, error)
      }
    }
    
    // 将Map转换为数组并按购买时间排序
    const purchases = Array.from(packMap.values()).sort((a, b) => 
      new Date(b.purchaseTime) - new Date(a.purchaseTime)
    )
    
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
