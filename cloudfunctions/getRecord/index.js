const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { recordId } = event
  
  try {
    console.log('获取观剧记录，OpenID:', OPENID, 'recordId:', recordId)
    
    if (!recordId) {
      return {
        code: -1,
        message: '记录ID不能为空'
      }
    }
    
    // 从 drama_records 集合获取指定记录
    const result = await db.collection('drama_records')
      .where({
        _openid: OPENID,
        _id: recordId
      })
      .get()
    
    if (result.data.length === 0) {
      return {
        code: -1,
        message: '记录不存在'
      }
    }
    
    // 增加查看次数
    await db.collection('drama_records')
      .doc(result.data[0]._id)
      .update({
        data: {
          views: db.command.inc(1)
        }
      })
    
    console.log('成功获取观剧记录:', result.data[0].dramaTitle)
    
    return {
      code: 0,
      data: result.data[0],
      message: '获取成功'
    }
    
  } catch (error) {
    console.error('getRecord error:', error)
    return {
      code: -1,
      message: error.message || '获取观剧记录失败'
    }
  }
} 