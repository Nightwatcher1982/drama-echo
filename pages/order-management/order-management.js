const app = getApp()

Page({
  data: {
    orders: [],
    loading: false,
    currentTab: 'all', // all, pending, paid, refunded
    tabs: [
      { key: 'all', name: '全部' },
      { key: 'pending', name: '待支付' },
      { key: 'paid', name: '已支付' },
      { key: 'refunded', name: '已退款' }
    ],
    page: 1,
    pageSize: 10,
    hasMore: true
  },

  onLoad() {
    this.loadOrders()
  },

  onShow() {
    // 页面显示时刷新订单列表
    this.refreshOrders()
  },

  // 切换标签
  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({
      currentTab: tab,
      page: 1,
      hasMore: true,
      orders: []
    })
    this.loadOrders()
  },

  // 加载订单列表
  async loadOrders() {
    if (this.data.loading || !this.data.hasMore) return

    try {
      this.setData({ loading: true })

      const userInfo = await this.getUserInfo()
      if (!userInfo) {
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        })
        return
      }

      const result = await wx.cloud.callFunction({
        name: 'getUserOrders',
        data: {
          userId: userInfo.openid,
          status: this.data.currentTab === 'all' ? null : this.data.currentTab,
          page: this.data.page,
          pageSize: this.data.pageSize
        }
      })

      if (result.result.code === 0) {
        const { orders, total, totalPages } = result.result.data
        const newOrders = this.data.page === 1 ? orders : [...this.data.orders, ...orders]
        
        this.setData({
          orders: newOrders,
          hasMore: this.data.page < totalPages,
          loading: false
        })
      } else {
        throw new Error(result.result.message || '获取订单失败')
      }

    } catch (error) {
      console.error('加载订单失败:', error)
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      })
      this.setData({ loading: false })
    }
  },

  // 刷新订单列表
  async refreshOrders() {
    this.setData({
      page: 1,
      hasMore: true,
      orders: []
    })
    await this.loadOrders()
  },

  // 加载更多
  onLoadMore() {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({
        page: this.data.page + 1
      })
      this.loadOrders()
    }
  },

  // 查看订单详情
  onOrderDetail(e) {
    const orderId = e.currentTarget.dataset.orderId
    wx.navigateTo({
      url: `/pages/order-detail/order-detail?orderId=${orderId}`
    })
  },

  // 申请退款
  async onRefund(e) {
    const orderId = e.currentTarget.dataset.orderId
    const order = this.data.orders.find(o => o.orderId === orderId)
    
    if (!order) {
      wx.showToast({
        title: '订单不存在',
        icon: 'none'
      })
      return
    }

    // 显示退款原因选择
    const refundReasons = [
      '不想要了',
      '买错了',
      '质量问题',
      '其他原因'
    ]

    const result = await wx.showActionSheet({
      itemList: refundReasons
    })

    if (result.tapIndex >= 0) {
      const refundReason = refundReasons[result.tapIndex]
      await this.processRefund(orderId, refundReason)
    }
  },

  // 处理退款
  async processRefund(orderId, refundReason) {
    try {
      wx.showLoading({ title: '处理退款中...' })

      const result = await wx.cloud.callFunction({
        name: 'refundOrder',
        data: {
          orderId: orderId,
          refundReason: refundReason
        }
      })

      wx.hideLoading()

      if (result.result.code === 0) {
        wx.showToast({
          title: '退款申请成功',
          icon: 'success'
        })
        
        // 刷新订单列表
        await this.refreshOrders()
      } else {
        wx.showToast({
          title: result.result.message || '退款失败',
          icon: 'none'
        })
      }

    } catch (error) {
      wx.hideLoading()
      console.error('退款失败:', error)
      wx.showToast({
        title: '退款失败，请重试',
        icon: 'none'
      })
    }
  },

  // 获取用户信息
  async getUserInfo() {
    try {
      let userInfo = wx.getStorageSync('userInfo')
      
      if (!userInfo) {
        const result = await wx.cloud.callFunction({
          name: 'login'
        })
        
        if (result.result.code === 0) {
          userInfo = result.result.data
          wx.setStorageSync('userInfo', userInfo)
        }
      }
      
      return userInfo
    } catch (error) {
      console.error('获取用户信息失败:', error)
      return null
    }
  },

  // 下拉刷新
  async onPullDownRefresh() {
    await this.refreshOrders()
    wx.stopPullDownRefresh()
  },

  // 上拉加载更多
  onReachBottom() {
    this.onLoadMore()
  }
})
