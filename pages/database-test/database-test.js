Page({
  data: {
    checkResult: null,
    loading: false
  },

  onLoad() {
    console.log('数据库测试页面加载')
  },

  // 检查所有数据
  async checkAllData() {
    this.setData({ loading: true })
    
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
        this.setData({
          checkResult: res.result.data,
          loading: false
        })
        
        console.log('数据库检查结果:', res.result.data)
        
        wx.showToast({
          title: '检查完成',
          icon: 'success'
        })
      } else {
        throw new Error(res.result.message)
      }
    } catch (error) {
      wx.hideLoading()
      console.error('检查失败:', error)
      wx.showToast({
        title: '检查失败: ' + error.message,
        icon: 'none',
        duration: 3000
      })
      this.setData({ loading: false })
    }
  },

  // 检查星座数据
  async checkZodiacData() {
    this.setData({ loading: true })
    
    try {
      wx.showLoading({
        title: '检查星座数据...',
        mask: true
      })

      const res = await wx.cloud.callFunction({
        name: 'checkDatabaseData',
        data: { collection: 'zodiac_quotes' }
      })

      wx.hideLoading()

      if (res.result.code === 0) {
        console.log('星座数据检查结果:', res.result.data)
        wx.showModal({
          title: '星座数据检查',
          content: `总数: ${res.result.data.zodiac_quotes.total_count}条\n12个星座数据分布：\n${Object.entries(res.result.data.zodiac_quotes.zodiac_distribution).map(([k,v]) => `${k}: ${v}条`).join('\\n')}`,
          showCancel: false
        })
      } else {
        throw new Error(res.result.message)
      }
    } catch (error) {
      wx.hideLoading()
      console.error('检查失败:', error)
      wx.showToast({
        title: '检查失败',
        icon: 'none'
      })
    }
    
    this.setData({ loading: false })
  },

  // 检查心情数据
  async checkMoodData() {
    this.setData({ loading: true })
    
    try {
      wx.showLoading({
        title: '检查心情数据...',
        mask: true
      })

      const res = await wx.cloud.callFunction({
        name: 'checkDatabaseData',
        data: { collection: 'mood_quotes' }
      })

      wx.hideLoading()

      if (res.result.code === 0) {
        console.log('心情数据检查结果:', res.result.data)
        const moodList = Object.entries(res.result.data.mood_quotes.mood_distribution)
          .map(([k,v]) => `${k}: ${v}条`).join('\\n')
        wx.showModal({
          title: '心情数据检查',
          content: `总数: ${res.result.data.mood_quotes.total_count}条\n心情分布：\n${moodList}`,
          showCancel: false
        })
      } else {
        throw new Error(res.result.message)
      }
    } catch (error) {
      wx.hideLoading()
      console.error('检查失败:', error)
      wx.showToast({
        title: '检查失败',
        icon: 'none'
      })
    }
    
    this.setData({ loading: false })
  },

  // 测试获取星座数据
  async testGetZodiac() {
    try {
      wx.showLoading({
        title: '测试星座数据...',
        mask: true
      })

      const res = await wx.cloud.callFunction({
        name: 'getZodiacQuotes',
        data: { zodiac: '白羊座' }
      })

      wx.hideLoading()

      if (res.result.code === 0) {
        console.log('白羊座数据:', res.result.data)
        wx.showModal({
          title: '白羊座数据测试',
          content: `获取到 ${res.result.data.length} 条白羊座数据\n第一条: ${res.result.data[0].chinese}`,
          showCancel: false
        })
      } else {
        throw new Error(res.result.message)
      }
    } catch (error) {
      wx.hideLoading()
      console.error('测试失败:', error)
      wx.showToast({
        title: '测试失败',
        icon: 'none'
      })
    }
  },

  // 测试获取心情数据
  async testGetMood() {
    try {
      wx.showLoading({
        title: '测试心情数据...',
        mask: true
      })

      const res = await wx.cloud.callFunction({
        name: 'getMoodQuotes',
        data: { mood: '抢到票啦' }
      })

      wx.hideLoading()

      if (res.result.code === 0) {
        console.log('抢到票啦数据:', res.result.data)
        wx.showModal({
          title: '心情数据测试',
          content: `获取到 ${res.result.data.length} 条"抢到票啦"数据\n第一条: ${res.result.data[0].chinese}`,
          showCancel: false
        })
      } else {
        throw new Error(res.result.message)
      }
    } catch (error) {
      wx.hideLoading()
      console.error('测试失败:', error)
      wx.showToast({
        title: '测试失败',
        icon: 'none'
      })
    }
  }
})