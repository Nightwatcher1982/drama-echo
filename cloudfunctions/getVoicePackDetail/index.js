const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloud1-2gyb3dkq4c474fe4'
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { packId } = event
  
  try {
    console.log('获取语音包详情，packId:', packId)
    
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
    
    // 获取演员信息
    const actorResult = await db.collection('actors').doc(packData.actorId).get()
    const actorData = actorResult.data || {}
    
    // 处理语音文件
    const voices = (packData.voiceFiles || []).map((file, index) => ({
      title: file.name || `语音${index + 1}`,
      subtitle: file.description || '',
      duration: '2:30', // 默认时长
      price: Math.floor((packData.price || 1999) / (packData.voiceFiles.length || 2)),
      canPreview: true,
      purchased: false,
      audioUrl: file.fileId || '',
      previewUrl: file.fileId || '',
      voiceId: `voice_${packId}_${index}`
    }))
    
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
      } else if (typeof actorData.avatar === 'string' && actorData.avatar.length > 0 && !actorData.avatar.includes('👤')) {
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
      packagePurchased: false,
      bonusVideoThumb: packData.bonusVideoThumb || 'https://picsum.photos/300/200?random=1',
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
