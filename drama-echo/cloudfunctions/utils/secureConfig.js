// 安全配置文件 - 微信支付配置
// 注意：在生产环境中，这些配置应该从环境变量或安全的配置服务中获取

const WECHAT_PAY_CONFIG = {
  // 微信小程序AppID
  appid: 'wx1234567890abcdef', // 请替换为你的小程序AppID
  
  // 微信支付商户号
  mch_id: '1234567890', // 请替换为你的商户号
  
  // 微信支付API密钥
  api_key: 'your_api_key_here', // 请替换为你的API密钥
  
  // 支付回调通知URL
  notify_url: 'https://your-domain.com/api/payCallback', // 请替换为你的回调URL
  
  // 证书路径（如果需要）
  cert_path: '',
  key_path: ''
}

// 开发环境标识
const IS_DEVELOPMENT = true

// 日志记录函数
function log(level, message, data = {}) {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`, data)
}

// 获取微信支付配置
function getWechatPayConfig() {
  return WECHAT_PAY_CONFIG
}

// 验证配置是否完整
function validateConfig() {
  const required = ['appid', 'mch_id', 'api_key', 'notify_url']
  const missing = required.filter(key => !WECHAT_PAY_CONFIG[key])
  
  if (missing.length > 0) {
    throw new Error(`微信支付配置不完整，缺少: ${missing.join(', ')}`)
  }
  
  return true
}

// 检查是否为开发环境
function isDevelopment() {
  return IS_DEVELOPMENT
}

module.exports = {
  getWechatPayConfig,
  validateConfig,
  log,
  isDevelopment
}
