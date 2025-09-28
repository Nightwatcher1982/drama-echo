const cloud = require('wx-server-sdk')

// 初始化云开发环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { action } = event
  
  try {
    console.log('语音包数据库初始化开始，action:', action)
    
    switch (action) {
      case 'createCollections':
        return await createCollections()
      case 'initSampleData':
        return await initSampleData()
      case 'checkStatus':
        return await checkDatabaseStatus()
      case 'deleteAll':
        return await deleteAllTestData()
      case 'deleteVoicePacks':
        return await deleteVoicePackData()
      default:
        return {
          code: 0,
          message: '语音包数据库初始化完成',
          data: {
            collections: await createCollections(),
            sampleData: await initSampleData()
          }
        }
    }
    
  } catch (error) {
    console.error('语音包数据库初始化失败:', error)
    return {
      code: -1,
      message: error.message || '初始化失败'
    }
  }
}

// 创建数据库集合
async function createCollections() {
  const collections = [
    {
      name: 'voice_packs',
      description: '语音包基本信息集合'
    },
    {
      name: 'voice_pack_photos',
      description: '语音包写真照片集合'
    },
    {
      name: 'voice_pack_voices',
      description: '语音包中的语音文件集合'
    },
    {
      name: 'bonus_videos',
      description: '花絮视频集合'
    },
    {
      name: 'user_purchases',
      description: '用户购买记录集合'
    }
  ]

  const results = []

  for (const collection of collections) {
    try {
      // 尝试创建集合（通过添加一个临时文档）
      await db.collection(collection.name).add({
        data: {
          _temp: true,
          createTime: new Date(),
          description: collection.description
        }
      })
      
      // 立即删除临时文档
      const tempDocs = await db.collection(collection.name).where({
        _temp: true
      }).get()
      
      if (tempDocs.data.length > 0) {
        await db.collection(collection.name).doc(tempDocs.data[0]._id).remove()
      }

      results.push({
        collection: collection.name,
        status: 'created',
        message: '集合创建成功'
      })

      console.log(`✅ 集合 ${collection.name} 创建成功`)

    } catch (error) {
      // 如果集合已存在，这是正常的
      if (error.errCode === -502005 || error.message.includes('exists')) {
        results.push({
          collection: collection.name,
          status: 'exists',
          message: '集合已存在'
        })
      } else {
        results.push({
          collection: collection.name,
          status: 'error',
          message: error.message
        })
      }
    }
  }

  return {
    code: 0,
    message: '数据库集合创建完成',
    data: results
  }
}

// 初始化示例数据
async function initSampleData() {
  try {
    const results = []
    
    // 初始化语音包数据
    results.push(await initVoicePacks())
    
    // 初始化语音包照片数据
    results.push(await initVoicePackPhotos())
    
    // 初始化语音文件数据
    results.push(await initVoicePackVoices())
    
    // 初始化花絮视频数据
    results.push(await initBonusVideos())
    
    return {
      code: 0,
      message: '示例数据初始化完成',
      data: results
    }
    
  } catch (error) {
    console.error('示例数据初始化失败:', error)
    return {
      code: -1,
      message: error.message || '示例数据初始化失败'
    }
  }
}

