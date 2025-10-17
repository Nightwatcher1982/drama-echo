const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { recordData, mode } = event
  
  try {
    console.log('保存观剧记录，OpenID:', OPENID, 'mode:', mode)
    
    if (!recordData) {
      return {
        code: -1,
        message: '记录数据不能为空'
      }
    }
    
    // 准备保存的数据
    const saveData = {
      dramaTitle: recordData.dramaTitle,
      watchDate: recordData.watchDate,
      watchTime: recordData.watchTime,
      venue: recordData.venue,
      stage: recordData.stage,
      seatArea: recordData.seatArea,
      seatRow: recordData.seatRow,
      seatNumber: recordData.seatNumber,
      ticketPrice: recordData.ticketPrice,
      selectedActors: recordData.selectedActors || [],
      purchaseChannel: recordData.purchaseChannel,
      ticketImages: recordData.ticketImages || [],
      selectedCalendar: recordData.selectedCalendar,
      displaySetting: recordData.displaySetting,
      isPending: recordData.isPending || false,
      remarks: recordData.remarks,
      views: recordData.views || 0,
      likes: recordData.likes || 0,
      shares: recordData.shares || 0,
      updateTime: new Date()
    }
    
    if (mode === 'create') {
      // 创建新记录
      saveData.createTime = new Date()
      saveData._openid = OPENID
      
      const result = await db.collection('drama_records').add({
        data: saveData
      })
      
      console.log('成功创建观剧记录:', saveData.dramaTitle)
      
      return {
        code: 0,
        data: { ...saveData, _id: result._id },
        message: '创建成功'
      }
      
    } else if (mode === 'edit') {
      // 更新现有记录
      const queryResult = await db.collection('drama_records')
        .where({
          _openid: OPENID,
          _id: recordData._id
        })
        .get()
      
      if (queryResult.data.length === 0) {
        return {
          code: -1,
          message: '记录不存在'
        }
      }
      
      const docId = queryResult.data[0]._id
      
      await db.collection('drama_records')
        .doc(docId)
        .update({
          data: saveData
        })
      
      console.log('成功更新观剧记录:', saveData.dramaTitle)
      
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
    console.error('saveRecord error:', error)
    return {
      code: -1,
      message: error.message || '保存观剧记录失败'
    }
  }
} 