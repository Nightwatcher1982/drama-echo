const cloud = require('wx-server-sdk')

// 初始化 cloud
cloud.init({ env: 'cloud1-2gyb3dkq4c474fe4' })

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  console.log('开始插入戏剧回响数据，操作者:', wxContext.OPENID)

  try {
    // 插入演员数据
    console.log('1. 开始插入演员数据...')
    await insertActors()
    
    // 插入语音包数据
    console.log('2. 开始插入语音包数据...')
    await insertVoicePacks()
    
    // 插入粉丝排行榜数据
    console.log('3. 开始插入粉丝排行榜数据...')
    await insertFanRanking()
    
    // 为当前用户创建一些购买记录（开发环境测试）
    console.log('4. 为当前用户创建购买记录...')
    await insertUserPurchases(wxContext.OPENID)
    
    console.log('✅ 所有数据插入完成！')
    
    return {
      code: 0,
      message: '戏剧回响数据插入成功！',
      data: {
        actors: 3,
        voicePacks: 8,
        fanRanking: 5,
        userPurchases: '已为当前用户创建',
        timestamp: new Date().toISOString()
      }
    }

  } catch (error) {
    console.error('插入数据失败:', error)
    return {
      code: -1,
      message: error.message || '插入数据失败',
      data: null
    }
  }
}

// 插入演员数据
async function insertActors() {
  const actors = [
    {
      _id: 'actor_001',
      name: '李雨萱',
      bio: '古典戏剧表演艺术家，专攻昆曲与京剧，嗓音清亮，表演细腻动人',
      avatar: '/images/default-avatar.png',
      specialty: ['昆曲', '京剧', '古典诗词'],
      experience: '8年',
      fanCount: 15420,
      totalSales: 89650,
      isActive: true,
      icon: '🌸',
      tags: ['古典', '优雅', '传统'],
      createTime: new Date('2024-12-18T10:00:00.000Z')
    },
    {
      _id: 'actor_002',
      name: '陈墨轩',
      bio: '现代话剧演员，擅长情感表达，声音富有磁性，深受年轻观众喜爱',
      avatar: '/images/default-avatar.png',
      specialty: ['话剧', '音乐剧', '现代戏'],
      experience: '6年',
      fanCount: 23580,
      totalSales: 126780,
      isActive: true,
      icon: '🎭',
      tags: ['现代', '磁性', '深情'],
      createTime: new Date('2024-12-18T10:00:00.000Z')
    },
    {
      _id: 'actor_003',
      name: '苏婉清',
      bio: '越剧名伶，花旦出身，声音甜美，擅长演绎古典爱情剧目',
      avatar: '/images/default-avatar.png',
      specialty: ['越剧', '花旦', '古典爱情'],
      experience: '10年',
      fanCount: 18930,
      totalSales: 95420,
      isActive: true,
      icon: '🌙',
      tags: ['甜美', '越剧', '花旦'],
      createTime: new Date('2024-12-18T10:00:00.000Z')
    }
  ]

  for (const actor of actors) {
    try {
      await db.collection('actors').add({ data: actor })
      console.log(`✅ 演员 ${actor.name} 插入成功`)
    } catch (error) {
      if (error.errCode === -502003) {
        console.log(`⚠️ 演员 ${actor.name} 已存在，跳过`)
      } else {
        throw error
      }
    }
  }
}

// 插入语音包数据
async function insertVoicePacks() {
  const voicePacks = [
    // 李雨萱的语音包
    {
      _id: 'pack_001',
      actorId: 'actor_001',
      name: '昆曲经典选段',
      icon: '🎵',
      price: 2999,
      description: '《牡丹亭》《桃花扇》等经典昆曲选段，声声入耳，韵味悠长',
      isHot: true,
      sales: 432,
      isActive: true,
      duration: 1800, // 30分钟
      tracks: 8,
      createTime: new Date('2024-12-18T10:00:00.000Z')
    },
    {
      _id: 'pack_002',
      actorId: 'actor_001',
      name: '古诗词朗诵',
      icon: '📜',
      price: 1999,
      description: '李白杜甫经典诗词深情朗诵，诗情画意尽在声中',
      isHot: false,
      sales: 298,
      isActive: true,
      duration: 1200, // 20分钟
      tracks: 12,
      createTime: new Date('2024-12-18T10:00:00.000Z')
    },
    {
      _id: 'pack_003',
      actorId: 'actor_001',
      name: '京剧花旦唱段',
      icon: '🌸',
      price: 2599,
      description: '《贵妃醉酒》《霸王别姬》花旦经典，婉转动听',
      isHot: false,
      sales: 186,
      isActive: true,
      duration: 1500, // 25分钟
      tracks: 6,
      createTime: new Date('2024-12-18T10:00:00.000Z')
    },

    // 陈墨轩的语音包
    {
      _id: 'pack_004',
      actorId: 'actor_002',
      name: '现代情感独白',
      icon: '💭',
      price: 2499,
      description: '深情款款的现代爱情独白集，磁性声音触动心弦',
      isHot: true,
      sales: 567,
      isActive: true,
      duration: 2100, // 35分钟
      tracks: 15,
      createTime: new Date('2024-12-18T10:00:00.000Z')
    },
    {
      _id: 'pack_005',
      actorId: 'actor_002',
      name: '经典话剧片段',
      icon: '🎬',
      price: 2899,
      description: '《雷雨》《茶馆》经典话剧片段，演技精湛',
      isHot: true,
      sales: 445,
      isActive: true,
      duration: 1800, // 30分钟
      tracks: 10,
      createTime: new Date('2024-12-18T10:00:00.000Z')
    },
    {
      _id: 'pack_006',
      actorId: 'actor_002',
      name: '音乐剧唱段',
      icon: '🎤',
      price: 1899,
      description: '百老汇经典音乐剧唱段精选，激情澎湃',
      isHot: false,
      sales: 223,
      isActive: true,
      duration: 1650, // 27.5分钟
      tracks: 9,
      createTime: new Date('2024-12-18T10:00:00.000Z')
    },

    // 苏婉清的语音包
    {
      _id: 'pack_007',
      actorId: 'actor_003',
      name: '越剧经典唱段',
      icon: '🎭',
      price: 2699,
      description: '《红楼梦》《西厢记》越剧名段，婉约清丽',
      isHot: true,
      sales: 389,
      isActive: true,
      duration: 1950, // 32.5分钟
      tracks: 11,
      createTime: new Date('2024-12-18T10:00:00.000Z')
    },
    {
      _id: 'pack_008',
      actorId: 'actor_003',
      name: '古典诗词吟唱',
      icon: '🌕',
      price: 2199,
      description: '配乐古典诗词吟唱，如梦如幻，余音绕梁',
      isHot: false,
      sales: 267,
      isActive: true,
      duration: 1400, // 23分钟
      tracks: 14,
      createTime: new Date('2024-12-18T10:00:00.000Z')
    }
  ]

  for (const pack of voicePacks) {
    try {
      await db.collection('voicePacks').add({ data: pack })
      console.log(`✅ 语音包 ${pack.name} 插入成功`)
    } catch (error) {
      if (error.errCode === -502003) {
        console.log(`⚠️ 语音包 ${pack.name} 已存在，跳过`)
      } else {
        throw error
      }
    }
  }
}

