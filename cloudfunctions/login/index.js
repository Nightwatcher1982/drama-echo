// 用户登录云函数
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const { OPENID, APPID, UNIONID } = cloud.getWXContext()
  
  try {
    console.log('用户登录，OpenID:', OPENID)
    
    return {
      code: 0,
      openid: OPENID,
      appid: APPID,
      unionid: UNIONID,
      message: '登录成功'
    }
    
  } catch (error) {
    console.error('login error:', error)
    return {
      code: -1,
      message: error.message || '登录失败'
    }
  }
} 