const cloud = require('wx-server-sdk')

// 初始化 cloud
cloud.init({ env: 'cloud1-2gyb3dkq4c474fe4' })

const db = cloud.database()

/**
 * 检查管理员权限的通用云函数
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { OPENID } = wxContext

  try {
    console.log('检查管理员权限:', { OPENID })

    // 方法1: 固定的管理员OpenID列表
    const adminOpenIds = [
      'o1JKg5VC5Fe27QBwNZ2d0DPyKImU', // 原有的管理员OpenID
      // 可以在这里添加更多管理员OpenID
    ]

    // 方法2: 通过用户信息检查（获取用户的微信信息）
    let isNightWatcherAdmin = false
    try {
      // 尝试从数据库获取用户信息（如果有存储的话）
      const userQuery = await db.collection('userProfiles')
        .where({ openid: OPENID })
        .limit(1)
        .get()

      if (userQuery.data.length > 0) {
        const userProfile = userQuery.data[0]
        if (userProfile.nickName && userProfile.nickName.toLowerCase() === 'nightwatcher') {
          isNightWatcherAdmin = true
          console.log('通过昵称检查确认nightwatcher管理员:', userProfile.nickName)
        }
      }
    } catch (dbError) {
      console.log('数据库查询用户信息失败，跳过昵称检查:', dbError.message)
    }

    // 方法3: 临时解决方案 - 允许所有用户（仅用于测试）
    const isDevelopmentMode = true // 生产环境设为false

    const hasPermission = adminOpenIds.includes(OPENID) || 
                         isNightWatcherAdmin || 
                         isDevelopmentMode

    console.log('权限检查结果:', {
      OPENID,
      inAdminList: adminOpenIds.includes(OPENID),
      isNightWatcherAdmin,
      isDevelopmentMode,
      hasPermission
    })

    if (hasPermission) {
      // 如果是nightwatcher用户且不在固定列表中，记录其OpenID
      if (isNightWatcherAdmin && !adminOpenIds.includes(OPENID)) {
        console.log('🎭 Nightwatcher用户OpenID:', OPENID)
        console.log('建议将此OpenID添加到管理员列表中')
      }
    }

    return {
      code: hasPermission ? 0 : -1,
      message: hasPermission ? '权限验证通过' : '无权限访问',
      data: {
        hasPermission,
        openid: OPENID,
        isNightWatcherAdmin,
        isDevelopmentMode
      }
    }

  } catch (error) {
    console.error('权限检查失败:', error)
    return {
      code: -1,
      message: '权限检查失败',
      data: null
    }
  }
}