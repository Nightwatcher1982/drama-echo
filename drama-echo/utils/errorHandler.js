/**
 * 统一错误处理工具
 * 提供标准化的错误处理和用户友好的错误消息
 */

// 错误类型枚举
const ERROR_TYPES = {
  NETWORK: 'NETWORK_ERROR',
  DATABASE: 'DATABASE_ERROR', 
  PERMISSION: 'PERMISSION_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR'
}

// 错误消息映射
const ERROR_MESSAGES = {
  [ERROR_TYPES.NETWORK]: '网络连接失败，请检查网络设置',
  [ERROR_TYPES.DATABASE]: '数据操作失败，请稍后重试',
  [ERROR_TYPES.PERMISSION]: '权限不足，请重新登录',
  [ERROR_TYPES.VALIDATION]: '输入数据有误，请检查后重试',
  [ERROR_TYPES.UNKNOWN]: '操作失败，请稍后重试'
}

/**
 * 错误处理器类
 */
class ErrorHandler {
  /**
   * 处理云函数错误
   * @param {Error} error - 错误对象
   * @param {string} operation - 操作名称
   * @returns {Object} 标准化的错误响应
   */
  static handleCloudFunctionError(error, operation = '操作') {
    const errorType = this.getErrorType(error)
    const userMessage = this.getUserFriendlyMessage(error, errorType)
    
    return {
      code: -1,
      message: userMessage,
      errorType: errorType,
      operation: operation,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * 处理前端错误
   * @param {Error} error - 错误对象
   * @param {string} operation - 操作名称
   * @param {Function} showToast - 显示提示的方法
   */
  static handleFrontendError(error, operation = '操作', showToast = wx.showToast) {
    const errorType = this.getErrorType(error)
    const userMessage = this.getUserFriendlyMessage(error, errorType)
    
    showToast({
      title: userMessage,
      icon: 'none',
      duration: 3000
    })
  }

  /**
   * 获取错误类型
   * @param {Error} error - 错误对象
   * @returns {string} 错误类型
   */
  static getErrorType(error) {
    if (!error) return ERROR_TYPES.UNKNOWN
    
    const message = error.message || error.toString()
    
    // 网络相关错误
    if (message.includes('network') || message.includes('timeout') || message.includes('连接')) {
      return ERROR_TYPES.NETWORK
    }
    
    // 数据库相关错误
    if (message.includes('database') || message.includes('collection') || message.includes('query')) {
      return ERROR_TYPES.DATABASE
    }
    
    // 权限相关错误
    if (message.includes('permission') || message.includes('auth') || message.includes('login')) {
      return ERROR_TYPES.PERMISSION
    }
    
    // 验证相关错误
    if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
      return ERROR_TYPES.VALIDATION
    }
    
    return ERROR_TYPES.UNKNOWN
  }

  /**
   * 获取用户友好的错误消息
   * @param {Error} error - 错误对象
   * @param {string} errorType - 错误类型
   * @returns {string} 用户友好的错误消息
   */
  static getUserFriendlyMessage(error, errorType) {
    // 如果有自定义消息，优先使用
    if (error && error.message && !error.message.includes('Error:')) {
      return error.message
    }
    
    // 使用预定义的消息
    return ERROR_MESSAGES[errorType] || ERROR_MESSAGES[ERROR_TYPES.UNKNOWN]
  }

  /**
   * 包装异步函数，自动处理错误
   * @param {Function} asyncFn - 异步函数
   * @param {string} operation - 操作名称
   * @param {Function} showToast - 显示提示的方法
   * @returns {Function} 包装后的函数
   */
  static wrapAsyncFunction(asyncFn, operation, showToast = wx.showToast) {
    return async (...args) => {
      try {
        return await asyncFn(...args)
      } catch (error) {
        this.handleFrontendError(error, operation, showToast)
        throw error
      }
    }
  }

  /**
   * 验证必需参数
   * @param {Object} params - 参数对象
   * @param {Array} requiredFields - 必需字段数组
   * @throws {Error} 参数验证失败时抛出错误
   */
  static validateRequiredParams(params, requiredFields) {
    const missingFields = requiredFields.filter(field => {
      const value = params[field]
      return value === undefined || value === null || value === ''
    })
    
    if (missingFields.length > 0) {
      throw new Error(`缺少必需参数: ${missingFields.join(', ')}`)
    }
  }

  /**
   * 安全执行云函数调用
   * @param {string} functionName - 云函数名称
   * @param {Object} data - 调用数据
   * @param {string} operation - 操作名称
   * @returns {Promise} 云函数调用结果
   */
  static async safeCloudCall(functionName, data, operation) {
    try {
      const result = await wx.cloud.callFunction({
        name: functionName,
        data: data
      })
      
      if (result.result && result.result.code !== undefined) {
        if (result.result.code === 0) {
          return result.result
        } else {
          throw new Error(result.result.message || `${operation}失败`)
        }
      }
      
      return result.result
    } catch (error) {
      throw new Error(`${operation}失败: ${error.message}`)
    }
  }
}

module.exports = {
  ErrorHandler,
  ERROR_TYPES,
  ERROR_MESSAGES
}

