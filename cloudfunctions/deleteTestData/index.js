// 删除测试数据的云函数
const cloud = require('wx-server-sdk')

// 初始化云开发环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { action } = event
  
  try {
    console.log('开始删除测试数据，操作类型:', action)
    
    if (action === 'deleteAll') {
      // 删除所有测试数据
      return await deleteAllTestData()
    } else if (action === 'deleteVoicePacks') {
      // 只删除语音包相关数据
      return await deleteVoicePackData()
    } else if (action === 'checkData') {
      // 检查当前数据状态
      return await checkCurrentData()
    } else {
      return {
        code: -1,
        message: '未知操作类型'
      }
    }
    
  } catch (error) {
    console.error('删除测试数据失败:', error)
    return {
      code: -1,
      message: error.message || '删除失败'
    }
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

// 检查当前数据状态
async function checkCurrentData() {
  try {
    const collections = [
      'voice_packs',
      'voice_pack_photos', 
      'voice_pack_voices',
      'bonus_videos',
      'user_purchases'
    ]
    
    const results = {}
    
    for (const collection of collections) {
      try {
        const result = await db.collection(collection).count()
        results[collection] = {
          exists: true,
          count: result.total
        }
      } catch (error) {
        results[collection] = {
          exists: false,
          count: 0
        }
      }
    }
    
    return {
      code: 0,
      message: '数据状态检查完成',
      data: results
    }
    
  } catch (error) {
    throw new Error('检查数据状态时出错: ' + error.message)
  }
}
