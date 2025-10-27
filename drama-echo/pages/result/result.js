const app = getApp()

Page({
  data: {
    pageTitle: '',
    resultIcon: '',
    sourceText: '',
    detailIcon: '',
    detailLabel: '',
    detailContent: '',
    retryText: '',
    resultData: {
      chinese: '',
      english: '',
      play: '',
      theater: '',
      fortune: '',
      scene: ''
    },
    type: '',
    value: '',
    shanghaiTip: '',
    recommendations: [],
    
    // 简化模式相关
    isSimplified: false,
    selectedMood: '',
    selectedMoodCategory: 'classic',
    currentMoodOptions: [],
    hasEarnedPointsToday: false,
    pointsToEarn: 15,
    
    // 心情选项
    classicMoods: [
      { name: '快乐', emoji: '😊', description: '如春日暖阳般的愉悦心情' },
      { name: '忧郁', emoji: '😔', description: '如雨夜般的深沉思考' },
      { name: '激情', emoji: '🔥', description: '如舞台上的炽热表演' },
      { name: '平静', emoji: '😌', description: '如湖水般的宁静致远' },
      { name: '困惑', emoji: '🤔', description: '如迷雾中的思索探寻' },
      { name: '愤怒', emoji: '😠', description: '如雷鸣般的正义之声' },
      { name: '浪漫', emoji: '💕', description: '如诗篇般的美好情感' }
    ],
    modernMoods: [
      { name: '焦虑', emoji: '😰', description: '现代生活的快节奏压力' },
      { name: '社恐', emoji: '😷', description: '在人群中的不安感受' },
      { name: '摆烂', emoji: '🙃', description: '对内卷生活的小小反抗' },
      { name: 'emo', emoji: '🌙', description: '深夜时分的真实情感' },
      { name: '躁动', emoji: '⚡', description: '内心渴望改变的冲动' },
      { name: '治愈', emoji: '🌱', description: '被温暖包围的美好感受' },
      { name: '丧气', emoji: '🌧️', description: '低谷时期的自我疗愈' }
    ],

    // 数据缓存
    cachedZodiacData: {},
    cachedMoodData: {},
    cacheExpiry: 0, // 缓存过期时间（30分钟）
    
    shanghaiTips: {
      zodiac: [
        "今天很适合去外滩看黄浦江的日落，让自然的力量为你充电。",
        "推荐去新天地的咖啡馆坐坐，在都市的优雅中找到内心的平静。",
        "不妨去豫园走走，在古典韵味中感受传统文化的力量。",
        "建议今晚去陆家嘴看夜景，在璀璨灯火中思考未来的方向。"
      ],
      mood: [
        "心情需要出口，推荐去上海博物馆，在艺术中找到共鸣。",
        "情感丰富的时候，最适合去苏州河边散步，让流水带走烦恼。",
        "推荐去田子坊感受文艺气息，在创意中释放内心的情感。",
        "心情复杂时，不妨去静安寺祈福，在宁静中整理思绪。"
      ]
    }
  },

  // 获取星座数据（带缓存）
  async getZodiacData(zodiac) {
    const now = Date.now()
    const cacheKey = zodiac || 'all'
    
    // 检查缓存是否有效（30分钟）
    if (this.data.cachedZodiacData[cacheKey] && now < this.data.cacheExpiry) {
      console.log('使用缓存的星座数据')
      return this.data.cachedZodiacData[cacheKey]
    }
    
    try {
      wx.showLoading({
        title: '获取数据中...',
        mask: true
      })
      
      const res = await wx.cloud.callFunction({
        name: 'getZodiacQuotes',
        data: { zodiac }
      })
      
      wx.hideLoading()
      
      if (res.result.code === 0) {
        // 更新缓存
        this.data.cachedZodiacData[cacheKey] = res.result.data
        this.data.cacheExpiry = now + 30 * 60 * 1000 // 30分钟后过期
        
        return res.result.data
      } else {
        throw new Error(res.result.message)
      }
    } catch (error) {
      wx.hideLoading()
      console.error('获取星座数据失败:', error)
      wx.showToast({
        title: '数据获取失败',
        icon: 'none'
      })
      return null
    }
  },

  // 获取心情数据（带缓存）
  async getMoodData(mood, category) {
    const now = Date.now()
    const cacheKey = `${mood || 'all'}_${category || 'all'}`
    
    // 检查缓存是否有效（30分钟）
    if (this.data.cachedMoodData[cacheKey] && now < this.data.cacheExpiry) {
      console.log('使用缓存的心情数据')
      return this.data.cachedMoodData[cacheKey]
    }
    
    try {
      if (!this.data.loading) {
        wx.showLoading({
          title: '获取数据中...',
          mask: true
        })
      }
      
      const res = await wx.cloud.callFunction({
        name: 'getMoodQuotes',
        data: { mood, category }
      })
      
      wx.hideLoading()
      
      if (res.result.code === 0) {
        // 更新缓存
        this.data.cachedMoodData[cacheKey] = res.result.data
        this.data.cacheExpiry = now + 30 * 60 * 1000 // 30分钟后过期
        
        return res.result.data
      } else {
        throw new Error(res.result.message)
      }
    } catch (error) {
      wx.hideLoading()
      console.error('获取心情数据失败:', error)
      wx.showToast({
        title: '数据获取失败',
        icon: 'none'
      })
      return null
    }
  },

  onLoad(options = {}) {
    console.log('result页面onLoad被调用，参数:', options);
    
    const { type, value, simplified, zodiac, mood } = options;
    const isSimplified = simplified === 'true';
    
    console.log('解析后的参数:', { type, value, simplified, zodiac, mood });
    
    this.setData({
      type: type || '',
      value: value || '',
      isSimplified: isSimplified,
      currentMoodOptions: this.data.classicMoods
    });
    
    if (isSimplified) {
      this.checkDailyPointsStatus();
    }
    
    if (type === 'zodiac') {
      console.log('处理zodiac类型');
      this.showZodiacResult(value);
    } else if (type === 'mood') {
      console.log('处理mood类型');
      this.showMoodResult(value);
    } else if (type === 'combined') {
      console.log('处理combined类型');
      // 处理魔法之书的组合模式
      this.showCombinedResult(zodiac, mood);
    } else {
      console.warn('未指定结果类型，使用默认配置')
    }
  },
  
  async showZodiacResult(zodiac) {
    console.log(`开始显示星座运势: ${zodiac}`);
    
    // 从云数据库获取星座数据
    const zodiacDataArray = await this.getZodiacData(zodiac);
    
    if (!zodiacDataArray || zodiacDataArray.length === 0) {
      console.error(`未找到星座 ${zodiac} 的数据`);
      wx.showToast({
        title: '星座数据获取失败',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    // 随机选择一个预测结果
    const randomIndex = Math.floor(Math.random() * zodiacDataArray.length);
    const resultData = zodiacDataArray[randomIndex];
    
    const shanghaiTip = this.getRandomTip('zodiac');
    const recommendations = this.getRecommendations('zodiac', zodiac);
    
    console.log('设置页面数据:', {
      pageTitle: `${zodiac}今日运势`,
      detailContent: resultData.fortune,
      selectedVariant: randomIndex
    });
    
    this.setData({
      pageTitle: `${zodiac}今日运势`,
      resultIcon: '☀️',
      sourceText: '启示',
      detailIcon: '⭐',
      detailLabel: '今日运势解读',
      detailContent: resultData.fortune,
      retryText: '重新选择星座',
      resultData,
      shanghaiTip,
      recommendations
    });
    
    console.log('页面数据设置完成，使用变体:', randomIndex);
    
    // 保存到星座历史记录
    this.saveToHistory('zodiac', zodiac, resultData);
  },
  
  async showMoodResult(mood) {
    console.log(`开始显示心情结果: ${mood}`);
    
    // 从云数据库获取心情数据
    const moodDataArray = await this.getMoodData(mood);
    
    if (!moodDataArray || moodDataArray.length === 0) {
      console.error(`未找到心情 ${mood} 的数据`);
      wx.showToast({
        title: '心情数据获取失败',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    // 随机选择一个结果
    const randomIndex = Math.floor(Math.random() * moodDataArray.length);
    const resultData = moodDataArray[randomIndex];
    
    const shanghaiTip = this.getRandomTip('mood');
    const recommendations = this.getRecommendations('mood', mood);
    
    this.setData({
      pageTitle: '心情戏剧台词',
      resultIcon: '🌙',
      sourceText: '共鸣',
      detailIcon: '🎭',
      detailLabel: '戏剧场景',
      detailContent: resultData.scene,
      retryText: '重新选择心情',
      resultData,
      shanghaiTip,
      recommendations
    });
    
    // 保存到心情历史记录
    this.saveToHistory('mood', mood, resultData);
  },
  
  async showCombinedResult(zodiac, mood) {
    console.log(`开始显示组合结果: 星座=${zodiac}, 心情=${mood}`);
    
    try {
      // 并行获取星座和心情数据
      const [zodiacDataArray, moodDataArray] = await Promise.all([
        this.getZodiacData(zodiac),
        this.getMoodData(mood)
      ]);
      
      if (!zodiacDataArray || zodiacDataArray.length === 0) {
        console.error(`未找到星座 ${zodiac} 的数据`);
        wx.showToast({
          title: '星座数据获取失败',
          icon: 'none',
          duration: 2000
        });
        return;
      }
      
      if (!moodDataArray || moodDataArray.length === 0) {
        console.error(`未找到心情 ${mood} 的数据`);
        wx.showToast({
          title: '心情数据获取失败',
          icon: 'none',
          duration: 2000
        });
        return;
      }
      
      // 随机选择星座和心情数据
      const zodiacRandomIndex = Math.floor(Math.random() * zodiacDataArray.length);
      const moodRandomIndex = Math.floor(Math.random() * moodDataArray.length);
      const zodiacData = zodiacDataArray[zodiacRandomIndex];
      const moodData = moodDataArray[moodRandomIndex];
      
      console.log('选择的星座数据:', zodiacData);
      console.log('选择的心情数据:', moodData);
      
      // 组合数据
      const combinedData = {
        chinese: `${moodData.chinese} - ${zodiacData.chinese}`,
        english: `${moodData.english} - ${zodiacData.english}`,
        play: moodData.play,
        theater: moodData.theater,
        fortune: zodiacData.fortune,
        scene: moodData.scene
      };
      
      console.log('组合数据:', combinedData);
    
    const shanghaiTip = this.getRandomTip('mood');
    const recommendations = this.getRecommendations('mood', mood);
    
    const setDataObj = {
      pageTitle: `${zodiac}今日运势`,
      resultIcon: '✨',
      sourceText: '魔法',
      detailIcon: '🎭',
      detailLabel: '戏剧场景',
      detailContent: moodData.scene,
      retryText: '重新发动魔法',
      resultData: combinedData,
      shanghaiTip,
      recommendations
    };
    
    console.log('设置页面数据:', setDataObj);
    
    this.setData(setDataObj);
    
    console.log('页面数据设置完成');
    
    // 保存组合记录
    this.saveCombinedRecord(zodiac, mood, combinedData);
    
    } catch (error) {
      console.error('组合结果处理失败:', error);
      wx.showToast({
        title: '数据处理失败',
        icon: 'none'
      });
    }
  },
  
  saveToHistory(type, value, data) {
    const userData = app.globalData.userData;
    if (!userData) return;
    
    const historyItem = {
      value: value,
      chinese: data.chinese,
      english: data.english,
      play: data.play,
      theater: data.theater,
      scene: data.scene || '', // 添加场景描述字段
      timestamp: Date.now()
    };
    
    if (type === 'zodiac') {
      // 如果支持云开发，保存星座记录到云端
      if (app.globalData.cloudEnabled) {
        wx.cloud.callFunction({
          name: 'saveZodiacRecord',
          data: {
            zodiac: value,
            result: data.chinese,
            playQuote: data.chinese,
            theater: data.theater,
            play: data.play
          }
        }).then(res => {
          if (res.result.code === 0) {
            console.log('星座记录保存到云端成功')
            // 云端保存成功后也保存到本地
            this.saveToLocalHistory('zodiac', historyItem)
          } else if (res.result.code === -2) {
            // 每日限制
            wx.showToast({
              title: res.result.message,
              icon: 'none',
              duration: 3000
            })
          } else {
            console.error('云端保存失败:', res.result.message)
            // 降级到本地保存
            this.saveToLocalHistory('zodiac', historyItem)
          }
        }).catch(error => {
          console.error('星座记录云函数调用失败:', error)
          // 降级到本地保存
          this.saveToLocalHistory('zodiac', historyItem)
        })
      } else {
        // 降级到本地保存
        this.saveToLocalHistory('zodiac', historyItem)
      }
    } else if (type === 'mood') {
      // 如果支持云开发，保存心情记录到云端
      if (app.globalData.cloudEnabled) {
        wx.cloud.callFunction({
          name: 'saveMoodRecord',
          data: {
            mood: value,
            emoji: '🎭', // 使用统一的戏剧表情
            category: 'classic', // 默认分类
            playQuote: data.chinese,
            english: data.english,
            theater: data.theater,
            play: data.play,
            scene: data.scene || '' // 添加场景描述字段
          }
        }).then(res => {
          if (res.result.code === 0) {
            console.log('心情记录保存到云端成功')
            // 云端保存成功后也保存到本地
            this.saveToLocalHistory('mood', historyItem)
          } else if (res.result.code === -2) {
            // 每日限制
            wx.showToast({
              title: res.result.message,
              icon: 'none',
              duration: 3000
            })
          } else {
            console.error('云端保存失败:', res.result.message)
            // 降级到本地保存
            this.saveToLocalHistory('mood', historyItem)
          }
        }).catch(error => {
          console.error('心情记录云函数调用失败:', error)
          // 降级到本地保存
          this.saveToLocalHistory('mood', historyItem)
        })
      } else {
        // 降级到本地保存
        this.saveToLocalHistory('mood', historyItem)
      }
    }
  },

  // 保存到本地历史记录
  saveToLocalHistory(type, historyItem) {
    const userData = app.globalData.userData;
    if (!userData) return;
    
    if (type === 'zodiac') {
      if (!userData.zodiacHistory) {
        userData.zodiacHistory = [];
      }
      userData.zodiacHistory.push(historyItem);
      // 只保留最近20条记录
      if (userData.zodiacHistory.length > 20) {
        userData.zodiacHistory = userData.zodiacHistory.slice(-20);
      }
    } else if (type === 'mood') {
      if (!userData.moodHistory) {
        userData.moodHistory = [];
      }
      userData.moodHistory.push(historyItem);
      // 只保留最近20条记录
      if (userData.moodHistory.length > 20) {
        userData.moodHistory = userData.moodHistory.slice(-20);
      }
    }
    
    // 保存到本地存储
    app.saveUserData();
  },
  
  getRandomTip(type) {
    const tips = this.data.shanghaiTips[type];
    return tips[Math.floor(Math.random() * tips.length)];
  },
  
  getRecommendations(type, value) {
    const recommendations = [];
    
    if (type === 'zodiac') {
      recommendations.push(
        {
          icon: '🎭',
          title: '推荐观剧',
          description: '根据你的星座特质，推荐观看相关主题的戏剧作品'
        },
        {
          icon: '📱',
          title: '记录心情',
          description: '用心情戏剧功能记录今天的感受'
        }
      );
    } else {
      recommendations.push(
        {
          icon: '⭐',
          title: '查看运势',
          description: '看看星座运势，获得更多生活指引'
        },
        {
          icon: '📅',
          title: '日历打卡',
          description: '在观剧日历中记录今天的心情'
        }
      );
    }
    
    return recommendations;
  },
  
  // 检查今日积分状态
  checkDailyPointsStatus() {
    const userData = app.globalData.userData
    if (!userData) return
    
    const today = new Date().toDateString()
    const lastEarnedDate = userData.lastMagicBookEarnDate
    const hasEarnedToday = lastEarnedDate === today
    
    this.setData({
      hasEarnedPointsToday: hasEarnedToday
    })
  },
  
  // 切换心情分类
  switchMoodCategory(e) {
    const category = e.currentTarget.dataset.category
    const moods = category === 'classic' ? this.data.classicMoods : this.data.modernMoods
    this.setData({
      selectedMoodCategory: category,
      currentMoodOptions: moods,
      selectedMood: '' // 清空已选择的心情
    })
  },
  
  // 选择心情
  selectMood(e) {
    const mood = e.currentTarget.dataset.mood
    this.setData({
      selectedMood: mood
    })
    wx.vibrateShort()
  },
  
  // 获取心情表情
  getMoodEmoji(moodName) {
    const classicMood = this.data.classicMoods.find(m => m.name === moodName)
    const modernMood = this.data.modernMoods.find(m => m.name === moodName)
    return (classicMood || modernMood)?.emoji || ''
  },
  
  // 完成记录
  completeRecord() {
    if (this.data.hasEarnedPointsToday) {
      wx.showToast({
        title: '今日已获得积分',
        icon: 'none'
      })
      return
    }
    
    if (!this.data.selectedMood) {
      wx.showToast({
        title: '请先选择心情',
        icon: 'none'
      })
      return
    }
    
    // 保存记录并获得积分
    this.saveCompleteRecord()
  },
  
  // 保存完整记录
  saveCompleteRecord() {
    const { type, value, selectedMood, selectedMoodCategory, resultData } = this.data
    
    // 获得积分奖励
    const points = this.data.pointsToEarn
    app.addPoints(points, '戏剧魔法书完整记录')
    
    // 记录今日已获得积分
    const userData = app.globalData.userData
    if (userData) {
      userData.lastMagicBookEarnDate = new Date().toDateString()
      app.saveUserData()
    }
    
    // 保存星座记录
    if (type === 'zodiac') {
      this.saveZodiacRecord(value, resultData)
    }
    
    // 保存心情记录
    this.saveMoodRecord(selectedMood, selectedMoodCategory, resultData)
    
    // 更新状态
    this.setData({
      hasEarnedPointsToday: true
    })
    
    wx.showToast({
      title: `获得${points}积分！`,
      icon: 'success'
    })
  },
  
  // 保存星座记录
  saveZodiacRecord(zodiac, data) {
    // 使用与原来相同的保存逻辑
    this.saveToHistory('zodiac', zodiac, data)
  },
  
  // 保存心情记录
  saveMoodRecord(mood, category, zodiacData) {
    // 创建基于星座的心情记录
    const combinedData = {
      chinese: `${mood}时刻：${zodiacData.chinese}`,
      english: `Moment of ${mood}: ${zodiacData.english}`,
      play: zodiacData.play,
      theater: zodiacData.theater,
      scene: zodiacData.fortune || '' // 使用星座运势作为场景描述
    }
    this.saveToHistory('mood', mood, combinedData)
  },
  
  saveCombinedRecord(zodiac, mood, combinedData) {
    // 保存星座记录
    const zodiacData = {
      chinese: combinedData.chinese.split(' - ')[1] || combinedData.chinese,
      english: combinedData.english.split(' - ')[1] || combinedData.english,
      play: combinedData.play,
      theater: combinedData.theater,
      fortune: combinedData.fortune,
      scene: ''
    };
    this.saveToHistory('zodiac', zodiac, zodiacData);
    
    // 保存心情记录  
    const moodData = {
      chinese: combinedData.chinese.split(' - ')[0] || combinedData.chinese,
      english: combinedData.english.split(' - ')[0] || combinedData.english,
      play: combinedData.play,
      theater: combinedData.theater,
      scene: combinedData.scene
    };
    this.saveToHistory('mood', mood, moodData);
    
    console.log('组合记录保存完成');
  },
  
  goBack() {
    wx.navigateBack({
      delta: 1
    });
  },
  
  // 分享功能
  onShareAppMessage() {
    const { type, value, resultData } = this.data;
    
    if (type === 'zodiac') {
      return {
        title: `我的${value}运势：${resultData.chinese}`,
        path: `/pages/result/result?type=${type}&value=${value}`,
        imageUrl: 'cloud://cloud1-2gyb3dkq4c474fe4.636c-cloud1-2gyb3dkq4c474fe4-1371126028/images/xjhx-logo.png'
      };
    } else if (type === 'mood') {
      return {
        title: `我的心情：${resultData.chinese}`,
        path: `/pages/result/result?type=${type}&value=${value}`,
        imageUrl: 'cloud://cloud1-2gyb3dkq4c474fe4.636c-cloud1-2gyb3dkq4c474fe4-1371126028/images/xjhx-logo.png'
      };
    } else if (type === 'combined') {
      // 组合模式的分享
      return {
        title: `魔法之书：${resultData.chinese}`,
        path: `/pages/result/result?type=${type}&value=${value}`,
        imageUrl: 'cloud://cloud1-2gyb3dkq4c474fe4.636c-cloud1-2gyb3dkq4c474fe4-1371126028/images/xjhx-logo.png'
      };
    } else {
      // 默认分享
      return {
        title: `戏剧台词：${resultData.chinese}`,
        path: `/pages/result/result?type=${type}&value=${value}`,
        imageUrl: 'cloud://cloud1-2gyb3dkq4c474fe4.636c-cloud1-2gyb3dkq4c474fe4-1371126028/images/xjhx-logo.png'
      };
    }
  }
})