// 初始化语音包数据
async function initVoicePacks() {
  // 获取现有的演员ID和姓名
  let actorId = 'actor_001' // 默认值
  let actorName = '林晓雨' // 默认值
  try {
    const actorsResult = await db.collection('actors').get()
    if (actorsResult.data.length > 0) {
      actorId = actorsResult.data[0]._id
      actorName = actorsResult.data[0].name || '林晓雨'
      console.log('使用现有演员ID:', actorId, '姓名:', actorName)
    }
  } catch (error) {
    console.log('获取演员ID失败，使用默认值:', actorId)
  }
  
  const voicePacks = [
    {
      _id: 'pack_classic_001',
      actorId: actorId,
      name: '经典台词',
      category: '经典台词',
      description: `精选经典戏剧台词，由${actorName}老师深情演绎，让您感受戏剧的魅力与情感的力量。`,
      icon: '🌹',
      price: 1999, // 19.99元，以分为单位
      originalPrice: 2750, // 原价27.50元
      isHot: true,
      sales: 159,
      totalDuration: 510, // 总时长（秒）
      voiceCount: 3,
      isActive: true,
      createTime: new Date(),
      updateTime: new Date()
    }
  ]

  const results = []
  for (const pack of voicePacks) {
    try {
      await db.collection('voice_packs').add({ data: pack })
      results.push({ pack: pack.name, status: 'created' })
      console.log(`✅ 语音包 ${pack.name} 创建成功`)
    } catch (error) {
      if (error.errCode === -502003) {
        results.push({ pack: pack.name, status: 'exists' })
        console.log(`⚠️ 语音包 ${pack.name} 已存在`)
      } else {
        throw error
      }
    }
  }

  return {
    type: 'voice_packs',
    message: '语音包数据初始化完成',
    data: results
  }
}

// 初始化语音包照片数据
async function initVoicePackPhotos() {
  const photos = [
    {
      _id: 'photo_classic_001',
      packId: 'pack_classic_001',
      photoUrl: '/images/voice-packs/classic/photo1.jpg',
      description: '林晓雨经典台词拍摄现场',
      sortOrder: 1,
      createTime: new Date()
    },
    {
      _id: 'photo_classic_002',
      packId: 'pack_classic_001',
      photoUrl: '/images/voice-packs/classic/photo2.jpg',
      description: '戏剧舞台上的精彩瞬间',
      sortOrder: 2,
      createTime: new Date()
    },
    {
      _id: 'photo_classic_003',
      packId: 'pack_classic_001',
      photoUrl: '/images/voice-packs/classic/photo3.jpg',
      description: '幕后花絮照片',
      sortOrder: 3,
      createTime: new Date()
    },
    {
      _id: 'photo_birthday_001',
      packId: 'pack_birthday_001',
      photoUrl: '/images/voice-packs/birthday/photo1.jpg',
      description: '生日祝福拍摄花絮',
      sortOrder: 1,
      createTime: new Date()
    },
    {
      _id: 'photo_birthday_002',
      packId: 'pack_birthday_001',
      photoUrl: '/images/voice-packs/birthday/photo2.jpg',
      description: '温馨的拍摄现场',
      sortOrder: 2,
      createTime: new Date()
    }
  ]

  const results = []
  for (const photo of photos) {
    try {
      await db.collection('voice_pack_photos').add({ data: photo })
      results.push({ photo: photo.description, status: 'created' })
      console.log(`✅ 照片 ${photo.description} 创建成功`)
    } catch (error) {
      if (error.errCode === -502003) {
        results.push({ photo: photo.description, status: 'exists' })
      } else {
        throw error
      }
    }
  }

  return {
    type: 'voice_pack_photos',
    message: '语音包照片数据初始化完成',
    data: results
  }
}

