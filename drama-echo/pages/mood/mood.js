const app = getApp()

Page({
  data: {
    activeCategory: 'theater',
    currentMoods: [],
    recentMoods: [],
    theaterMoods: [
      { name: '抢到票啦', emoji: '🎫', description: '成功抢到心仪演出的票！' },
      { name: '见到爱豆', emoji: '⭐', description: '近距离接触喜欢的演员' },
      { name: '演后谈', emoji: '🎤', description: '参加演后谈收获满满' },
      { name: '二刷三刷', emoji: '🔄', description: '好戏值得一看再看' },
      { name: '落泪了', emoji: '😭', description: '被剧情感动到泪流满面' },
      { name: '爆笑', emoji: '🤣', description: '被演员逗得前仰后合' },
      { name: '意犹未尽', emoji: '✨', description: '散场后还沉浸在剧情中' },
      { name: '没抢到票', emoji: '💔', description: '心仪的票瞬间售罄' },
      { name: '偶遇明星', emoji: '🌟', description: '剧院偶遇喜欢的演员' },
      { name: '签名合影', emoji: '📸', description: '获得签名或合影留念' },
      { name: '前排观剧', emoji: '👀', description: '坐在前排看得超清楚' },
      { name: '剧荒了', emoji: '📚', description: '找不到想看的新剧' }
    ],
    classicMoods: [
      { name: '快乐', emoji: '😊', description: '如春日暖阳般的愉悦心情' },
      { name: '忧郁', emoji: '😔', description: '如雨夜般的深沉思考' },
      { name: '激情', emoji: '🔥', description: '如舞台上的炽热表演' },
      { name: '平静', emoji: '😌', description: '如湖水般的宁静致远' },
      { name: '困惑', emoji: '🤔', description: '如迷雾中的思索探寻' },
      { name: '愤怒', emoji: '😠', description: '如雷鸣般的正义之声' },
      { name: '浪漫', emoji: '💕', description: '如诗篇般的美好情感' },
      { name: '感动', emoji: '🥺', description: '内心被深深触动' },
      { name: '期待', emoji: '🤗', description: '对美好未来的憧憬' },
      { name: '怀念', emoji: '💭', description: '回忆往昔的美好时光' }
    ],
    modernMoods: [
      { name: '焦虑', emoji: '😰', description: '现代生活的快节奏压力' },
      { name: '社恐', emoji: '😷', description: '在人群中的不安感受' },
      { name: '摆烂', emoji: '🙃', description: '对内卷生活的小小反抗' },
      { name: 'emo', emoji: '🌙', description: '深夜时分的真实情感' },
      { name: '躁动', emoji: '⚡', description: '内心渴望改变的冲动' },
      { name: '治愈', emoji: '🌱', description: '被温暖包围的美好感受' },
      { name: '丧气', emoji: '🌧️', description: '低谷时期的自我疗愈' },
      { name: '躺平', emoji: '🛌', description: '放松心态享受生活' },
      { name: '上头', emoji: '🎭', description: '完全沉迷某事无法自拔' },
      { name: '破防', emoji: '💫', description: '防线崩塌内心柔软' }
    ],
    canShareToday: true,
    todayShares: 0,
    // 授权弹窗
    showAuthModal: false
  },
  
  async onLoad() {
    // 允许用户先浏览功能，在需要保存数据时才检查登录状态
    
    this.initCategory()
    this.loadRecentMoods()
    this.checkDailyLimit()
  },
  
  onShow() {
    this.loadRecentMoods()
    this.checkDailyLimit()
  },
  
  checkDailyLimit() {
    const canShare = app.checkDailyLimit('mood')
    const userData = app.globalData.userData
    
    this.setData({
      canShareToday: canShare,
      todayShares: userData.dailyMoodShares || 0
    })
  },
  
  initCategory() {
    this.setData({
      activeCategory: 'theater',
      currentMoods: this.data.theaterMoods
    })
  },
  
  switchCategory(e) {
    const category = e.currentTarget.dataset.category
    let moods = []
    switch(category) {
      case 'theater':
        moods = this.data.theaterMoods
        break
      case 'classic':
        moods = this.data.classicMoods
        break
      case 'modern':
        moods = this.data.modernMoods
        break
      default:
        moods = this.data.theaterMoods
    }
    this.setData({
      activeCategory: category,
      currentMoods: moods
    })
  },
  
  loadRecentMoods() {
    const userData = app.globalData.userData
    if (userData && userData.moodRecords) {
      const recentMoods = userData.moodRecords.slice(-5).reverse().map(record => {
        return {
          ...record,
          date: this.formatDate(record.timestamp)
        }
      })
      this.setData({
        recentMoods
      })
    }
  },
  
  formatDate(timestamp) {
    const date = new Date(timestamp)
    const now = new Date()
    const diffTime = now - date
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return '今天'
    if (diffDays === 1) return '昨天'
    if (diffDays < 7) return `${diffDays}天前`
    return `${date.getMonth() + 1}月${date.getDate()}日`
  },
  
  selectMood(e) {
    const mood = e.currentTarget.dataset.mood;
    const category = this.data.activeCategory;
    
    // 检查每日限制
    if (!this.data.canShareToday) {
      wx.showModal({
        title: '每日限制',
        content: '今日心情分享次数已用完，明天再来记录心情吧！每日限制1次可获得戏剧币奖励。',
        showCancel: false,
        confirmText: '知道了'
      })
      return
    }
    
    // 检查登录状态，如果需要保存数据但用户未登录，弹出授权弹窗
    if (!app.checkLoginStatus()) {
      this.setData({ showAuthModal: true })
      return
    }
    
    // 触觉反馈
    wx.vibrateShort()
    
    // 保存心情记录
    this.saveMoodRecord(mood, category)
    
    // 获得积分奖励
    const points = 10 // 每次心情记录获得10戏剧币
    app.addPoints(points, '心情记录')
    app.recordDailyUse('mood')
    
    // 更新每日限制状态
    this.checkDailyLimit()
    
    // 跳转到结果页面
    wx.navigateTo({
      url: `/pages/result/result?type=mood&value=${mood}`
    })
  },
  
  saveMoodRecord(mood, category) {
    const userData = app.globalData.userData
    if (!userData) {
      console.error('用户数据未初始化')
      return
    }

    let moodItem
    switch(this.data.activeCategory) {
      case 'theater':
        moodItem = this.data.theaterMoods.find(m => m.name === mood)
        break
      case 'classic':
        moodItem = this.data.classicMoods.find(m => m.name === mood)
        break
      case 'modern':
        moodItem = this.data.modernMoods.find(m => m.name === mood)
        break
      default:
        moodItem = this.data.theaterMoods.find(m => m.name === mood)
    }
    
    // 检查是否找到了对应的心情项
    if (!moodItem) {
      console.error(`未找到心情项: ${mood} in ${this.data.activeCategory} category`)
      return
    }

    // 如果支持云开发，使用云函数保存
    if (app.globalData.cloudEnabled) {
      wx.cloud.callFunction({
        name: 'saveMoodRecord',
        data: {
          mood: mood,
          emoji: moodItem.emoji,
          category: category,
          playQuote: '戏剧化的心情时刻', // TODO: 可以根据心情生成相应的戏剧台词
          theater: '生活的舞台' // TODO: 可以推荐相应的剧院
        }
      }).then(res => {
        if (res.result.code === 0) {
          wx.showToast({
            title: res.result.message,
            icon: 'success',
            duration: 2000
          })
          // 同时保存到本地备份
          this.saveToLocal(mood, moodItem, category)
          // 刷新数据显示
          this.loadRecentMoods()
        } else if (res.result.code === -2) {
          // 每日限制
          wx.showModal({
            title: '温馨提示',
            content: res.result.message,
            showCancel: false
          })
        } else {
          console.error('保存心情记录失败:', res.result.message)
          // 降级到本地保存
          this.saveToLocal(mood, moodItem, category)
        }
      }).catch(error => {
        console.error('云函数调用失败:', error)
        // 降级到本地保存
        this.saveToLocal(mood, moodItem, category)
      })
    } else {
      // 降级到本地保存
      this.saveToLocal(mood, moodItem, category)
    }
  },

  // 本地保存心情记录（备用方案）
  saveToLocal(mood, moodItem, category) {
    const userData = app.globalData.userData
    if (userData) {
      const record = {
        mood: mood,
        emoji: moodItem.emoji,
        category: category,
        timestamp: Date.now()
      }
      
      userData.moodRecords.push(record)
      
      // 只保留最近30条记录
      if (userData.moodRecords.length > 30) {
        userData.moodRecords = userData.moodRecords.slice(-30)
      }
      
      app.saveUserData()
      
      wx.showToast({
        title: '心情记录已保存',
        icon: 'success'
      })
      
      // 刷新显示
      this.loadRecentMoods()
    }
  },
  
  // 分享功能
  onShareAppMessage() {
    return {
      title: '魔都戏剧 - 用戏剧语言记录心情',
      path: '/pages/mood/mood',
      imageUrl: 'cloud://cloud1-2gyb3dkq4c474fe4.636c-cloud1-2gyb3dkq4c474fe4-1371126028/images/xjhx-logo.png'
    }
  },

  // 授权弹窗事件处理
  onAuthSuccess(e) {
    console.log('授权成功:', e.detail)
    this.setData({ showAuthModal: false })
    // 重新执行之前的心情选择
    // 这里可以重新触发selectMood逻辑
  },

  onAuthCancel() {
    console.log('用户取消授权')
    this.setData({ showAuthModal: false })
  },

  onAuthClose() {
    this.setData({ showAuthModal: false })
  }
}) 