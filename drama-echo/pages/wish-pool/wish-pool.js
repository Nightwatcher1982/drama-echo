const app = getApp()

Page({
  data: {
    wishes: [],
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 10,
    showWishModal: false,
    wishActor: '',
    wishMessage: '',
    wishOther: '',
    canSubmitWish: false,
    canWishToday: true
  },

  onLoad() {
    this.loadWishes()
    this.checkWishPermission()
  },

  onShow() {
    // 页面显示时检查许愿权限
    this.checkWishPermission()
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  },

  // 检查许愿权限
  async checkWishPermission() {
    try {
      // 使用app的登录状态检查方法
      if (!app.checkLoginStatus()) {
        this.setData({ canWishToday: false })
        return
      }

      const userInfo = await this.getUserInfo()
      if (!userInfo) {
        this.setData({ canWishToday: false })
        return
      }

      // 直接使用数据库操作检查今天是否已许愿
      const db = wx.cloud.database()
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const existingWish = await db.collection('wishes')
        .where({
          userId: userInfo.openid || userInfo.nickName, // 兼容不同的用户标识
          createdAt: db.command.gte(today).and(db.command.lt(tomorrow))
        })
        .get()

      const canWish = existingWish.data.length === 0
      this.setData({ canWishToday: canWish })

    } catch (error) {
      console.error('检查许愿权限失败:', error)
      // 如果出错，默认允许许愿
      this.setData({ canWishToday: true })
    }
  },

  // 加载许愿列表
  async loadWishes() {
    if (this.data.loading || !this.data.hasMore) return

    try {
      this.setData({ loading: true })

      // 直接使用数据库操作，避免云函数问题
      const db = wx.cloud.database()
      const skip = (this.data.page - 1) * this.data.pageSize

      // 获取许愿列表
      const result = await db.collection('wishes')
        .where({
          status: 'active'
        })
        .orderBy('wishCount', 'desc')
        .orderBy('createdAt', 'desc')
        .skip(skip)
        .limit(this.data.pageSize)
        .get()

      // 获取总数
      const countResult = await db.collection('wishes')
        .where({
          status: 'active'
        })
        .count()

      const total = countResult.total
      const totalPages = Math.ceil(total / this.data.pageSize)
      
      // 处理许愿数据，添加等级和点赞状态
      const processedWishes = result.data.map(wish => ({
        ...wish,
        level: this.getWishLevel(wish.wishCount),
        liked: false // 这里需要根据用户点赞记录设置
      }))

      const newWishes = this.data.page === 1 ? processedWishes : [...this.data.wishes, ...processedWishes]
      
      this.setData({
        wishes: newWishes,
        hasMore: this.data.page < totalPages,
        loading: false
      })

    } catch (error) {
      console.error('加载许愿失败:', error)
      
      // 如果是集合不存在，显示空状态
      if (error.message && error.message.includes('collection not exists')) {
        this.setData({
          wishes: [],
          hasMore: false,
          loading: false
        })
        return
      }
      
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
      this.setData({ loading: false })
    }
  },

  // 获取许愿等级
  getWishLevel(wishCount) {
    if (wishCount >= 50) return 5
    if (wishCount >= 20) return 4
    if (wishCount >= 10) return 3
    if (wishCount >= 5) return 2
    return 1
  },

  // 加载更多
  onLoadMore() {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({
        page: this.data.page + 1
      })
      this.loadWishes()
    }
  },

  // 显示许愿弹窗
  async showWishModal() {
    if (!this.data.canWishToday) {
      wx.showToast({
        title: '今天已经许过愿了',
        icon: 'none'
      })
      return
    }

    // 使用app的登录状态检查方法
    if (!app.checkLoginStatus()) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    this.setData({
      showWishModal: true,
      wishActor: '',
      wishMessage: '',
      wishOther: '',
      canSubmitWish: false
    })
  },

  // 关闭许愿弹窗
  closeWishModal() {
    this.setData({
      showWishModal: false,
      wishActor: '',
      wishMessage: '',
      wishOther: '',
      canSubmitWish: false
    })
  },

  // 防止弹窗关闭
  preventClose() {
    // 空函数，防止点击内容区域关闭弹窗
  },

  // 演员姓名输入
  onActorInput(e) {
    this.setData({
      wishActor: e.detail.value
    })
    this.checkCanSubmit()
  },

  // 希望听到的话输入
  onMessageInput(e) {
    this.setData({
      wishMessage: e.detail.value
    })
    this.checkCanSubmit()
  },

  // 其他内容输入
  onOtherInput(e) {
    this.setData({
      wishOther: e.detail.value
    })
    this.checkCanSubmit()
  },

  // 检查是否可以提交
  checkCanSubmit() {
    const { wishActor, wishMessage } = this.data
    const canSubmit = wishActor.trim().length > 0 && wishMessage.trim().length > 0
    this.setData({
      canSubmitWish: canSubmit
    })
  },

  // 提交许愿
  async submitWish() {
    const { wishActor, wishMessage, wishOther } = this.data
    
    if (!wishActor.trim()) {
      wx.showToast({
        title: '请输入演员姓名',
        icon: 'none'
      })
      return
    }

    if (!wishMessage.trim()) {
      wx.showToast({
        title: '请输入希望听到的话',
        icon: 'none'
      })
      return
    }

    if (wishActor.length > 10) {
      wx.showToast({
        title: '演员姓名不能超过10字',
        icon: 'none'
      })
      return
    }

    if (wishMessage.length > 100) {
      wx.showToast({
        title: '希望听到的话不能超过100字',
        icon: 'none'
      })
      return
    }

    if (wishOther.length > 100) {
      wx.showToast({
        title: '其他内容不能超过100字',
        icon: 'none'
      })
      return
    }

    try {
      wx.showLoading({ title: '许愿中...' })

      // 使用app的登录状态检查方法
      if (!app.checkLoginStatus()) {
        throw new Error('请先登录')
      }

      const userInfo = await this.getUserInfo()
      if (!userInfo) {
        throw new Error('获取用户信息失败')
      }

      // 直接使用数据库操作创建许愿
      const db = wx.cloud.database()
      
      // 检查今天是否已经许愿
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      
      const existingWish = await db.collection('wishes')
        .where({
          userId: userInfo.openid || userInfo.nickName,
          createdAt: db.command.gte(today).and(db.command.lt(tomorrow))
        })
        .get()
      
      if (existingWish.data.length > 0) {
        throw new Error('今天已经许过愿了')
      }

      // 组合许愿内容
      let content = `希望听到${wishActor.trim()}的声音：${wishMessage.trim()}`
      if (wishOther.trim()) {
        content += `\n其他：${wishOther.trim()}`
      }

      // 创建许愿
      const wishData = {
        content: content,
        actor: wishActor.trim(),
        message: wishMessage.trim(),
        other: wishOther.trim(),
        userId: userInfo.openid || userInfo.nickName,
        userName: userInfo.nickName || '匿名用户',
        userAvatar: userInfo.avatarUrl || '',
        wishCount: 0,
        createdAt: new Date(),
        status: 'active'
      }

      const result = await db.collection('wishes').add({
        data: wishData
      })

      wx.hideLoading()

      wx.showToast({
        title: '许愿成功！',
        icon: 'success'
      })
      
      this.closeWishModal()
      this.setData({
        page: 1,
        hasMore: true,
        wishes: [],
        canWishToday: false
      })
      this.loadWishes()

    } catch (error) {
      wx.hideLoading()
      console.error('许愿失败:', error)
      wx.showToast({
        title: error.message || '许愿失败',
        icon: 'none'
      })
    }
  },

  // 许愿点赞
  async onWishLike(e) {
    const { wishId, liked } = e.currentTarget.dataset
    
    if (liked) {
      wx.showToast({
        title: '已经点过赞了',
        icon: 'none'
      })
      return
    }

    try {
      // 使用app的登录状态检查方法
      if (!app.checkLoginStatus()) {
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        })
        return
      }

      const userInfo = await this.getUserInfo()
      if (!userInfo) {
        wx.showToast({
          title: '获取用户信息失败',
          icon: 'none'
        })
        return
      }

      const db = wx.cloud.database()
      const userId = userInfo.openid || userInfo.nickName

      // 检查是否已经点赞过
      const existingLike = await db.collection('wish_likes')
        .where({
          wishId: wishId,
          userId: userId
        })
        .get()

      if (existingLike.data.length > 0) {
        wx.showToast({
          title: '已经点过赞了',
          icon: 'none'
        })
        return
      }

      // 先添加点赞记录
      await db.collection('wish_likes').add({
        data: {
          wishId: wishId,
          userId: userId,
          createdAt: new Date()
        }
      })

      // 更新许愿的愿力数量
      await db.collection('wishes').doc(wishId).update({
        data: {
          wishCount: db.command.inc(1)
        }
      })

      // 更新本地许愿列表
      const wishes = this.data.wishes.map(wish => {
        if (wish._id === wishId) {
          return {
            ...wish,
            wishCount: wish.wishCount + 1,
            level: this.getWishLevel(wish.wishCount + 1),
            liked: true
          }
        }
        return wish
      })

      this.setData({ wishes })

      wx.showToast({
        title: '愿力+1',
        icon: 'success'
      })

    } catch (error) {
      console.error('点赞失败:', error)
      wx.showToast({
        title: error.message || '点赞失败',
        icon: 'none'
      })
    }
  },

  // 获取用户信息
  async getUserInfo() {
    try {
      // 优先从app.globalData.userProfile获取用户信息
      if (app.globalData.userProfile) {
        console.log('从globalData获取用户信息:', app.globalData.userProfile)
        return app.globalData.userProfile
      }

      // 如果globalData没有，尝试从本地存储获取
      const userProfile = wx.getStorageSync('userProfile')
      if (userProfile && userProfile.nickName) {
        console.log('从本地存储获取用户信息:', userProfile)
        app.globalData.userProfile = userProfile
        return userProfile
      }

      // 最后尝试获取用户授权
      const userInfo = await wx.getUserProfile({
        desc: '用于许愿和点赞'
      })

      if (userInfo && userInfo.userInfo) {
        console.log('通过授权获取用户信息:', userInfo.userInfo)
        app.globalData.userProfile = userInfo.userInfo
        return userInfo.userInfo
      }

      console.log('未找到用户信息')
      return null

    } catch (error) {
      console.error('获取用户信息失败:', error)
      return null
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.setData({
      page: 1,
      hasMore: true,
      wishes: []
    })
    this.loadWishes()
    this.checkWishPermission()
    wx.stopPullDownRefresh()
  },

  // 上拉加载更多
  onReachBottom() {
    this.onLoadMore()
  },

  // 创建数据库索引（临时方法）
  async createIndexes() {
    try {
      wx.showLoading({ title: '创建索引中...' })
      
      const result = await wx.cloud.callFunction({
        name: 'createIndexes'
      })

      wx.hideLoading()

      if (result.result.code === 0) {
        wx.showModal({
          title: '索引创建成功',
          content: '数据库索引已创建完成，现在可以正常使用许愿池功能了！',
          showCancel: false,
          confirmText: '确定'
        })
      } else {
        throw new Error(result.result.message || '创建索引失败')
      }

    } catch (error) {
      wx.hideLoading()
      console.error('创建索引失败:', error)
      wx.showModal({
        title: '创建索引失败',
        content: error.message || '请稍后重试',
        showCancel: false,
        confirmText: '确定'
      })
    }
  }
})