// 初始化语音文件数据
async function initVoicePackVoices() {
  const voices = [
    // 经典台词语音包
    {
      _id: 'voice_classic_001',
      packId: 'pack_classic_001',
      title: '《雷雨》经典片段',
      subtitle: '四凤与周萍的对话',
      description: '曹禺经典话剧《雷雨》中的精彩对话片段',
      duration: 150, // 2分30秒
      price: 880, // 8.8元
      audioUrl: '/audio/classic/voice1.mp3',
      previewUrl: '/audio/classic/voice1_preview.mp3',
      fileSize: 2048000, // 2MB
      sortOrder: 1,
      isActive: true,
      createTime: new Date()
    },
    {
      _id: 'voice_classic_002',
      packId: 'pack_classic_001',
      title: '《茶馆》精彩选段',
      subtitle: '王利发的独白',
      description: '老舍经典话剧《茶馆》中王利发的经典独白',
      duration: 195, // 3分15秒
      price: 990, // 9.9元
      audioUrl: '/audio/classic/voice2.mp3',
      previewUrl: '/audio/classic/voice2_preview.mp3',
      fileSize: 2560000,
      sortOrder: 2,
      isActive: true,
      createTime: new Date()
    },
    {
      _id: 'voice_classic_003',
      packId: 'pack_classic_001',
      title: '《日出》感人台词',
      subtitle: '陈白露的心声',
      description: '曹禺话剧《日出》中陈白露的内心独白',
      duration: 165, // 2分45秒
      price: 880, // 8.8元
      audioUrl: '/audio/classic/voice3.mp3',
      previewUrl: '/audio/classic/voice3_preview.mp3',
      fileSize: 2200000,
      sortOrder: 3,
      isActive: true,
      createTime: new Date()
    },
    // 生日祝福语音包
    {
      _id: 'voice_birthday_001',
      packId: 'pack_birthday_001',
      title: '温馨生日祝福',
      subtitle: '特别的生日问候',
      description: '为您的生日送上最温馨的祝福',
      duration: 180,
      price: 699,
      audioUrl: '/audio/birthday/voice1.mp3',
      previewUrl: '/audio/birthday/voice1_preview.mp3',
      fileSize: 1800000,
      sortOrder: 1,
      isActive: true,
      createTime: new Date()
    },
    {
      _id: 'voice_birthday_002',
      packId: 'pack_birthday_001',
      title: '生日许愿',
      subtitle: '美好的生日愿望',
      description: '为您的生日许下美好的愿望',
      duration: 240,
      price: 699,
      audioUrl: '/audio/birthday/voice2.mp3',
      previewUrl: '/audio/birthday/voice2_preview.mp3',
      fileSize: 2400000,
      sortOrder: 2,
      isActive: true,
      createTime: new Date()
    }
  ]

  const results = []
  for (const voice of voices) {
    try {
      await db.collection('voice_pack_voices').add({ data: voice })
      results.push({ voice: voice.title, status: 'created' })
      console.log(`✅ 语音 ${voice.title} 创建成功`)
    } catch (error) {
      if (error.errCode === -502003) {
        results.push({ voice: voice.title, status: 'exists' })
      } else {
        throw error
      }
    }
  }

  return {
    type: 'voice_pack_voices',
    message: '语音文件数据初始化完成',
    data: results
  }
}

// 初始化花絮视频数据
async function initBonusVideos() {
  const videos = [
    {
      _id: 'bonus_classic_001',
      packId: 'pack_classic_001',
      title: '拍摄花絮：林晓雨的戏剧人生',
      description: '独家花絮视频，展现林晓雨老师在拍摄经典台词时的精彩瞬间',
      duration: 320, // 5分20秒
      videoUrl: '/video/classic/bonus.mp4',
      thumbnailUrl: 'https://picsum.photos/300/200?random=1',
      fileSize: 25600000, // 25MB
      isActive: true,
      createTime: new Date()
    },
    {
      _id: 'bonus_birthday_001',
      packId: 'pack_birthday_001',
      title: '生日祝福拍摄幕后',
      description: '温馨的生日祝福拍摄花絮，感受演员的用心',
      duration: 240,
      videoUrl: '/video/birthday/bonus.mp4',
      thumbnailUrl: 'https://picsum.photos/300/200?random=1',
      fileSize: 19200000,
      isActive: true,
      createTime: new Date()
    }
  ]

  const results = []
  for (const video of videos) {
    try {
      await db.collection('bonus_videos').add({ data: video })
      results.push({ video: video.title, status: 'created' })
      console.log(`✅ 花絮视频 ${video.title} 创建成功`)
    } catch (error) {
      if (error.errCode === -502003) {
        results.push({ video: video.title, status: 'exists' })
      } else {
        throw error
      }
    }
  }

  return {
    type: 'bonus_videos',
    message: '花絮视频数据初始化完成',
    data: results
  }
}

