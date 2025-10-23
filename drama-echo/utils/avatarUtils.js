/**
 * 头像处理工具函数
 * 用于安全地处理头像显示，避免emoji导致的图片加载错误
 */

/**
 * 获取安全的头像显示内容
 * @param {string} avatar - 头像内容
 * @param {string} fallback - 备用显示内容
 * @returns {string} 安全的显示内容
 */
function getSafeAvatar(avatar, fallback = '头像') {
  // 如果是空值或无效值，返回备用内容
  if (!avatar || typeof avatar !== 'string') {
    return fallback
  }
  
  // 如果是emoji，返回备用内容
  if (isEmoji(avatar)) {
    return fallback
  }
  
  // 如果是有效的图片路径，返回原值
  if (isValidImagePath(avatar)) {
    return avatar
  }
  
  // 其他情况返回备用内容
  return fallback
}

/**
 * 检查是否为emoji
 * @param {string} str - 要检查的字符串
 * @returns {boolean} 是否为emoji
 */
function isEmoji(str) {
  // 常见的emoji unicode范围
  const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u
  return emojiRegex.test(str)
}

/**
 * 检查是否为有效的图片路径
 * @param {string} path - 要检查的路径
 * @returns {boolean} 是否为有效图片路径
 */
function isValidImagePath(path) {
  // 检查是否为HTTP/HTTPS URL
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return true
  }
  
  // 检查是否为云存储路径
  if (path.startsWith('cloud://')) {
    return true
  }
  
  // 检查是否为本地路径
  if (path.startsWith('/') || path.startsWith('./') || path.startsWith('../')) {
    return true
  }
  
  return false
}

/**
 * 获取头像占位符
 * @param {string} name - 名称
 * @returns {string} 占位符内容
 */
function getAvatarPlaceholder(name) {
  if (!name || typeof name !== 'string') {
    return '头像'
  }
  
  // 返回名称的第一个字符
  return name.charAt(0).toUpperCase()
}

module.exports = {
  getSafeAvatar,
  isEmoji,
  isValidImagePath,
  getAvatarPlaceholder
}



