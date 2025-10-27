const app = getApp()
const UserStateManager = require('../../utils/userStateManager.js')

Page({
  data: {
    // 页面状态
    pageReady: false,
    
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
    actorAvatars: [],
    // 演员头像加载状态
    actorAvatarsLoaded: false
  },
  
  onLoad() {
    // 立即显示页面，异步加载数据
    this.setData({
      pageReady: true
    })
    
    // 异步初始化页面
    this.initializePage()
  },
  
  onShow() {
    // 只在必要时刷新用户状态，避免重复检查
    if (!this.data.userLoggedIn) {
      this.refreshUserState()
    }
  },

  // 初始化页面
  async initializePage() {
    try {
      // 1. 并行加载关键数据
      const [userStateValid] = await Promise.all([
        this.refreshUserState(),
        this.loadActorAvatars() // 并行加载演员头像
      ])
      
      // 2. 加载其他数据（非阻塞）
      this.loadUserData()
      this.setTodayTheater()
      
      // 3. 添加云函数测试功能（开发环境）
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
      
      // 检查缓存，避免重复调用
      const cacheKey = 'userStateRefreshed'
      const lastRefresh = wx.getStorageSync(cacheKey)
      const now = Date.now()
      
      // 如果最近30秒内已经刷新过，跳过
      if (lastRefresh && (now - lastRefresh < 30 * 1000)) {
        console.log('📦 用户状态最近已刷新，跳过')
        UserStateManager.updatePageUserState(this)
        return
      }
      
      // 1. 检查并修复用户信息
      const userInfoValid = await UserStateManager.checkAndFixUserInfo()
      if (!userInfoValid) {
        console.log('⚠️ 用户信息无效，尝试刷新...')
        await UserStateManager.refreshUserInfo()
      }
      
      // 2. 更新页面用户状态
      UserStateManager.updatePageUserState(this)
      
      // 3. 记录刷新时间
      wx.setStorageSync(cacheKey, now)
      
      // 4. 如果用户已登录，重新加载数据
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

  // 检查登录状态（供其他页面调用）
  checkLoginStatus() {
    return app.checkLoginStatus()
  },
  
  loadUserData() {
    const userData = app.globalData.userData || {
      checkInDays: 0,
      moodRecords: [],
      favoriteTheaters: []
    }
    
    // 计算今日戏剧回响使用次数
    const todayUses = this.getTodayDramaEchoUses()
    
    // 计算总的戏剧笔记数量
    const totalNotes = (userData.dramaNotes && Array.isArray(userData.dramaNotes)) ? userData.dramaNotes.length : 0
    
    this.setData({
      userData,
      todayUses,
      totalNotes
    })
  },

  // 获取今日戏剧回响使用次数
  getTodayDramaEchoUses() {
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
  
  goToEcho() {
    // 直接进入戏剧回响页面，不需要登录
    wx.navigateTo({
      url: '/pages/voice-echo/voice-echo'
    })
  },

  // 跳转到个人中心
  goToProfile() {
    wx.navigateTo({
      url: '/pages/profile/profile'
    })
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
      imageUrl: 'cloud://cloud1-2gyb3dkq4c474fe4.636c-cloud1-2gyb3dkq4c474fe4-1371126028/images/xjhx-logo.png'
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
        
        if (data.voices && data.voices.length > 0) {
          console.log('- 语音列表:')
          data.voices.forEach((voice, index) => {
            console.log(`  ${index + 1}. ${voice.title}`)
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
  },

  // 加载演员头像数据
  async loadActorAvatars() {
    try {
      console.log('🎭 开始加载演员头像数据...')
      
      // 检查缓存
      const cacheKey = 'actorAvatars'
      const cachedAvatars = wx.getStorageSync(cacheKey)
      const cacheTime = wx.getStorageSync(cacheKey + '_time')
      const now = Date.now()
      
      // 如果缓存存在且未过期（5分钟），直接使用缓存
      if (cachedAvatars && cacheTime && (now - cacheTime < 5 * 60 * 1000)) {
        console.log('📦 使用缓存的演员头像数据')
        this.setData({
          actorAvatars: cachedAvatars,
          actorAvatarsLoaded: true
        })
        return
      }
      
      if (app.globalData.cloudEnabled) {
        const res = await wx.cloud.callFunction({
          name: 'getActors',
          data: {}
        })
        
        if (res.result && res.result.code === 0) {
          const actors = res.result.data
          console.log('✅ 获取到演员数据:', actors.length, '个演员')
          
          // 提取演员头像，最多显示8个
          const avatars = actors.slice(0, 8).map(actor => actor.imageUrl || actor.avatar)
          
          // 缓存数据
          wx.setStorageSync(cacheKey, avatars)
          wx.setStorageSync(cacheKey + '_time', now)
          
          this.setData({
            actorAvatars: avatars,
            actorAvatarsLoaded: true
          })
          
          console.log('✅ 演员头像已更新:', avatars.length, '个头像')
        } else {
          console.error('❌ 获取演员数据失败:', res.result?.message || '未知错误')
        }
      } else {
        console.log('⚠️ 云开发未启用，使用默认头像')
      }
    } catch (error) {
      console.error('❌ 加载演员头像失败:', error)
      // 保持默认头像不变
    }
  }
}) 