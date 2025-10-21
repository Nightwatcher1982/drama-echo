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
    currentImageIndex: 0
  },

  onLoad(options) {
    const packId = options.packId || options.id
    if (packId) {
      this.setData({ packId })
      this.loadPackInfo(packId)
    }
    
    // 初始化音频上下文
    this.initAudioContext()
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
            
            // 使用云函数返回的购买状态
            if (packData.packagePurchased || packData.isPurchased) {
              if (packData.voices) {
                packData.voices.forEach(voice => {
                  voice.purchased = true
                  voice.canPreview = true
                })
              }
            }
            
            // 添加格式化价格字段
            packData.formattedPrice = (packData.packagePrice / 100).toFixed(2)
            
            // 设置用户购买数量（基于购买状态）
            const userPurchaseCount = (packData.packagePurchased || packData.isPurchased) ? 1 : 0
            this.setData({ userPurchaseCount })
            
            // 临时：为了测试复购功能，强制设置为已购买状态
            packData.packagePurchased = true
            packData.isPurchased = true
            
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
    
    // 使用分享图片处理工具
    const shareContent = await ShareImageHandler.createShareContent(
      `${packInfo.actorName}的${packInfo.name} - 戏剧回响`,
      packInfo.description || `${packInfo.actorName}专属语音包`,
      `/pages/voice-pack-detail/voice-pack-detail?packId=${this.data.packId}`,
      shareImage
    )
    
    // 设置分享内容到页面数据
    this.setData({ shareContent })
    
    console.log('✅ 分享内容设置完成:', shareContent)
  },

  // 验证图片URL是否有效
  async validateImageUrl(imageUrl) {
    return new Promise((resolve) => {
      if (!imageUrl || imageUrl === '/images/modu.png') {
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
    const defaultImage = packInfo.actorAvatar || packInfo.photos && packInfo.photos[0] || packInfo.images && packInfo.images[0] || '/images/modu.png'
    
    return {
      title: `${packInfo.actorName}的${packInfo.name} - 戏剧回响`,
      path: `/pages/voice-pack-detail/voice-pack-detail?packId=${this.data.packId}`,
      imageUrl: defaultImage
    }
  },

  onShareTimeline() {
    const shareContent = this.data.shareContent
    if (shareContent) {
      return {
        title: shareContent.title,
        query: `packId=${shareContent.path.split('packId=')[1]}`,
        imageUrl: shareContent.imageUrl
      }
    }
    
    // 默认分享内容
    const { packInfo } = this.data
    const defaultImage = packInfo.actorAvatar || packInfo.photos && packInfo.photos[0] || packInfo.images && packInfo.images[0] || '/images/modu.png'
    
    return {
      title: `${packInfo.actorName}的${packInfo.name} - 戏剧回响`,
      query: `packId=${this.data.packId}`,
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
    const { packInfo, repurchaseQuantity } = this.data
    console.log('💰 计算总价:', { packInfo, repurchaseQuantity })
    
    // 尝试多种价格字段
    const price = packInfo?.price || packInfo?.packagePrice || packInfo?.originalPrice
    console.log('💰 找到的价格字段:', { price, packagePrice: packInfo?.packagePrice, originalPrice: packInfo?.originalPrice })
    
    if (packInfo && price && repurchaseQuantity) {
      const totalPrice = (price * repurchaseQuantity / 100).toFixed(2)
      console.log('💰 计算出的总价:', totalPrice)
      this.setData({ totalPrice })
    } else {
      console.log('💰 数据不完整，设置默认总价')
      this.setData({ totalPrice: '0.00' })
    }
  },

  // 显示复购弹窗
  showRepurchaseModal() {
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
      const result = await wx.cloud.callFunction({
        name: 'createOrder',
        data: {
          packId: packId,
          userId: userInfo.openid,
          openid: userInfo.openid,
          quantity: repurchaseQuantity
        }
      })
      
      wx.hideLoading()
      
      if (result.result.code === 0) {
        const { orderId, payParams, status } = result.result.data
        
        if (payParams && status === 'pending') {
          // 调起微信支付
          await this.requestPayment(payParams, orderId, packId, repurchaseQuantity)
        } else {
          wx.showToast({
            title: '支付参数错误',
            icon: 'none'
          })
        }
      } else {
        wx.showToast({
          title: result.result.message || '创建订单失败',
          icon: 'none'
        })
      }
      
    } catch (error) {
      wx.hideLoading()
      wx.showToast({
        title: error.message || '复购失败',
        icon: 'none'
      })
    }
  },

  // 调起微信支付
  async requestPayment(payParams, orderId, packId, quantity = 1) {
    try {
      wx.showLoading({ title: '调起支付中...' })
      
      const paymentResult = await wx.requestPayment({
        appId: payParams.appId,
        timeStamp: payParams.timeStamp,
        nonceStr: payParams.nonceStr,
        package: payParams.package,
        signType: payParams.signType,
        paySign: payParams.paySign
      })
      
      wx.hideLoading()
      
      // 支付成功
      wx.showToast({
        title: `购买成功！已购买${quantity}份`,
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
      
    } catch (error) {
      wx.hideLoading()
      console.error('支付失败:', error)
      
      if (error.errMsg.includes('cancel')) {
        wx.showToast({
          title: '支付已取消',
          icon: 'none'
        })
      } else {
        wx.showToast({
          title: '支付失败，请重试',
          icon: 'none'
        })
      }
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
