// 获取用户数据云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  
  try {
    console.log('获取用户数据，OpenID:', OPENID)
    
    let result
    try {
      // 尝试查询用户数据
      result = await db.collection('users').doc(OPENID).get()
    } catch (getError) {
      // 如果记录不存在，result.data 会是 undefined
      console.log('用户记录不存在，将创建新用户')
      result = { data: null }
    }
    
    if (!result.data) {
      console.log('新用户，初始化数据')
      // 初始化新用户数据
      const defaultUserData = {
        _id: OPENID,
        userInfo: {
          createTime: new Date(),
          lastActiveTime: new Date()
        },
        gameData: {
          checkInDays: 0,
          lastCheckIn: null,
          favoriteTheaters: [],
          zodiacSign: null
        },
        pointsData: {
          points: 0,
          totalPointsEarned: 0,
          lastMoodShareDate: null,
          lastZodiacUseDate: null,
          dailyMoodShares: 0,
          dailyZodiacUses: 0
        },
        addressData: {
          name: '',
          phone: '',
          province: '',
          city: '',
          district: '',
          detail: '',
          isDefault: true
        },
        // 历史记录在单独的集合中存储，这里只保存基础数据
        moodRecords: [],
        zodiacHistory: [],
        moodHistory: [],
        exchangeRecords: []
      }
      
      // 创建新用户记录
      await db.collection('users').add({
        data: defaultUserData
      })
      
      return {
        code: 0,
        data: defaultUserData,
        message: '用户初始化成功'
      }
    }
    
    // 更新最后活跃时间
    await db.collection('users').doc(OPENID).update({
      data: {
        'userInfo.lastActiveTime': new Date()
      }
    })
    
    console.log('用户数据获取成功')
    return {
      code: 0,
      data: result.data,
      message: '获取成功'
    }
    
  } catch (error) {
    console.error('getUserData error:', error)
    return {
      code: -1,
      message: error.message || '获取用户数据失败'
    }
  }
} 