// 插入粉丝排行榜数据
async function insertFanRanking() {
  const fanRanking = [
    {
      _id: 'fan_001',
      actorId: 'actor_001',
      nickname: '戏韵流年',
      purchaseCount: 8,
      totalSpent: 15950,
      avatar: '',
      level: 'VIP',
      badge: '💎',
      joinTime: new Date('2024-08-15T10:00:00.000Z'),
      createTime: new Date('2024-12-18T10:00:00.000Z')
    },
    {
      _id: 'fan_002',
      actorId: 'actor_001',
      nickname: '古韵悠扬',
      purchaseCount: 6,
      totalSpent: 12480,
      avatar: '',
      level: 'Gold',
      badge: '🥇',
      joinTime: new Date('2024-09-20T10:00:00.000Z'),
      createTime: new Date('2024-12-18T10:00:00.000Z')
    },
    {
      _id: 'fan_003',
      actorId: 'actor_002',
      nickname: '现代诗人',
      purchaseCount: 12,
      totalSpent: 24560,
      avatar: '',
      level: 'Diamond',
      badge: '💍',
      joinTime: new Date('2024-07-10T10:00:00.000Z'),
      createTime: new Date('2024-12-18T10:00:00.000Z')
    },
    {
      _id: 'fan_004',
      actorId: 'actor_002',
      nickname: '话剧迷',
      purchaseCount: 9,
      totalSpent: 18730,
      avatar: '',
      level: 'VIP',
      badge: '💎',
      joinTime: new Date('2024-08-25T10:00:00.000Z'),
      createTime: new Date('2024-12-18T10:00:00.000Z')
    },
    {
      _id: 'fan_005',
      actorId: 'actor_003',
      nickname: '越剧情缘',
      purchaseCount: 7,
      totalSpent: 14520,
      avatar: '',
      level: 'Gold',
      badge: '🥇',
      joinTime: new Date('2024-09-05T10:00:00.000Z'),
      createTime: new Date('2024-12-18T10:00:00.000Z')
    }
  ]

  for (const fan of fanRanking) {
    try {
      await db.collection('fanRanking').add({ data: fan })
      console.log(`✅ 粉丝 ${fan.nickname} 插入成功`)
    } catch (error) {
      if (error.errCode === -502003) {
        console.log(`⚠️ 粉丝 ${fan.nickname} 已存在，跳过`)
      } else {
        throw error
      }
    }
  }
}

// 为当前用户插入一些购买记录（开发环境测试）
async function insertUserPurchases(openid) {
  if (!openid) {
    console.log('⚠️ 没有用户OpenID，跳过购买记录创建')
    return
  }

  // 模拟用户购买了一些语音包
  const purchaseRecords = [
    {
      _openid: openid,
      actorId: 'actor_001',
      voicePackId: 'pack_001',
      orderId: `test_order_${Date.now()}_1`,
      purchaseTime: new Date(),
      price: 2999
    },
    {
      _openid: openid,
      actorId: 'actor_001', 
      voicePackId: 'pack_002',
      orderId: `test_order_${Date.now()}_2`,
      purchaseTime: new Date(),
      price: 1999
    },
    {
      _openid: openid,
      actorId: 'actor_002',
      voicePackId: 'pack_004',
      orderId: `test_order_${Date.now()}_3`,
      purchaseTime: new Date(),
      price: 2499
    }
  ]

  for (const record of purchaseRecords) {
    try {
      await db.collection('userPurchases').add({ data: record })
      console.log(`✅ 购买记录创建成功: ${record.voicePackId}`)
    } catch (error) {
      if (error.errCode === -502003) {
        console.log(`⚠️ 购买记录已存在，跳过: ${record.voicePackId}`)
      } else {
        console.error(`❌ 购买记录创建失败: ${record.voicePackId}`, error)
      }
    }
  }
  
  console.log(`✅ 用户购买记录创建完成，用户: ${openid}`)
}