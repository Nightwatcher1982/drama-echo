// 保存星座记录云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { zodiac, result, playQuote, theater, play } = event
  
  try {
    console.log('保存星座记录，OpenID:', OPENID, 'zodiac:', zodiac)
    
    // 验证必要参数
    if (!zodiac || !result) {
      return {
        code: -1,
        message: '星座和运势结果不能为空'
      }
    }
    
    const now = new Date()
    
    // 检查每日限制
    const user = await db.collection('users').doc(OPENID).get()
    if (user.data && user.data.pointsData) {
      const lastUseDate = user.data.pointsData.lastZodiacUseDate
      const dailyUses = user.data.pointsData.dailyZodiacUses || 0
      
      // 检查是否是同一天
      const isToday = lastUseDate && 
        new Date(lastUseDate).toDateString() === now.toDateString()
      
      if (isToday && dailyUses >= 3) {
        return {
          code: -2,
          message: '今日星座查询次数已用完，明天再来查看运势吧！'
        }
      }
    }
    
    // 保存星座记录到单独的集合
    const zodiacRecord = {
      _openid: OPENID,
      zodiac,
      result,
      playQuote: playQuote || '',
      theater: theater || '',
      timestamp: now
    }
    
    await db.collection('zodiac_records').add({
      data: zodiacRecord
    })
    
    // 更新用户积分和每日统计
    const pointsToAdd = 5 // 每次星座查询获得5积分
    
    // 准备更新数据
    const updateData = {
      'pointsData.points': _.inc(pointsToAdd),
      'pointsData.totalPointsEarned': _.inc(pointsToAdd),
      'pointsData.lastZodiacUseDate': now
    }
    
    // 如果是今天第一次查询，重置计数为1，否则增加1
    const lastUseDate = user.data?.pointsData?.lastZodiacUseDate
    const isToday = lastUseDate && 
      new Date(lastUseDate).toDateString() === now.toDateString()
    
    if (isToday) {
      updateData['pointsData.dailyZodiacUses'] = _.inc(1)
    } else {
      updateData['pointsData.dailyZodiacUses'] = 1
    }
    
    // 设置星座（只保存星座名称，保持数据库兼容性）
    updateData['gameData.zodiacSign'] = zodiac
    
    // 更新用户数据
    await db.collection('users').doc(OPENID).update({
      data: updateData
    })
    
    // 同时保存到用户的历史记录中（用于泡泡球显示）
    const historyRecord = {
      zodiac,
      chinese: result,
      english: 'Zodiac fortune',
      play: play || '星座的舞台',
      timestamp: now.getTime()
    }
    
    await db.collection('users').doc(OPENID).update({
      data: {
        zodiacHistory: _.push(historyRecord)
      }
    })
    
    console.log('星座记录保存成功，获得积分:', pointsToAdd)
    return {
      code: 0,
      message: `星座运势记录成功，获得${pointsToAdd}戏剧币！`,
      pointsEarned: pointsToAdd,
      zodiacRecord: historyRecord
    }
    
  } catch (error) {
    console.error('saveZodiacRecord error:', error)
    return {
      code: -1,
      message: error.message || '保存星座记录失败'
    }
  }
} 