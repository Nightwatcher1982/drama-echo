const app = getApp()
const adminConfig = require('../../utils/adminConfig')

Page({
  data: {
    loading: false,
    result: null,
    isAdmin: false
  },

  onLoad() {
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

  // 插入数据
  async insertData() {
    if (this.data.loading) return
    
    this.setData({ loading: true })
    wx.showLoading({ title: '插入数据中...' })

    try {
      console.log('开始调用插入数据云函数')
      
      const res = await wx.cloud.callFunction({
        name: 'insertVoiceEchoData'
      })

      console.log('云函数返回结果:', res)

      if (res.result.code === 0) {
        this.setData({
          result: {
            success: true,
            message: res.result.message,
            data: res.result.data
          }
        })
        
        wx.showToast({
          title: '数据插入成功！',
          icon: 'success',
          duration: 2000
        })
        
        console.log('✅ 数据插入成功:', res.result.data)
        
      } else {
        throw new Error(res.result.message || '插入数据失败')
      }

    } catch (error) {
      console.error('插入数据失败:', error)
      
      this.setData({
        result: {
          success: false,
          message: error.message || '插入数据失败',
          data: null
        }
      })
      
      wx.showToast({
        title: error.message || '插入失败',
        icon: 'none',
        duration: 3000
      })
    } finally {
      this.setData({ loading: false })
      wx.hideLoading()
    }
  },

  // 测试戏剧回响
  testVoiceEcho() {
    wx.navigateTo({
      url: '/pages/voice-echo/voice-echo'
    })
  },

  // 返回
  goBack() {
    wx.navigateBack()
  }
})