// 管理后台数据页面
const app = getApp()

Page({
  data: {
    isAuthed: false,
    adminPassword: '',
    currentTab: 'purchaseRecords',
    loading: false,
    
    // 购买记录数据
    purchaseRecords: [],
    purchasePage: 1,
    purchaseTotalPages: 1,
    
    // 粉丝排行榜数据
    fanRankings: [],
    rankingPage: 1,
    rankingTotalPages: 1,
    selectedActorId: '',
    selectedActorName: '',
    actors: [],
    
    // 语音包销售明细数据
    voicePackSales: [],
    salesPage: 1,
    salesTotalPages: 1,
    
    // 统计数据
    salesStats: {
      totalPurchases: 0,
      totalSales: 0,
      todayPurchases: 0,
      averageOrderValue: 0
    },
    userStats: {
      totalUsers: 0,
      purchasingUsers: 0,
      conversionRate: 0
    }
  },

  onLoad() {
    this.checkAuth()
  },

  // 检查管理员权限
  checkAuth() {
    const token = wx.getStorageSync('adminConsoleAuth')
    const allow = ['voice2024', 'admin123']
    const ok = !!(token && allow.includes(token.adminPassword) && Date.now() - token.ts < 3600000)
    this.setData({ isAuthed: ok })
    
    if (ok) {
      this.loadInitialData()
    }
  },

  // 管理员登录
  async authenticate() {
    const { adminPassword } = this.data
    const allow = ['voice2024', 'admin123']
    
    if (allow.includes(adminPassword)) {
      const token = {
        adminPassword: adminPassword,
        ts: Date.now()
      }
      wx.setStorageSync('adminConsoleAuth', token)
      this.setData({ isAuthed: true })
      this.loadInitialData()
    } else {
      wx.showToast({
        title: '密码错误',
        icon: 'none'
      })
    }
  },

  // 密码输入
  onPasswordInput(e) {
    this.setData({ adminPassword: e.detail.value })
  },

  // 加载初始数据
  async loadInitialData() {
    await Promise.all([
      this.loadActors(),
      this.loadSalesStats(),
      this.loadUserStats(),
      this.loadPurchaseRecords()
    ])
  },

  // 加载演员列表
  async loadActors() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'getActors'
      })
      
      if (res.result.code === 0) {
        this.setData({ actors: res.result.data })
      }
    } catch (error) {
      console.error('加载演员列表失败:', error)
    }
  },

  // 加载销售统计
  async loadSalesStats() {
    try {
      const res = await Promise.race([
        wx.cloud.callFunction({
          name: 'getAdminData',
          data: { dataType: 'salesStats' }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('请求超时')), 8000) // 8秒超时
        )
      ])
      
      if (res.result.code === 0) {
        this.setData({ salesStats: res.result.data })
      }
    } catch (error) {
      console.error('加载销售统计失败:', error)
      // 设置默认值，避免页面显示异常
      this.setData({
        salesStats: {
          totalPurchases: 0,
          totalSales: 0,
          todayPurchases: 0,
          averageOrderValue: 0
        }
      })
    }
  },

  // 加载用户统计
  async loadUserStats() {
    try {
      const res = await Promise.race([
        wx.cloud.callFunction({
          name: 'getAdminData',
          data: { dataType: 'userStats' }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('请求超时')), 8000) // 8秒超时
        )
      ])
      
      if (res.result.code === 0) {
        this.setData({ userStats: res.result.data })
      }
    } catch (error) {
      console.error('加载用户统计失败:', error)
      // 设置默认值，避免页面显示异常
      this.setData({
        userStats: {
          totalUsers: 0,
          purchasingUsers: 0,
          conversionRate: 0
        }
      })
    }
  },

  // 加载购买记录
  async loadPurchaseRecords(page = 1) {
    try {
      this.setData({ loading: true })
      
      const res = await Promise.race([
        wx.cloud.callFunction({
          name: 'getAdminData',
          data: {
            dataType: 'purchaseRecords',
            page: page,
            pageSize: 20
          }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('请求超时')), 10000) // 10秒超时
        )
      ])
      
      if (res.result.code === 0) {
        const { records, totalPages } = res.result.data
        this.setData({
          purchaseRecords: page === 1 ? records : [...this.data.purchaseRecords, ...records],
          purchasePage: page,
          purchaseTotalPages: totalPages
        })
      } else {
        throw new Error(res.result.message || '获取数据失败')
      }
    } catch (error) {
      console.error('加载购买记录失败:', error)
      if (error.message.includes('超时')) {
        wx.showToast({
          title: '数据加载超时，请重试',
          icon: 'none'
        })
      } else {
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        })
      }
    } finally {
      this.setData({ loading: false })
    }
  },

  // 加载粉丝排行榜
  async loadFanRankings(page = 1) {
    try {
      this.setData({ loading: true })
      
      const res = await wx.cloud.callFunction({
        name: 'getAdminData',
        data: {
          dataType: 'fanRankings',
          actorId: this.data.selectedActorId,
          page: page,
          pageSize: 20
        }
      })
      
      if (res.result.code === 0) {
        const { rankings, totalPages } = res.result.data
        this.setData({
          fanRankings: page === 1 ? rankings : [...this.data.fanRankings, ...rankings],
          rankingPage: page,
          rankingTotalPages: totalPages
        })
      }
    } catch (error) {
      console.error('加载粉丝排行榜失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 加载语音包销售明细
  async loadVoicePackSales(page = 1) {
    try {
      this.setData({ loading: true })
      
      const res = await Promise.race([
        wx.cloud.callFunction({
          name: 'getAdminData',
          data: {
            dataType: 'voicePackSales',
            page: page,
            pageSize: 20
          }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('请求超时')), 10000) // 10秒超时
        )
      ])
      
      if (res.result.code === 0) {
        const { salesDetails, totalPages } = res.result.data
        this.setData({
          voicePackSales: page === 1 ? salesDetails : [...this.data.voicePackSales, ...salesDetails],
          salesPage: page,
          salesTotalPages: totalPages
        })
      } else {
        throw new Error(res.result.message || '获取数据失败')
      }
    } catch (error) {
      console.error('加载语音包销售明细失败:', error)
      if (error.message.includes('超时')) {
        wx.showToast({
          title: '数据加载超时，请重试',
          icon: 'none'
        })
      } else {
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        })
      }
    } finally {
      this.setData({ loading: false })
    }
  },

  // 切换标签页
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ currentTab: tab })
    
    if (tab === 'fanRankings' && this.data.fanRankings.length === 0) {
      this.loadFanRankings()
    } else if (tab === 'voicePackSales' && this.data.voicePackSales.length === 0) {
      this.loadVoicePackSales()
    }
  },

  // 选择演员
  onActorChange(e) {
    const actorIndex = e.detail.value
    const actor = this.data.actors[actorIndex]
    this.setData({
      selectedActorId: actor ? actor._id : '',
      selectedActorName: actor ? actor.name : '',
      fanRankings: [],
      rankingPage: 1
    })
    
    if (actor) {
      this.loadFanRankings()
    }
  },

  // 加载更多购买记录
  loadMorePurchases() {
    if (this.data.purchasePage < this.data.purchaseTotalPages && !this.data.loading) {
      this.loadPurchaseRecords(this.data.purchasePage + 1)
    }
  },

  // 加载更多排行榜
  loadMoreRankings() {
    if (this.data.rankingPage < this.data.rankingTotalPages && !this.data.loading) {
      this.loadFanRankings(this.data.rankingPage + 1)
    }
  },

  // 加载更多销售明细
  loadMoreSales() {
    if (this.data.salesPage < this.data.salesTotalPages && !this.data.loading) {
      this.loadVoicePackSales(this.data.salesPage + 1)
    }
  },

  // 刷新数据
  async refreshData() {
    wx.showLoading({ title: '刷新中...' })
    
    try {
      await Promise.all([
        this.loadSalesStats(),
        this.loadUserStats()
      ])
      
      if (this.data.currentTab === 'purchaseRecords') {
        await this.loadPurchaseRecords(1)
      } else if (this.data.currentTab === 'fanRankings') {
        await this.loadFanRankings(1)
      } else if (this.data.currentTab === 'voicePackSales') {
        await this.loadVoicePackSales(1)
      }
      
      wx.showToast({
        title: '刷新成功',
        icon: 'success'
      })
    } catch (error) {
      wx.showToast({
        title: '刷新失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 格式化金额
  formatAmount(amount) {
    if (!amount || amount === 0) {
      return '0.00'
    }
    return (amount / 100).toFixed(2)
  },

  // 格式化时间
  formatTime(time) {
    if (!time) return '未知'
    const date = new Date(time)
    return date.toLocaleString('zh-CN')
  },

  // 退出登录
  logout() {
    wx.removeStorageSync('adminConsoleAuth')
    this.setData({ isAuthed: false })
  }
})
