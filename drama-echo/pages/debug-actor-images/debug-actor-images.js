// 调试演员图片数据页面
Page({
  data: {
    debugInfo: null,
    loading: false
  },

  onLoad() {
    console.log('🔍 调试演员图片数据页面加载')
  },

  // 调试演员图片数据
  async debugActorImages() {
    try {
      this.setData({ loading: true })
      console.log('🔍 开始调试演员图片数据...')

      const res = await wx.cloud.callFunction({
        name: 'debugActorImages'
      })

      if (res.result.code === 0) {
        this.setData({
          debugInfo: res.result.data
        })
        
        console.log('✅ 调试数据获取成功:', res.result.data)
        
        const { issues, totalActors } = res.result.data
        
        wx.showModal({
          title: '演员图片数据调试结果',
          content: `总演员数: ${totalActors}\n\n问题统计:\n• 既无封面照片也无图片库: ${issues.noImages}个\n• 无封面照片但有图片库: ${issues.noCoverButHasGallery}个\n• 封面照片和图片库都存在: ${issues.hasBoth}个\n\n详细信息请查看控制台`,
          showCancel: false
        })
      } else {
        throw new Error(res.result.message || '调试失败')
      }
    } catch (error) {
      console.error('❌ 调试演员图片数据失败:', error)
      wx.showToast({
        title: error.message || '调试失败',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  }
})
