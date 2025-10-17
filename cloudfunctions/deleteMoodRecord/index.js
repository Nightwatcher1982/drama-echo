// 删除心情记录云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { timestamp, type } = event
  
  console.log('删除记录开始，参数:', { OPENID, timestamp, type })
  
  try {
    // 验证必要参数
    if (!timestamp || !type) {
      console.log('参数验证失败:', { timestamp, type })
      return {
        code: -1,
        message: '时间戳和类型不能为空'
      }
    }
    
    console.log('开始删除操作，类型:', type)
    
    // 根据类型删除不同的记录
    if (type === 'mood') {
      // 删除心情记录
      console.log('删除心情记录，时间戳:', timestamp)
      
      // 先查询是否存在
      const moodRecords = await db.collection('mood_records')
        .where({
          _openid: OPENID,
          timestamp: new Date(parseInt(timestamp))
        })
        .get()
      
      console.log('查询到的心情记录数量:', moodRecords.data.length)
      
      if (moodRecords.data.length > 0) {
        await db.collection('mood_records')
          .where({
            _openid: OPENID,
            timestamp: new Date(parseInt(timestamp))
          })
          .remove()
        console.log('心情记录删除成功')
      }
      
      // 从用户历史记录中删除
      await db.collection('users').doc(OPENID).update({
        data: {
          moodHistory: _.pull({
            timestamp: parseInt(timestamp)
          })
        }
      })
      console.log('用户历史记录删除成功')
      
    } else if (type === 'zodiac') {
      // 从用户历史记录中删除星座记录
      console.log('删除星座记录，时间戳:', timestamp)
      
      await db.collection('users').doc(OPENID).update({
        data: {
          zodiacHistory: _.pull({
            timestamp: parseInt(timestamp)
          })
        }
      })
      console.log('星座记录删除成功')
    } else {
      console.log('未知的记录类型:', type)
      return {
        code: -1,
        message: '未知的记录类型'
      }
    }
    
    console.log('记录删除成功')
    return {
      code: 0,
      message: '记录删除成功'
    }
    
  } catch (error) {
    console.error('删除记录失败:', error)
    return {
      code: -1,
      message: error.message || '删除记录失败'
    }
  }
} 