// 删除所有测试数据
async function deleteAllTestData() {
  const results = []
  
  try {
    // 1. 删除 voice_packs 集合中的所有数据
    const voicePacksResult = await db.collection('voice_packs').get()
    if (voicePacksResult.data.length > 0) {
      for (const doc of voicePacksResult.data) {
        await db.collection('voice_packs').doc(doc._id).remove()
      }
      results.push(`删除了 ${voicePacksResult.data.length} 个语音包文档`)
    }
    
    // 2. 删除 voice_pack_photos 集合中的所有数据
    const photosResult = await db.collection('voice_pack_photos').get()
    if (photosResult.data.length > 0) {
      for (const doc of photosResult.data) {
        await db.collection('voice_pack_photos').doc(doc._id).remove()
      }
      results.push(`删除了 ${photosResult.data.length} 个照片文档`)
    }
    
    // 3. 删除 voice_pack_voices 集合中的所有数据
    const voicesResult = await db.collection('voice_pack_voices').get()
    if (voicesResult.data.length > 0) {
      for (const doc of voicesResult.data) {
        await db.collection('voice_pack_voices').doc(doc._id).remove()
      }
      results.push(`删除了 ${voicesResult.data.length} 个语音文档`)
    }
    
    // 4. 删除 bonus_videos 集合中的所有数据
    const videosResult = await db.collection('bonus_videos').get()
    if (videosResult.data.length > 0) {
      for (const doc of videosResult.data) {
        await db.collection('bonus_videos').doc(doc._id).remove()
      }
      results.push(`删除了 ${videosResult.data.length} 个视频文档`)
    }
    
    // 5. 删除 user_purchases 集合中的所有数据
    const purchasesResult = await db.collection('user_purchases').get()
    if (purchasesResult.data.length > 0) {
      for (const doc of purchasesResult.data) {
        await db.collection('user_purchases').doc(doc._id).remove()
      }
      results.push(`删除了 ${purchasesResult.data.length} 个购买记录文档`)
    }
    
    return {
      code: 0,
      message: '测试数据删除成功',
      data: results
    }
    
  } catch (error) {
    throw new Error('删除数据时出错: ' + error.message)
  }
}

// 只删除语音包相关数据
async function deleteVoicePackData() {
  const results = []
  
  try {
    // 删除 voice_packs 集合中的数据
    const voicePacksResult = await db.collection('voice_packs').get()
    if (voicePacksResult.data.length > 0) {
      for (const doc of voicePacksResult.data) {
        await db.collection('voice_packs').doc(doc._id).remove()
      }
      results.push(`删除了 ${voicePacksResult.data.length} 个语音包文档`)
    }
    
    // 删除 voice_pack_voices 集合中的数据
    const voicesResult = await db.collection('voice_pack_voices').get()
    if (voicesResult.data.length > 0) {
      for (const doc of voicesResult.data) {
        await db.collection('voice_pack_voices').doc(doc._id).remove()
      }
      results.push(`删除了 ${voicesResult.data.length} 个语音文档`)
    }
    
    return {
      code: 0,
      message: '语音包测试数据删除成功',
      data: results
    }
    
  } catch (error) {
    throw new Error('删除语音包数据时出错: ' + error.message)
  }
}

// 检查数据库状态
async function checkDatabaseStatus() {
  const collections = ['voice_packs', 'voice_pack_photos', 'voice_pack_voices', 'bonus_videos', 'user_purchases']
  const status = {}

  for (const collectionName of collections) {
    try {
      const result = await db.collection(collectionName).count()
      status[collectionName] = {
        exists: true,
        count: result.total
      }
    } catch (error) {
      status[collectionName] = {
        exists: false,
        error: error.message
      }
    }
  }

  return {
    code: 0,
    message: '数据库状态检查完成',
    data: status
  }
}
