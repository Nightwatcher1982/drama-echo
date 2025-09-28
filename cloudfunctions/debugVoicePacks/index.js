const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { action, packId } = event
  
  try {
    if (action === 'checkAllCollections') {
      const results = {}
      
      // 检查 voicePacks 集合
      try {
        const voicePacksResult = await db.collection('voicePacks').get()
        results.voicePacks = {
          count: voicePacksResult.data.length,
          data: voicePacksResult.data.map(doc => ({
            _id: doc._id,
            name: doc.name,
            actorId: doc.actorId,
            hasVoiceFiles: !!doc.voiceFiles,
            voiceFilesCount: doc.voiceFiles ? doc.voiceFiles.length : 0
          }))
        }
      } catch (error) {
        results.voicePacks = { error: error.message }
      }
      
      // 检查 voice_packs 集合
      try {
        const voicePacksNewResult = await db.collection('voice_packs').get()
        results.voice_packs = {
          count: voicePacksNewResult.data.length,
          data: voicePacksNewResult.data.map(doc => ({
            _id: doc._id,
            name: doc.name,
            actorId: doc.actorId
          }))
        }
      } catch (error) {
        results.voice_packs = { error: error.message }
      }
      
      return {
        code: 0,
        data: results,
        message: '集合检查完成'
      }
    }
    
    if (action === 'getPackById') {
      if (!packId) {
        return { code: -1, message: '缺少packId参数' }
      }
      
      const results = {}
      
      // 从 voicePacks 集合查找
      try {
        const voicePacksResult = await db.collection('voicePacks').doc(packId).get()
        results.voicePacks = voicePacksResult.data ? {
          found: true,
          data: voicePacksResult.data
        } : { found: false }
      } catch (error) {
        results.voicePacks = { found: false, error: error.message }
      }
      
      // 从 voice_packs 集合查找
      try {
        const voicePacksNewResult = await db.collection('voice_packs').doc(packId).get()
        results.voice_packs = voicePacksNewResult.data ? {
          found: true,
          data: voicePacksNewResult.data
        } : { found: false }
      } catch (error) {
        results.voice_packs = { found: false, error: error.message }
      }
      
      return {
        code: 0,
        data: results,
        message: '查找完成'
      }
    }
    
    return { code: -1, message: '未知操作' }
    
  } catch (error) {
    console.error('debugVoicePacks error:', error)
    return {
      code: -1,
      message: error.message || '操作失败'
    }
  }
}
