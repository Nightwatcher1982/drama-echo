const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { packId, action } = event
  
  try {
    if (action === 'listAll') {
      console.log('查询所有语音包')
      
      // 查询所有语音包
      const result = await db.collection('voicePacks').get()
      
      console.log('查询到', result.data.length, '个语音包')
      
      const packsWithVoices = result.data.filter(pack => pack.voiceFiles && pack.voiceFiles.length > 0)
      
      return {
        code: 0,
        data: {
          total: result.data.length,
          withVoices: packsWithVoices.length,
          allPacks: result.data.map(pack => ({
            _id: pack._id,
            name: pack.name,
            actorId: pack.actorId,
            voiceFilesCount: pack.voiceFiles ? pack.voiceFiles.length : 0
          })),
          packsWithVoices: packsWithVoices.map(pack => ({
            _id: pack._id,
            name: pack.name,
            actorId: pack.actorId,
            voiceFiles: pack.voiceFiles.map(voice => ({
              name: voice.name,
              fileId: voice.fileId
            }))
          }))
        },
        message: '查询完成'
      }
    }
    
    if (packId) {
      console.log('测试语音包查询，packId:', packId)
      
      // 直接查询 voicePacks 集合
      const result = await db.collection('voicePacks').doc(packId).get()
      
      console.log('查询结果:', result.data ? '找到' : '未找到')
      
      if (result.data) {
        const packData = result.data
        console.log('语音包数据:', {
          _id: packData._id,
          name: packData.name,
          actorId: packData.actorId,
          hasVoiceFiles: !!packData.voiceFiles,
          voiceFilesCount: packData.voiceFiles ? packData.voiceFiles.length : 0
        })
        
        return {
          code: 0,
          data: {
            found: true,
            packData: packData
          },
          message: '找到语音包'
        }
      } else {
        return {
          code: -1,
          data: {
            found: false
          },
          message: '语音包不存在'
        }
      }
    }
    
    return {
      code: -1,
      message: '缺少参数'
    }
    
  } catch (error) {
    console.error('测试查询失败:', error)
    return {
      code: -1,
      message: error.message || '查询失败'
    }
  }
}
