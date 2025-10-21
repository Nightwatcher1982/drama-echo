const app = getApp()

Page({
  data: {
    actorsData: [],
    allImages: [], // 所有演员的图片数组
    currentSlide: 0,
    totalSlides: 0,
    loading: true,
    
    // 当前显示的演员信息
    currentActor: null,
    
    // 自动播放相关
    autoPlayInterval: null,
    isAutoPlaying: true,
    
    // 触摸相关
    startX: 0,
    isDragging: false
  },

  async onLoad() {
    console.log('voice-echo 页面加载')
    await this.loadActorsData()
  },

  onShow() {
    this.startAutoPlay()
  },

  onHide() {
    this.stopAutoPlay()
  },

  onUnload() {
    this.stopAutoPlay()
  },

  // 加载演员数据
  async loadActorsData() {
    try {
      console.log('开始调用 getActors 云函数')
      wx.showLoading({ title: '加载中...' })

      const res = await wx.cloud.callFunction({
        name: 'getActors'
      })

      if (res.result.code === 0) {
        const actorsData = res.result.data
        console.log('演员数量:', actorsData.length)
        
        // 快速处理图片数据，先显示页面
        const allImages = []
        const cloudImageUrls = []
        const addedUrls = new Set()
        
        actorsData.forEach(actor => {
          if (actor.imageUrl && !addedUrls.has(actor.imageUrl)) {
            addedUrls.add(actor.imageUrl)
            
            if (actor.imageUrl.startsWith('cloud://')) {
              cloudImageUrls.push(actor.imageUrl)
            }
            
            allImages.push({
              url: actor.imageUrl,
              actorId: actor._id,
              actorName: actor.name,
              isCloud: actor.imageUrl.startsWith('cloud://')
            })
          }
        })
        
        // 立即显示页面，不等待图片处理
        // 确保每个演员都有正确的stats结构
        const processedActorsData = actorsData.map(actor => ({
          ...actor,
          stats: {
            guardianCount: actor.stats?.guardianCount || 0,
            voicePackCount: actor.stats?.voicePackCount || 0,
            ...actor.stats
          }
        }))
        
        this.setData({
          actorsData: processedActorsData,
          allImages: allImages,
          totalSlides: allImages.length,
          currentActor: processedActorsData[0] || null,
          loading: false
        })

        console.log('页面数据更新完成')

        // 启动自动播放
        if (allImages.length > 1) {
          this.startAutoPlay()
        }
        
        // 异步处理云存储图片，不阻塞页面显示
        if (cloudImageUrls.length > 0) {
          this.processCloudImages(cloudImageUrls, allImages)
        }
      } else {
        console.log('云函数返回错误:', res.result.message)
        this.setData({ loading: false })
        throw new Error(res.result.message || '获取演员数据失败')
      }

    } catch (error) {
      console.error('加载演员数据失败:', error)
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none',
        duration: 2000
      })
      this.setData({ loading: false })
    } finally {
      wx.hideLoading()
    }
  },

  // 异步处理云存储图片
  async processCloudImages(cloudImageUrls, allImages) {
    try {
      console.log('开始处理云存储图片，数量:', cloudImageUrls.length)
      
      const tempUrlRes = await wx.cloud.getTempFileURL({
        fileList: cloudImageUrls
      })
      
      // 更新图片URL
      if (tempUrlRes.fileList && tempUrlRes.fileList.length > 0) {
        let updatedCount = 0
        tempUrlRes.fileList.forEach((file, index) => {
          if (file.status === 0) {
            const cloudUrl = cloudImageUrls[index]
            const imageItem = allImages.find(img => img.url === cloudUrl)
            if (imageItem) {
              imageItem.url = file.tempFileURL
              imageItem.isCloud = false
              updatedCount++
            }
          }
        })
        
        // 更新页面数据
        this.setData({
          allImages: [...allImages] // 触发页面更新
        })
        
        console.log(`云存储图片处理完成，成功更新 ${updatedCount} 张图片`)
      }
    } catch (error) {
      console.error('处理云存储图片失败:', error)
    }
  },

  // 跳转到数据初始化页面
  goToInit() {
    wx.navigateTo({
      url: '/pages/test-init/test-init'
    })
  },

  // swiper 切换事件
  onSwiperChange(e) {
    const index = e.detail.current || 0
    const { allImages, actorsData } = this.data
    
    // 根据当前图片找到对应的演员
    const currentImage = allImages[index]
    let currentActor = null
    
    if (currentImage) {
      currentActor = actorsData.find(actor => actor._id === currentImage.actorId)
    }
    
    this.setData({ 
      currentSlide: index, 
      currentActor: currentActor || actorsData[0] || null 
    })
  },

  // 更新指示器
  updateIndicators() {
    // 通过class控制指示器状态，在WXML中处理
  },

  // 以下自定义切换逻辑由 swiper 接管，无需保留

  // 开始自动播放
  startAutoPlay() {
    if (this.data.totalSlides <= 1) return
    this.stopAutoPlay()
    const interval = setInterval(() => {
      if (!this.data.isAutoPlaying) return
      const { currentSlide, totalSlides, allImages, actorsData } = this.data
      const newSlide = (currentSlide + 1) % totalSlides
      
      // 根据新图片找到对应的演员
      const currentImage = allImages[newSlide]
      let currentActor = null
      
      if (currentImage) {
        currentActor = actorsData.find(actor => actor._id === currentImage.actorId)
      }
      
      this.setData({ 
        currentSlide: newSlide, 
        currentActor: currentActor || actorsData[0] || null 
      })
    }, 4000)
    this.setData({ autoPlayInterval: interval })
  },

  // 停止自动播放
  stopAutoPlay() {
    if (this.data.autoPlayInterval) {
      clearInterval(this.data.autoPlayInterval)
      this.setData({ autoPlayInterval: null })
    }
  },

  // 触摸开始
  onTouchStart(e) {
    this.setData({
      startX: e.touches[0].clientX,
      isDragging: true,
      isAutoPlaying: false
    })
    this.stopAutoPlay()
  },

  // 触摸移动
  onTouchMove(e) {
    if (!this.data.isDragging) return
    e.preventDefault?.()
  },

  // 触摸结束
  onTouchEnd(e) {
    if (!this.data.isDragging) return

    const endX = e.changedTouches[0].clientX
    const diffX = this.data.startX - endX

    this.setData({ 
      isDragging: false,
      isAutoPlaying: true 
    })

    // 滑动距离超过50px才切换
    if (Math.abs(diffX) > 50) {
      if (diffX > 0) {
        this.nextSlide()
      } else {
        this.previousSlide()
      }
    }

    // 重新启动自动播放
    setTimeout(() => {
      this.startAutoPlay()
    }, 1000)
  },

  // 进入演员专属空间
  enterActorSpace() {
    const { currentActor } = this.data
    if (!currentActor) return

    wx.navigateTo({
      url: `/pages/actor-detail/actor-detail?actorId=${currentActor._id}`
    })
  },

  // 点击轮播图
  onCarouselTap() {
    this.enterActorSpace()
  },

  // 点击指示器
  onIndicatorTap(e) {
    const index = e.currentTarget.dataset.index
    const { allImages, actorsData } = this.data
    
    // 根据点击的指示器找到对应的演员
    const currentImage = allImages[index]
    let currentActor = null
    
    if (currentImage) {
      currentActor = actorsData.find(actor => actor._id === currentImage.actorId)
    }
    
    this.setData({ 
      currentSlide: index, 
      currentActor: currentActor || actorsData[0] || null 
    })
  }
})