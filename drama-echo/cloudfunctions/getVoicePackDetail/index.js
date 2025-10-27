const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloud1-2gyb3dkq4c474fe4'
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { packId } = event
  const { OPENID } = cloud.getWXContext()
  
  try {
    console.log('获取语音包详情，packId:', packId, '用户:', OPENID)
    
    if (!packId) {
      return {
        code: -1,
        message: '缺少packId参数'
      }
    }

    // 直接查询 voicePacks 集合
    const packResult = await db.collection('voicePacks').doc(packId).get()
    
    if (!packResult.data) {
      return {
        code: -1,
        message: '语音包不存在'
      }
    }

    const packData = packResult.data
    console.log('找到语音包:', packData.name)
    
    // 检查用户是否已购买此语音包
    let isPurchased = false
    if (OPENID) {
      try {
        // 先尝试从新集合查询
        const newPurchaseResult = await db.collection('user_purchases')
          .where({
            _openid: OPENID,
            packId: packId,
            status: 'completed'
          })
          .get()
        
        console.log('新集合购买记录:', newPurchaseResult.data.length, '条')
        
        if (newPurchaseResult.data.length > 0) {
          isPurchased = true
        } else {
          // 如果新集合没有数据，从旧集合查询
          const oldPurchaseResult = await db.collection('userPurchases')
            .where({
              _openid: OPENID,
              voicePackId: packId
            })
            .get()
          
          console.log('旧集合购买记录:', oldPurchaseResult.data.length, '条')
          isPurchased = oldPurchaseResult.data.length > 0
        }
      } catch (error) {
        console.error('检查购买状态失败:', error)
        isPurchased = false
      }
    }
    
    console.log('用户购买状态:', isPurchased)
    
    // 获取演员信息
    const actorResult = await db.collection('actors').doc(packData.actorId).get()
    const actorData = actorResult.data || {}
    
    // 处理语音文件
    const voices = (packData.voiceFiles || []).map((file, index) => {
      // 格式化时长：如果duration是数字（秒），转换为分:秒格式
      let formattedDuration = '0:00'
      if (file.duration) {
        if (typeof file.duration === 'number') {
          const minutes = Math.floor(file.duration / 60)
          const seconds = file.duration % 60
          formattedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`
        } else if (typeof file.duration === 'string') {
          // 如果已经是字符串格式，直接使用
          formattedDuration = file.duration
        }
      }
      
      // 过滤掉包含"bgm的原作者"的description内容
      let cleanDescription = file.description || ''
      if (cleanDescription.includes('bgm的原作者') || cleanDescription.includes('Audionautix')) {
        cleanDescription = ''
      }
      
      return {
        title: file.name || `语音${index + 1}`,
        subtitle: cleanDescription,
        duration: formattedDuration,
        price: Math.floor((packData.price || 1999) / (packData.voiceFiles.length || 2)),
        canPreview: true,
        purchased: false,
        audioUrl: file.fileId || '',
        previewUrl: file.fileId || '',
        voiceId: `voice_${packId}_${index}`
      }
    })
    
    // 处理演员头像 - 优先使用 imageUrl 字段
    let actorAvatar = 'https://picsum.photos/200/200?random=2' // 默认占位图片
    
    // 优先使用 imageUrl 字段（真实的图片路径）
    if (actorData.imageUrl && typeof actorData.imageUrl === 'string' && actorData.imageUrl.length > 0) {
      actorAvatar = actorData.imageUrl
    }
    // 如果没有 imageUrl，尝试使用 avatar 字段
    else if (actorData.avatar) {
      if (typeof actorData.avatar === 'string' && actorData.avatar.startsWith('http')) {
        // HTTP URL
        actorAvatar = actorData.avatar
      } else if (typeof actorData.avatar === 'string' && actorData.avatar.startsWith('cloud://')) {
        // 云存储路径
        actorAvatar = actorData.avatar
      } else if (typeof actorData.avatar === 'string' && actorData.avatar.length > 0 && !actorData.avatar.includes('头像')) {
        // 其他有效路径
        actorAvatar = actorData.avatar
      }
    }
    
    console.log('演员头像处理:', {
      avatar: actorData.avatar,
      imageUrl: actorData.imageUrl,
      processed: actorAvatar
    })
    
    // 构建返回数据
    const result = {
      _id: packData._id,
      name: packData.name,
      actorId: packData.actorId, // 添加演员ID字段
      actorName: actorData.name || '未知演员',
      actorAvatar: actorAvatar,
      actorTitle: actorData.title || '戏剧演员',
      category: packData.category || '经典台词',
      description: packData.description || '',
      images: packData.images || [], // 使用真实的图片数据
      voices: voices,
      totalDuration: '5分钟',
      voiceCount: voices.length,
      salesCount: packData.sales || 0,
      originalPrice: packData.originalPrice || packData.price || 1999,
      packagePrice: packData.price || 1999,
      saveAmount: (packData.originalPrice || packData.price || 1999) - (packData.price || 1999),
      packagePurchased: isPurchased,
      isPurchased: isPurchased,
      bonusVideoThumb: packData.bonusVideoCoverUploaded && packData.bonusVideoThumb 
        ? packData.bonusVideoThumb 
        : 'https://picsum.photos/300/200?random=1',
      bonusVideoTitle: packData.bonusVideoTitle || '拍摄花絮',
      bonusVideoDuration: packData.bonusVideoDuration || '3:20',
      bonusVideoUrl: packData.bonusVideoUrl || ''
    }
    
    console.log('返回数据:', {
      name: result.name,
      actorName: result.actorName,
      voiceCount: result.voiceCount
    })
    
    return {
      code: 0,
      data: result,
      message: '获取成功'
    }
    
  } catch (error) {
    console.error('获取语音包详情失败:', error)
    return {
      code: -1,
      message: error.message || '获取失败'
    }
  }
}

// 简化版云函数，直接返回数据
