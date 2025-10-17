const app = getApp()
const adminConfig = require('../../utils/adminConfig')
const UserStateManager = require('../../utils/userStateManager.js')

Page({
  data: {
    userInfo: {},
    displayName: '戏剧爱好者',
    userData: {},
    todayMagicBookUses: 0,
    purchasedVoicePacks: 0,
    myVoicePacks: [],
    isAdmin: false,
    // 头像昵称官方采集面板
    showEditorPanel: false,
    pendingAvatarUrl: '',
    pendingNickname: '',
    // 新用户引导层
    showOnboardingOverlay: false
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
      await this.loadData()
    } catch (error) {
      console.error('页面初始化失败:', error)
    }
  },

  // 刷新用户状态
  async refreshUserState() {
    try {
      console.log('🔄 个人中心刷新用户状态...')
      
      // 1. 检查并修复用户信息
      const userInfoValid = await UserStateManager.checkAndFixUserInfo()
      if (!userInfoValid) {
        console.log('⚠️ 用户信息无效，尝试刷新...')
        await UserStateManager.refreshUserInfo()
      }
      
      // 2. 重新加载数据
      await this.loadData()
      
    } catch (error) {
      console.error('刷新用户状态失败:', error)
      // 降级处理：直接加载数据
      await this.loadData()
    }
  },
  
  async loadData() {
    this.loadUserInfo()
    await this.loadUserData()
    this.calculateStats()
    this.checkAdminStatus()
    await this.loadVoicePacks()
  },
  
  // 加载用户数据
  async loadUserData() {
    try {
      const userData = app.globalData.userData || {}
      this.setData({ userData })
      
      // 戏剧笔记功能已移除
    } catch (error) {
      console.error('加载用户数据失败:', error)
      const userData = app.globalData.userData || {}
      this.setData({ userData })
    }
  },
  
  loadUserInfo() {
    try {
      // 使用用户状态管理器更新页面状态
      UserStateManager.updatePageUserState(this)
      
      // 额外设置userInfo字段以保持兼容性
      const userInfo = app.globalData.userProfile || {}
      this.setData({
        userInfo: userInfo
      })
      
      // 判断是否需要展示新手引导（仅在用户信息为默认或缺失头像时，且未完成引导）
      if (userInfo && userInfo.nickName) {
        const onboardingDone = wx.getStorageSync('onboardingDone')
        const needOnboarding = (
          userInfo.nickName === '微信用户' || 
          userInfo.isWechatDefault || 
          !userInfo.avatarUrl ||
          /^\d+\.?\d*$/.test(userInfo.nickName) // 纯数字昵称也需要引导
        )
        if (needOnboarding && !onboardingDone) {
          this.setData({ showOnboardingOverlay: true })
        }
      }
      
      console.log('✅ 个人中心用户信息已更新:', {
        userLoggedIn: app.globalData.userLoggedIn,
        displayName: this.data.displayName,
        hasAvatar: !!userInfo.avatarUrl,
        nickName: userInfo.nickName
      })
      
    } catch (error) {
      console.error('加载用户信息失败:', error)
      this.setData({
        userInfo: {
          nickName: '未登录用户',
          avatarUrl: '/images/default-avatar.png'
        },
        displayName: '戏剧爱好者',
        userLoggedIn: false
      })
    }
  },
  
  calculateStats() {
    const userData = app.globalData.userData
    if (userData) {
      // 计算今日魔法书使用次数
      const today = new Date().toDateString()
      const lastUsedDate = userData.lastUsedDate ? new Date(userData.lastUsedDate).toDateString() : ''
      
      if (today === lastUsedDate) {
        const todayUses = (userData.zodiacUsedCount || 0) + (userData.moodUsedCount || 0)
        this.setData({ todayMagicBookUses: todayUses })
      } else {
        this.setData({ todayMagicBookUses: 0 })
      }
    }
  },
  
  checkAdminStatus() {
    const userInfo = app.globalData.userProfile
    const openid = app.globalData.userOpenId
    if (openid && userInfo) {
      const isAdmin = adminConfig.isAdmin(openid, userInfo)
      this.setData({ isAdmin })
    }
  },
  
  // 加载已购买的语音包
  async loadVoicePacks() {
    try {
      if (!app.globalData.cloudEnabled) return
      
      const res = await wx.cloud.callFunction({
        name: 'getUserData'
      })
      
      if (res.result.code === 0 && res.result.data.purchases) {
        const purchases = res.result.data.purchases || []
        this.setData({ 
          purchasedVoicePacks: purchases.length,
          myVoicePacks: purchases.slice(0, 3).map(p => ({
            id: p.packId,
            name: p.packName,
            actorName: p.actorName,
            actorAvatar: p.actorAvatar || '🎭'
          }))
        })
      }
    } catch (error) {
      console.error('加载语音包失败:', error)
    }
  },
  
  // 编辑用户信息
  async editUserInfo() {
    try {
      // 检查登录状态
      if (!app.globalData.userLoggedIn) {
        wx.showModal({
          title: '需要登录',
          content: '请先登录后再修改个人信息',
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

      // 真机默认调起系统授权窗口；开发工具保持原有编辑面板
      if (app.globalData && app.globalData.isRealDevice) {
        await this.triggerSystemProfileAuth()
      } else {
        this.showUserProfileEditor()
      }
    } catch (error) {
      console.error('编辑用户信息失败:', error)
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
    }
  },

  // 真机：直接调起系统授权窗获取头像昵称
  async triggerSystemProfileAuth() {
    try {
      wx.showLoading({ title: '授权中...', mask: true })
      const res = await new Promise((resolve, reject) => {
        wx.getUserProfile({
          desc: '用于完善个人资料',
          success: resolve,
          fail: reject
        })
      })
      const info = res.userInfo || {}
      if (!info.nickName || info.nickName === '微信用户') {
        // 昵称仍为默认时，引导到官方头像昵称填写面板
        wx.hideLoading()
        this.setData({ showEditorPanel: true, pendingAvatarUrl: info.avatarUrl || '', pendingNickname: '' })
        wx.showToast({ title: '请设置个性昵称以完善资料', icon: 'none' })
        return
      }
      // 正常保存微信资料
      await this.saveWechatProfile(info)
      try { wx.setStorageSync('onboardingDone', true) } catch (e) {}
    } catch (e) {
      // 用户拒绝或失败，回退到编辑面板
      console.warn('系统授权失败或取消，回退到面板:', e)
      this.showUserProfileEditor()
    } finally {
      try { wx.hideLoading() } catch (_) {}
    }
  },

  // 显示用户信息编辑界面
  showUserProfileEditor() {
    wx.showActionSheet({
      itemList: ['选择微信头像和昵称', '自定义戏剧昵称'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 选择微信头像和昵称
          // 优先使用官方“头像昵称填写能力”
          this.setData({ showEditorPanel: true, pendingNickname: '', pendingAvatarUrl: '' })
        } else if (res.tapIndex === 1) {
          // 自定义戏剧昵称
          this.showCustomNicknameInput()
        }
      }
    })
  },

  // 官方头像昵称填写：选择头像
  onChooseAvatar(e) {
    const avatarUrl = e.detail && e.detail.avatarUrl ? e.detail.avatarUrl : ''
    if (avatarUrl) {
      this.setData({ pendingAvatarUrl: avatarUrl })
    }
  },

  // 官方头像昵称填写：输入昵称（type=nickname）
  onNicknameInput(e) {
    const val = (e.detail && e.detail.value) ? String(e.detail.value).trim() : ''
    this.setData({ pendingNickname: val })
  },

  // 关闭面板
  closeEditorPanel() {
    this.setData({ showEditorPanel: false })
  },

  // 保存官方头像昵称
  async saveEditorProfile() {
    const nickname = this.data.pendingNickname && this.data.pendingNickname.trim()
    const avatar = this.data.pendingAvatarUrl
    if (!nickname || nickname === '微信用户' || nickname.length < 2 || nickname.length > 20) {
      wx.showToast({ title: '请输入有效昵称', icon: 'none' })
      return
    }
    if (!avatar) {
      wx.showToast({ title: '请先选择头像', icon: 'none' })
      return
    }
    // 复用已有的保存逻辑（会自动上传头像并保存云端）
    this.closeEditorPanel()
    this.saveAvatarAndNickname(avatar, nickname)
  },

  // 选择微信头像和昵称
  async chooseWechatProfile() {
    try {
      // 检查是否支持新的头像选择API
      if (wx.chooseAvatar) {
        await this.chooseAvatarAndNickname()
      } else {
        // 降级到传统的 getUserProfile
        const profileRes = await this.getWechatUserProfile()
        
        if (profileRes) {
          // 检查是否真的需要保存（避免覆盖更好的用户信息）
          const currentProfile = app.globalData.userProfile
          if (!currentProfile || 
              currentProfile.nickName === '微信用户' || 
              !currentProfile.isCustomized) {
            // 只在当前没有更好信息时才保存微信信息
            this.saveWechatProfile(profileRes)
          } else {
            console.log('🎭 已有更好的用户信息，跳过微信信息保存')
            wx.showToast({
              title: '资料已是最新',
              icon: 'success'
            })
          }
        }
      }
    } catch (error) {
      console.error('获取微信信息失败:', error)
      
      if (error.errMsg && error.errMsg.includes('cancel')) {
        wx.showToast({
          title: '已取消选择',
          icon: 'none'
        })
      } else {
        wx.showToast({
          title: '获取信息失败',
          icon: 'none'
        })
      }
    }
  },

  // 使用新API选择头像和昵称
  async chooseAvatarAndNickname() {
    try {
      // 选择头像
      const avatarRes = await this.chooseAvatar()
      console.log('选择的头像:', avatarRes.avatarUrl)
      
      // 显示昵称输入框
      this.showNicknameInputWithAvatar(avatarRes.avatarUrl)
      
    } catch (error) {
      console.error('选择头像失败:', error)
      throw error
    }
  },

  // 选择头像
  chooseAvatar() {
    return new Promise((resolve, reject) => {
      wx.chooseAvatar({
        success: (res) => {
          resolve(res)
        },
        fail: (error) => {
          reject(error)
        }
      })
    })
  },

  // 显示昵称输入框（带头像预览）
  showNicknameInputWithAvatar(avatarUrl) {
    const currentProfile = app.globalData.userProfile || {}
    const currentNickname = currentProfile.nickName !== '微信用户' ? currentProfile.nickName : ''
    
    wx.showModal({
      title: '设置个人信息',
      content: '请输入您的昵称',
      editable: true,
      placeholderText: currentNickname || '请输入昵称',
      success: (res) => {
        if (res.confirm) {
          const nickname = res.content ? res.content.trim() : ''
          
          if (!nickname || nickname.length < 2) {
            wx.showToast({
              title: '请输入有效的昵称',
              icon: 'none'
            })
            return
          }
          
          // 保存头像和昵称
          this.saveAvatarAndNickname(avatarUrl, nickname)
        }
      }
    })
  },

  // 保存头像和昵称
  saveAvatarAndNickname(avatarUrl, nickname) {
    wx.showLoading({
      title: '保存中...',
      mask: true
    })

    try {
      // 上传头像到云存储（可选）
      this.uploadAvatarToCloud(avatarUrl).then((cloudAvatarUrl) => {
        // 创建更新的用户信息
        const updatedProfile = {
          nickName: nickname,
          avatarUrl: cloudAvatarUrl || avatarUrl, // 优先使用云存储URL
          isCustomized: true,
          dataSource: 'chooseAvatar',
          updatedTime: new Date().toISOString()
        }

        // 调用app的保存方法
        const finalProfile = app.saveCustomUserProfile(updatedProfile)
        
        // 更新界面显示
        this.setData({
          userInfo: finalProfile
        })
        
        wx.hideLoading()
        
        wx.showToast({
          title: '头像昵称更新成功！',
          icon: 'success'
        })
        
        // 标记引导完成
        try { wx.setStorageSync('onboardingDone', true) } catch (e) {}
        // 重新加载数据
        this.loadData()
        
      }).catch((uploadError) => {
        console.warn('头像上传失败，使用本地路径:', uploadError)
        
        // 即使上传失败，也保存本地头像路径
        const updatedProfile = {
          nickName: nickname,
          avatarUrl: avatarUrl,
          isCustomized: true,
          dataSource: 'chooseAvatar',
          updatedTime: new Date().toISOString()
        }

        const finalProfile = app.saveCustomUserProfile(updatedProfile)
        
        this.setData({
          userInfo: finalProfile
        })
        
        wx.hideLoading()
        
        wx.showToast({
          title: '信息更新成功！',
          icon: 'success'
        })
        
        try { wx.setStorageSync('onboardingDone', true) } catch (e) {}
        this.loadData()
      })
      
    } catch (error) {
      wx.hideLoading()
      console.error('保存头像昵称失败:', error)
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none'
      })
    }
  },

  // 上传头像到云存储
  async uploadAvatarToCloud(localPath) {
    try {
      if (!app.globalData.cloudEnabled) {
        throw new Error('云开发未启用')
      }
      
      const timestamp = Date.now()
      const openid = app.globalData.userOpenId
      const fileName = `avatars/${openid}_${timestamp}.jpg`
      
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: fileName,
        filePath: localPath
      })
      
      console.log('头像上传成功:', uploadRes.fileID)
      return uploadRes.fileID
      
    } catch (error) {
      console.error('头像上传失败:', error)
      throw error
    }
  },

  // 获取微信用户信息
  getWechatUserProfile() {
    return new Promise((resolve, reject) => {
      wx.getUserProfile({
        desc: '用于更新个人资料',
        success: (res) => {
          resolve(res.userInfo)
        },
        fail: (error) => {
          reject(error)
        }
      })
    })
  },

  // 保存微信信息到个人资料
  saveWechatProfile(wechatInfo) {
    wx.showLoading({
      title: '更新中...',
      mask: true
    })

    try {
      // 创建更新的用户信息
      const updatedProfile = {
        nickName: wechatInfo.nickName,
        avatarUrl: wechatInfo.avatarUrl,
        gender: wechatInfo.gender,
        country: wechatInfo.country,
        province: wechatInfo.province,
        city: wechatInfo.city,
        language: wechatInfo.language,
        isCustomized: false, // 通过微信获取的信息不标记为自定义
        dataSource: 'wechat', // 标记数据来源
        updatedTime: new Date().toISOString()
      }

      // 调用app的保存方法
      const finalProfile = app.saveCustomUserProfile(updatedProfile)
      
      // 更新界面显示
      this.setData({
        userInfo: finalProfile
      })
      
      wx.hideLoading()
      
      wx.showToast({
        title: '资料更新成功！',
        icon: 'success'
      })
      
      // 引导完成标记
      try { wx.setStorageSync('onboardingDone', true) } catch (e) {}
      // 重新加载数据
      this.loadData()
      
    } catch (error) {
      wx.hideLoading()
      console.error('保存微信信息失败:', error)
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none'
      })
    }
  },

  // 新手引导：一键授权并完善
  async startOneTapOnboarding() {
    try {
      wx.showLoading({ title: '授权中...', mask: true })
      const res = await new Promise((resolve, reject) => {
        wx.getUserProfile({
          desc: '用于完善个人资料',
          success: (r) => resolve(r),
          fail: reject
        })
      })

      const info = res.userInfo || {}
      // 如果昵称仍为“微信用户”，转用自定义面板
      if (!info.nickName || info.nickName === '微信用户') {
        wx.hideLoading()
        this.setData({ showOnboardingOverlay: false, showEditorPanel: true, pendingAvatarUrl: info.avatarUrl || '' })
        wx.showToast({ title: '请设置个性昵称以完善资料', icon: 'none' })
        return
      }

      // 正常保存微信资料
      await this.saveWechatProfile(info)
      this.setData({ showOnboardingOverlay: false })
      try { wx.setStorageSync('onboardingDone', true) } catch (e) {}
    } catch (error) {
      console.error('一键授权失败:', error)
      wx.showToast({ title: '已取消或失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  // 关闭新手引导
  dismissOnboarding() {
    this.setData({ showOnboardingOverlay: false })
  },

  // 显示自定义昵称输入框
  showCustomNicknameInput() {
    const currentProfile = app.globalData.userProfile || {}
    const currentNickname = currentProfile.isCustomized ? currentProfile.nickName : ''
    
    wx.showModal({
      title: '设置戏剧昵称',
      content: '请输入您的个性化戏剧昵称',
      editable: true,
      placeholderText: '例如：戏剧小王子',
      success: (res) => {
        if (res.confirm) {
          if (res.content && res.content.trim()) {
            const newNickname = res.content.trim()
            // 检查是否是提示内容或无效输入
            if (newNickname === '为自己设置一个有趣的戏剧昵称吧！' || 
                newNickname === '请输入您的个性化戏剧昵称' ||
                newNickname === '微信用户' ||
                newNickname.length < 2 ||
                /^\d+\.?\d*$/.test(newNickname)) { // 纯数字检查
              wx.showToast({
                title: '请输入有效的昵称',
                icon: 'none'
              })
              return
            }
            if (newNickname.length > 20) {
              wx.showToast({
                title: '昵称不能超过20个字符',
                icon: 'none'
              })
              return
            }
            this.saveCustomNickname(newNickname)
          } else {
            wx.showToast({
              title: '请输入昵称',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  // 保存自定义昵称
  saveCustomNickname(nickname) {
    wx.showLoading({
      title: '保存中...',
      mask: true
    })

    try {
      // 调用app的保存方法
      const updatedProfile = app.saveCustomUserProfile({
        nickName: nickname
      })
      
      // 更新界面显示
      this.setData({
        userInfo: updatedProfile
      })
      
      wx.hideLoading()
      
      wx.showToast({
        title: '昵称设置成功！',
        icon: 'success'
      })
      
      // 重新加载数据
      this.loadData()
      
    } catch (error) {
      wx.hideLoading()
      console.error('保存昵称失败:', error)
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none'
      })
    }
  },

  // 处理登录
  async handleLogin() {
    try {
      wx.showLoading({
        title: '登录中...',
        mask: true
      })

      await app.authorizeUser()
      
      // 更新页面数据
      await this.loadData()
      
      wx.hideLoading()
      
      wx.showToast({
        title: '登录成功！',
        icon: 'success'
      })
      
    } catch (error) {
      wx.hideLoading()
      console.error('登录失败:', error)
      
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'none'
      })
    }
  },
  
  // 跳转到戏剧魔法书
  goToMagicBook() {
    wx.navigateTo({
      url: '/pages/magicbook/magicbook'
    })
  },
  
  // 跳转到已购买的语音包列表
  goToVoiceEcho() {
    // 检查是否有购买的语音包
    if (this.data.purchasedVoicePacks === 0) {
      wx.showToast({
        title: '暂无购买的语音包',
        icon: 'none'
      })
      return
    }
    
    // 跳转到已购买的语音包列表页面
    wx.navigateTo({
      url: '/pages/purchased-voice-packs/purchased-voice-packs'
    })
  },

  // 跳转到戏剧回响页面（用于快捷入口）
  goToDramaEcho() {
    wx.navigateTo({
      url: '/pages/voice-echo/voice-echo'
    })
  },
  
  // 跳转到许愿池页面
  goToWishPool() {
    wx.navigateTo({
      url: '/pages/wish-pool/wish-pool'
    })
  },
  
  
  // 播放语音包
  playVoicePack(e) {
    const packId = e.currentTarget.dataset.packId
    wx.navigateTo({
      url: `/pages/voice-echo/voice-echo?packId=${packId}`
    })
  },
  
  // 管理员功能（长按头像进入）
  goToAdmin() {
    if (this.data.isAdmin) {
      wx.showActionSheet({
        itemList: ['戏剧回响管理', '语音管理', '管理助手'],
        success: (res) => {
          if (res.tapIndex === 0) {
            wx.navigateTo({
              url: '/pages/admin-console/admin-console'
            })
          } else if (res.tapIndex === 1) {
            wx.navigateTo({
              url: '/pages/admin-console/admin-console'
            })
          } else if (res.tapIndex === 2) {
            wx.navigateTo({
              url: '/pages/admin-helper/admin-helper'
            })
          }
        }
      })
    }
  },
  
  // 清除缓存
  clearData() {
    wx.showModal({
      title: '清除缓存',
      content: '确定要清除所有缓存数据吗？',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync()
          app.globalData.userData = {}
          this.setData({
            userData: {},
            todayMagicBookUses: 0,
            purchasedVoicePacks: 0,
            myVoicePacks: []
          })
          wx.showToast({
            title: '清除成功',
            icon: 'success'
          })
        }
      }
    })
  },
  
  // 关于应用
  aboutApp() {
    wx.showModal({
      title: '戏剧回响',
      content: '版本：v2.1.0\n\n让戏剧照亮你的每一天\n\n专为戏剧爱好者打造的生活记录应用，融合了戏剧魔法书、语音回响和笔记功能。',
      showCancel: false,
      confirmText: '知道了'
    })
  },
  
  // 联系我们
  contactUs() {
    wx.showModal({
      title: '联系我们',
      content: '邮箱：drama@modu.com\n微信：ModuDrama\n\n欢迎反馈意见和建议',
      showCancel: false,
      confirmText: '知道了'
    })
  },
  
  // 退出登录
  handleLogout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除用户信息
          app.globalData.userLoggedIn = false
          app.globalData.userProfile = null
          app.globalData.openid = null
          
          // 清除存储的用户信息
          wx.removeStorageSync('userProfile')
          wx.removeStorageSync('openid')
          
          this.setData({
            userInfo: {
              nickName: '未登录用户',
              avatarUrl: '/images/default-avatar.png'
            }
          })
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          })
          
          // 返回首页
          setTimeout(() => {
            wx.switchTab({
              url: '/pages/index/index'
            })
          }, 1500)
        }
      }
    })
  },
  
  // 分享设置
  onShareAppMessage() {
    return {
      title: '戏剧回响 - 让戏剧照亮你的每一天',
      path: '/pages/index/index',
      imageUrl: '/images/share-cover.png'
    }
  },
  
  onShareTimeline() {
    return {
      title: '戏剧回响 - 让戏剧照亮你的每一天',
      query: '',
      imageUrl: '/images/share-cover.png'
    }
  }
})