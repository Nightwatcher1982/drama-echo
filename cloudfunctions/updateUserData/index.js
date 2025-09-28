// 更新用户数据云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { userData } = event
  
  try {
    console.log('更新用户数据，OpenID:', OPENID)
    
    // 验证数据
    if (!userData) {
      return {
        code: -1,
        message: '用户数据不能为空'
      }
    }
    
    // 准备更新数据，移除历史记录字段（历史记录在单独集合中管理）
    const updateData = { ...userData }
    delete updateData.moodRecords
    delete updateData.zodiacHistory  
    delete updateData.moodHistory
    delete updateData.exchangeRecords
    
    // 确保更新最后活跃时间
    if (!updateData.userInfo) {
      updateData.userInfo = {}
    }
    updateData.userInfo.lastActiveTime = new Date()
    
    // 更新用户数据
    await db.collection('users').doc(OPENID).update({
      data: updateData
    })
    
    console.log('用户数据更新成功')
    return {
      code: 0,
      message: '更新成功'
    }
    
  } catch (error) {
    console.error('updateUserData error:', error)
    
    // 如果记录不存在，尝试创建
    if (error.errCode === -502004) {
      try {
        await db.collection('users').add({
          data: {
            _id: OPENID,
            ...userData,
            userInfo: {
              ...userData.userInfo,
              createTime: new Date(),
              lastActiveTime: new Date()
            }
          }
        })
        
        return {
          code: 0,
          message: '用户数据创建成功'
        }
      } catch (createError) {
        console.error('创建用户数据失败:', createError)
        return {
          code: -1,
          message: '创建用户数据失败: ' + createError.message
        }
      }
    }
    
    return {
      code: -1,
      message: error.message || '更新用户数据失败'
    }
  }
} 