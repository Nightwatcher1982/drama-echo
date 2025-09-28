// 保存戏剧笔记云函数
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { noteData, mode } = event
  
  try {
    console.log('保存戏剧笔记，OpenID:', OPENID, 'mode:', mode)
    
    if (!noteData) {
      return {
        code: -1,
        message: '笔记数据不能为空'
      }
    }
    
    // 准备保存的数据
    const saveData = {
      id: noteData.id,
      dramaTitle: noteData.dramaTitle,
      theater: noteData.theater,
      watchDate: noteData.watchDate,
      rating: noteData.rating,
      content: noteData.content,
      images: noteData.images || [],
      tags: noteData.tags || [],
      views: noteData.views || 0,
      likes: noteData.likes || 0,
      shares: noteData.shares || 0,
      shareCount: noteData.shareCount || 0,
      updateTime: new Date()
    }
    
    if (mode === 'create') {
      // 创建新笔记
      saveData.createTime = new Date()
      saveData._openid = OPENID
      
      const result = await db.collection('drama_notes').add({
        data: saveData
      })
      
      console.log('成功创建笔记:', saveData.dramaTitle)
      
      return {
        code: 0,
        data: { ...saveData, _id: result._id },
        message: '创建成功'
      }
      
    } else if (mode === 'edit') {
      // 更新现有笔记
      const queryResult = await db.collection('drama_notes')
        .where({
          _openid: OPENID,
          id: noteData.id
        })
        .get()
      
      if (queryResult.data.length === 0) {
        return {
          code: -1,
          message: '笔记不存在'
        }
      }
      
      const docId = queryResult.data[0]._id
      
      await db.collection('drama_notes')
        .doc(docId)
        .update({
          data: saveData
        })
      
      console.log('成功更新笔记:', saveData.dramaTitle)
      
      return {
        code: 0,
        data: { ...saveData, _id: docId },
        message: '更新成功'
      }
    } else {
      return {
        code: -1,
        message: '无效的操作模式'
      }
    }
    
  } catch (error) {
    console.error('saveNote error:', error)
    return {
      code: -1,
      message: error.message || '保存戏剧笔记失败'
    }
  }
} 