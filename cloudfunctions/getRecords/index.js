const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  
  try {
    console.log('获取观剧记录列表，OpenID:', OPENID)
    
    // 从 drama_records 集合获取用户的记录列表
    const result = await db.collection('drama_records')
      .where({
        _openid: OPENID
      })
      .orderBy('createTime', 'desc')
      .get()
    
    console.log('成功获取记录列表，数量:', result.data.length)
    
    return {
      code: 0,
      data: result.data,
      message: '获取成功'
    }
    
  } catch (error) {
    console.error('getRecords error:', error)
    return {
      code: -1,
      message: error.message || '获取观剧记录列表失败'
    }
  }
} 