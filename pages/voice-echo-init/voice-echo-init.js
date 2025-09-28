const app = getApp()
const adminConfig = require('../../utils/adminConfig')

Page({
  data: {
    loading: false,
    databaseStatus: null,
    initResults: null,
    isAdmin: false,
    
    // 操作状态
    checkingStatus: false,
    creatingCollections: false,
    initingData: false,
    fullIniting: false
  },

  onLoad() {
    this.checkAdminStatus()
    this.checkDatabaseStatus()
  },

  onShow() {
    this.checkAdminStatus()
  },

  // 检查管理员权限
  checkAdminStatus() {
    const userInfo = app.globalData.userProfile
    const openid = app.globalData.openid
    const isAdmin = adminConfig.isAdmin(openid, userInfo)
    
    this.setData({ isAdmin })
    
    if (!isAdmin) {
      wx.showModal({
        title: '权限不足',
        content: '此功能仅限管理员使用',
        showCancel: false,
        success: () => {
          wx.navigateBack()
        }
      })
    }
  },

  // 检查数据库状态
  async checkDatabaseStatus() {
    if (this.data.checkingStatus) return

    this.setData({ checkingStatus: true })

    try {
      wx.showLoading({ title: '检查数据库状态...' })

      const res = await wx.cloud.callFunction({
        name: 'initVoiceEchoDatabase',
        data: { action: 'checkDatabase' }
      })

      if (res.result.code === 0) {
        this.setData({ databaseStatus: res.result.data })
        console.log('数据库状态:', res.result.data)
      } else {
        throw new Error(res.result.message)
      }

    } catch (error) {
      console.error('检查数据库状态失败:', error)
      wx.showToast({
        title: error.message || '检查失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
      this.setData({ checkingStatus: false })
    }
  },

  // 创建数据库集合
  async createCollections() {
    if (this.data.creatingCollections) return

    this.setData({ creatingCollections: true })

    try {
      wx.showLoading({ title: '创建数据库集合...' })

      const res = await wx.cloud.callFunction({
        name: 'initVoiceEchoDatabase',
        data: { action: 'createCollections' }
      })

      if (res.result.code === 0) {
        wx.showToast({
          title: '集合创建成功',
          icon: 'success'
        })
        console.log('创建结果:', res.result.data)
        
        // 刷新状态
        setTimeout(() => {
          this.checkDatabaseStatus()
        }, 1000)
        
      } else {
        throw new Error(res.result.message)
      }

    } catch (error) {
      console.error('创建数据库集合失败:', error)
      wx.showToast({
        title: error.message || '创建失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
      this.setData({ creatingCollections: false })
    }
  },

  // 初始化示例数据
  async initSampleData() {
    if (this.data.initingData) return

    this.setData({ initingData: true })

    try {
      wx.showLoading({ title: '初始化示例数据...' })

      const res = await wx.cloud.callFunction({
        name: 'initVoiceEchoDatabase',
        data: { action: 'initSampleData' }
      })

      if (res.result.code === 0) {
        this.setData({ initResults: res.result.data })
        wx.showToast({
          title: '数据初始化成功',
          icon: 'success'
        })
        console.log('初始化结果:', res.result.data)
        
        // 刷新状态
        setTimeout(() => {
          this.checkDatabaseStatus()
        }, 1000)
        
      } else {
        throw new Error(res.result.message)
      }

    } catch (error) {
      console.error('初始化示例数据失败:', error)
      wx.showToast({
        title: error.message || '初始化失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
      this.setData({ initingData: false })
    }
  },

  // 完整初始化
  async fullInit() {
    if (this.data.fullIniting) return

    wx.showModal({
      title: '确认初始化',
      content: '将创建所有必需的数据库集合并填充示例数据，这可能需要几分钟时间。确定要继续吗？',
      success: async (modalRes) => {
        if (!modalRes.confirm) return

        this.setData({ fullIniting: true })

        try {
          wx.showLoading({ title: '正在完整初始化...', mask: true })

          const res = await wx.cloud.callFunction({
            name: 'initVoiceEchoDatabase',
            data: { action: 'fullInit' }
          })

          if (res.result.code === 0) {
            this.setData({ initResults: res.result.data })
            wx.showModal({
              title: '初始化完成',
              content: '戏剧回响数据库已完成初始化，您现在可以正常使用所有功能了！',
              showCancel: false,
              success: () => {
                this.checkDatabaseStatus()
              }
            })
            console.log('完整初始化结果:', res.result.data)
            
          } else {
            throw new Error(res.result.message)
          }

        } catch (error) {
          console.error('完整初始化失败:', error)
          wx.showModal({
            title: '初始化失败',
            content: `初始化过程中出现错误：${error.message}\n\n请检查网络连接和云函数配置，然后重试。`,
            showCancel: false
          })
        } finally {
          wx.hideLoading()
          this.setData({ fullIniting: false })
        }
      }
    })
  },

  // 测试戏剧回响功能
  testVoiceEcho() {
    wx.navigateTo({
      url: '/pages/voice-echo/voice-echo'
    })
  },

  // 前往语音包管理
  goToVoiceAdmin() {
    wx.navigateTo({
      url: '/pages/voice-admin/voice-admin'
    })
  }
})