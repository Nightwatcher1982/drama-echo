const cloud = require('wx-server-sdk')

// 初始化云开发环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 主函数
exports.main = async (event, context) => {
  const { action, confirmCode } = event
  
  try {
    // 验证确认码
    if (confirmCode !== 'CLEAR_ALL_DATA_2024') {
      return {
        code: -1,
        message: '确认码错误，无法执行数据清理操作'
      }
    }
    
    switch (action) {
      case 'analyze':
        return await analyzeData()
      case 'clear':
        return await clearAllData()
      case 'clearActors':
        return await clearActorsData()
      case 'clearVoicePacks':
        return await clearVoicePacksData()
      case 'clearPurchases':
        return await clearPurchasesData()
      case 'clearWishes':
        return await clearWishesData()
      case 'clearUsers':
        return await clearUsersData()
      default:
        return {
          code: -1,
          message: '未知操作类型'
        }
    }
    
  } catch (error) {
    return {
      code: -1,
      message: '数据清理失败: ' + error.message
    }
  }
}

// 分析数据
async function analyzeData() {
  const collections = [
    'actors',
    'voicePacks', 
    'voice_packs',
    'userPurchases',
    'user_purchases',
    'userData',
    'wishes',
    'wish_likes',
    'fanRankings'
  ]
  
  const analysis = {}
  
  for (const collection of collections) {
    try {
      const result = await db.collection(collection).count()
      analysis[collection] = {
        count: result.total,
        exists: true
      }
    } catch (error) {
      analysis[collection] = {
        count: 0,
        exists: false,
        error: error.message
      }
    }
  }
  
  return {
    code: 0,
    message: '数据分析完成',
    data: analysis
  }
}

// 清理所有数据
async function clearAllData() {
  const results = {}
  
  // 按依赖关系顺序清理
  const clearOrder = [
    { name: 'fanRankings', desc: '粉丝排行榜' },
    { name: 'wish_likes', desc: '许愿点赞' },
    { name: 'wishes', desc: '许愿记录' },
    { name: 'user_purchases', desc: '用户购买记录(新)' },
    { name: 'userPurchases', desc: '用户购买记录(旧)' },
    { name: 'voice_packs', desc: '语音包(新)' },
    { name: 'voicePacks', desc: '语音包(旧)' },
    { name: 'actors', desc: '演员信息' },
    { name: 'userData', desc: '用户数据' }
  ]
  
  for (const item of clearOrder) {
    try {
      const result = await clearCollection(item.name)
      results[item.name] = {
        success: true,
        deleted: result.deleted,
        desc: item.desc
      }
    } catch (error) {
      results[item.name] = {
        success: false,
        error: error.message,
        desc: item.desc
      }
    }
  }
  
  return {
    code: 0,
    message: '数据清理完成',
    data: results
  }
}

// 清理演员数据
async function clearActorsData() {
  const result = await clearCollection('actors')
  
  return {
    code: 0,
    message: '演员数据清理完成',
    data: {
      deleted: result.deleted
    }
  }
}

// 清理语音包数据
async function clearVoicePacksData() {
  const results = {}
  
  // 清理两个语音包集合
  const collections = ['voicePacks', 'voice_packs']
  
  for (const collection of collections) {
    try {
      const result = await clearCollection(collection)
      results[collection] = {
        success: true,
        deleted: result.deleted
      }
    } catch (error) {
      results[collection] = {
        success: false,
        error: error.message
      }
    }
  }
  
  return {
    code: 0,
    message: '语音包数据清理完成',
    data: results
  }
}

// 清理购买记录数据
async function clearPurchasesData() {
  const results = {}
  
  // 清理两个购买记录集合
  const collections = ['userPurchases', 'user_purchases']
  
  for (const collection of collections) {
    try {
      const result = await clearCollection(collection)
      results[collection] = {
        success: true,
        deleted: result.deleted
      }
    } catch (error) {
      results[collection] = {
        success: false,
        error: error.message
      }
    }
  }
  
  return {
    code: 0,
    message: '购买记录数据清理完成',
    data: results
  }
}

// 清理许愿数据
async function clearWishesData() {
  const results = {}
  
  // 清理许愿相关集合
  const collections = ['wishes', 'wish_likes']
  
  for (const collection of collections) {
    try {
      const result = await clearCollection(collection)
      results[collection] = {
        success: true,
        deleted: result.deleted
      }
    } catch (error) {
      results[collection] = {
        success: false,
        error: error.message
      }
    }
  }
  
  return {
    code: 0,
    message: '许愿数据清理完成',
    data: results
  }
}

// 清理用户数据
async function clearUsersData() {
  const result = await clearCollection('userData')
  
  return {
    code: 0,
    message: '用户数据清理完成',
    data: {
      deleted: result.deleted
    }
  }
}

// 清理指定集合的所有数据
async function clearCollection(collectionName) {
  // 分批删除，避免超时
  let totalDeleted = 0
  const batchSize = 100
  
  while (true) {
    // 获取一批数据
    const queryResult = await db.collection(collectionName)
      .limit(batchSize)
      .get()
    
    if (queryResult.data.length === 0) {
      break // 没有更多数据了
    }
    
    // 删除这批数据
    const deletePromises = queryResult.data.map(doc => 
      db.collection(collectionName).doc(doc._id).remove()
    )
    
    await Promise.all(deletePromises)
    totalDeleted += queryResult.data.length
    
    // 如果这批数据少于批次大小，说明已经删完了
    if (queryResult.data.length < batchSize) {
      break
    }
  }
  
  return {
    deleted: totalDeleted
  }
}
