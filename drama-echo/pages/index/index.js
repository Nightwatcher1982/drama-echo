const app = getApp()
const UserStateManager = require('../../utils/userStateManager.js')

Page({
  data: {
    userData: {
      checkInDays: 0,
      moodRecords: [],
      favoriteTheaters: []
    },
    todayTheater: {},
    // 用户登录状态
    userLoggedIn: false,
    userProfile: null,
    displayName: '戏剧爱好者',
    userPurchaseCount: 897,
    // 新增数据显示
    todayUses: 0,
    totalNotes: 0,
    // nightwatcher管理员检测
    isNightWatcher: false,
    // 环境相关
    isRealDevice: false,
    // 演员头像数据
    actorAvatars: [
      'https://picsum.photos/100/100?random=1',
      'https://picsum.photos/100/100?random=2',
      'https://picsum.photos/100/100?random=3',
      'https://picsum.photos/100/100?random=4',
      'https://picsum.photos/100/100?random=5',
      'https://picsum.photos/100/100?random=6',
      'https://picsum.photos/100/100?random=7',
      'https://picsum.photos/100/100?random=8'
    ]
  },
  
  onLoad() {
    this.initializePage()
  },
  
  onShow() {
    this.refreshUserState()
  },

  // 初始化页面
  async initializePage() {
    try {
      // 1. 刷新用户状态
      await this.refreshUserState()
      
      // 2. 加载用户数据
      this.loadUserData()
      
      // 3. 设置今日剧院
      this.setTodayTheater()
      
      // 4. 加载用户购买记录
      await this.loadUserPurchaseCount()
      
      // 5. 加载演员头像数据
      await this.loadActorAvatars()
      
      // 6. 添加云函数测试功能（开发环境）
      if (wx.getSystemInfoSync().platform === 'devtools') {
        this.testCloudFunction = this.testVoicePackDetail
      }
    } catch (error) {
      console.error('页面初始化失败:', error)
    }
  },

  // 刷新用户状态
  async refreshUserState() {
    try {
      console.log('🔄 刷新用户状态...')
      
      // 1. 检查并修复用户信息
      const userInfoValid = await UserStateManager.checkAndFixUserInfo()
      if (!userInfoValid) {
        console.log('⚠️ 用户信息无效，尝试刷新...')
        await UserStateManager.refreshUserInfo()
      }
      
      // 2. 更新页面用户状态
      UserStateManager.updatePageUserState(this)
      
      // 3. 如果用户已登录，重新加载数据
      if (UserStateManager.checkLoginStatus()) {
        this.loadUserData()
      }
      
    } catch (error) {
      console.error('刷新用户状态失败:', error)
      // 降级处理：直接更新页面状态
      UserStateManager.updatePageUserState(this)
    }
  },

  // 更新登录状态
  updateLoginStatus() {
    const userProfile = app.globalData.userProfile || null
    const isNightWatcher = userProfile && userProfile.nickName && 
      userProfile.nickName.toLowerCase() === 'nightwatcher'
    
    // 处理用户昵称显示
    let displayName = '戏剧爱好者'
    let showCustomizeHint = false
    
    if (userProfile && userProfile.nickName) {
      if (userProfile.isCustomized && userProfile.nickName !== '微信用户') {
        // 用户已自定义昵称（包括通过头像昵称选择器设置的）
        displayName = userProfile.nickName
        console.log('🎭 使用用户自定义昵称:', displayName, '来源:', userProfile.dataSource || 'unknown')
      } else if (userProfile.nickName === '微信用户' || userProfile.isWechatDefault) {
        // 微信默认昵称，显示友好提示并提供自定义选项
        displayName = '戏剧爱好者'
        showCustomizeHint = true
        console.log('🎭 检测到微信默认昵称，显示友好昵称并提示自定义')
      } else {
        // 真实的微信昵称
        displayName = userProfile.nickName
        console.log('🎭 使用微信真实昵称:', displayName)
      }
    } else {
      console.log('🎭 使用默认昵称:', displayName)
    }
    
    this.setData({
      userLoggedIn: app.globalData.userLoggedIn || false,
      userProfile: userProfile,
      displayName: displayName,
      showCustomizeHint: showCustomizeHint,
      isNightWatcher: isNightWatcher,
      isRealDevice: app.globalData.isRealDevice || false
    })
    
    if (isNightWatcher) {
      console.log('🎭 检测到Nightwatcher管理员用户:', userProfile.nickName)
    }
  },

  // 处理用户登录
  async handleLogin(e) {
    try {
      wx.showLoading({
        title: '登录中...',
        mask: true
      })

      // 调用app中的授权方法
      await app.authorizeUser()
      
      // 更新页面登录状态
      this.updateLoginStatus()
      
      wx.hideLoading()
      
      // 重新加载用户数据
      this.loadUserData()
      
      wx.showToast({
        title: '登录成功！',
        icon: 'success'
      })
      
    } catch (error) {
      wx.hideLoading()
      console.error('登录失败:', error)
      
      if (error.errMsg && (error.errMsg.includes('deny') || error.errMsg.includes('cancel'))) {
        wx.showModal({
          title: '温馨提示',
          content: '需要您的授权才能使用完整功能哦～',
          showCancel: false,
          confirmText: '知道了'
        })
      } else if (error.errMsg && error.errMsg.includes('can only be invoked by user TAP gesture')) {
        wx.showModal({
          title: '授权提示',
          content: '请点击登录按钮完成授权',
          showCancel: false,
          confirmText: '知道了'
        })
      } else if (error.errMsg && error.errMsg.includes('desc length does not meet the requirements')) {
        wx.showModal({
          title: '授权配置错误',
          content: '登录参数配置有误，请联系开发者修复',
          showCancel: false,
          confirmText: '知道了'
        })
      } else {
        wx.showToast({
          title: '登录失败，请重试',
          icon: 'none'
        })
      }
    }
  },
  
  loadUserData() {
    const userData = app.globalData.userData || {
      checkInDays: 0,
      moodRecords: [],
      favoriteTheaters: []
    }
    
    // 计算今日魔法书使用次数
    const todayUses = this.getTodayMagicBookUses()
    
    // 计算总的戏剧笔记数量
    const totalNotes = (userData.dramaNotes && Array.isArray(userData.dramaNotes)) ? userData.dramaNotes.length : 0
    
    this.setData({
      userData,
      todayUses,
      totalNotes
    })
  },

  // 获取今日魔法书使用次数
  getTodayMagicBookUses() {
    const userData = app.globalData.userData
    if (!userData) return 0
    
    const today = new Date().toDateString()
    const zodiacUsedCount = userData.zodiacUsedCount || 0
    const moodUsedCount = userData.moodUsedCount || 0
    const lastZodiacDate = userData.lastZodiacDate
    const lastMoodDate = userData.lastMoodDate
    
    // 计算今日已使用次数
    let todayCount = 0
    if (lastZodiacDate === today) todayCount += zodiacUsedCount
    if (lastMoodDate === today) todayCount += moodUsedCount
    
    return todayCount
  },
  
  setTodayTheater() {
    const theaters = app.globalData.theatersData
    if (theaters && theaters.length > 0) {
      const today = new Date().getDate()
      const todayTheater = theaters[today % theaters.length]
      this.setData({
        todayTheater
      })
    }
  },
  
  goToMagicBook() {
    if (!app.checkLoginStatus()) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }
    
    wx.navigateTo({
      url: '/pages/magicbook/magicbook'
    })
  },
  
  goToEcho() {
    // 检查登录状态
    if (!app.checkLoginStatus()) {
      wx.showModal({
        title: '需要登录',
        content: '请先登录后再体验戏剧回响功能',
        confirmText: '去登录',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            this.handleLogin()
          }
        }
      })
      return
    }

    wx.navigateTo({
      url: '/pages/voice-echo/voice-echo'
    })
  },

  goToWishPool() {
    wx.navigateTo({
      url: '/pages/wish-pool/wish-pool'
    })
  },

  // 跳转到个人中心
  goToProfile() {
    wx.navigateTo({
      url: '/pages/profile/profile'
    })
  },

  // 加载用户购买记录数量
  async loadUserPurchaseCount() {
    try {
      if (!app.checkLoginStatus()) {
        console.log('用户未登录，跳过购买记录加载')
        return
      }

      console.log('🔍 开始加载用户购买记录...')
      
      const result = await wx.cloud.callFunction({
        name: 'getUserPurchases',
        data: { userId: 'current' }
      })

      if (result.result.code === 0) {
        const purchases = result.result.data.purchases || []
        console.log('📦 用户购买记录:', purchases.length, '条')
        
        // 计算总购买数量（考虑purchaseCount字段）
        const totalPurchaseCount = purchases.reduce((total, purchase) => {
          return total + (purchase.purchaseCount || 1)
        }, 0)
        
        console.log('📊 用户总购买数量:', totalPurchaseCount)
        this.setData({ userPurchaseCount: totalPurchaseCount })
      } else {
        console.error('获取用户购买记录失败:', result.result.message)
        this.setData({ userPurchaseCount: 0 })
      }
    } catch (error) {
      console.error('加载用户购买记录失败:', error)
      this.setData({ userPurchaseCount: 0 })
    }
  },

  // 加载演员头像数据
  async loadActorAvatars() {
    try {
      console.log('🔍 开始加载演员头像数据...')
      
      const result = await wx.cloud.callFunction({
        name: 'getActors'
      })

      if (result.result.code === 0) {
        const actors = result.result.data || []
        console.log('👥 获取到演员数据:', actors.length, '个')
        
        // 提取演员的封面照片作为头像
        const actorAvatars = actors.map(actor => {
          // 优先使用封面照片，如果没有则使用图片库第一张
          return actor.imageUrl || (actor.images && actor.images[0]) || '/images/default-actor.png'
        })
        
        console.log('🖼️ 演员头像数据:', actorAvatars)
        this.setData({ actorAvatars })
      } else {
        console.error('获取演员数据失败:', result.result.message)
        // 保持默认的模拟数据
      }
    } catch (error) {
      console.error('加载演员头像数据失败:', error)
      // 保持默认的模拟数据
    }
  },
  
  // 跳转到管理员助手
  goToAdminHelper() {
    wx.navigateTo({
      url: '/pages/admin-helper/admin-helper'
    })
  },
  
  // 分享功能
  onShareAppMessage() {
    return {
      title: '戏剧回响 - 聆听内心的戏剧回响',
      path: '/pages/index/index',
      imageUrl: '/images/share-cover.jpg'
    }
  },

  // 测试语音包详情云函数（开发环境）
  async testVoicePackDetail(packId = 'pack_001') {
    console.log('=== 测试语音包详情云函数 ===')
    
    try {
      if (!wx.cloud) {
        console.error('❌ 云开发环境未初始化')
        return
      }
      
      console.log(`正在获取语音包详情: ${packId}`)
      
      const result = await wx.cloud.callFunction({
        name: 'getVoicePackDetail',
        data: { packId }
      })
      
      console.log('云函数调用结果:', result)
      
      if (result.result && result.result.code === 0) {
        const data = result.result.data
        console.log('✅ 成功获取语音包详情:')
        console.log('- 语音包名称:', data.name)
        console.log('- 演员姓名:', data.actorName)
        console.log('- 语音数量:', data.voiceCount)
        console.log('- 套餐价格:', data.packagePrice / 100, '元')
        console.log('- 原价:', data.originalPrice / 100, '元')
        console.log('- 节省金额:', data.saveAmount / 100, '元')
        
        if (data.voices && data.voices.length > 0) {
          console.log('- 语音列表:')
          data.voices.forEach((voice, index) => {
            console.log(`  ${index + 1}. ${voice.title} - ¥${voice.price / 100}`)
          })
        }
        
        return data
      } else {
        console.error('❌ 获取失败:', result.result?.message || '未知错误')
        return null
      }
      
    } catch (error) {
      console.error('❌ 云函数调用异常:', error)
      return null
    }
  }
}) 