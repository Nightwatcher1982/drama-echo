const app = getApp()

Page({
  data: {
    // 星座数据
    zodiacSigns: [
      { name: '白羊座', en: 'Aries', dates: '3/21-4/19', symbol: '♈', element: '火象' },
      { name: '金牛座', en: 'Taurus', dates: '4/20-5/20', symbol: '♉', element: '土象' },
      { name: '双子座', en: 'Gemini', dates: '5/21-6/21', symbol: '♊', element: '风象' },
      { name: '巨蟹座', en: 'Cancer', dates: '6/22-7/22', symbol: '♋', element: '水象' },
      { name: '狮子座', en: 'Leo', dates: '7/23-8/22', symbol: '♌', element: '火象' },
      { name: '处女座', en: 'Virgo', dates: '8/23-9/22', symbol: '♍', element: '土象' },
      { name: '天秤座', en: 'Libra', dates: '9/23-10/23', symbol: '♎', element: '风象' },
      { name: '天蝎座', en: 'Scorpio', dates: '10/24-11/21', symbol: '♏', element: '水象' },
      { name: '射手座', en: 'Sagittarius', dates: '11/22-12/21', symbol: '♐', element: '火象' },
      { name: '摩羯座', en: 'Capricorn', dates: '12/22-1/19', symbol: '♑', element: '土象' },
      { name: '水瓶座', en: 'Aquarius', dates: '1/20-2/18', symbol: '♒', element: '风象' },
      { name: '双鱼座', en: 'Pisces', dates: '2/19-3/20', symbol: '♓', element: '水象' }
    ],
    
    // 简化心情数据（戏剧相关心情）
    simpleMoods: [
      { name: '抢到票啦', emoji: '🎫', description: '成功抢到心仪演出的票！' },
      { name: '见到爱豆', emoji: '⭐', description: '近距离接触喜欢的演员' },
      { name: '意犹未尽', emoji: '✨', description: '散场后还沉浸在剧情中' },
      { name: '落泪了', emoji: '😭', description: '被剧情感动到泪流满面' },
      { name: '爆笑', emoji: '🤣', description: '被演员逗得前仰后合' },
      { name: '没抢到票', emoji: '💔', description: '心仪的票瞬间售罄' },
      { name: '二刷三刷', emoji: '🔄', description: '好戏值得一看再看' },
      { name: '剧荒了', emoji: '📚', description: '找不到想看的新剧' },
      { name: '快乐', emoji: '😊', description: '如春日暖阳般的愉悦心情' },
      { name: '激情', emoji: '🔥', description: '如舞台上的炽热表演' },
      { name: '平静', emoji: '😌', description: '如湖水般的宁静致远' },
      { name: '浪漫', emoji: '💕', description: '如诗篇般的美好情感' }
    ],
    
    // 用户状态
    showMyZodiac: false,
    userZodiac: null,
    recentRecords: [],
    selectedMood: null,
    
    // 使用限制
    canUseToday: true,
    
    // 魔法施放状态
    isCastingMagic: false,
    castingProgress: 0,
    castingTimer: null,
    showMagicEffect: false
  },
  
  async onLoad() {
    // 检查登录状态
    if (!app.checkLoginStatus()) {
      wx.showModal({
        title: '需要登录',
        content: '请先登录后再使用魔法之书功能',
        confirmText: '去登录',
        cancelText: '返回',
        success: (res) => {
          if (res.confirm) {
            wx.switchTab({
              url: '/pages/index/index'
            })
          } else {
            wx.navigateBack()
          }
        }
      })
      return
    }
    
    this.initData()
    this.checkDailyLimit()
  },
  
  onShow() {
    this.initData()
    this.checkDailyLimit()
  },
  
  onHide() {
    // 页面隐藏时清理定时器
    if (this.data.castingTimer) {
      clearInterval(this.data.castingTimer)
      this.data.castingTimer = null
    }
  },
  
  onUnload() {
    // 页面卸载时清理定时器
    if (this.data.castingTimer) {
      clearInterval(this.data.castingTimer)
      this.data.castingTimer = null
    }
  },
  
  initData() {
    this.checkUserZodiac()
    this.loadRecentRecords()
  },
  
  checkDailyLimit() {
    const userData = app.globalData.userData
    if (!userData) return
    
    // 检查今日使用限制（简化版本，不再限制使用次数）
    this.setData({
      canUseToday: true
    })
  },
  
  checkUserZodiac() {
    const userData = app.globalData.userData
    if (userData && userData.zodiacSign) {
      // 根据星座名称找到完整的星座信息
      const zodiacInfo = this.data.zodiacSigns.find(sign => 
        sign.name === userData.zodiacSign || sign === userData.zodiacSign
      )
      this.setData({
        showMyZodiac: true,
        userZodiac: zodiacInfo || userData.zodiacSign
      })
    } else {
      this.setData({
        showMyZodiac: false,
        userZodiac: null
      })
    }
  },
  
  loadRecentRecords() {
    const userData = app.globalData.userData
    if (!userData) return
    
    const records = []
    
    // 获取最近的星座记录
    if (userData.zodiacHistory && Array.isArray(userData.zodiacHistory)) {
      userData.zodiacHistory.slice(-5).forEach(record => {
        if (record && record.chinese && record.english && record.play) {
          records.push({
            id: `zodiac_${record.timestamp}`,
            type: 'zodiac',
            title: record.chinese,
            subtitle: record.play,
            date: this.formatDate(record.timestamp),
            timestamp: record.timestamp
          })
        }
      })
    }
    
    // 按时间排序并取最近5条
    records.sort((a, b) => b.timestamp - a.timestamp)
    
    this.setData({
      recentRecords: records.slice(0, 5)
    })
  },
  
  formatDate(timestamp) {
    if (!timestamp) return ''
    
    try {
      const date = new Date(timestamp)
      const now = new Date()
      const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))
      
      if (diffDays === 0) return '今天'
      if (diffDays === 1) return '昨天'
      if (diffDays < 7) return `${diffDays}天前`
      return `${date.getMonth() + 1}月${date.getDate()}日`
    } catch (error) {
      console.error('Date formatting error:', error)
      return ''
    }
  },
  
  // 选择心情
  selectMood(e) {
    const mood = e.currentTarget.dataset.mood
    
    // 更新选中的心情
    this.setData({
      selectedMood: mood
    })
    
    // 高亮显示选中的心情
    this.updateMoodSelection(mood)
  },
  
  // 更新心情选择状态
  updateMoodSelection(selectedMood) {
    const simpleMoods = this.data.simpleMoods.map(mood => ({
      ...mood,
      selected: mood.name === selectedMood.name
    }))
    
    this.setData({
      simpleMoods: simpleMoods
    })
  },
  
  // 开始长按施放魔法
  startCastMagic() {
    console.log('开始长按施放魔法');
    
    // 检查是否有用户星座
    if (!this.data.userZodiac) {
      wx.showModal({
        title: '需要选择星座',
        content: '请先选择你的星座，然后发动魔法查看今日运势',
        confirmText: '选择星座',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            this.changeZodiac()
          }
        }
      })
      return
    }
    
    // 检查是否选择了心情
    if (!this.data.selectedMood) {
      wx.showModal({
        title: '需要选择心情',
        content: '请先选择你当下的心情，然后发动魔法',
        confirmText: '知道了',
        showCancel: false
      })
      return
    }
    
    // 开始施放魔法动画
    this.setData({
      isCastingMagic: true,
      castingProgress: 0
    })
    
    // 震动反馈已移除
    
    // 开始2秒倒计时动画
    let progress = 0
    const totalTime = 2000 // 2秒
    const interval = 16 // 约60fps
    
    this.data.castingTimer = setInterval(() => {
      progress += interval
      const progressPercent = Math.min((progress / totalTime) * 100, 100)
      
      this.setData({
        castingProgress: progressPercent
      })
      
      // 倒计时完成
      if (progress >= totalTime) {
        clearInterval(this.data.castingTimer)
        this.completeMagicCast()
      }
    }, interval)
  },
  
  // 停止施放魔法（长按释放）
  stopCastMagic() {
    console.log('停止施放魔法');
    
    if (this.data.castingTimer) {
      clearInterval(this.data.castingTimer)
      this.data.castingTimer = null
    }
    
    this.setData({
      isCastingMagic: false,
      castingProgress: 0
    })
  },
  
  // 完成魔法施放
  completeMagicCast() {
    console.log('魔法施放完成');
    
    // 显示屏幕特效
    this.setData({
      showMagicEffect: true
    })
    
    // 震动反馈已移除
    
    // 特效持续1秒后跳转
    setTimeout(() => {
      this.navigateToResult()
    }, 1000)
  },
  
  // 跳转到结果页面
  navigateToResult() {
    const zodiacName = this.data.userZodiac.name || this.data.userZodiac
    const moodName = this.data.selectedMood.name
    
    console.log('跳转参数:', {
      zodiacName,
      moodName,
      url: `/pages/result/result?type=combined&zodiac=${zodiacName}&mood=${moodName}&simplified=true`
    });
    
    // 重置状态
    this.setData({
      isCastingMagic: false,
      castingProgress: 0,
      showMagicEffect: false
    })
    
    wx.navigateTo({
      url: `/pages/result/result?type=combined&zodiac=${zodiacName}&mood=${moodName}&simplified=true`
    })
  },
  
  // 发动魔法按钮（保留作为备用）
  castMagic() {
    console.log('开始发动魔法');
    console.log('用户星座:', this.data.userZodiac);
    console.log('选中心情:', this.data.selectedMood);
    
    // 检查是否有用户星座
    if (!this.data.userZodiac) {
      wx.showModal({
        title: '需要选择星座',
        content: '请先选择你的星座，然后发动魔法查看今日运势',
        confirmText: '选择星座',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            this.changeZodiac()
          }
        }
      })
      return
    }
    
    // 检查是否选择了心情
    if (!this.data.selectedMood) {
      wx.showModal({
        title: '需要选择心情',
        content: '请先选择你当下的心情，然后发动魔法',
        confirmText: '知道了',
        showCancel: false
      })
      return
    }
    
    // 震动效果已移除
    
    // 跳转到结果页面，同时传递星座和心情信息
    const zodiacName = this.data.userZodiac.name || this.data.userZodiac
    const moodName = this.data.selectedMood.name
    
    console.log('跳转参数:', {
      zodiacName,
      moodName,
      url: `/pages/result/result?type=combined&zodiac=${zodiacName}&mood=${moodName}&simplified=true`
    });
    
    wx.navigateTo({
      url: `/pages/result/result?type=combined&zodiac=${zodiacName}&mood=${moodName}&simplified=true`
    })
  },
  
  // 改变星座
  changeZodiac() {
    this.setData({
      showMyZodiac: false
    })
    
    // 跳转到星座选择页面
    wx.navigateTo({
      url: '/pages/zodiac/zodiac'
    })
  },
  
  // 分享功能
  onShareAppMessage() {
    return {
      title: '魔法之书 - 用戏剧解读生活的每一刻',
      path: '/pages/magicbook/magicbook',
      imageUrl: 'cloud://cloud1-2gyb3dkq4c474fe4.636c-cloud1-2gyb3dkq4c474fe4-1371126028/images/xjhx-logo.png'
    }
  }
})