// 数据迁移云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { localData } = event
  
  try {
    console.log('开始迁移用户数据，OpenID:', OPENID)
    
    if (!localData) {
      return {
        code: -1,
        message: '本地数据为空，无需迁移'
      }
    }
    
    // 检查用户是否已存在
    const existingUser = await db.collection('users').doc(OPENID).get()
    
    if (existingUser.data) {
      console.log('用户已存在，合并数据')
      // 合并数据而不是覆盖
      await mergeUserData(OPENID, localData, existingUser.data)
    } else {
      console.log('新用户，创建数据')
      // 创建新用户数据
      await createNewUser(OPENID, localData)
    }
    
    // 迁移心情记录
    if (localData.moodRecords && localData.moodRecords.length > 0) {
      await migrateMoodRecords(OPENID, localData.moodRecords)
    }
    
    // 迁移星座历史
    if (localData.zodiacHistory && localData.zodiacHistory.length > 0) {
      await migrateZodiacRecords(OPENID, localData.zodiacHistory)
    }
    
    // 迁移兑换记录
    if (localData.exchangeRecords && localData.exchangeRecords.length > 0) {
      await migrateExchangeRecords(OPENID, localData.exchangeRecords)
    }
    
    console.log('数据迁移完成')
    return {
      code: 0,
      message: '数据迁移成功',
      migratedData: {
        moodRecords: localData.moodRecords?.length || 0,
        zodiacHistory: localData.zodiacHistory?.length || 0,
        exchangeRecords: localData.exchangeRecords?.length || 0,
        points: localData.points || 0
      }
    }
    
  } catch (error) {
    console.error('数据迁移失败:', error)
    return {
      code: -1,
      message: '数据迁移失败: ' + error.message
    }
  }
}

// 合并用户数据
async function mergeUserData(openid, localData, cloudData) {
  const updateData = {}
  
  // 合并积分数据（取较大值）
  const localPoints = localData.points || 0
  const cloudPoints = cloudData.pointsData?.points || 0
  if (localPoints > cloudPoints) {
    updateData['pointsData.points'] = localPoints
    updateData['pointsData.totalPointsEarned'] = Math.max(
      localData.totalPointsEarned || 0,
      cloudData.pointsData?.totalPointsEarned || 0
    )
  }
  
  // 合并地址信息（如果本地有地址且云端没有）
  if (localData.userAddress?.name && !cloudData.addressData?.name) {
    updateData.addressData = localData.userAddress
  }
  
  // 合并星座设置
  if (localData.zodiacSign && !cloudData.gameData?.zodiacSign) {
    updateData['gameData.zodiacSign'] = localData.zodiacSign
  }
  
  // 合并打卡天数（取较大值）
  const localCheckIns = localData.checkInDays || 0
  const cloudCheckIns = cloudData.gameData?.checkInDays || 0
  if (localCheckIns > cloudCheckIns) {
    updateData['gameData.checkInDays'] = localCheckIns
  }
  
  if (Object.keys(updateData).length > 0) {
    await db.collection('users').doc(openid).update({
      data: updateData
    })
  }
}

// 创建新用户
async function createNewUser(openid, localData) {
  const userData = {
    _id: openid,
    userInfo: {
      createTime: new Date(),
      lastActiveTime: new Date()
    },
    gameData: {
      checkInDays: localData.checkInDays || 0,
      lastCheckIn: localData.lastCheckIn || null,
      favoriteTheaters: localData.favoriteTheaters || [],
      zodiacSign: localData.zodiacSign || null
    },
    pointsData: {
      points: localData.points || 0,
      totalPointsEarned: localData.totalPointsEarned || 0,
      lastMoodShareDate: localData.lastMoodShareDate || null,
      lastZodiacUseDate: localData.lastZodiacUseDate || null,
      dailyMoodShares: localData.dailyMoodShares || 0,
      dailyZodiacUses: localData.dailyZodiacUses || 0
    },
    addressData: localData.userAddress || {
      name: '',
      phone: '',
      province: '',
      city: '',
      district: '',
      detail: '',
      isDefault: true
    },
    // 迁移标记
    migrated: true,
    migratedAt: new Date()
  }
  
  await db.collection('users').add({
    data: userData
  })
}

// 迁移心情记录
async function migrateMoodRecords(openid, records) {
  const batch = []
  
  for (let record of records) {
    batch.push({
      _openid: openid,
      mood: record.mood,
      emoji: record.emoji,
      category: record.category || 'classic',
      timestamp: new Date(record.timestamp),
      playQuote: '本地迁移数据',
      theater: '历史记录',
      migrated: true
    })
  }
  
  // 批量插入
  for (let i = 0; i < batch.length; i += 20) {
    const chunk = batch.slice(i, i + 20)
    const promises = chunk.map(record => 
      db.collection('mood_records').add({ data: record })
    )
    await Promise.all(promises)
  }
}

// 迁移星座记录
async function migrateZodiacRecords(openid, history) {
  const batch = []
  
  for (let record of history) {
    batch.push({
      _openid: openid,
      zodiac: record.zodiac || '未知',
      result: record.chinese || '历史记录',
      playQuote: record.chinese || '',
      timestamp: new Date(record.timestamp),
      migrated: true
    })
  }
  
  // 批量插入
  for (let i = 0; i < batch.length; i += 20) {
    const chunk = batch.slice(i, i + 20)
    const promises = chunk.map(record => 
      db.collection('zodiac_records').add({ data: record })
    )
    await Promise.all(promises)
  }
}

// 迁移兑换记录
async function migrateExchangeRecords(openid, records) {
  const batch = []
  
  for (let record of records) {
    batch.push({
      _openid: openid,
      giftId: record.giftId || 'migrated_gift',
      giftName: record.giftName || '历史兑换商品',
      pointsCost: record.pointsCost || 0,
      status: record.status || 'completed',
      timestamp: new Date(record.timestamp),
      address: record.address || {},
      migrated: true
    })
  }
  
  // 批量插入
  for (let i = 0; i < batch.length; i += 20) {
    const chunk = batch.slice(i, i + 20)
    const promises = chunk.map(record => 
      db.collection('exchange_records').add({ data: record })
    )
    await Promise.all(promises)
  }
} 