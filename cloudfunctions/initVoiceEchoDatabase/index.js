const cloud = require('wx-server-sdk')

// 初始化 cloud
cloud.init({ env: 'cloud1-2gyb3dkq4c474fe4' })

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { action } = event

  try {
    console.log('初始化戏剧回响数据库，操作:', action)

    switch (action) {
      case 'createCollections':
        return await createCollections()
      case 'initSampleData':
        return await initSampleData()
      case 'checkDatabase':
        return await checkDatabase()
      case 'fullInit':
        // 完整初始化：创建集合 + 初始化数据
        const createRes = await createCollections()
        if (createRes.code === 0) {
          const initRes = await initSampleData()
          return initRes
        }
        return createRes
      default:
        return {
          code: -1,
          message: '无效的操作类型'
        }
    }

  } catch (error) {
    console.error('初始化数据库失败:', error)
    return {
      code: -1,
      message: error.message || '初始化失败',
      data: null
    }
  }
}

// 检查数据库集合状态
async function checkDatabase() {
  const collections = ['actors', 'voicePacks', 'fanRanking', 'orders', 'userPurchases']
  const status = {}

  for (const collectionName of collections) {
    try {
      const result = await db.collection(collectionName).limit(1).get()
      status[collectionName] = {
        exists: true,
        count: result.data.length
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

// 创建数据库集合
async function createCollections() {
  const collections = [
    {
      name: 'actors',
      description: '演员信息集合'
    },
    {
      name: 'voicePacks',
      description: '语音包集合'
    },
    {
      name: 'fanRanking',
      description: '粉丝排行榜集合'
    },
    {
      name: 'orders',
      description: '订单集合'
    },
    {
      name: 'userPurchases',
      description: '用户购买记录集合'
    },
    {
      name: 'voicePlayLogs',
      description: '语音播放日志集合'
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
    message: '数据库集合初始化完成',
    data: results
  }
}

// 初始化示例数据
async function initSampleData() {
  try {
    // 1. 初始化演员数据
    const actorsResult = await initActors()
    console.log('演员数据初始化结果:', actorsResult)

    // 2. 初始化语音包数据
    const voicePacksResult = await initVoicePacks()
    console.log('语音包数据初始化结果:', voicePacksResult)

    // 3. 初始化粉丝排行榜数据
    const fanRankingResult = await initFanRanking()
    console.log('粉丝排行榜数据初始化结果:', fanRankingResult)

    return {
      code: 0,
      message: '示例数据初始化完成',
      data: {
        actors: actorsResult,
        voicePacks: voicePacksResult,
        fanRanking: fanRankingResult
      }
    }

  } catch (error) {
    console.error('初始化示例数据失败:', error)
    return {
      code: -1,
      message: '初始化示例数据失败: ' + error.message
    }
  }
}

// 初始化演员数据
async function initActors() {
  const sampleActors = [
    {
      _id: 'actor_001',
      name: '李雨萱',
      avatar: '🌸',
      title: '古典戏剧表演艺术家',
      description: '专攻昆曲与京剧，声线清澈如山泉，情感细腻动人。代表作品《牡丹亭》、《长生殿》，被誉为"江南第一青衣"。',
      tags: ['昆曲', '京剧', '古典'],
      stats: {
        voicePackCount: 3,
        guardianCount: 128,
        totalSales: 256
      },
      isHot: true,
      createTime: new Date(),
      updateTime: new Date()
    },
    {
      _id: 'actor_002',
      name: '陈墨轩',
      avatar: '🎭',
      title: '现代话剧演员',
      description: '擅长现代话剧与音乐剧，声音磁性富有层次，情感表达直击人心。主演《雷雨》、《茶馆》等经典作品。',
      tags: ['话剧', '音乐剧', '现代'],
      stats: {
        voicePackCount: 4,
        guardianCount: 95,
        totalSales: 189
      },
      isHot: true,
      createTime: new Date(),
      updateTime: new Date()
    },
    {
      _id: 'actor_003',
      name: '苏婉清',
      avatar: '🌙',
      title: '越剧名伶',
      description: '越剧花旦，嗓音甜美如银铃，表演婉约动人。精通《红楼梦》、《西厢记》等经典剧目，深受观众喜爱。',
      tags: ['越剧', '花旦', '经典'],
      stats: {
        voicePackCount: 2,
        guardianCount: 76,
        totalSales: 152
      },
      isHot: false,
      createTime: new Date(),
      updateTime: new Date()
    }
  ]

  const results = []
  for (const actor of sampleActors) {
    try {
      // 检查是否已存在
      const existing = await db.collection('actors').doc(actor._id).get()
      if (existing.data) {
        results.push({ id: actor._id, status: 'exists' })
        continue
      }
    } catch (error) {
      // 文档不存在，继续创建
    }

    try {
      await db.collection('actors').doc(actor._id).set({
        data: actor
      })
      results.push({ id: actor._id, status: 'created' })
    } catch (error) {
      results.push({ id: actor._id, status: 'error', message: error.message })
    }
  }

  return results
}

// 初始化语音包数据
async function initVoicePacks() {
  const sampleVoicePacks = [
    // 李雨萱的语音包
    {
      _id: 'pack_001',
      actorId: 'actor_001',
      name: '昆曲经典选段',
      icon: '🎵',
      description: '收录《牡丹亭·游园》、《长生殿·情殇》等经典选段，感受古典昆曲的韵律之美。',
      price: 2999, // 29.99元，以分为单位
      originalPrice: 3999,
      tags: ['昆曲', '经典', '古风'],
      isHot: true,
      sales: 89,
      voiceFiles: [
        {
          name: '牡丹亭·游园',
          fileName: 'mudan_youyuan.mp3',
          fileId: 'voice_file_001', // 实际应该是云存储的fileId
          duration: 180,
          size: 2048000
        },
        {
          name: '长生殿·情殇',
          fileName: 'changsheng_qishang.mp3', 
          fileId: 'voice_file_002',
          duration: 240,
          size: 2560000
        }
      ],
      createTime: new Date(),
      updateTime: new Date()
    },
    {
      _id: 'pack_002',
      actorId: 'actor_001',
      name: '诗词朗诵专辑',
      icon: '📜',
      description: '用昆曲唱腔演绎经典诗词，包含《春江花月夜》、《锦瑟》等名篇，诗韵悠长。',
      price: 1999,
      originalPrice: 2599,
      tags: ['诗词', '朗诵', '文学'],
      isHot: false,
      sales: 67,
      voiceFiles: [
        {
          name: '春江花月夜',
          fileName: 'chunjiang_huayueye.mp3',
          fileId: 'voice_file_003',
          duration: 300,
          size: 3200000
        }
      ],
      createTime: new Date(),
      updateTime: new Date()
    },
    // 陈墨轩的语音包
    {
      _id: 'pack_003',
      actorId: 'actor_002',
      name: '话剧经典台词',
      icon: '🎭',
      description: '收录《雷雨》、《茶馆》等经典话剧的精彩片段，感受话剧艺术的魅力。',
      price: 2499,
      originalPrice: 2999,
      tags: ['话剧', '台词', '经典'],
      isHot: true,
      sales: 112,
      voiceFiles: [
        {
          name: '雷雨·周萍独白',
          fileName: 'leiyu_zhouping.mp3',
          fileId: 'voice_file_004',
          duration: 150,
          size: 1920000
        },
        {
          name: '茶馆·王利发',
          fileName: 'chaguan_wanglife.mp3',
          fileId: 'voice_file_005',
          duration: 180,
          size: 2304000
        }
      ],
      createTime: new Date(),
      updateTime: new Date()
    }
  ]

  const results = []
  for (const pack of sampleVoicePacks) {
    try {
      // 检查是否已存在
      const existing = await db.collection('voicePacks').doc(pack._id).get()
      if (existing.data) {
        results.push({ id: pack._id, status: 'exists' })
        continue
      }
    } catch (error) {
      // 文档不存在，继续创建
    }

    try {
      await db.collection('voicePacks').doc(pack._id).set({
        data: pack
      })
      results.push({ id: pack._id, status: 'created' })
    } catch (error) {
      results.push({ id: pack._id, status: 'error', message: error.message })
    }
  }

  return results
}

// 初始化粉丝排行榜数据
async function initFanRanking() {
  const sampleRankings = [
    {
      _id: 'ranking_001',
      actorId: 'actor_001',
      openid: 'sample_user_001',
      userInfo: {
        nickName: '戏曲爱好者',
        avatarUrl: ''
      },
      purchaseCount: 3,
      totalAmount: 8997,
      starCount: 5,
      level: '钻石守护者',
      lastPurchaseTime: new Date(),
      createTime: new Date(),
      updateTime: new Date()
    },
    {
      _id: 'ranking_002', 
      actorId: 'actor_001',
      openid: 'sample_user_002',
      userInfo: {
        nickName: '昆曲迷',
        avatarUrl: ''
      },
      purchaseCount: 2,
      totalAmount: 4998,
      starCount: 4,
      level: '黄金守护者',
      lastPurchaseTime: new Date(),
      createTime: new Date(),
      updateTime: new Date()
    }
  ]

  const results = []
  for (const ranking of sampleRankings) {
    try {
      await db.collection('fanRanking').add({
        data: ranking
      })
      results.push({ id: ranking._id, status: 'created' })
    } catch (error) {
      results.push({ id: ranking._id, status: 'error', message: error.message })
    }
  }

  return results
}