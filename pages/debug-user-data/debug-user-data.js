const app = getApp()

Page({
  data: {
    userProfile: null,
    cloudUserData: null,
    openId: '',
    lastRefresh: ''
  },

  onLoad() {
    this.loadAllData()
  },

  async loadAllData() {
    try {
      // 获取本地用户信息
      const userProfile = app.globalData.userProfile
      const openId = app.globalData.userOpenId

      this.setData({
        userProfile: userProfile,
        openId: openId,
        lastRefresh: new Date().toLocaleString()
      })

      // 获取云端用户数据
      await this.loadCloudData()
    } catch (error) {
      console.error('加载数据失败:', error)
    }
  },

  async loadCloudData() {
    try {
      wx.showLoading({ title: '加载云端数据...' })
      
      const res = await wx.cloud.callFunction({
        name: 'getUserData'
      })

      wx.hideLoading()

      if (res.result.code === 0) {
        this.setData({
          cloudUserData: res.result.data
        })
      } else {
        wx.showToast({
          title: '加载云端数据失败',
          icon: 'none'
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('加载云端数据失败:', error)
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      })
    }
  },

  // 清理本地数据
  clearLocalData() {
    wx.showModal({
      title: '确认清理',
      content: '这将清理所有本地用户数据，需要重新登录',
      success: (res) => {
        if (res.confirm) {
          app.clearUserData()
          this.loadAllData()
          wx.showToast({
            title: '本地数据已清理',
            icon: 'success'
          })
        }
      }
    })
  },

  // 紧急数据修复
  emergencyDataFix() {
    wx.showModal({
      title: '紧急修复',
      content: '这将修复错误的用户数据标记，是否继续？',
      confirmText: '立即修复',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '修复中...' })
          
          try {
            const hasFixedData = app.emergencyDataFix()
            
            setTimeout(() => {
              wx.hideLoading()
              this.loadAllData()
              
              if (hasFixedData) {
                wx.showToast({
                  title: '修复完成',
                  icon: 'success'
                })
              } else {
                wx.showToast({
                  title: '数据正常',
                  icon: 'none'
                })
              }
            }, 1000)
            
          } catch (error) {
            wx.hideLoading()
            console.error('紧急修复失败:', error)
            wx.showToast({
              title: '修复失败',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  // 恢复真实微信昵称
  async recoverRealNickname() {
    wx.showModal({
      title: '🔍 恢复真实昵称',
      content: '尝试重新获取您的真实微信昵称，需要重新授权，是否继续？',
      confirmText: '开始恢复',
      cancelText: '取消',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '恢复中...' })
          
          try {
            const recoveredProfile = await app.tryRecoverRealWechatNickname()
            
            setTimeout(() => {
              wx.hideLoading()
              this.loadAllData()
              
              if (recoveredProfile) {
                wx.showModal({
                  title: '🎉 恢复成功',
                  content: `真实昵称已恢复：${recoveredProfile.nickName}`,
                  showCancel: false
                })
              } else {
                wx.showModal({
                  title: 'ℹ️ 恢复结果',
                  content: '未能获取到真实昵称，可能是微信隐私保护或用户取消授权',
                  showCancel: false
                })
              }
            }, 1000)
            
          } catch (error) {
            wx.hideLoading()
            console.error('恢复真实昵称失败:', error)
            wx.showToast({
              title: '恢复失败',
              icon: 'error'
            })
          }
        }
      }
    })
  },

  // 强制重置用户信息
  forceResetUserInfo() {
    wx.showModal({
      title: '强制重置',
      content: '这将彻底重置所有用户信息并重新初始化，确定继续吗？',
      confirmText: '重置',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '重置中...' })
          
          try {
            app.forceResetUserInfo()
            
            setTimeout(() => {
              wx.hideLoading()
              this.loadAllData()
              wx.showToast({
                title: '重置完成',
                icon: 'success'
              })
            }, 2000)
            
          } catch (error) {
            wx.hideLoading()
            console.error('重置失败:', error)
            wx.showToast({
              title: '重置失败',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  // 重新登录
  async reLogin() {
    try {
      wx.showLoading({ title: '重新登录...' })
      
      await app.authorizeUser()
      await this.loadAllData()
      
      wx.hideLoading()
      wx.showToast({
        title: '重新登录成功',
        icon: 'success'
      })
    } catch (error) {
      wx.hideLoading()
      console.error('重新登录失败:', error)
      wx.showToast({
        title: '登录失败',
        icon: 'none'
      })
    }
  },

  // 复制数据到剪贴板
  copyData(e) {
    const type = e.currentTarget.dataset.type
    let data = ''
    
    if (type === 'local') {
      data = JSON.stringify(this.data.userProfile, null, 2)
    } else if (type === 'cloud') {
      data = JSON.stringify(this.data.cloudUserData, null, 2)
    }
    
    wx.setClipboardData({
      data: data,
      success: () => {
        wx.showToast({
          title: '数据已复制',
          icon: 'success'
        })
      }
    })
  },

  // 刷新数据
  onRefresh() {
    this.loadAllData()
  }
})
