const app = getApp()

Page({
  data: {
    userInfo: null,
    openid: '',
    isAdmin: false,
    debugInfo: {}
  },

  onLoad() {
    this.loadUserInfo()
  },

  onShow() {
    this.loadUserInfo()
    this.checkAdminStatus()
  },

  async loadUserInfo() {
    const userInfo = app.globalData.userProfile
    const openid = app.globalData.openid
    
    this.setData({
      userInfo,
      openid,
      debugInfo: {
        userLoggedIn: app.globalData.userLoggedIn,
        cloudEnabled: app.globalData.cloudEnabled,
        nickName: userInfo?.nickName,
        avatarUrl: userInfo?.avatarUrl
      }
    })
  },

  checkAdminStatus() {
    const userInfo = app.globalData.userProfile
    const openid = app.globalData.openid
    
    // 管理员检查逻辑
    const adminOpenIds = [
      'o1JKg5VC5Fe27QBwNZ2d0DPyKImU', // 原有的管理员OpenID
      // 在这里添加新管理员的OpenID：
      // 'oXXXXXXXXXXXXXXXXXXXXXXXXXXX', // 新管理员1的OpenID
      // 'oYYYYYYYYYYYYYYYYYYYYYYYYYYY', // 新管理员2的OpenID
    ]
    const isNightWatcher = userInfo && userInfo.nickName && 
      userInfo.nickName.toLowerCase() === 'nightwatcher'
    const isAdmin = adminOpenIds.includes(openid) || isNightWatcher
    
    this.setData({ isAdmin })
    
    console.log('管理员检查结果:', {
      nickName: userInfo?.nickName,
      openid,
      isNightWatcher,
      isAdmin
    })
  },

  // 快速跳转功能
  goToVoiceAdmin() {
    wx.navigateTo({
      url: '/pages/voice-admin/voice-admin'
    })
  },

  goToAdmin() {
    wx.showToast({
      title: '该后台已下线',
      icon: 'none'
    })
  },

  goToProfile() {
    wx.switchTab({
      url: '/pages/profile/profile'
    })
  },

  goToVoiceEcho() {
    wx.navigateTo({
      url: '/pages/voice-echo/voice-echo'
    })
  },

  // 复制OpenID
  copyOpenId() {
    if (this.data.openid) {
      wx.setClipboardData({
        data: this.data.openid,
        success: () => {
          wx.showToast({
            title: 'OpenID已复制',
            icon: 'success'
          })
        }
      })
    } else {
      wx.showToast({
        title: '暂无OpenID',
        icon: 'none'
      })
    }
  },

  // 跳转到管理员管理
  goToAdminManager() {
    wx.navigateTo({
      url: '/pages/admin-manager/admin-manager'
    })
  },

  // 跳转到戏剧回响数据库初始化
  goToVoiceEchoInit() {
    wx.navigateTo({
      url: '/pages/voice-echo-init/voice-echo-init'
    })
  },

  // 跳转到数据调试页面
  goToDebugData() {
    wx.navigateTo({
      url: '/pages/debug-user-data/debug-user-data'
    })
  },

  // 重新登录
  async reLogin() {
    try {
      await app.authorizeUser()
      this.loadUserInfo()
      this.checkAdminStatus()
      wx.showToast({
        title: '重新登录成功',
        icon: 'success'
      })
    } catch (error) {
      console.error('重新登录失败:', error)
      wx.showToast({
        title: '登录失败',
        icon: 'none'
      })
    }
  }
})