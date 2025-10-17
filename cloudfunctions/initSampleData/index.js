// 初始化戏剧回响示例数据云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 管理员OpenID列表（从错误日志中看到的实际OpenID）
const adminOpenIds = [
  'o1JKg5VC5Fe27QBwNZ2d0DPyKImU', // 从日志中看到的当前用户OpenID
  'admin_openid_2' // 可添加多个管理员
]

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  
  // 验证管理员权限
  if (!adminOpenIds.includes(OPENID)) {
    return {
      code: -1,
      message: '无权限执行此操作'
    }
  }
  
  try {
    console.log('开始初始化示例数据...')
    
    // 1. 清空现有数据（可选）
    if (event.clearData) {
      await clearExistingData()
    }
    
    // 2. 插入演员数据
    await insertActors()
    
    // 3. 插入语音包数据
    await insertVoicePacks()
    
    // 4. 插入粉丝排行榜数据
    await insertFanRanking()
    
    console.log('示例数据初始化完成')
    
    return {
      code: 0,
      message: '示例数据初始化成功',
      data: {
        actors: 4,
        voicePacks: 7,
        fanRanking: 5
      }
    }
    
  } catch (error) {
    console.error('初始化示例数据失败:', error)
    return {
      code: -1,
      message: error.message || '初始化失败'
    }
  }
}

// 清空现有数据
async function clearExistingData() {
  console.log('清空现有数据...')
  
  // 获取所有现有记录并删除
  const collections = ['actors', 'voicePacks', 'fanRanking']
  
  for (const collectionName of collections) {
    const result = await db.collection(collectionName).get()
    if (result.data && result.data.length > 0) {
      const deletePromises = result.data.map(doc => 
        db.collection(collectionName).doc(doc._id).remove()
      )
      await Promise.all(deletePromises)
      console.log(`清空集合 ${collectionName}，删除 ${result.data.length} 条记录`)
    }
  }
}

// 插入演员数据
async function insertActors() {
  console.log('插入演员数据...')
  
  const actors = [
    {
      _id: "actor_001",
      name: "林晓雨",
      englishName: "Lin Xiaoyu",
      avatar: "林",
      title: "国家一级演员",
      description: "《红玫瑰与白玫瑰》主演，擅长现代都市情感剧，声音温婉动人，被誉为话剧界的'声音女神'",
      status: "online",
      tags: ["热门"],
      stats: {
        guardianCount: 247,
        voicePackCount: 4,
        totalSales: 156
      },
      slideColor: "slide1",
      sortOrder: 1,
      isActive: true,
      createTime: new Date(),
      updateTime: new Date()
    },
    {
      _id: "actor_002",
      name: "王子豪",
      englishName: "Wang Zihao",
      avatar: "王",
      title: "音乐剧王子",
      description: "百老汇归来音乐剧演员，《猫》《歌剧魅影》中文版主演，声音磁性富有感染力",
      status: "offline",
      tags: [],
      stats: {
        guardianCount: 189,
        voicePackCount: 3,
        totalSales: 89
      },
      slideColor: "slide2",
      sortOrder: 2,
      isActive: true,
      createTime: new Date(),
      updateTime: new Date()
    },
    {
      _id: "actor_003",
      name: "张小曼",
      englishName: "Zhang Xiaoman",
      avatar: "张",
      title: "青年实力派",
      description: "中央戏剧学院毕业，青年艺术剧院主力演员，新生代代表，声音清澈纯净",
      status: "online",
      tags: ["新人"],
      stats: {
        guardianCount: 156,
        voicePackCount: 2,
        totalSales: 67
      },
      slideColor: "slide3",
      sortOrder: 3,
      isActive: true,
      createTime: new Date(),
      updateTime: new Date()
    },
    {
      _id: "actor_004",
      name: "李文强",
      englishName: "Li Wenqiang",
      avatar: "李",
      title: "相声新秀",
      description: "德云社青年相声演员，擅长传统相声和现代幽默表演，语言风趣幽默",
      status: "offline",
      tags: [],
      stats: {
        guardianCount: 134,
        voicePackCount: 3,
        totalSales: 45
      },
      slideColor: "slide4",
      sortOrder: 4,
      isActive: true,
      createTime: new Date(),
      updateTime: new Date()
    }
  ]
  
  for (const actor of actors) {
    try {
      await db.collection('actors').add({
        data: actor
      })
      console.log(`插入演员: ${actor.name}`)
    } catch (error) {
      if (error.errCode === -502002) {
        // 记录已存在，更新它
        await db.collection('actors').doc(actor._id).set({
          data: actor
        })
        console.log(`更新演员: ${actor.name}`)
      } else {
        throw error
      }
    }
  }
}

