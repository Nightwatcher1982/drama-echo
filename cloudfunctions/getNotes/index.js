// 获取戏剧笔记列表云函数
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  
  try {
    console.log('获取戏剧笔记列表，OpenID:', OPENID)
    
    // 从 drama_notes 集合获取用户的笔记列表
    const result = await db.collection('drama_notes')
      .where({
        _openid: OPENID
      })
      .orderBy('createTime', 'desc')
      .get()
    
    console.log('成功获取笔记列表，数量:', result.data.length)
    
    return {
      code: 0,
      data: result.data,
      message: '获取成功'
    }
    
  } catch (error) {
    console.error('getNotes error:', error)
    return {
      code: -1,
      message: error.message || '获取戏剧笔记列表失败'
    }
  }
} 