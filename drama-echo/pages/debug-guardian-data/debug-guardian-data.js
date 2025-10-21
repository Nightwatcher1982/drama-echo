// 调试守护者数据页面
Page({
  data: {
    debugInfo: null,
    loading: false
  },

  onLoad() {
    console.log('🔍 调试守护者数据页面加载')
  },

  // 调试守护者数据
  async debugGuardianData() {
    try {
      this.setData({ loading: true })
      console.log('🔍 开始调试守护者数据...')

      const res = await wx.cloud.callFunction({
        name: 'debugGuardianData'
      })

      if (res.result.code === 0) {
        this.setData({
          debugInfo: res.result.data
        })
        
        console.log('✅ 调试数据获取成功:', res.result.data)
        
        wx.showModal({
          title: '调试结果',
          content: `演员: ${res.result.data.actors}个\n语音包: ${res.result.data.voicePacks}个\n新购买记录: ${res.result.data.newPurchases}条\n旧购买记录: ${res.result.data.oldPurchases}条\n粉丝榜: ${res.result.data.fanRanking}条\n\n守护者计数详情请查看控制台`,
          showCancel: false
        })
      } else {
        throw new Error(res.result.message || '调试失败')
      }
    } catch (error) {
      console.error('❌ 调试守护者数据失败:', error)
      wx.showToast({
        title: error.message || '调试失败',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  }
})
