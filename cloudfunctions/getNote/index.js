// 获取单个戏剧笔记云函数
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { noteId } = event
  
  try {
    console.log('获取戏剧笔记，OpenID:', OPENID, 'noteId:', noteId)
    
    if (!noteId) {
      return {
        code: -1,
        message: '笔记ID不能为空'
      }
    }
    
    // 从 drama_notes 集合获取指定笔记
    const result = await db.collection('drama_notes')
      .where({
        _openid: OPENID,
        id: noteId
      })
      .get()
    
    if (result.data.length === 0) {
      return {
        code: -1,
        message: '笔记不存在'
      }
    }
    
    // 增加查看次数
    await db.collection('drama_notes')
      .doc(result.data[0]._id)
      .update({
        data: {
          views: db.command.inc(1)
        }
      })
    
    console.log('成功获取笔记:', result.data[0].dramaTitle)
    
    return {
      code: 0,
      data: result.data[0],
      message: '获取成功'
    }
    
  } catch (error) {
    console.error('getNote error:', error)
    return {
      code: -1,
      message: error.message || '获取戏剧笔记失败'
    }
  }
} 