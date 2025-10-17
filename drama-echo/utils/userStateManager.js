// 用户状态管理工具
class UserStateManager {
  
  // 检查登录状态
  static checkLoginStatus() {
    const app = getApp()
    return app.globalData.userLoggedIn && app.globalData.userOpenId
  }
  
  // 获取用户信息
  static getUserInfo() {
    const app = getApp()
    return {
      userProfile: app.globalData.userProfile,
      userOpenId: app.globalData.userOpenId,
      userLoggedIn: app.globalData.userLoggedIn,
      userData: app.globalData.userData
    }
  }
  
  // 更新用户状态到页面
  static updatePageUserState(page) {
    const app = getApp()
    const userInfo = this.getUserInfo()
    const { userProfile, userLoggedIn } = userInfo
    
    // 处理用户昵称显示
    let displayName = '戏剧爱好者'
    let showCustomizeHint = false
    
    if (userProfile && userProfile.nickName) {
      if (userProfile.isCustomized && userProfile.nickName !== '微信用户') {
        // 用户已自定义昵称
        displayName = userProfile.nickName
      } else if (userProfile.nickName === '微信用户' || userProfile.isWechatDefault) {
        // 微信默认昵称
        displayName = '戏剧爱好者'
        showCustomizeHint = true
      } else {
        // 真实的微信昵称
        displayName = userProfile.nickName
      }
    }
    
    // 检查是否为管理员
    const isNightWatcher = userProfile && userProfile.nickName && 
      userProfile.nickName.toLowerCase() === 'nightwatcher'
    
    // 更新页面数据
    page.setData({
      userLoggedIn: userLoggedIn,
      userProfile: userProfile,
      displayName: displayName,
      showCustomizeHint: showCustomizeHint,
      isNightWatcher: isNightWatcher,
      isRealDevice: app.globalData.isRealDevice || false
    })
    
    console.log('✅ 用户状态已更新到页面:', {
      userLoggedIn,
      displayName,
      isNightWatcher
    })
  }
  
  // 强制刷新用户信息
  static async refreshUserInfo() {
    const app = getApp()
    
    try {
      console.log('🔄 开始刷新用户信息...')
      
      // 1. 检查会话是否有效
      const sessionValid = await this.checkSession()
      if (!sessionValid) {
        console.log('⚠️ 会话已失效，重新登录...')
        await app.initUserLogin()
        return true
      }
      
      // 2. 检查本地存储的用户信息
      const localUserProfile = wx.getStorageSync('userProfile')
      if (localUserProfile && localUserProfile.nickName) {
        console.log('📱 从本地存储恢复用户信息:', localUserProfile.nickName)
        app.globalData.userProfile = localUserProfile
        app.globalData.userLoggedIn = true
        return true
      }
      
      // 3. 如果本地没有有效信息，尝试从云端获取
      if (app.globalData.cloudEnabled) {
        try {
          const cloudResult = await wx.cloud.callFunction({
            name: 'getUserData'
          })
          
          if (cloudResult.result && cloudResult.result.code === 0) {
            const cloudUserData = cloudResult.result.data
            if (cloudUserData.userProfile) {
              console.log('☁️ 从云端恢复用户信息:', cloudUserData.userProfile.nickName)
              app.globalData.userProfile = cloudUserData.userProfile
              app.globalData.userLoggedIn = true
              
              // 同步到本地存储
              wx.setStorageSync('userProfile', cloudUserData.userProfile)
              return true
            }
          }
        } catch (error) {
          console.error('从云端获取用户信息失败:', error)
        }
      }
      
      console.log('❌ 无法恢复用户信息，需要重新登录')
      return false
      
    } catch (error) {
      console.error('刷新用户信息失败:', error)
      return false
    }
  }
  
  // 检查会话是否有效
  static checkSession() {
    return new Promise((resolve) => {
      wx.checkSession({
        success: () => {
          console.log('✅ 会话有效')
          resolve(true)
        },
        fail: () => {
          console.log('❌ 会话已失效')
          resolve(false)
        }
      })
    })
  }
  
  // 静默登录
  static async silentLogin() {
    const app = getApp()
    
    try {
      console.log('🔄 开始静默登录...')
      
      const loginResult = await new Promise((resolve, reject) => {
        wx.login({
          success: resolve,
          fail: reject
        })
      })
      
      if (loginResult.code) {
        console.log('✅ 获取登录凭证成功')
        
        // 调用云函数获取OpenID
        const openIdResult = await wx.cloud.callFunction({
          name: 'getOpenId',
          data: { code: loginResult.code }
        })
        
        if (openIdResult.result && openIdResult.result.openid) {
          app.globalData.userOpenId = openIdResult.result.openid
          console.log('✅ OpenID获取成功:', app.globalData.userOpenId)
          return true
        }
      }
      
      console.log('❌ 静默登录失败')
      return false
      
    } catch (error) {
      console.error('静默登录异常:', error)
      return false
    }
  }
  
  // 保存用户信息到本地和云端
  static async saveUserInfo(userProfile) {
    const app = getApp()
    
    try {
      console.log('💾 保存用户信息:', userProfile.nickName)
      
      // 1. 保存到本地存储
      wx.setStorageSync('userProfile', userProfile)
      app.globalData.userProfile = userProfile
      app.globalData.userLoggedIn = true
      
      // 2. 保存到云端（如果支持云开发）
      if (app.globalData.cloudEnabled) {
        try {
          await wx.cloud.callFunction({
            name: 'updateUserData',
            data: {
              userProfile: userProfile,
              openId: app.globalData.userOpenId
            }
          })
          console.log('☁️ 用户信息已同步到云端')
        } catch (error) {
          console.error('同步到云端失败:', error)
        }
      }
      
      return true
      
    } catch (error) {
      console.error('保存用户信息失败:', error)
      return false
    }
  }
  
  // 清除用户信息
  static clearUserInfo() {
    const app = getApp()
    
    console.log('🗑️ 清除用户信息')
    
    // 清除本地存储
    wx.removeStorageSync('userProfile')
    wx.removeStorageSync('userData')
    
    // 清除全局数据
    app.globalData.userProfile = null
    app.globalData.userLoggedIn = false
    app.globalData.userOpenId = null
    app.globalData.userData = {}
  }
  
  // 检查并修复用户信息
  static async checkAndFixUserInfo() {
    const app = getApp()
    const userProfile = app.globalData.userProfile
    
    if (!userProfile || !userProfile.nickName) {
      console.log('🔧 用户信息缺失，尝试修复...')
      return await this.refreshUserInfo()
    }
    
    // 检查昵称是否有效
    if (userProfile.nickName === '微信用户' || 
        userProfile.nickName === '为自己设置一个有趣的戏剧昵称吧！' ||
        /^\d+\.?\d*$/.test(userProfile.nickName)) {
      console.log('🔧 检测到无效昵称，尝试修复...')
      return await this.refreshUserInfo()
    }
    
    return true
  }
}

module.exports = UserStateManager


