// 更新用户信息云函数
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { userProfile } = event
  
  try {
    if (!userProfile) {
      return {
        code: -1,
        message: '用户信息不能为空'
      }
    }
    
    console.log('更新用户信息，OpenID:', OPENID)
    
    // 准备更新的用户信息
    const updateData = {
      'userInfo.nickName': userProfile.nickName,
      'userInfo.avatarUrl': userProfile.avatarUrl,
      'userInfo.gender': userProfile.gender,
      'userInfo.country': userProfile.country,
      'userInfo.province': userProfile.province,
      'userInfo.city': userProfile.city,
      'userInfo.language': userProfile.language,
      'userInfo.authTime': userProfile.authTime,
      'userInfo.lastActiveTime': new Date()
    }
    
    try {
      // 尝试更新用户信息
      await db.collection('users').doc(OPENID).update({
        data: updateData
      })
      
      console.log('用户信息更新成功')
      return {
        code: 0,
        message: '用户信息更新成功'
      }
      
    } catch (updateError) {
      // 如果用户记录不存在，先创建基础记录再更新
      if (updateError.errCode === -502004) {
        console.log('用户记录不存在，创建新记录')
        
        const defaultUserData = {
          _id: OPENID,
          userInfo: {
            nickName: userProfile.nickName,
            avatarUrl: userProfile.avatarUrl,
            gender: userProfile.gender,
            country: userProfile.country,
            province: userProfile.province,
            city: userProfile.city,
            language: userProfile.language,
            authTime: userProfile.authTime,
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
          moodRecords: [],
          zodiacHistory: [],
          moodHistory: [],
          exchangeRecords: []
        }
        
        await db.collection('users').add({
          data: defaultUserData
        })
        
        return {
          code: 0,
          message: '用户信息保存成功'
        }
      } else {
        throw updateError
      }
    }
    
  } catch (error) {
    console.error('updateUserProfile error:', error)
    return {
      code: -1,
      message: error.message || '更新用户信息失败'
    }
  }
} 