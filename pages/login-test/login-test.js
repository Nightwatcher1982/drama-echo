Page({
  data: {
    userInfo: null,
    loginStatus: '未登录',
    logs: []
  },

  onLoad() {
    this.addLog('页面加载完成')
    this.checkLoginStatus()
  },

  // 检查登录状态
  async checkLoginStatus() {
    try {
      this.addLog('开始检查登录状态...')
      
      // 检查缓存中的用户信息
      const cachedUserInfo = wx.getStorageSync('userInfo')
      this.addLog('缓存中的用户信息: ' + JSON.stringify(cachedUserInfo))
      
      if (cachedUserInfo && cachedUserInfo.openid) {
        this.setData({
          userInfo: cachedUserInfo,
          loginStatus: '已登录（缓存）'
        })
        this.addLog('从缓存获取到用户信息')
        return
      }
      
      // 尝试调用登录云函数
      this.addLog('调用登录云函数...')
      const result = await wx.cloud.callFunction({
        name: 'login'
      })
      
      this.addLog('登录云函数返回: ' + JSON.stringify(result))
      
      if (result.result && result.result.code === 0) {
        const userInfo = {
          openid: result.result.openid,
          appid: result.result.appid,
          unionid: result.result.unionid
        }
        
        wx.setStorageSync('userInfo', userInfo)
        
        this.setData({
          userInfo: userInfo,
          loginStatus: '已登录（云函数）'
        })
        
        this.addLog('登录成功: ' + JSON.stringify(userInfo))
      } else {
        this.setData({
          loginStatus: '登录失败'
        })
        this.addLog('登录失败: ' + JSON.stringify(result.result))
      }
      
    } catch (error) {
      this.addLog('登录过程出错: ' + error.message)
      this.setData({
        loginStatus: '登录出错'
      })
    }
  },

  // 手动登录
  async manualLogin() {
    try {
      this.addLog('手动触发登录...')
      
      // 清除缓存
      wx.removeStorageSync('userInfo')
      this.addLog('已清除用户信息缓存')
      
      // 重新检查登录状态
      await this.checkLoginStatus()
      
    } catch (error) {
      this.addLog('手动登录失败: ' + error.message)
    }
  },

  // 清除缓存
  clearCache() {
    wx.removeStorageSync('userInfo')
    this.setData({
      userInfo: null,
      loginStatus: '未登录'
    })
    this.addLog('已清除所有缓存')
  },

  // 测试支付
  async testPayment() {
    try {
      this.addLog('测试支付功能...')
      
      const userInfo = await this.getUserInfo()
      if (!userInfo) {
        this.addLog('用户信息获取失败，无法测试支付')
        return
      }
      
      this.addLog('用户信息获取成功，可以正常支付')
      
    } catch (error) {
      this.addLog('测试支付失败: ' + error.message)
    }
  },

  // 获取用户信息（复制自actor-detail页面）
  async getUserInfo() {
    try {
      this.addLog('开始获取用户信息...')
      
      // 先尝试从缓存获取
      let userInfo = wx.getStorageSync('userInfo')
      this.addLog('缓存中的用户信息: ' + JSON.stringify(userInfo))
      
      if (!userInfo || !userInfo.openid) {
        this.addLog('缓存中没有用户信息，调用登录云函数...')
        
        // 调用登录云函数获取用户信息
        const result = await wx.cloud.callFunction({
          name: 'login'
        })
        
        this.addLog('登录云函数返回结果: ' + JSON.stringify(result))
        
        if (result.result && result.result.code === 0) {
          userInfo = {
            openid: result.result.openid,
            appid: result.result.appid,
            unionid: result.result.unionid
          }
          wx.setStorageSync('userInfo', userInfo)
          this.addLog('用户信息获取成功: ' + JSON.stringify(userInfo))
        } else {
          this.addLog('登录云函数返回错误: ' + JSON.stringify(result.result))
          return null
        }
      }
      
      return userInfo
    } catch (error) {
      this.addLog('获取用户信息失败: ' + error.message)
      return null
    }
  },

  // 添加日志
  addLog(message) {
    const timestamp = new Date().toLocaleTimeString()
    const log = `[${timestamp}] ${message}`
    console.log(log)
    
    const logs = this.data.logs
    logs.push(log)
    
    this.setData({
      logs: logs.slice(-20) // 只保留最近20条日志
    })
  }
})
