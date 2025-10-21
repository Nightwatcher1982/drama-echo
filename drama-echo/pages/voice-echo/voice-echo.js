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
    
    // 检查登录状态（临时简化，便于调试）
    try {
      const loginStatus = app.checkLoginStatus()
      console.log('登录状态检查结果:', loginStatus)
      
      if (!loginStatus) {
        console.log('用户未登录，但继续加载数据用于测试')
        // 暂时注释掉登录检查，便于调试
        /*
        wx.showModal({
          title: '需要登录',
          content: '请先登录后再使用戏剧回响功能',
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
        */
      }
    } catch (loginError) {
      console.log('登录检查出错，继续加载:', loginError)
    }

    console.log('开始加载演员数据')
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

      console.log('getActors 云函数返回结果:', res)

      if (res.result.code === 0) {
        const actorsData = res.result.data
        console.log('解析到的演员数据:', actorsData)
        console.log('演员数量:', actorsData.length)
        
        // 处理所有演员的图片，获取临时访问链接
        const allImages = []
        const cloudImageUrls = []
        const addedUrls = new Set() // 用于去重
        
        actorsData.forEach(actor => {
          // 收集所有图片URL（包括主要图片和其他图片）
          const actorImageUrls = []
          
          // 添加主要图片
          if (actor.imageUrl) {
            actorImageUrls.push(actor.imageUrl)
          }
          
          // 添加其他图片
          if (actor.images && actor.images.length > 0) {
            actorImageUrls.push(...actor.images)
          }
          
          // 去重并添加到allImages
          actorImageUrls.forEach(imageUrl => {
            if (!addedUrls.has(imageUrl)) {
              addedUrls.add(imageUrl)
              
              if (imageUrl.startsWith('cloud://')) {
                cloudImageUrls.push(imageUrl)
              }
              
              allImages.push({
                url: imageUrl,
                actorId: actor._id,
                actorName: actor.name,
                isCloud: imageUrl.startsWith('cloud://')
              })
            }
          })
        })
        
        console.log('处理后的图片数组:', allImages)
        console.log('图片总数:', allImages.length)
        console.log('去重后的图片URLs:', Array.from(addedUrls))
        console.log('需要获取临时链接的云存储图片:', cloudImageUrls)
        
        // 详细日志：显示每个演员的图片情况
        actorsData.forEach(actor => {
          console.log(`演员 ${actor.name} 的图片:`, {
            imageUrl: actor.imageUrl,
            images: actor.images,
            totalImages: (actor.imageUrl ? 1 : 0) + (actor.images ? actor.images.length : 0)
          })
        })
        
        // 如果有云存储图片，先获取临时访问链接
        if (cloudImageUrls.length > 0) {
          try {
            const tempUrlRes = await wx.cloud.getTempFileURL({
              fileList: cloudImageUrls
            })
            
            console.log('云存储临时链接结果:', tempUrlRes)
            
            // 更新图片URL
            if (tempUrlRes.fileList && tempUrlRes.fileList.length > 0) {
              tempUrlRes.fileList.forEach((file, index) => {
                if (file.status === 0) {
                  // 找到对应的图片并更新URL
                  const cloudUrl = cloudImageUrls[index]
                  const imageItem = allImages.find(img => img.url === cloudUrl)
                  if (imageItem) {
                    imageItem.url = file.tempFileURL
                    imageItem.isCloud = false
                    console.log(`✅ 图片临时链接获取成功: ${cloudUrl} -> ${file.tempFileURL}`)
                  }
                } else {
                  console.error(`❌ 图片临时链接获取失败: ${cloudImageUrls[index]} - ${file.errMsg}`)
                }
              })
            }
          } catch (error) {
            console.error('❌ 获取图片临时链接失败:', error)
          }
        }
        
        this.setData({
          actorsData: actorsData,
          allImages: allImages,
          totalSlides: allImages.length,
          currentActor: actorsData[0] || null,
          loading: false
        })

        console.log('页面数据更新完成')

        // 启动自动播放
        if (allImages.length > 1) {
          this.startAutoPlay()
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
  }
})