// 插入语音包数据
async function insertVoicePacks() {
  console.log('插入语音包数据...')
  
  const voicePacks = [
    // 林晓雨的语音包
    {
      _id: "pack_001",
      actorId: "actor_001",
      name: "经典台词",
      icon: "🌹",
      price: 6800,
      description: "经典戏剧台词合集，重温经典之美",
      isHot: true,
      sales: 156,
      voiceFiles: [
        {
          name: "红玫瑰经典台词1",
          fileId: "cloud://example.mp3",
          duration: 30
        }
      ],
      isActive: true,
      createTime: new Date(),
      updateTime: new Date()
    },
    {
      _id: "pack_002",
      actorId: "actor_001",
      name: "生日祝福",
      icon: "💝",
      price: 4800,
      description: "温馨生日祝福语音包",
      isHot: false,
      sales: 89,
      voiceFiles: [],
      isActive: true,
      createTime: new Date(),
      updateTime: new Date()
    },
    {
      _id: "pack_003",
      actorId: "actor_001",
      name: "晚安物语",
      icon: "🌙",
      price: 5800,
      description: "睡前温柔晚安语音",
      isHot: false,
      sales: 123,
      voiceFiles: [],
      isActive: true,
      createTime: new Date(),
      updateTime: new Date()
    },
    {
      _id: "pack_004",
      actorId: "actor_001",
      name: "励志语录",
      icon: "☀️",
      price: 5200,
      description: "正能量励志语音集合",
      isHot: false,
      sales: 76,
      voiceFiles: [],
      isActive: true,
      createTime: new Date(),
      updateTime: new Date()
    },
    // 王子豪的语音包
    {
      _id: "pack_005",
      actorId: "actor_002",
      name: "音乐剧选段",
      icon: "🎭",
      price: 7800,
      description: "百老汇经典音乐剧演唱",
      isHot: true,
      sales: 78,
      voiceFiles: [],
      isActive: true,
      createTime: new Date(),
      updateTime: new Date()
    },
    {
      _id: "pack_006",
      actorId: "actor_002",
      name: "情歌对唱",
      icon: "🎵",
      price: 5800,
      description: "浪漫情歌二重唱",
      isHot: false,
      sales: 58,
      voiceFiles: [],
      isActive: true,
      createTime: new Date(),
      updateTime: new Date()
    },
    {
      _id: "pack_007",
      actorId: "actor_002",
      name: "舞台独白",
      icon: "🌟",
      price: 6500,
      description: "经典舞台独白表演",
      isHot: false,
      sales: 65,
      voiceFiles: [],
      isActive: true,
      createTime: new Date(),
      updateTime: new Date()
    }
  ]
  
  for (const pack of voicePacks) {
    try {
      await db.collection('voicePacks').add({
        data: pack
      })
      console.log(`插入语音包: ${pack.name}`)
    } catch (error) {
      if (error.errCode === -502002) {
        // 记录已存在，更新它
        await db.collection('voicePacks').doc(pack._id).set({
          data: pack
        })
        console.log(`更新语音包: ${pack.name}`)
      } else {
        throw error
      }
    }
  }
}

// 插入粉丝排行榜数据
async function insertFanRanking() {
  console.log('插入粉丝排行榜数据...')
  
  const fanRankings = [
    {
      _id: "ranking_001",
      _openid: "test_openid_001",
      actorId: "actor_001",
      userInfo: {
        nickName: "星***梦",
        avatarUrl: ""
      },
      purchaseCount: 8,
      totalSpent: 40000,
      level: "钻石守护者",
      starCount: 5,
      lastPurchaseTime: new Date(),
      updateTime: new Date()
    },
    {
      _id: "ranking_002",
      _openid: "test_openid_002",
      actorId: "actor_001",
      userInfo: {
        nickName: "戏***迷",
        avatarUrl: ""
      },
      purchaseCount: 6,
      totalSpent: 30000,
      level: "黄金支持者",
      starCount: 4,
      lastPurchaseTime: new Date(),
      updateTime: new Date()
    },
    {
      _id: "ranking_003",
      _openid: "test_openid_003",
      actorId: "actor_001",
      userInfo: {
        nickName: "林***粉",
        avatarUrl: ""
      },
      purchaseCount: 5,
      totalSpent: 25000,
      level: "白银粉丝",
      starCount: 4,
      lastPurchaseTime: new Date(),
      updateTime: new Date()
    },
    {
      _id: "ranking_004",
      _openid: "test_openid_004",
      actorId: "actor_001",
      userInfo: {
        nickName: "话***爱好者",
        avatarUrl: ""
      },
      purchaseCount: 4,
      totalSpent: 20000,
      level: "忠实听众",
      starCount: 3,
      lastPurchaseTime: new Date(),
      updateTime: new Date()
    },
    {
      _id: "ranking_005",
      _openid: "test_openid_005",
      actorId: "actor_001",
      userInfo: {
        nickName: "艺***粉丝",
        avatarUrl: ""
      },
      purchaseCount: 3,
      totalSpent: 15000,
      level: "声音收藏家",
      starCount: 3,
      lastPurchaseTime: new Date(),
      updateTime: new Date()
    }
  ]
  
  for (const ranking of fanRankings) {
    try {
      await db.collection('fanRanking').add({
        data: ranking
      })
      console.log(`插入粉丝排行: ${ranking.userInfo.nickName}`)
    } catch (error) {
      if (error.errCode === -502002) {
        // 记录已存在，更新它
        await db.collection('fanRanking').doc(ranking._id).set({
          data: ranking
        })
        console.log(`更新粉丝排行: ${ranking.userInfo.nickName}`)
      } else {
        throw error
      }
    }
  }
}