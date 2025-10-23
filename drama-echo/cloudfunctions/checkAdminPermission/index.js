const cloud = require('wx-server-sdk')

// 初始化 cloud
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

// 安全配置加载
const secureConfig = require('../utils/secureConfig')

/**
 * 检查管理员权限的通用云函数
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { OPENID } = wxContext

  try {
    secureConfig.log('info', '检查管理员权限', { openId: OPENID })

    // 获取管理员配置
    const adminConfig = secureConfig.getAdminConfig()
    
    // 检查OpenID是否在管理员列表中
    const isInAdminList = adminConfig.openIds.includes(OPENID)
    
    // 通过用户信息检查（获取用户的微信信息）
    let isNightWatcherAdmin = false
    try {
      const userQuery = await db.collection('userProfiles')
        .where({ openid: OPENID })
        .limit(1)
        .get()

      if (userQuery.data.length > 0) {
        const userProfile = userQuery.data[0]
        if (userProfile.nickName && userProfile.nickName.toLowerCase() === 'nightwatcher') {
          isNightWatcherAdmin = true
          secureConfig.log('info', '通过昵称检查确认nightwatcher管理员', { nickName: userProfile.nickName })
        }
      }
    } catch (dbError) {
      secureConfig.log('warn', '数据库查询用户信息失败，跳过昵称检查', { error: dbError.message })
    }

    // 权限验证
    const hasPermission = isInAdminList || isNightWatcherAdmin || adminConfig.isDevelopmentMode

    secureConfig.log('info', '权限检查结果', {
      inAdminList: isInAdminList,
      isNightWatcherAdmin,
      isDevelopmentMode: adminConfig.isDevelopmentMode,
      hasPermission
    })

    if (hasPermission && isNightWatcherAdmin && !isInAdminList) {
      secureConfig.log('info', '建议将Nightwatcher用户OpenID添加到管理员列表中', { openId: OPENID })
    }

    return {
      code: hasPermission ? 0 : -1,
      message: hasPermission ? '权限验证通过' : '无权限访问',
      data: {
        hasPermission,
        isNightWatcherAdmin,
        isDevelopmentMode: adminConfig.isDevelopmentMode
      }
    }

  } catch (error) {
    secureConfig.log('error', '权限检查失败', { error: error.message })
    return {
      code: -1,
      message: '权限检查失败',
      data: null
    }
  }
}