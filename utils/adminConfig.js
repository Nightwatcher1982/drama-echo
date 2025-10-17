/**
 * 管理员配置文件
 * 统一管理所有管理员的OpenID和权限
 */

// 管理员OpenID列表 - 在这里统一添加所有管理员
const ADMIN_OPENIDS = [
  'o1JKg5VC5Fe27QBwNZ2d0DPyKImU', // 原始管理员OpenID
  
  // ===== 在这里添加新的管理员OpenID =====
  // 格式：'oXXXXXXXXXXXXXXXXXXXXXXXXXXX', // 管理员名称或备注
  
  // 示例（取消注释并替换为真实OpenID）:
  // 'oABCDEFGHIJKLMNOPQRSTUVWXYZ', // 张三 - 主管理员
  // 'o1234567890ABCDEFGHIJKLMNOP', // 李四 - 语音管理员
  // 'oZYXWVUTSRQPONMLKJIHGFEDCB', // 王五 - 内容管理员
]

// 特殊昵称管理员列表（临时权限，基于微信昵称）
const SPECIAL_NICKNAME_ADMINS = [
  'nightwatcher', // 注意：基于昵称的权限不够安全，建议迁移到OpenID
  // 在这里添加新的管理员昵称（临时使用）：
  // 'admin_user_2',     // 新管理员的微信昵称
  // 'content_manager',  // 内容管理员昵称
]

// 开发模式配置
const DEVELOPMENT_CONFIG = {
  // 开发环境是否允许所有用户访问管理功能
  allowAllUsers: true, // 生产环境设为 false
  
  // 是否显示详细的权限检查日志
  showDebugLogs: true,
  
  // 是否自动显示用户OpenID（便于添加新管理员）
  showUserOpenId: true
}

/**
 * 检查用户是否为管理员
 * @param {string} openid - 用户的OpenID
 * @param {object} userProfile - 用户资料信息
 * @returns {boolean} 是否为管理员
 */
function isAdmin(openid, userProfile = null) {
  // 1. 检查OpenID是否在管理员列表中
  if (ADMIN_OPENIDS.includes(openid)) {
    return true
  }
  
  // 2. 检查特殊昵称（临时权限）
  if (userProfile && userProfile.nickName) {
    const nickName = userProfile.nickName.toLowerCase()
    if (SPECIAL_NICKNAME_ADMINS.some(admin => admin.toLowerCase() === nickName)) {
      return true
    }
  }
  
  // 3. 开发模式检查
  if (DEVELOPMENT_CONFIG.allowAllUsers) {
    if (DEVELOPMENT_CONFIG.showDebugLogs) {
      console.log('🔧 开发模式：允许所有用户访问管理功能')
      if (DEVELOPMENT_CONFIG.showUserOpenId) {
        console.log('用户OpenID:', openid)
        console.log('用户昵称:', userProfile?.nickName || 'unknown')
        console.log('是否自定义:', userProfile?.isCustomized || false)
        console.log('真实显示名:', userProfile?.isCustomized ? userProfile.nickName : (userProfile?.nickName === '微信用户' ? '戏剧爱好者' : userProfile?.nickName))
      }
    }
    return true
  }
  
  return false
}

/**
 * 获取管理员配置信息
 */
function getAdminConfig() {
  return {
    adminOpenIds: ADMIN_OPENIDS,
    specialNicknameAdmins: SPECIAL_NICKNAME_ADMINS,
    developmentConfig: DEVELOPMENT_CONFIG,
    totalAdmins: ADMIN_OPENIDS.length + SPECIAL_NICKNAME_ADMINS.length
  }
}

/**
 * 添加新管理员OpenID（动态添加，重启后失效）
 * @param {string} openid - 新管理员的OpenID
 * @param {string} remark - 备注信息
 */
function addTempAdmin(openid, remark = '') {
  if (!ADMIN_OPENIDS.includes(openid)) {
    ADMIN_OPENIDS.push(openid)
    console.log(`✅ 临时添加管理员: ${openid} ${remark ? '(' + remark + ')' : ''}`)
    console.log('⚠️  注意：这是临时添加，重启后失效。请在代码中永久添加。')
  }
}

module.exports = {
  ADMIN_OPENIDS,
  SPECIAL_NICKNAME_ADMINS,
  DEVELOPMENT_CONFIG,
  isAdmin,
  getAdminConfig,
  addTempAdmin
}