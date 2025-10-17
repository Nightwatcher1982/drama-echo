// 保存心情记录云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { mood, emoji, category, playQuote, theater, play, english } = event
  
  try {
    console.log('保存心情记录，OpenID:', OPENID, 'mood:', mood)
    
    // 验证必要参数
    if (!mood || !emoji || !category) {
      return {
        code: -1,
        message: '心情、表情和分类不能为空'
      }
    }
    
    const now = new Date()
    
    // 检查每日限制
    const user = await db.collection('users').doc(OPENID).get()
    if (user.data && user.data.pointsData) {
      const lastShareDate = user.data.pointsData.lastMoodShareDate
      const dailyShares = user.data.pointsData.dailyMoodShares || 0
      
      // 检查是否是同一天
      const isToday = lastShareDate && 
        new Date(lastShareDate).toDateString() === now.toDateString()
      
      if (isToday && dailyShares >= 1) {
        return {
          code: -2,
          message: '今日心情分享次数已用完，明天再来记录吧！'
        }
      }
    }
    
    // 保存心情记录到单独的集合
    const moodRecord = {
      _openid: OPENID,
      mood,
      emoji,
      category,
      timestamp: now,
      playQuote: playQuote || '',
      theater: theater || ''
    }
    
    await db.collection('mood_records').add({
      data: moodRecord
    })
    
    // 更新用户积分和每日统计
    const pointsToAdd = 10 // 每次心情记录获得10积分
    
    // 准备更新数据
    const updateData = {
      'pointsData.points': _.inc(pointsToAdd),
      'pointsData.totalPointsEarned': _.inc(pointsToAdd),
      'pointsData.lastMoodShareDate': now
    }
    
    // 如果是今天第一次分享，重置计数为1，否则增加1
    const lastShareDate = user.data?.pointsData?.lastMoodShareDate
    const isToday = lastShareDate && 
      new Date(lastShareDate).toDateString() === now.toDateString()
    
    if (isToday) {
      updateData['pointsData.dailyMoodShares'] = _.inc(1)
    } else {
      updateData['pointsData.dailyMoodShares'] = 1
    }
    
    // 更新用户数据
    await db.collection('users').doc(OPENID).update({
      data: updateData
    })
    
    // 同时保存到用户的历史记录中（用于泡泡球显示）
    const historyRecord = {
      chinese: playQuote || '记录心情的美好时刻',
      english: english || 'A beautiful moment of recording mood',
      play: play || '生活的舞台',
      timestamp: now.getTime()
    }
    
    await db.collection('users').doc(OPENID).update({
      data: {
        moodHistory: _.push(historyRecord)
      }
    })
    
    console.log('心情记录保存成功，获得积分:', pointsToAdd)
    return {
      code: 0,
      message: `心情记录保存成功，获得${pointsToAdd}戏剧币！`,
      pointsEarned: pointsToAdd
    }
    
  } catch (error) {
    console.error('saveMoodRecord error:', error)
    return {
      code: -1,
      message: error.message || '保存心情记录失败'
    }
  }
} 