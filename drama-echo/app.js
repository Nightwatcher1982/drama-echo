App({
  onLaunch() {
    console.log('《魔都戏剧》小程序启动')
    
    // 检测运行环境
    this.detectEnvironment()
    
    // 添加全局错误处理
    this.setupGlobalErrorHandler()
    
    // 初始化云开发
    if (wx.cloud) {
      wx.cloud.init({
        env: 'cloud1-2gyb3dkq4c474fe4',
        traceUser: true
      })
      this.globalData.cloudEnabled = true
      console.log('云开发初始化成功')
    } else {
      console.log('当前微信版本不支持云开发')
      this.globalData.cloudEnabled = false
    }
    
    // 初始化用户登录状态
    this.initUserLogin()
  },
  
  // 设置全局错误处理
  setupGlobalErrorHandler() {
    // 捕获未处理的Promise错误
    wx.onUnhandledRejection((res) => {
      console.warn('未处理的Promise错误:', res.reason)
      // 对于文件访问错误，静默处理
      if (res.reason && res.reason.toString().includes('wxfile://')) {
        console.log('真机文件访问错误，已忽略')
        return
      }
      // 其他错误可能需要用户知道
      if (res.reason && !res.reason.toString().includes('backgroundfetch')) {
        console.error('应用错误:', res.reason)
      }
    })
    
    // 监听应用错误
    wx.onError((error) => {
      console.warn('应用运行时错误:', error)
      // 对于真机特有的错误，进行过滤
      if (error.includes('wxfile://') || error.includes('backgroundfetch')) {
        console.log('真机环境特有错误，已忽略')
        return
      }
    })
  },
  
  onShow() {
    console.log('小程序显示')
  },
  
  initUserData() {
    // 如果支持云开发，优先使用云端数据
    if (this.globalData.cloudEnabled) {
      this.initCloudUserData()
    } else {
      // 降级到本地存储
      this.initLocalUserData()
    }
  },

  // 云端用户数据初始化
  initCloudUserData() {
    wx.cloud.callFunction({
      name: 'getUserData'
    }).then(res => {
      if (res.result.code === 0) {
        this.globalData.userData = res.result.data
        console.log('云端用户数据加载成功')
        
        // 检查是否需要数据迁移
        this.checkAndMigrate()
        
        // 同步保存到本地作为备份，并标记为已迁移（避免重复提示）
        const dataToStore = { ...res.result.data, migrated: true }
        wx.setStorageSync('userData', dataToStore)
      } else {
        console.error('获取云端用户数据失败:', res.result.message)
        // 降级到本地存储
        this.initLocalUserData()
      }
    }).catch(error => {
      console.error('云函数调用失败:', error)
      // 降级到本地存储
      this.initLocalUserData()
    })
  },

  // 检查并执行迁移
  checkAndMigrate() {
    const localData = wx.getStorageSync('userData')
    
    // 如果本地有数据但未迁移，则执行迁移
    if (localData && !localData.migrated) {
      // 延迟执行迁移，确保UI已经加载完成
      setTimeout(() => {
        this.migrateLocalToCloud()
      }, 2000)
    }
  },

  // 数据迁移到云端
  migrateLocalToCloud() {
    const localData = wx.getStorageSync('userData')
    
    // 检查是否需要迁移
    if (!localData || localData.migrated) {
      console.log('无需迁移或已经迁移过')
      return
    }
    
    console.log('开始数据迁移...')
    
    // 显示迁移进度
    wx.showModal({
      title: '数据升级',
      content: '检测到本地数据，正在升级到云端以获得更好的体验...',
      showCancel: false,
      confirmText: '开始升级',
      success: (res) => {
        if (res.confirm) {
          this.executeDataMigration(localData)
        }
      }
    })
  },

  // 执行数据迁移
  executeDataMigration(localData) {
    wx.showLoading({
      title: '数据迁移中...',
      mask: true
    })
    
    // 使用专门的迁移云函数
    wx.cloud.callFunction({
      name: 'migrateUserData',
      data: { localData }
    }).then(res => {
      wx.hideLoading()
      
      if (res.result.code === 0) {
        // 迁移成功
        console.log('数据迁移成功:', res.result.migratedData)
        
        // 标记本地数据为已迁移
        localData.migrated = true
        localData.migratedAt = Date.now()
        wx.setStorageSync('userData', localData)
        
        // 重新加载云端数据
        this.initCloudUserData()
        
        wx.showModal({
          title: '升级完成！',
          content: `数据迁移成功！\n\n迁移内容：\n• 积分：${res.result.migratedData.points}戏剧币\n• 心情记录：${res.result.migratedData.moodRecords}条\n• 星座历史：${res.result.migratedData.zodiacHistory}条\n• 兑换记录：${res.result.migratedData.exchangeRecords}条\n\n现在您的数据已安全保存在云端！`,
          showCancel: false,
          confirmText: '太棒了！'
        })
        
      } else {
        console.error('数据迁移失败:', res.result.message)
        wx.showModal({
          title: '迁移失败',
          content: res.result.message + '\n\n不用担心，您的本地数据仍然安全，我们会继续使用本地存储。',
          showCancel: true,
          confirmText: '重试',
          cancelText: '稍后再试',
          success: (modalRes) => {
            if (modalRes.confirm) {
              // 重试迁移
              setTimeout(() => {
                this.executeDataMigration(localData)
              }, 1000)
            }
          }
        })
      }
      
    }).catch(error => {
      wx.hideLoading()
      console.error('迁移云函数调用失败:', error)
      
      wx.showModal({
        title: '网络问题',
        content: '数据迁移暂时无法完成，请检查网络连接后重试。\n\n您的本地数据依然安全有效。',
        showCancel: true,
        confirmText: '重试',
        cancelText: '稍后再试',
        success: (modalRes) => {
          if (modalRes.confirm) {
            // 重试迁移
            setTimeout(() => {
              this.executeDataMigration(localData)
            }, 1000)
          }
        }
      })
    })
  },

  // 本地用户数据初始化（备用方案）
  initLocalUserData() {
    try {
      const userData = wx.getStorageSync('userData')
      if (!userData) {
        const defaultData = {
          checkInDays: 0,
          lastCheckIn: null,
          favoriteTheaters: [],
          moodRecords: [],
          zodiacSign: null,
          // 使用次数追踪
          lastMoodShareDate: null,
          lastZodiacUseDate: null,
          dailyMoodShares: 0,
          dailyZodiacUses: 0,
          zodiacUsedCount: 0,
          moodUsedCount: 0,
          lastZodiacDate: null,
          lastMoodDate: null,
          // 历史记录
          zodiacHistory: [],
          moodHistory: [],
          dramaNotes: []
        }
        wx.setStorageSync('userData', defaultData)
        this.globalData.userData = defaultData
        console.log('本地用户数据初始化完成')
      } else {
        // 兼容旧数据，添加新字段
        if (!userData.lastMoodShareDate) userData.lastMoodShareDate = null
        if (!userData.lastZodiacUseDate) userData.lastZodiacUseDate = null
        if (typeof userData.dailyMoodShares !== 'number') userData.dailyMoodShares = 0
        if (typeof userData.dailyZodiacUses !== 'number') userData.dailyZodiacUses = 0
        if (typeof userData.zodiacUsedCount !== 'number') userData.zodiacUsedCount = 0
        if (typeof userData.moodUsedCount !== 'number') userData.moodUsedCount = 0
        if (!userData.userAddress || typeof userData.userAddress !== 'object') {
          userData.userAddress = {
            name: '',
            phone: '',
            province: '',
            city: '',
            district: '',
            detail: '',
            isDefault: true
          }
        }
        if (!Array.isArray(userData.exchangeRecords)) userData.exchangeRecords = []
        if (!Array.isArray(userData.zodiacHistory)) userData.zodiacHistory = []
        if (!Array.isArray(userData.moodHistory)) userData.moodHistory = []
        if (!Array.isArray(userData.moodRecords)) userData.moodRecords = []
        if (!Array.isArray(userData.favoriteTheaters)) userData.favoriteTheaters = []
        if (typeof userData.checkInDays !== 'number') userData.checkInDays = 0
        if (!Array.isArray(userData.dramaNotes)) userData.dramaNotes = []
        if (!userData.lastMagicBookEarnDate) userData.lastMagicBookEarnDate = null
        
        this.globalData.userData = userData
        this.saveUserData()
        console.log('本地用户数据加载完成')
      }
    } catch (error) {
      console.error('初始化本地用户数据失败:', error)
      // 如果出现错误，使用默认数据
      const defaultData = {
        checkInDays: 0,
        lastCheckIn: null,
        favoriteTheaters: [],
        zodiacSign: null,
        points: 0,
        totalPointsEarned: 0,
        lastMoodShareDate: null,
        lastZodiacUseDate: null,
        dailyMoodShares: 0,
        dailyZodiacUses: 0,
        userAddress: {
          name: '',
          phone: '',
          province: '',
          city: '',
          district: '',
          detail: '',
          isDefault: true
        },
        exchangeRecords: [],
        zodiacHistory: [],
        moodHistory: [],
        dramaNotes: [],
        lastMagicBookEarnDate: null
      }
      this.globalData.userData = defaultData
    }
  },
  
  saveUserData() {
    try {
      if (!this.globalData.userData) {
        return
      }

      // 先保存到本地作为备份
      wx.setStorageSync('userData', this.globalData.userData)

      // 如果支持云开发，同步到云端
      if (this.globalData.cloudEnabled) {
        // 过滤掉 _id 字段和其他不需要更新的字段
        const cleanUserData = { ...this.globalData.userData }
        delete cleanUserData._id
        delete cleanUserData._openid
        
        wx.cloud.callFunction({
          name: 'updateUserData',
          data: { userData: cleanUserData }
        }).then(res => {
          if (res.result.code === 0) {
            console.log('用户数据同步到云端成功')
          } else {
            console.error('云端数据同步失败:', res.result.message)
          }
        }).catch(error => {
          console.error('云端数据同步失败:', error)
        })
      }
    } catch (error) {
      console.error('保存用户数据失败:', error)
    }
  },
  
  // 移除积分系统，保留空函数以兼容旧代码
  addPoints(points, reason) {
    // 积分系统已移除
    return 0
  },
  
  spendPoints(points, reason) {
    // 积分系统已移除
    return false
  },
  
  checkDailyLimit(type) {
    try {
      const userData = this.globalData.userData
      if (!userData) {
        console.error('用户数据不存在，无法检查每日限制')
        return false
      }
      
      const today = new Date().toDateString()
      
      // 检查星座使用次数
      const lastZodiacDate = userData.lastZodiacUseDate
      if (lastZodiacDate !== today) {
        userData.dailyZodiacUses = 0
        userData.lastZodiacUseDate = today
      }
      
      // 检查心情使用次数
      const lastMoodDate = userData.lastMoodShareDate
      if (lastMoodDate !== today) {
        userData.dailyMoodShares = 0
        userData.lastMoodShareDate = today
      }
      
      // 戏剧魔法书模式：统一每日3次限制
      if (type === 'magicbook') {
        const totalUses = (userData.dailyZodiacUses || 0) + (userData.dailyMoodShares || 0)
        return totalUses < 3
      }
      
      // 兼容旧模式
      if (type === 'mood') {
        const totalUses = (userData.dailyZodiacUses || 0) + (userData.dailyMoodShares || 0)
        return totalUses < 3
      } else if (type === 'zodiac') {
        const totalUses = (userData.dailyZodiacUses || 0) + (userData.dailyMoodShares || 0)
        return totalUses < 3
      }
      
      return false
    } catch (error) {
      console.error('检查每日限制失败:', error)
      return false
    }
  },
  
  recordDailyUse(type) {
    try {
      const userData = this.globalData.userData
      if (!userData) {
        console.error('用户数据不存在，无法记录每日使用')
        return
      }
      
      if (type === 'mood') {
        userData.dailyMoodShares = (userData.dailyMoodShares || 0) + 1
      } else if (type === 'zodiac') {
        userData.dailyZodiacUses = (userData.dailyZodiacUses || 0) + 1
      }
      this.saveUserData()
    } catch (error) {
      console.error('记录每日使用失败:', error)
    }
  },
  
  globalData: {
    userInfo: null,
    userData: null,
    cloudEnabled: false, // 云开发状态标识
    isRealDevice: false, // 是否为真机环境
    
    // 添加用户登录相关状态
    userLoggedIn: false,
    userOpenId: null,
    userProfile: null,
    
    theatersData: [
      { name: '上海大剧院', district: '黄浦区' },
      { name: '上海话剧艺术中心', district: '静安区' },
      { name: '兰心大戏院', district: '黄浦区' },
      { name: '美琪大戏院', district: '静安区' },
      { name: '上海文化广场', district: '徐汇区' },
      { name: '上海戏剧学院', district: '静安区' }
    ]
  },
  
  // 检测运行环境
  detectEnvironment() {
    try {
      const systemInfo = wx.getSystemInfoSync()
      this.globalData.isRealDevice = systemInfo.platform !== 'devtools'
      if (this.globalData.isRealDevice) {
        console.log('🔧 真机环境检测完成')
      } else {
        console.log('🔧 开发工具环境检测完成')
      }
    } catch (error) {
      console.warn('环境检测失败:', error)
      this.globalData.isRealDevice = false
    }
  },

  // 初始化用户登录
  async initUserLogin() {
    try {
      // 第一步：静默登录获取OpenID
      await this.silentLogin()
      
      // 第二步：检查用户是否已授权过
      const userProfile = wx.getStorageSync('userProfile')
      if (userProfile && userProfile.nickName) {
        this.globalData.userProfile = userProfile
        this.globalData.userLoggedIn = true
        console.log('用户登录状态已恢复:', userProfile.nickName)
        
        // 同时设置openId用于云端数据访问
        this.globalData.openId = this.globalData.userOpenId
        
        // 第三步：如果已登录，初始化用户数据
        await this.initUserData()
      } else {
        console.log('用户未登录，需要授权')
        this.globalData.userLoggedIn = false
        
        // 第三步：即使未登录，也初始化基础数据
        this.initLocalUserData()
      }
      
    } catch (error) {
      console.error('初始化用户登录失败:', error)
      // 即使登录失败，也尝试初始化本地数据
      this.initLocalUserData()
    }
  },

  // 静默登录获取OpenID
  async silentLogin() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: (loginRes) => {
          if (loginRes.code) {
            console.log('获取登录凭证成功:', loginRes.code)
            
            // 如果支持云开发，通过云函数获取OpenID
            if (this.globalData.cloudEnabled) {
              wx.cloud.callFunction({
                name: 'login',
                data: { code: loginRes.code }
              }).then(res => {
                if (res.result && res.result.openid) {
                  this.globalData.userOpenId = res.result.openid
                  console.log('OpenID获取成功:', res.result.openid)
                  resolve(res.result.openid)
                } else {
                  console.error('获取OpenID失败:', res.result)
                  reject(new Error('获取OpenID失败'))
                }
              }).catch(error => {
                console.error('login云函数调用失败:', error)
                reject(error)
              })
            } else {
              // 降级方案：使用本地存储
              const mockOpenId = 'local_' + Date.now()
              this.globalData.userOpenId = mockOpenId
              resolve(mockOpenId)
            }
          } else {
            console.error('获取登录凭证失败:', loginRes.errMsg)
            reject(new Error(loginRes.errMsg))
          }
        },
        fail: (error) => {
          console.error('wx.login调用失败:', error)
          reject(error)
        }
      })
    })
  },

  // 用户授权登录（获取用户信息）
  async authorizeUser() {
    return new Promise((resolve, reject) => {
      // 直接调用 getUserProfile，必须在用户点击事件中调用
      this.getUserProfile(resolve, reject)
    })
  },

  // 获取用户信息
  getUserProfile(resolve, reject) {
    // 先检查是否已经有自定义的用户信息
    const customProfile = wx.getStorageSync('customUserProfile')
    
    // 清理无效的自定义数据
    if (customProfile && (
        customProfile.nickName === '为自己设置一个有趣的戏剧昵称吧！' ||
        customProfile.nickName === '请输入您的个性化戏剧昵称' ||
        customProfile.nickName === '微信用户' ||
        /^\d+\.?\d*$/.test(customProfile.nickName) || // 清理纯数字昵称如"0.21"
        !customProfile.isCustomized ||
        !customProfile.nickName ||
        customProfile.nickName.length < 2 ||
        customProfile.nickName.length > 20
    )) {
      console.log('🧹 清理无效的自定义数据:', customProfile.nickName, '原因: 无效格式')
      wx.removeStorageSync('customUserProfile')
      wx.removeStorageSync('userProfile') // 同时清理主用户配置
    } else if (customProfile && customProfile.nickName && 
        customProfile.nickName !== '微信用户' && 
        customProfile.isCustomized) {
      console.log('🎭 使用用户自定义信息:', customProfile)
      this.globalData.userProfile = customProfile
      this.globalData.userLoggedIn = true
      resolve(customProfile)
      return
    }

    wx.getUserProfile({
      desc: '用于完善戏剧回响个人资料',
      success: (profileRes) => {
        const userProfile = {
          nickName: profileRes.userInfo.nickName,
          avatarUrl: profileRes.userInfo.avatarUrl,
          gender: profileRes.userInfo.gender,
          country: profileRes.userInfo.country,
          province: profileRes.userInfo.province,
          city: profileRes.userInfo.city,
          language: profileRes.userInfo.language,
          authTime: new Date().toISOString(),
          isWechatDefault: profileRes.userInfo.nickName === '微信用户', // 标记是否为微信默认信息
          isCustomized: false // 通过授权获取的信息不标记为自定义
        }
        
        // 保存用户信息
        this.globalData.userProfile = userProfile
        this.globalData.userLoggedIn = true
        wx.setStorageSync('userProfile', userProfile)
        
        console.log('用户授权成功:', userProfile)
        console.log('🖼️ 头像URL:', userProfile.avatarUrl)
        console.log('👤 昵称信息:', userProfile.nickName)
        console.log('🔗 头像URL长度:', userProfile.avatarUrl ? userProfile.avatarUrl.length : 0)
        console.log('🌐 头像URL有效性:', userProfile.avatarUrl && userProfile.avatarUrl.startsWith('https://'))
        
        // 分析昵称质量
        if (userProfile.isWechatDefault) {
          console.log('🔄 检测到微信默认信息，用户可在个人中心手动设置个性化昵称')
        } else {
          console.log('✅ 获取到真实微信昵称:', userProfile.nickName, '将保持并优先使用')
          // 对于真实昵称，标记为已自定义以提高优先级
          userProfile.isCustomized = true
          userProfile.dataSource = 'wechat-real'
        }
        
        // 如果支持云开发，保存到云端
        if (this.globalData.cloudEnabled && this.globalData.userOpenId) {
          this.saveUserProfileToCloud(userProfile)
        }
        
        resolve(userProfile)
      },
      fail: (error) => {
        console.error('用户拒绝授权:', error)
        reject(error)
      }
    })
  },

  // 显示自定义资料提示
  showCustomProfilePrompt() {
    wx.showModal({
      title: '完善个人资料',
      content: '检测到您使用的是微信默认头像昵称，是否要设置个性化的戏剧昵称？这将让其他戏剧爱好者更好地认识您。',
      confirmText: '去设置',
      cancelText: '稍后再说',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({
            url: '/pages/profile/profile?action=edit'
          })
        }
      }
    })
  },

  // 保存自定义用户信息（带智能保护）
  saveCustomUserProfile(customProfile) {
    // 合并自定义信息和原始信息
    const currentProfile = this.globalData.userProfile || {}
    
    // 智能保护：防止用较差的信息覆盖较好的信息
    const shouldProtectExisting = this.shouldProtectUserInfo(currentProfile, customProfile)
    if (shouldProtectExisting) {
      console.log('🛡️ 用户信息保护：阻止用较差信息覆盖现有信息')
      console.log('当前信息:', currentProfile.nickName, '尝试保存:', customProfile.nickName)
      return currentProfile // 返回当前信息，不覆盖
    }
    
    const updatedProfile = {
      ...currentProfile,
      ...customProfile,
      // 保持原有的isCustomized状态，除非明确指定要修改
      isCustomized: customProfile.hasOwnProperty('isCustomized') ? customProfile.isCustomized : true,
      customizedTime: new Date().toISOString()
    }
    
    // 保存到全局和本地存储
    this.globalData.userProfile = updatedProfile
    wx.setStorageSync('userProfile', updatedProfile)
    wx.setStorageSync('customUserProfile', updatedProfile)
    
    console.log('✅ 用户自定义信息已保存:', {
      nickName: updatedProfile.nickName,
      avatarUrl: updatedProfile.avatarUrl ? '已设置' : '未设置',
      dataSource: updatedProfile.dataSource,
      isCustomized: updatedProfile.isCustomized
    })
    
    // 同步到云端
    if (this.globalData.cloudEnabled && this.globalData.userOpenId) {
      this.saveUserProfileToCloud(updatedProfile)
    }
    
    return updatedProfile
  },

  // 保存用户信息到云端
  async saveUserProfileToCloud(userProfile) {
    try {
      await wx.cloud.callFunction({
        name: 'updateUserProfile',
        data: { userProfile }
      })
      console.log('用户信息保存到云端成功')
    } catch (error) {
      console.error('保存用户信息到云端失败:', error)
    }
  },

  // 用户登出
  logout() {
    this.globalData.userLoggedIn = false
    this.globalData.userOpenId = null
    this.globalData.userProfile = null
    wx.removeStorageSync('userProfile')
    
    // 清空用户数据
    this.globalData.userData = null
    wx.removeStorageSync('userData') // 确保删除本地用户数据
    
    console.log('用户已登出')
    
    // 跳转到首页
    wx.reLaunch({
      url: '/pages/index/index'
    })
  },

  // 检查登录状态
  checkLoginStatus() {
    const hasOpenId = !!this.globalData.userOpenId
    const hasUserProfile = !!this.globalData.userProfile
    const hasValidNickname = this.globalData.userProfile && 
      this.globalData.userProfile.nickName && 
      this.globalData.userProfile.nickName !== '微信用户' &&
      !/^\d+\.?\d*$/.test(this.globalData.userProfile.nickName)
    
    const isLoggedIn = hasOpenId && hasUserProfile && hasValidNickname
    
    console.log('🔍 登录状态检查:', {
      hasOpenId,
      hasUserProfile,
      hasValidNickname,
      isLoggedIn,
      nickname: this.globalData.userProfile?.nickName
    })
    
    return isLoggedIn
  },

  // 增强的用户信息验证
  validateUserInfo(userProfile) {
    if (!userProfile || !userProfile.nickName) {
      return false
    }
    
    // 检查昵称是否有效
    const invalidNicknames = [
      '微信用户',
      '为自己设置一个有趣的戏剧昵称吧！',
      '请输入您的个性化戏剧昵称'
    ]
    
    if (invalidNicknames.includes(userProfile.nickName)) {
      return false
    }
    
    // 检查是否为纯数字昵称
    if (/^\d+\.?\d*$/.test(userProfile.nickName)) {
      return false
    }
    
    return true
  },

  // 强制登录（用于需要登录的页面）
  async requireLogin() {
    if (!this.checkLoginStatus()) {
      try {
        await this.authorizeUser()
        return true
      } catch (error) {
        wx.showModal({
          title: '需要登录',
          content: '请先登录后再使用此功能',
          showCancel: false,
          confirmText: '确定'
        })
        return false
      }
    }
    return true
  },

  // 刷新戏剧笔记数据
  async refreshDramaNotes() {
    if (this.globalData.cloudEnabled && this.globalData.userLoggedIn) {
      try {
        const res = await wx.cloud.callFunction({
          name: 'getNotes'
        })
        
        if (res.result.code === 0) {
          // 更新本地用户数据中的戏剧笔记
          this.globalData.userData = this.globalData.userData || {}
          this.globalData.userData.dramaNotes = res.result.data
          
          // 保存到本地存储
          wx.setStorageSync('userData', this.globalData.userData)
          
          console.log('戏剧笔记数据已同步:', res.result.data.length)
          return true
        }
      } catch (error) {
        console.error('同步戏剧笔记失败:', error)
      }
    }
    return false
  },

  // 清理用户数据（开发调试用）
  clearUserData() {
    try {
      // 清理所有相关的本地存储
      wx.removeStorageSync('userProfile')
      wx.removeStorageSync('customUserProfile')
      wx.removeStorageSync('userData')
      wx.removeStorageSync('lastCustomPromptTime')
      
      // 清理全局状态
      this.globalData.userProfile = null
      this.globalData.userLoggedIn = false
      this.globalData.userData = null
      this.globalData.userOpenId = null
      
      console.log('✅ 用户数据已彻底清理')
      return true
    } catch (error) {
      console.error('清理用户数据失败:', error)
      return false
    }
  },

  // 强制重置用户信息（紧急修复用）
  forceResetUserInfo() {
    try {
      console.log('🔄 开始强制重置用户信息...')
      
      // 1. 清理所有本地存储
      this.clearUserData()
      
      // 2. 额外清理可能的缓存数据
      try {
        wx.removeStorageSync('lastCustomPromptTime')
        wx.removeStorageSync('userData')
        wx.removeStorageSync('userConfig')
      } catch (e) {
        console.log('清理额外缓存:', e)
      }
      
      // 3. 重新初始化登录
      this.initUserLogin()
      
      console.log('✅ 用户信息强制重置完成')
      return true
    } catch (error) {
      console.error('强制重置失败:', error)
      return false
    }
  },

  // 紧急数据修复（修复错误的isCustomized标记）
  emergencyDataFix() {
    try {
      console.log('🚨 开始紧急数据修复...')
      
      // 检查并修复错误的自定义数据
      const userProfile = wx.getStorageSync('userProfile')
      const customProfile = wx.getStorageSync('customUserProfile')
      
      let needsFix = false
      
      // 如果用户资料中昵称是"微信用户"但标记为自定义，这是错误的
      if (userProfile && userProfile.nickName === '微信用户' && userProfile.isCustomized) {
        console.log('🔧 修复错误的用户资料数据')
        userProfile.isCustomized = false
        userProfile.isWechatDefault = true
        wx.setStorageSync('userProfile', userProfile)
        this.globalData.userProfile = userProfile
        needsFix = true
      }
      
      // 清理错误的自定义资料
      if (customProfile && customProfile.nickName === '微信用户') {
        console.log('🔧 清理错误的自定义资料')
        wx.removeStorageSync('customUserProfile')
        needsFix = true
      }
      
      if (needsFix) {
        console.log('✅ 紧急数据修复完成')
        return true
      } else {
        console.log('ℹ️ 数据正常，无需修复')
        return false
      }
    } catch (error) {
      console.error('紧急数据修复失败:', error)
      return false
    }
  },

  // 智能用户信息保护（防止好信息被差信息覆盖）
  shouldProtectUserInfo(currentProfile, newProfile) {
    if (!currentProfile || !newProfile) return false
    
    // 如果当前是真实有意义的昵称，而新的是微信默认昵称，则保护
    if (currentProfile.nickName && 
        currentProfile.nickName !== '微信用户' && 
        currentProfile.nickName !== '戏剧爱好者' &&
        newProfile.nickName === '微信用户') {
      return true
    }
    
    // 如果当前是已自定义的昵称，而新的想设为非自定义，需要谨慎
    if (currentProfile.isCustomized && 
        currentProfile.nickName !== '微信用户' &&
        newProfile.nickName === '微信用户' &&
        newProfile.isCustomized === false) {
      return true
    }
    
    return false
  },

  // 尝试恢复真实的微信昵称
  tryRecoverRealWechatNickname() {
    return new Promise((resolve) => {
      console.log('🔍 正在尝试恢复真实微信昵称...')
      
      // 重新调用 getUserProfile 获取最新信息
      wx.getUserProfile({
        desc: '恢复您的真实微信昵称',
        success: (profileRes) => {
          const realNickname = profileRes.userInfo.nickName
          console.log('🔍 重新获取的昵称:', realNickname)
          
          if (realNickname && realNickname !== '微信用户') {
            console.log('✅ 发现真实昵称:', realNickname)
            
            // 创建正确的用户资料
            const realProfile = {
              nickName: realNickname,
              avatarUrl: profileRes.userInfo.avatarUrl,
              gender: profileRes.userInfo.gender,
              country: profileRes.userInfo.country,
              province: profileRes.userInfo.province,
              city: profileRes.userInfo.city,
              language: profileRes.userInfo.language,
              isCustomized: true, // 真实昵称标记为自定义以提高优先级
              isWechatDefault: false,
              dataSource: 'wechat-real',
              recoveredTime: new Date().toISOString()
            }
            
            // 保存恢复的数据
            this.globalData.userProfile = realProfile
            wx.setStorageSync('userProfile', realProfile)
            wx.setStorageSync('customUserProfile', realProfile)
            
            // 同步到云端
            if (this.globalData.cloudEnabled && this.globalData.userOpenId) {
              this.saveUserProfileToCloud(realProfile)
            }
            
            console.log('🎉 真实昵称恢复成功:', realNickname)
            resolve(realProfile)
          } else {
            console.log('ℹ️ 未获取到真实昵称，继续使用当前设置')
            resolve(null)
          }
        },
        fail: (error) => {
          console.log('ℹ️ 昵称恢复失败，用户可能取消了授权:', error)
          resolve(null)
        }
      })
    })
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: '戏剧回响 - 聆听内心的戏剧回响',
      path: '/pages/index/index',
      imageUrl: '/images/share-cover.jpg'
    }
  }
})