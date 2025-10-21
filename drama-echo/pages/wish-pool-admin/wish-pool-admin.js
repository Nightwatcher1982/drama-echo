// 许愿池管理页面
Page({
  data: {
    loading: true,
    wishData: [],
    totalWishes: 0,
    totalSupports: 0,
    todayWishes: 0,
    todaySupports: 0,
    topWishes: [],
    currentTab: 'list', // 'list' 或 'stats'
    searchKeyword: '',
    filteredWishes: []
  },

  onLoad() {
    this.loadWishData()
  },

  onShow() {
    this.loadWishData()
  },

  // 加载许愿数据
  async loadWishData() {
    try {
      this.setData({ loading: true })

      // 获取许愿列表数据
      const wishResult = await wx.cloud.callFunction({
        name: 'getWishPoolData',
        data: {
          action: 'getWishData'
        }
      })

      // 获取统计信息
      const statsResult = await wx.cloud.callFunction({
        name: 'getWishPoolData',
        data: {
          action: 'getWishStats'
        }
      })

      if (wishResult.result.code === 0 && statsResult.result.code === 0) {
        const wishData = wishResult.result.data.wishes
        const stats = statsResult.result.data

        this.setData({
          wishData: wishData,
          filteredWishes: wishData,
          totalWishes: wishData.length,
          totalSupports: wishResult.result.data.totalSupports,
          todayWishes: stats.todayWishes,
          todaySupports: stats.todaySupports,
          topWishes: stats.topWishes
        })

        console.log('✅ 许愿池数据加载成功')
      } else {
        wx.showToast({
          title: '数据加载失败',
          icon: 'error'
        })
      }
    } catch (error) {
      console.error('加载许愿池数据失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 切换标签页
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({
      currentTab: tab
    })
  },

  // 搜索许愿内容
  onSearchInput(e) {
    const keyword = e.detail.value.toLowerCase()
    this.setData({
      searchKeyword: keyword
    })
    this.filterWishes()
  },

  // 过滤许愿数据
  filterWishes() {
    const { wishData, searchKeyword } = this.data
    let filteredWishes = wishData

    if (searchKeyword) {
      filteredWishes = wishData.filter(wish => 
        wish.content.toLowerCase().includes(searchKeyword) ||
        wish.userNickName.toLowerCase().includes(searchKeyword)
      )
    }

    this.setData({
      filteredWishes: filteredWishes
    })
  },

  // 刷新数据
  async refreshData() {
    await this.loadWishData()
    wx.showToast({
      title: '刷新成功',
      icon: 'success'
    })
  },

  // 查看许愿详情
  viewWishDetail(e) {
    const wish = e.currentTarget.dataset.wish
    const content = `许愿内容：${wish.content}\n\n许愿时间：${wish.createTimeFormatted}\n许愿用户：${wish.userNickName}\n助力数量：${wish.supportCount}`
    
    wx.showModal({
      title: '许愿详情',
      content: content,
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 格式化助力数量显示
  formatSupportCount(count) {
    if (count === 0) return '暂无助力'
    if (count < 10) return `${count} 人助力`
    if (count < 100) return `${count} 人助力`
    return `${count} 人助力`
  }
})
