const app = getApp()
const ShareImageHandler = require('../../utils/shareImageHandler.js')

Page({
  data: {
    packId: '',
    packInfo: {
      name: '',
      actorName: '',
      actorAvatar: '',
      actorTitle: '',
      category: '',
      description: '',
      photos: [],
      voices: [],
      totalDuration: '',
      voiceCount: 0,
      salesCount: 0,
      originalPrice: 0,
      packagePrice: 0,
      saveAmount: 0,
      packagePurchased: false,
      bonusVideoThumb: '',
      bonusVideoTitle: '',
      bonusVideoDuration: '',
      bonusVideoUrl: ''
    },
    currentPlaying: -1,
    playProgress: 0,
    audioContext: null,
    // 复购相关数据
    showRepurchaseModal: false,
    repurchaseQuantity: 1,
    userPurchaseCount: 0,
    totalPrice: '0.00',
    // 音频播放器相关
    showAudioPlayer: false,
    currentAudioUrl: '',
    currentAudioFileName: '',
    // 分享相关
    shareContent: null,
    // 轮播图相关
    currentImageIndex: 0,
    // 虚拟支付支持检查
    isVirtualPaymentSupported: false
  },

  onLoad(options) {
    const packId = options.packId || options.id
    
    // 初始化虚拟支付支持检查
    this.setData({
      isVirtualPaymentSupported: app.isVirtualPaymentSupported()
    })
    
    if (packId) {
      this.setData({ packId })
      this.loadPackInfo(packId)
    }
    
    // 初始化音频上下文
    this.initAudioContext()
  },

  onShow() {
    // 允许浏览，但在购买时检查登录状态
  },

  onUnload() {
    // 清理音频资源
    if (this.audioContext) {
      this.audioContext.stop()
      this.audioContext.destroy()
    }
  },

  // 初始化音频上下文
  initAudioContext() {
    try {
      // 如果已存在，先销毁
      if (this.audioContext) {
        this.audioContext.destroy()
        this.audioContext = null
      }
      
      // 创建新的音频上下文
      this.audioContext = wx.createInnerAudioContext()
      
      // 设置iOS静音模式下也能播放声音
      this.audioContext.obeyMuteSwitch = false
      
      // 验证音频上下文是否创建成功
      if (!this.audioContext) {
        throw new Error('音频上下文创建失败')
      }
      
      this.setupAudioEvents()
      
      console.log('✅ 音频上下文初始化成功')
      return true
    } catch (error) {
      console.error('❌ 音频上下文初始化失败:', error)
      this.audioContext = null
      return false
    }
  },

  goBackFn(){
    wx.navigateBack({
      delta: 1, // 返回层数（1表示上一页）
      success() {
        console.log('返回成功');
      }
    });
  },

  // 加载语音包信息
  async loadPackInfo(packId) {
    try {
      wx.showLoading({ title: '加载中...' })
      
      console.log('开始加载语音包信息，packId:', packId)
      
      // 设置加载状态
      this.setData({ loading: true })
      
      // 优先调用云函数获取真实数据
      if (app.globalData.cloudEnabled) {
        try {
          const res = await wx.cloud.callFunction({
            name: 'getVoicePackDetail',
            data: { packId }
          })
          
          console.log('云函数返回结果:', res.result)
          
          if (res.result && res.result.code === 0) {
            console.log('使用云端数据:', res.result.data)
            const packData = res.result.data
            
            // 使用云函数返回的购买状态，但需要检查用户是否已登录
            const isUserLoggedIn = app.checkLoginStatus()
            if (isUserLoggedIn && (packData.packagePurchased || packData.isPurchased)) {
              if (packData.voices) {
                packData.voices.forEach(voice => {
                  voice.purchased = true
                  voice.canPreview = true
                })
              }
            } else {
              // 未登录用户，设置为未购买状态
              if (packData.voices) {
                packData.voices.forEach(voice => {
                  voice.purchased = false
                  voice.canPreview = true
                })
              }
              packData.packagePurchased = false
              packData.isPurchased = false
            }
            
            // 添加格式化价格字段（显示为回响单位）
            if (this.data.isVirtualPaymentSupported) {
              const priceValue = (packData.packagePrice / 100).toFixed(1)
              packData.priceValue = priceValue
              packData.priceUnit = '个回响'
              packData.formattedPrice = `${priceValue}个回响`
            } else {
              packData.formattedPrice = ''
              packData.priceValue = ''
              packData.priceUnit = ''
            }
            
            // 设置用户购买数量（基于购买状态和登录状态）
            const userPurchaseCount = (isUserLoggedIn && (packData.packagePurchased || packData.isPurchased)) ? 1 : 0
            this.setData({ userPurchaseCount })
            
            // 先显示页面数据
            this.setData({ 
              packInfo: packData,
              loading: false
            })
            
            // 调试信息
            console.log('🔄 复购功能调试信息:', {
              packagePurchased: packData.packagePurchased,
              isPurchased: packData.isPurchased,
              userPurchaseCount: this.data.userPurchaseCount
            })
            wx.hideLoading()
            
            // 异步处理云存储图片，获取临时链接
            this.processCloudImages(packData)
            
            // 异步获取真实音频时长
            this.loadRealAudioDurations(packData)
            
            // 获取用户购买数量
            await this.getUserPurchaseCount(packId)
            
            return
          } else {
            console.error('获取语音包详情失败:', res.result?.message || '未知错误')
          }
        } catch (error) {
          console.error('云函数调用失败:', error)
        }
      }
      
      // 如果云函数失败，使用模拟数据作为降级方案
      console.log('使用模拟数据作为降级方案')
      const mockData = this.getMockPackData(packId)
      // 设置为已购买状态
      mockData.packagePurchased = true
      mockData.isPurchased = true
      if (mockData.voices) {
        mockData.voices.forEach(voice => {
          voice.purchased = true
          voice.canPreview = true
        })
      }
      this.setData({ 
        packInfo: mockData,
        userPurchaseCount: 1
      })
      
      wx.hideLoading()
      
    } catch (error) {
      wx.hideLoading()
      console.error('加载语音包信息失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 模拟数据
  getMockPackData(packId) {
    const mockPacks = {
      'classic': {
        name: '经典台词',
        actorName: '林晓雨',
        actorAvatar: '/images/actors/linxiaoyu.jpg',
        actorTitle: '知名话剧演员',
        category: '经典台词',
        description: '精选经典戏剧台词，由林晓雨老师深情演绎，让您感受戏剧的魅力与情感的力量。',
        photos: [
          '/images/voice-packs/classic/photo1.jpg',
          '/images/voice-packs/classic/photo2.jpg',
          '/images/voice-packs/classic/photo3.jpg'
        ],
        voices: [
          {
            title: '《雷雨》经典片段',
            subtitle: '四凤与周萍的对话',
            duration: '2:30',
            price: 8.8,
            canPreview: true,
            purchased: false,
            audioUrl: '/audio/classic/voice1.mp3',
            previewUrl: '/audio/classic/voice1_preview.mp3'
          },
          {
            title: '《茶馆》精彩选段',
            subtitle: '王利发的独白',
            duration: '3:15',
            price: 9.9,
            canPreview: true,
            purchased: false,
            audioUrl: '/audio/classic/voice2.mp3',
            previewUrl: '/audio/classic/voice2_preview.mp3'
          },
          {
            title: '《日出》感人台词',
            subtitle: '陈白露的心声',
            duration: '2:45',
            price: 8.8,
            canPreview: true,
            purchased: false,
            audioUrl: '/audio/classic/voice3.mp3',
            previewUrl: '/audio/classic/voice3_preview.mp3'
          }
        ],
        totalDuration: '8分30秒',
        voiceCount: 3,
        salesCount: 159,
        originalPrice: 27.5,
        packagePrice: 19.9,
        saveAmount: 7.6,
        packagePurchased: false,
        bonusVideoThumb: 'https://picsum.photos/300/200?random=1',
        bonusVideoTitle: '拍摄花絮：林晓雨的戏剧人生',
        bonusVideoDuration: '5:20',
        bonusVideoUrl: '/video/classic/bonus.mp4'
      }
    }
    
    return mockPacks[packId] || mockPacks['classic']
  },

  // 设置音频事件
  setupAudioEvents() {
    if (!this.audioContext) {
      console.error('音频上下文未初始化')
      return
    }

    this.audioContext.onPlay(() => {
      console.log('音频开始播放')
    })

    this.audioContext.onPause(() => {
      console.log('音频暂停')
    })

    this.audioContext.onStop(() => {
      this.setData({
        currentPlaying: -1,
        playProgress: 0
      })
    })

    this.audioContext.onEnded(() => {
      this.setData({
        currentPlaying: -1,
        playProgress: 0
      })
    })

    this.audioContext.onTimeUpdate(() => {
      const progress = (this.audioContext.currentTime / this.audioContext.duration) * 100
      this.setData({ playProgress: progress || 0 })
    })

    this.audioContext.onError((error) => {
      console.error('音频播放错误:', error)
      this.setData({ currentPlaying: -1 })
      
      // 根据错误类型显示不同的提示
      let errorMessage = '播放失败'
      if (error.errCode === 10001) {
        errorMessage = '音频文件不存在或无法访问'
      } else if (error.errCode === -1) {
        errorMessage = '音频播放器未初始化'
      }
      
      wx.showToast({
        title: errorMessage,
        icon: 'none'
      })
    })
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  },

  // 设置分享内容
  async setShareContent() {
    const { packInfo } = this.data
    
    console.log('📤 设置语音包分享内容:', packInfo)
    console.log('📤 演员信息:', {
      actorName: packInfo.actorName,
      actorAvatar: packInfo.actorAvatar,
      images: packInfo.images,
      photos: packInfo.photos
    })
    
    // 优先使用演员封面图，然后是语音包图片
    const shareImage = packInfo.actorAvatar || packInfo.images?.[0] || packInfo.photos?.[0] || ''
    
    console.log('🖼️ 分享图片URL (优先演员封面):', shareImage)
    console.log('🖼️ 图片类型判断:', {
      isCloud: shareImage.startsWith('cloud://'),
      isHttp: shareImage.startsWith('http'),
      isLocal: shareImage.startsWith('/images/'),
      isEmpty: !shareImage
    })
    
    // 构建演员详情页链接，需要获取演员ID
    const actorId = packInfo.actorId || packInfo.actor_id
    const sharePath = actorId ? 
      `/pages/actor-detail/actor-detail?actorId=${actorId}` : 
      `/pages/voice-echo/voice-echo` // 如果没有演员ID，回退到戏剧回响页面
    
    // 使用分享图片处理工具
    const shareContent = await ShareImageHandler.createShareContent(
      `${packInfo.actorName}的专属空间 - 戏剧回响`,
      `探索${packInfo.actorName}的精彩内容`,
      sharePath,
      shareImage
    )
    
    // 设置分享内容到页面数据
    this.setData({ shareContent })
    
    console.log('✅ 分享内容设置完成:', shareContent)
  },

  // 验证图片URL是否有效
  async validateImageUrl(imageUrl) {
    return new Promise((resolve) => {
      if (!imageUrl || imageUrl === 'cloud://cloud1-2gyb3dkq4c474fe4.636c-cloud1-2gyb3dkq4c474fe4-1371126028/images/xjhx-logo.png') {
        resolve(true) // 本地图片直接通过
        return
      }
      
      // 创建图片对象来验证URL
      const img = new Image()
      img.onload = () => {
        console.log('✅ 图片加载成功:', imageUrl)
        resolve(true)
      }
      img.onerror = () => {
        console.log('❌ 图片加载失败:', imageUrl)
        resolve(false)
      }
      img.src = imageUrl
      
      // 设置超时
      setTimeout(() => {
        console.log('⏰ 图片验证超时:', imageUrl)
        resolve(false)
      }, 5000)
    })
  },

  // 获取云存储图片的临时链接
  async getTempImageUrl(cloudUrl) {
    try {
      console.log('🔍 开始获取云存储图片临时链接:', cloudUrl)
      
      const tempRes = await wx.cloud.getTempFileURL({
        fileList: [cloudUrl]
      })
      
      console.log('🔍 临时链接获取结果:', tempRes)
      
      if (tempRes.fileList && tempRes.fileList.length > 0) {
        const fileResult = tempRes.fileList[0]
        console.log('🔍 文件处理结果:', {
          fileID: fileResult.fileID,
          status: fileResult.status,
          errMsg: fileResult.errMsg,
          tempFileURL: fileResult.tempFileURL
        })
        
        if (fileResult.status === 0) {
          console.log('✅ 临时链接获取成功:', fileResult.tempFileURL)
          return fileResult.tempFileURL
        } else {
          console.error('❌ 获取临时链接失败:', {
            status: fileResult.status,
            errMsg: fileResult.errMsg,
            fileID: fileResult.fileID
          })
          return null
        }
      } else {
        console.error('❌ 返回结果为空:', tempRes)
        return null
      }
    } catch (error) {
      console.error('❌ 获取临时链接异常:', {
        error: error,
        message: error.message,
        stack: error.stack
      })
      return null
    }
  },

  // 轮播图切换事件
  onSwiperChange(e) {
    const current = e.detail.current
    this.setData({
      currentImageIndex: current
    })
  },

  // 预览照片
  previewPhoto(e) {
    const index = e.currentTarget.dataset.index
    const images = this.data.packInfo.images || []
    
    if (images.length > 0) {
      wx.previewImage({
        current: images[index],
        urls: images
      })
    }
  },

  // 试听语音
  previewVoice(e) {
    const index = e.currentTarget.dataset.index
    const voice = this.data.packInfo.voices[index]
    
    if (!voice) {
      console.error('语音数据不存在:', index)
      return
    }
    
    console.log('试听语音:', voice)
    
    // 获取音频URL
    let audioUrl = voice.previewUrl || voice.audioUrl
    
    if (!audioUrl) {
      wx.showToast({
        title: '音频文件不可用',
        icon: 'none'
      })
      return
    }
    
    // 如果是云存储路径，需要获取临时访问链接
    if (audioUrl.startsWith('cloud://')) {
      wx.showLoading({
        title: '加载音频中...'
      })
      
      wx.cloud.getTempFileURL({
        fileList: [audioUrl]
      }).then(res => {
        wx.hideLoading()
        
        if (res.fileList && res.fileList.length > 0) {
          const file = res.fileList[0]
          if (file.status === 0) {
            // 使用新的音频播放器组件
            this.setData({
              showAudioPlayer: true,
              currentAudioUrl: file.tempFileURL,
              currentAudioFileName: voice.title || `语音${index + 1}`,
              currentPlaying: index
            })
          } else {
            wx.showToast({
              title: '音频文件访问失败',
              icon: 'none'
            })
          }
        } else {
          wx.showToast({
            title: '音频文件不可用',
            icon: 'none'
          })
        }
      }).catch(err => {
        wx.hideLoading()
        console.error('获取临时链接失败:', err)
        wx.showToast({
          title: '音频加载失败',
          icon: 'none'
        })
      })
    } else {
      // HTTP URL，直接使用
      this.setData({
        showAudioPlayer: true,
        currentAudioUrl: audioUrl,
        currentAudioFileName: voice.title || `语音${index + 1}`,
        currentPlaying: index
      })
    }
  },

  // 单独购买语音
  buyIndividual(e) {
    const index = e.currentTarget.dataset.index
    const voice = this.data.packInfo.voices[index]
    
    const purchaseItem = {
      type: 'individual',
      index: index,
      voiceId: voice.voiceId || `voice_${index}`, // 语音ID
      name: voice.title,
      description: voice.subtitle,
      price: voice.price
    }
    
    this.setData({
      purchaseItem,
      showPurchaseModal: true
    })
  },

  // 购买功能已移除，页面为已购买状态

  // 购物车功能已移除

  // 播放花絮视频（仅播放，不可下载）
  playBonusVideo() {
    const videoUrl = this.data.packInfo.bonusVideoUrl
    if (!videoUrl) {
      wx.showToast({
        title: '暂无花絮视频',
        icon: 'none'
      })
      return
    }
    
    // 如果是云存储URL，需要获取临时链接
    if (videoUrl.startsWith('cloud://')) {
      wx.showLoading({
        title: '加载视频中...'
      })
      
      wx.cloud.getTempFileURL({
        fileList: [videoUrl]
      }).then(res => {
        wx.hideLoading()
        console.log('视频临时链接结果:', res)
        
        if (res.fileList && res.fileList.length > 0) {
          const tempFile = res.fileList[0]
          if (tempFile.status === 0) {
            // 使用微信内置视频播放器，设置仅播放模式
            wx.previewMedia({
              sources: [{
                url: tempFile.tempFileURL,
                type: 'video',
                poster: this.data.packInfo.bonusVideoThumb || 'https://picsum.photos/300/200?random=1'
              }],
              // 禁用下载功能
              showmenu: false,
              // 设置播放模式为仅播放
              enablePlayGesture: true,
              enableProgressGesture: true,
              // 禁用长按保存功能
              enableSavePhoto: false
            })
          } else {
            wx.showToast({
              title: '视频加载失败',
              icon: 'none'
            })
          }
        }
      }).catch(error => {
        wx.hideLoading()
        console.error('获取视频临时链接失败:', error)
        wx.showToast({
          title: '视频加载失败',
          icon: 'none'
        })
      })
    } else {
      // 直接使用URL，同样设置仅播放模式
      wx.previewMedia({
        sources: [{
          url: videoUrl,
          type: 'video',
          poster: this.data.packInfo.bonusVideoThumb || 'https://picsum.photos/300/200?random=1'
        }],
        // 禁用下载功能
        showmenu: false,
        // 设置播放模式为仅播放
        enablePlayGesture: true,
        enableProgressGesture: true,
        // 禁用长按保存功能
        enableSavePhoto: false
      })
    }
  },

  // 购买弹窗相关方法已移除

  // 支付相关方法已移除

  // 分享设置
  onShareAppMessage() {
    const shareContent = this.data.shareContent
    if (shareContent) {
      return shareContent
    }
    
    // 默认分享内容
    const { packInfo } = this.data
    const defaultImage = packInfo.actorAvatar || packInfo.photos && packInfo.photos[0] || packInfo.images && packInfo.images[0] || 'cloud://cloud1-2gyb3dkq4c474fe4.636c-cloud1-2gyb3dkq4c474fe4-1371126028/images/xjhx-logo.png'
    
    // 构建演员详情页链接
    const actorId = packInfo.actorId || packInfo.actor_id
    const sharePath = actorId ? 
      `/pages/actor-detail/actor-detail?actorId=${actorId}` : 
      `/pages/voice-echo/voice-echo` // 如果没有演员ID，回退到戏剧回响页面
    
    return {
      title: `${packInfo.actorName}的专属空间 - 戏剧回响`,
      path: sharePath,
      imageUrl: defaultImage
    }
  },

  onShareTimeline() {
    const shareContent = this.data.shareContent
    if (shareContent) {
      // 从分享路径中提取参数
      const urlParts = shareContent.path.split('?')
      const query = urlParts.length > 1 ? urlParts[1] : ''
      
      return {
        title: shareContent.title,
        query: query,
        imageUrl: shareContent.imageUrl
      }
    }
    
    // 默认分享内容
    const { packInfo } = this.data
    const defaultImage = packInfo.actorAvatar || packInfo.photos && packInfo.photos[0] || packInfo.images && packInfo.images[0] || 'cloud://cloud1-2gyb3dkq4c474fe4.636c-cloud1-2gyb3dkq4c474fe4-1371126028/images/xjhx-logo.png'
    
    // 构建演员详情页链接
    const actorId = packInfo.actorId || packInfo.actor_id
    const query = actorId ? `actorId=${actorId}` : ''
    
    return {
      title: `${packInfo.actorName}的专属空间 - 戏剧回响`,
      query: query,
      imageUrl: defaultImage
    }
  },

  // 异步处理云存储图片
  async processCloudImages(packData) {
    if (!packData.images || packData.images.length === 0) {
      return
    }
    
    try {
      console.log('🖼️ 异步处理语音包图片，数量:', packData.images.length)
      const cloudImageUrls = packData.images.filter(url => url && url.startsWith('cloud://'))
      
      if (cloudImageUrls.length > 0) {
        console.log('🖼️ 需要获取临时链接的云存储图片:', cloudImageUrls)
        const tempRes = await wx.cloud.getTempFileURL({
          fileList: cloudImageUrls
        })
        
        console.log('🖼️ 图片临时链接结果:', tempRes)
        
        // 更新图片URL
        const updatedImages = packData.images.map(url => {
          if (url && url.startsWith('cloud://')) {
            const tempFile = tempRes.fileList.find(file => file.fileID === url)
            return tempFile && tempFile.status === 0 ? tempFile.tempFileURL : url
          }
          return url
        })
        
        // 更新页面数据
        this.setData({
          'packInfo.images': updatedImages
        })
        
        console.log('🖼️ 图片URL更新完成:', updatedImages)
      }
    } catch (error) {
      console.error('🖼️ 获取图片临时链接失败:', error)
    }
  },

  // 获取真实音频时长
  async loadRealAudioDurations(packData) {
    try {
      console.log('🎵 开始获取真实音频时长，语音数量:', packData.voices?.length || 0)
      
      if (!packData.voices || packData.voices.length === 0) {
        console.log('🎵 没有语音需要获取时长')
        return
      }
      
      // 为每个语音获取真实时长
      const updatedVoices = await Promise.all(
        packData.voices.map(async (voice, index) => {
          try {
            // 如果数据库中已经有真实时长，直接使用
            if (voice.duration && voice.duration !== '2:30' && voice.duration !== '0:00') {
              console.log(`🎵 语音 ${index + 1} (${voice.title}) 使用数据库时长: ${voice.duration}`)
              return voice
            }
            
            // 调用云函数获取真实时长
            const durationResult = await wx.cloud.callFunction({
              name: 'getAudioDuration',
              data: { audioUrl: voice.audioUrl || voice.previewUrl }
            })
            
            if (durationResult.result && durationResult.result.code === 0) {
              voice.duration = durationResult.result.data.formattedDuration
              console.log(`🎵 语音 ${index + 1} (${voice.title}) 真实时长: ${voice.duration}`)
            } else {
              console.error(`🎵 获取语音 ${index + 1} 时长失败:`, durationResult.result?.message)
              // 保持原有时长或设置默认值
              if (!voice.duration || voice.duration === '2:30') {
                voice.duration = '0:00'
              }
            }
          } catch (error) {
            console.error(`🎵 获取语音 ${index + 1} 时长失败:`, error)
            // 保持原有时长或设置默认值
            if (!voice.duration || voice.duration === '2:30') {
              voice.duration = '0:00'
            }
          }
          return voice
        })
      )
      
      // 更新页面数据
      this.setData({
        'packInfo.voices': updatedVoices
      })
      
      console.log('🎵 真实音频时长获取完成')
    } catch (error) {
      console.error('🎵 获取真实音频时长失败:', error)
    }
  },

  // 获取单个音频文件的时长
  getAudioDuration(audioUrl) {
    return new Promise((resolve, reject) => {
      if (!audioUrl) {
        reject(new Error('音频URL为空'))
        return
      }
      
      // 创建音频上下文
      const audioContext = wx.createInnerAudioContext()
      
      // 设置iOS静音模式下也能播放声音
      audioContext.obeyMuteSwitch = false
      
      audioContext.src = audioUrl
      
      // 监听音频加载完成事件
      audioContext.onCanplay(() => {
        // 获取音频时长
        const duration = audioContext.duration
        audioContext.destroy()
        
        if (duration && duration > 0) {
          resolve(duration)
        } else {
          reject(new Error('无法获取音频时长'))
        }
      })
      
      // 监听错误事件
      audioContext.onError((error) => {
        audioContext.destroy()
        reject(error)
      })
      
      // 设置超时
      setTimeout(() => {
        audioContext.destroy()
        reject(new Error('获取音频时长超时'))
      }, 10000) // 10秒超时
    })
  },

  // 格式化时长（秒转换为分:秒格式）
  formatDuration(seconds) {
    if (!seconds || seconds <= 0) {
      return '0:00'
    }
    
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  },

  // 获取用户购买数量
  async getUserPurchaseCount(packId) {
    try {
      console.log('🔍 获取用户购买数量，packId:', packId)

      // 调用getUserPurchases获取真实的购买记录
      const result = await wx.cloud.callFunction({
        name: 'getUserPurchases',
        data: { userId: 'current' }
      })

      console.log('🔍 getUserPurchases 返回结果:', result.result)

      if (result.result.code === 0) {
        const purchases = result.result.data.purchases || []
        console.log('📦 用户购买记录:', purchases)
        
        // 统计该语音包的购买数量
        const matchingPurchases = purchases.filter(purchase =>
          purchase.packId === packId || purchase.voicePackId === packId
        )
        
        console.log('🔍 匹配的购买记录:', matchingPurchases)
        console.log('🔍 每条记录的purchaseCount:', matchingPurchases.map(p => p.purchaseCount))
        
        // 计算总购买份数（考虑purchaseCount字段）
        const userPurchaseCount = matchingPurchases.reduce((total, purchase) => {
          const count = purchase.purchaseCount || 1
          console.log('🔍 累加购买份数:', count, '总计:', total + count)
          return total + count
        }, 0)

        console.log('📊 用户购买数量:', userPurchaseCount)
        this.setData({ userPurchaseCount })
      } else {
        console.error('获取用户购买记录失败:', result.result.message)
        this.setData({ userPurchaseCount: 0 })
      }
    } catch (error) {
      console.error('获取用户购买数量失败:', error)
      this.setData({ userPurchaseCount: 0 })
    }
  },

  // 计算总价
  calculateTotalPrice() {
    // 在iOS端不计算价格
    if (!this.data.isVirtualPaymentSupported) {
      this.setData({ totalPrice: '' })
      return
    }
    
    const { packInfo, repurchaseQuantity } = this.data
    console.log('💰 计算总价:', { packInfo, repurchaseQuantity })
    
    // 尝试多种价格字段
    const price = packInfo?.price || packInfo?.packagePrice || packInfo?.originalPrice
    console.log('💰 找到的价格字段:', { price, packagePrice: packInfo?.packagePrice, originalPrice: packInfo?.originalPrice })
    
    if (packInfo && price && repurchaseQuantity) {
      const totalPriceValue = (price * repurchaseQuantity / 100).toFixed(1)
      const totalPrice = `${totalPriceValue}个回响`
      console.log('💰 计算出的总价:', totalPrice)
      this.setData({ 
        totalPrice,
        totalPriceValue
      })
    } else {
      console.log('💰 数据不完整，设置默认总价')
      this.setData({ 
        totalPrice: '0.0个回响',
        totalPriceValue: '0.0'
      })
    }
  },

  // 显示复购弹窗
  showRepurchaseModal() {
    // 检查登录状态，如果未登录则提示
    if (!app.checkLoginStatus()) {
      wx.showToast({
        title: '请先登录',
        icon: 'none',
        duration: 2000
      })
      return
    }
    
    console.log('🔄 显示复购弹窗')
    console.log('🔄 当前数据状态:', {
      showRepurchaseModal: this.data.showRepurchaseModal,
      packInfo: this.data.packInfo,
      userPurchaseCount: this.data.userPurchaseCount
    })
    
    this.setData({ 
      showRepurchaseModal: true,
      repurchaseQuantity: 1
    })
    
    this.calculateTotalPrice()
    
    console.log('✅ 弹窗状态已设置:', this.data.showRepurchaseModal)
    
    // 添加延迟检查，确保状态更新
    setTimeout(() => {
      console.log('🔄 延迟检查弹窗状态:', this.data.showRepurchaseModal)
    }, 100)
  },

  // 隐藏复购弹窗
  hideRepurchaseModal() {
    this.setData({ showRepurchaseModal: false })
  },

  // 增加数量
  increaseQuantity() {
    console.log('➕ 增加数量按钮被点击')
    const { repurchaseQuantity } = this.data
    if (repurchaseQuantity < 99) { // 限制最大购买数量
      this.setData({ repurchaseQuantity: repurchaseQuantity + 1 })
      this.calculateTotalPrice()
      console.log('✅ 数量已增加到:', repurchaseQuantity + 1)
    }
  },

  // 减少数量
  decreaseQuantity() {
    console.log('➖ 减少数量按钮被点击')
    const { repurchaseQuantity } = this.data
    if (repurchaseQuantity > 1) {
      this.setData({ repurchaseQuantity: repurchaseQuantity - 1 })
      this.calculateTotalPrice()
      console.log('✅ 数量已减少到:', repurchaseQuantity - 1)
    }
  },

  // 确认复购
  async confirmRepurchase() {
    // 检查虚拟支付支持
    // 现在安卓和iOS都支持虚拟支付，无需检查
    
    const { packId, repurchaseQuantity, packInfo } = this.data
    
    try {
      wx.showLoading({ title: '创建订单中...' })
      
      // 获取用户信息
      const userInfo = await this.getUserInfo()
      if (!userInfo) {
        wx.hideLoading()
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        })
        return
      }
      
      // 创建订单并调起支付
      console.log('📞 开始调用createOrder云函数...')
      const result = await Promise.race([
        wx.cloud.callFunction({
          name: 'createOrder',
          data: {
            packId: packId,
            userId: userInfo.openid,
            openid: userInfo.openid,
            quantity: repurchaseQuantity
          }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('云函数调用超时')), 30000)
        )
      ])
      console.log('✅ 云函数调用完成')
      
      wx.hideLoading()
      
      console.log('🔍 完整的云函数返回结果:', result)
      console.log('🔍 result.result:', result.result)
      console.log('🔍 result.result.data:', result.result.data)
      
      if (result.result.code === 0) {
        const { orderId, payParams, status, simulatedPayment } = result.result.data
        console.log('📊 复购订单创建成功:', { orderId, payParams, status, simulatedPayment })
        console.log('📊 数据类型检查:', {
          orderIdType: typeof orderId,
          payParamsType: typeof payParams,
          statusType: typeof status,
          payParamsValue: payParams,
          statusValue: status
        })
        
        // 处理旧格式的数据（兼容性处理）
        if (simulatedPayment) {
          console.log('🎭 检测到旧格式数据，直接模拟支付成功')
          wx.showToast({
            title: `购买成功！已购买${repurchaseQuantity}份`,
            icon: 'success',
            duration: 2000
          })
          
          // 关闭弹窗
          this.hideRepurchaseModal()
          
          // 更新用户购买数量
          await this.getUserPurchaseCount(packId)
          
          // 立即刷新页面数据
          await this.loadPackInfo(packId)
          
          // 通知父页面刷新数据
          const pages = getCurrentPages()
          if (pages.length > 1) {
            const prevPage = pages[pages.length - 2]
            if (prevPage.route.includes('actor-detail')) {
              // 刷新演员详情页面的数据
              prevPage.loadActorDetail && prevPage.loadActorDetail()
              // 刷新粉丝排行榜
              prevPage.updateFanRanking && prevPage.updateFanRanking()
            }
          }
          return
        }
        
        if (payParams && status === 'pending') {
          // 调起微信支付
          console.log('💰 开始调起微信支付...')
          await this.requestPayment(payParams, orderId, packId, repurchaseQuantity)
        } else {
          console.error('❌ 支付参数异常:', { payParams, status })
          console.error('❌ 完整的数据结构:', result.result.data)
          wx.showToast({
            title: '支付参数错误',
            icon: 'none'
          })
        }
      } else {
        console.error('❌ 复购订单创建失败:', result.result)
        wx.showToast({
          title: result.result.message || '创建订单失败',
          icon: 'none'
        })
      }
      
    } catch (error) {
      wx.hideLoading()
      console.error('💥 复购异常详情:', {
        error: error,
        message: error.message,
        stack: error.stack,
        errMsg: error.errMsg,
        errCode: error.errCode
      })
      
      let errorMessage = '复购失败'
      if (error.message === '云函数调用超时') {
        errorMessage = '网络超时，请重试'
      } else if (error.message) {
        errorMessage = error.message
      } else if (error.errMsg) {
        errorMessage = error.errMsg
      }
      
      wx.showToast({
        title: errorMessage,
        icon: 'none',
        duration: 3000
      })
    }
  },

  // 调起微信支付
  async requestPayment(payParams, orderId, packId, quantity = 1) {
    try {
      wx.showLoading({ title: '调起支付中...' })
      
      // 检查是否为开发环境或fallback模式
      if (payParams.paySign === 'test_signature_for_development' || payParams.paySign === 'fallback_signature_for_testing') {
        // 开发环境或fallback模式：模拟支付成功
        console.log('🎭 模拟支付成功（开发环境或fallback模式）')
        wx.hideLoading()
        
        // 模拟获取成功
        wx.showToast({
          title: `获取成功！已获取${quantity}份`,
          icon: 'success',
          duration: 2000
        })
        
        // 关闭弹窗
        this.hideRepurchaseModal()
        
        // 更新用户购买数量
        await this.getUserPurchaseCount(packId)
        
        // 立即刷新页面数据
        await this.loadPackInfo(packId)
        
        // 通知父页面刷新数据
        const pages = getCurrentPages()
        if (pages.length > 1) {
          const prevPage = pages[pages.length - 2]
          if (prevPage.route.includes('actor-detail')) {
            // 刷新演员详情页面的数据
            prevPage.loadActorDetail && prevPage.loadActorDetail()
            // 刷新粉丝排行榜
            prevPage.updateFanRanking && prevPage.updateFanRanking()
          }
        }
        
        return
      }
      
      // 检查是否在开发工具环境中
      const systemInfo = wx.getSystemInfoSync()
      const isDevTools = systemInfo.platform === 'devtools'
      
      if (isDevTools) {
        // 开发工具环境：模拟支付成功
        console.log('🎭 开发工具环境，模拟支付成功')
        wx.hideLoading()
        
        // 模拟获取成功
        wx.showToast({
          title: `获取成功！已获取${quantity}份`,
          icon: 'success',
          duration: 2000
        })
        
        // 关闭弹窗
        this.hideRepurchaseModal()
        
        // 直接调用云函数创建购买记录
        console.log('🔄 支付成功，创建购买记录...')
        try {
          const completePurchaseRes = await wx.cloud.callFunction({
            name: 'completePurchase',
            data: {
              orderId: orderId,
              packId: packId
            }
          })
          console.log('📦 购买记录创建结果:', completePurchaseRes.result)
        } catch (error) {
          console.error('❌ 创建购买记录失败:', error)
        }
        
        // 等待1秒确保数据库更新完成
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // 重试机制：最多重试3次获取购买状态
        let retryCount = 0
        let purchaseStatusUpdated = false
        
        while (retryCount < 3 && !purchaseStatusUpdated) {
          console.log(`🔄 第${retryCount + 1}次尝试刷新购买状态...`)
          
          // 更新用户购买数量
          await this.getUserPurchaseCount(packId)
          
          // 重新调用云函数获取最新状态
          try {
            const res = await wx.cloud.callFunction({
              name: 'getVoicePackDetail',
              data: { packId }
            })
            
            if (res.result && res.result.code === 0) {
              const packData = res.result.data
              
              // 检查购买状态是否已更新
              if (packData.packagePurchased || packData.isPurchased) {
                if (packData.voices) {
                  packData.voices.forEach(voice => {
                    voice.purchased = true
                    voice.canPreview = true
                  })
                }
                
                // 添加格式化价格字段
                if (this.data.isVirtualPaymentSupported) {
                  packData.formattedPrice = (packData.packagePrice / 100).toFixed(2)
                } else {
                  packData.formattedPrice = ''
                }
                
                this.setData({ packInfo: packData })
                console.log('✅ 购买状态已更新:', packData.packagePurchased || packData.isPurchased)
                purchaseStatusUpdated = true
              } else {
                console.log('⏳ 购买状态尚未更新，等待1秒后重试...')
                await new Promise(resolve => setTimeout(resolve, 1000))
                retryCount++
              }
            }
          } catch (error) {
            console.error('刷新页面数据失败:', error)
            retryCount++
          }
        }
        
        if (!purchaseStatusUpdated) {
          console.log('⚠️ 购买状态更新超时，但继续显示页面')
        }
        
        // 通知父页面刷新数据
        const pages = getCurrentPages()
        if (pages.length > 1) {
          const prevPage = pages[pages.length - 2]
          if (prevPage.route.includes('actor-detail')) {
            // 刷新演员详情页面的数据
            prevPage.loadActorDetail && prevPage.loadActorDetail()
            // 刷新粉丝排行榜
            prevPage.updateFanRanking && prevPage.updateFanRanking()
          }
        }
        
        return
      }
      
      // 生产环境：调起真实的微信支付
      console.log('💰 开始调起微信支付...')
      const paymentResult = await Promise.race([
        wx.requestPayment({
          appId: payParams.appId,
          timeStamp: payParams.timeStamp,
          nonceStr: payParams.nonceStr,
          package: payParams.package,
          signType: payParams.signType,
          paySign: payParams.paySign
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('支付调起超时')), 15000)
        )
      ])
      console.log('✅ 微信支付调起完成')
      
      wx.hideLoading()
      
      // 获取成功
      wx.showToast({
        title: `获取成功！已获取${quantity}份`,
        icon: 'success',
        duration: 2000
      })
      
      // 关闭弹窗
      this.hideRepurchaseModal()
      
      // 直接调用云函数创建购买记录
      console.log('🔄 支付成功，创建购买记录...')
      try {
        const completePurchaseRes = await wx.cloud.callFunction({
          name: 'completePurchase',
          data: {
            orderId: orderId,
            packId: packId
          }
        })
        console.log('📦 购买记录创建结果:', completePurchaseRes.result)
      } catch (error) {
        console.error('❌ 创建购买记录失败:', error)
      }
      
      // 等待1秒确保数据库更新完成
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 重试机制：最多重试3次获取购买状态
      let retryCount = 0
      let purchaseStatusUpdated = false
      
      while (retryCount < 3 && !purchaseStatusUpdated) {
        console.log(`🔄 第${retryCount + 1}次尝试刷新购买状态...`)
        
        // 更新用户购买数量
        await this.getUserPurchaseCount(packId)
        
        // 重新调用云函数获取最新状态
        try {
          const res = await wx.cloud.callFunction({
            name: 'getVoicePackDetail',
            data: { packId }
          })
          
          if (res.result && res.result.code === 0) {
            const packData = res.result.data
            
            // 检查购买状态是否已更新
            if (packData.packagePurchased || packData.isPurchased) {
              if (packData.voices) {
                packData.voices.forEach(voice => {
                  voice.purchased = true
                  voice.canPreview = true
                })
              }
              
              // 添加格式化价格字段
              if (this.data.isVirtualPaymentSupported) {
                packData.formattedPrice = (packData.packagePrice / 100).toFixed(2)
              } else {
                packData.formattedPrice = ''
              }
              
              this.setData({ packInfo: packData })
              console.log('✅ 购买状态已更新:', packData.packagePurchased || packData.isPurchased)
              purchaseStatusUpdated = true
            } else {
              console.log('⏳ 购买状态尚未更新，等待1秒后重试...')
              await new Promise(resolve => setTimeout(resolve, 1000))
              retryCount++
            }
          }
        } catch (error) {
          console.error('刷新页面数据失败:', error)
          retryCount++
        }
      }
      
      if (!purchaseStatusUpdated) {
        console.log('⚠️ 购买状态更新超时，但继续显示页面')
      }
      
      // 通知父页面刷新数据
      const pages = getCurrentPages()
      if (pages.length > 1) {
        const prevPage = pages[pages.length - 2]
        if (prevPage.route.includes('actor-detail')) {
          // 刷新演员详情页面的数据
          prevPage.loadActorDetail && prevPage.loadActorDetail()
          // 刷新粉丝排行榜
          prevPage.updateFanRanking && prevPage.updateFanRanking()
        }
      }
      
    } catch (error) {
      wx.hideLoading()
      console.error('💥 支付异常详情:', {
        error: error,
        message: error.message,
        errMsg: error.errMsg,
        errCode: error.errCode
      })
      
      let errorMessage = '支付失败'
      if (error.message === '支付调起超时') {
        errorMessage = '支付调起超时，请重试'
      } else if (error.errMsg && error.errMsg.includes('cancel')) {
        errorMessage = '支付已取消'
      } else if (error.message) {
        errorMessage = error.message
      } else if (error.errMsg) {
        errorMessage = error.errMsg
      }
      
      wx.showToast({
        title: errorMessage,
        icon: 'none',
        duration: 3000
      })
    }
  },

  // 获取用户信息
  async getUserInfo() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'getUserData'
      })
      
      if (result.result.code === 0) {
        return result.result.data
      }
      return null
    } catch (error) {
      console.error('获取用户信息失败:', error)
      return null
    }
  },

  // 阻止弹窗背景滚动
  preventTouchMove() {
    return false
  },

  // 关闭音频播放器
  closeAudioPlayer() {
    this.setData({
      showAudioPlayer: false,
      currentAudioUrl: '',
      currentAudioFileName: '',
      currentPlaying: -1
    })
  }
})
