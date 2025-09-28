Page({
  data: {
    loading: false,
    result: null
  },

  onLoad() {
    console.log('数据填充测试页面加载')
  },

  // 填充测试数据
  async populateData() {
    this.setData({ loading: true, result: null })
    
    try {
      wx.showLoading({
        title: '填充数据中...',
        mask: true
      })

      const res = await wx.cloud.callFunction({
        name: 'populateTestData'
      })

      wx.hideLoading()

      console.log('数据填充结果:', res)

      if (res.result.code === 0) {
        this.setData({
          result: {
            success: true,
            message: res.result.message,
            zodiacCount: res.result.data.zodiacCount,
            moodCount: res.result.data.moodCount
          },
          loading: false
        })
        
        wx.showToast({
          title: '数据填充成功！',
          icon: 'success',
          duration: 3000
        })
      } else {
        throw new Error(res.result.message)
      }
    } catch (error) {
      wx.hideLoading()
      console.error('填充数据失败:', error)
      
      this.setData({
        result: {
          success: false,
          message: '填充失败: ' + error.message
        },
        loading: false
      })
      
      wx.showToast({
        title: '填充失败',
        icon: 'none',
        duration: 3000
      })
    }
  },

  // 清空数据
  async clearData() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有测试数据吗？此操作不可恢复。',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({
              title: '清空数据中...',
              mask: true
            })

            // 这里可以调用清空数据的云函数
            // 暂时用populateTestData的清空功能
            await wx.cloud.callFunction({
              name: 'populateTestData',
              data: { clearOnly: true }
            })

            wx.hideLoading()
            
            this.setData({
              result: {
                success: true,
                message: '数据已清空'
              }
            })
            
            wx.showToast({
              title: '数据已清空',
              icon: 'success'
            })
          } catch (error) {
            wx.hideLoading()
            console.error('清空数据失败:', error)
            wx.showToast({
              title: '清空失败',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  // 检查数据
  async checkData() {
    try {
      wx.showLoading({
        title: '检查数据中...',
        mask: true
      })

      const res = await wx.cloud.callFunction({
        name: 'checkDatabaseData'
      })

      wx.hideLoading()

      if (res.result.code === 0) {
        const data = res.result.data
        const zodiacCount = data.zodiac_quotes ? data.zodiac_quotes.total_count : 0
        const moodCount = data.mood_quotes ? data.mood_quotes.total_count : 0
        
        wx.showModal({
          title: '数据统计',
          content: `星座数据：${zodiacCount} 条\n心情数据：${moodCount} 条`,
          showCancel: false
        })
      } else {
        throw new Error(res.result.message)
      }
    } catch (error) {
      wx.hideLoading()
      console.error('检查数据失败:', error)
      wx.showToast({
        title: '检查失败',
        icon: 'none'
      })
    }
  },

  // 测试魔法之书
  testMagicBook() {
    wx.navigateTo({
      url: '/pages/result/result?type=combined&zodiac=巨蟹座&mood=见到爱豆'
    })
  }
})