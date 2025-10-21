Page({
  data: {
    loading: false,
    result: null,
    indexes: []
  },

  onLoad() {
    console.log('索引优化页面加载')
  },

  // 执行索引优化
  async runOptimization() {
    try {
      this.setData({ loading: true, result: null })

      wx.showLoading({
        title: '优化中...',
        mask: true
      })

      const result = await wx.cloud.callFunction({
        name: 'optimizeDatabaseIndexes',
        data: {}
      })

      wx.hideLoading()

      if (result.result.code === 0) {
        const data = result.result.data
        this.setData({
          result: 'success',
          indexes: data.analysis,
          recommendations: data.recommendations,
          performanceStats: data.performanceStats
        })

        wx.showModal({
          title: '分析完成',
          content: `数据库性能分析完成！\n\n分析集合数量: ${data.totalCollections}\n\n${data.note}`,
          confirmText: '查看建议',
          cancelText: '知道了',
          success: (res) => {
            if (res.confirm) {
              this.viewDetails()
            }
          }
        })
      } else {
        this.setData({ result: 'error' })
        wx.showToast({
          title: '分析失败',
          icon: 'error'
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('索引优化失败:', error)
      this.setData({ result: 'error' })
      wx.showToast({
        title: '优化失败',
        icon: 'error'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 查看详细结果
  viewDetails() {
    if (!this.data.recommendations) return

    const recommendations = this.data.recommendations.join('\n')
    
    wx.showModal({
      title: '索引优化建议',
      content: recommendations,
      showCancel: false,
      confirmText: '知道了'
    })
  }
})
