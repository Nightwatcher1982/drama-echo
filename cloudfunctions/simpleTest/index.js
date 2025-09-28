const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { packId } = event
  
  try {
    console.log('简单测试查询，packId:', packId)
    
    // 直接查询 voicePacks 集合
    const result = await db.collection('voicePacks').doc(packId).get()
    
    if (result.data) {
      console.log('找到语音包:', result.data.name)
      return {
        code: 0,
        data: result.data,
        message: '找到语音包'
      }
    } else {
      console.log('语音包不存在')
      return {
        code: -1,
        message: '语音包不存在'
      }
    }
    
  } catch (error) {
    console.error('查询失败:', error)
    return {
      code: -1,
      message: error.message || '查询失败'
    }
  }
}
