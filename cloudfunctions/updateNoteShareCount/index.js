// 更新戏剧笔记分享计数云函数
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { noteId } = event
  
  try {
    console.log('更新笔记分享计数，OpenID:', OPENID, 'noteId:', noteId)
    
    if (!noteId) {
      return {
        code: -1,
        message: '笔记ID不能为空'
      }
    }
    
    // 查找笔记
    const queryResult = await db.collection('drama_notes')
      .where({
        _openid: OPENID,
        id: noteId
      })
      .get()
    
    if (queryResult.data.length === 0) {
      return {
        code: -1,
        message: '笔记不存在'
      }
    }
    
    const docId = queryResult.data[0]._id
    
    // 增加分享计数
    await db.collection('drama_notes')
      .doc(docId)
      .update({
        data: {
          shares: db.command.inc(1),
          shareCount: db.command.inc(1)
        }
      })
    
    console.log('成功更新分享计数')
    
    return {
      code: 0,
      message: '更新成功'
    }
    
  } catch (error) {
    console.error('updateNoteShareCount error:', error)
    return {
      code: -1,
      message: error.message || '更新分享计数失败'
    }
  }
} 