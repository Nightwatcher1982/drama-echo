const app = getApp()

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
    audioContext: null
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

  // 加载语音包信息
  async loadPackInfo(packId) {
    try {
      wx.showLoading({ title: '加载中...' })
      
      console.log('开始加载语音包信息，packId:', packId)
      
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
            // 设置为已购买状态
            const packData = res.result.data
            packData.packagePurchased = true
            if (packData.voices) {
              packData.voices.forEach(voice => {
                voice.purchased = true
                voice.canPreview = true
              })
            }
            
            // 处理云存储图片，获取临时链接
            if (packData.images && packData.images.length > 0) {
              console.log('处理语音包图片，数量:', packData.images.length)
              const cloudImageUrls = packData.images.filter(url => url && url.startsWith('cloud://'))
              
              if (cloudImageUrls.length > 0) {
                console.log('需要获取临时链接的云存储图片:', cloudImageUrls)
                wx.cloud.getTempFileURL({
                  fileList: cloudImageUrls
                }).then(tempRes => {
                  console.log('图片临时链接结果:', tempRes)
                  
                  // 更新图片URL
                  const updatedImages = packData.images.map(url => {
                    if (url && url.startsWith('cloud://')) {
                      const tempFile = tempRes.fileList.find(file => file.fileID === url)
                      return tempFile && tempFile.status === 0 ? tempFile.tempFileURL : url
                    }
                    return url
                  })
                  
                  packData.images = updatedImages
                  console.log('更新后的图片URLs:', updatedImages)
                  this.setData({ packInfo: packData })
                }).catch(error => {
                  console.error('获取图片临时链接失败:', error)
                  this.setData({ packInfo: packData })
                })
              } else {
                this.setData({ packInfo: packData })
              }
            } else {
              this.setData({ packInfo: packData })
            }
            
            wx.hideLoading()
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
      if (mockData.voices) {
        mockData.voices.forEach(voice => {
          voice.purchased = true
          voice.canPreview = true
        })
      }
      this.setData({ packInfo: mockData })
      
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

  // 分享语音包
  sharePack() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
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
    
    if (this.data.currentPlaying === index) {
      // 暂停当前播放
      if (this.audioContext) {
        this.audioContext.pause()
      }
      this.setData({ currentPlaying: -1 })
    } else {
      // 播放新的语音
      if (!this.audioContext) {
        console.log('音频上下文不存在，重新初始化...')
        const initSuccess = this.initAudioContext()
        if (!initSuccess) {
          console.error('❌ 音频上下文初始化失败，无法播放')
          wx.showToast({
            title: '音频播放器初始化失败',
            icon: 'none'
          })
          return
        }
      }
      
      if (this.audioContext) {
        this.audioContext.stop()
        
        // 处理音频文件URL
        let audioUrl = voice.previewUrl || voice.audioUrl
        console.log('原始音频URL:', audioUrl)
        
        // 如果是云存储路径，需要获取临时访问链接
        if (audioUrl && audioUrl.startsWith('cloud://')) {
          // 显示加载提示
          wx.showLoading({
            title: '加载音频中...'
          })
          
          // 获取云存储临时访问链接
          wx.cloud.getTempFileURL({
            fileList: [audioUrl]
          }).then(res => {
            wx.hideLoading()
            console.log('云存储临时链接结果:', res)
            
            // 确保音频上下文仍然存在
            if (!this.audioContext) {
              console.log('音频上下文丢失，重新初始化...')
              const initSuccess = this.initAudioContext()
              if (!initSuccess) {
                console.error('❌ 音频上下文重新初始化失败')
                wx.showToast({
                  title: '音频播放器初始化失败',
                  icon: 'none'
                })
                return
              }
            }
            
            if (res.fileList && res.fileList.length > 0) {
              const file = res.fileList[0]
              if (file.status === 0) {
                console.log('✅ 获取临时链接成功:', file.tempFileURL)
                
                // 再次确保音频上下文存在
                if (this.audioContext) {
                  this.audioContext.src = file.tempFileURL
                  console.log('设置音频源:', this.audioContext.src)
                  
                  try {
                    this.audioContext.play()
                    this.setData({ currentPlaying: index })
                    console.log('✅ 音频播放成功')
                  } catch (error) {
                    console.error('音频播放错误:', error)
                    wx.showToast({
                      title: '播放失败',
                      icon: 'none'
                    })
                  }
                } else {
                  console.error('❌ 音频上下文初始化失败')
                  wx.showToast({
                    title: '音频播放器初始化失败',
                    icon: 'none'
                  })
                }
              } else {
                console.error('❌ 获取临时链接失败:', file.errMsg)
                wx.showToast({
                  title: '音频文件访问失败',
                  icon: 'none'
                })
              }
            } else {
              console.error('❌ 临时链接结果为空')
              wx.showToast({
                title: '音频文件不可用',
                icon: 'none'
              })
            }
          }).catch(err => {
            wx.hideLoading()
            console.error('❌ 获取临时链接失败:', err)
            wx.showToast({
              title: '音频加载失败',
              icon: 'none'
            })
          })
        } else if (audioUrl && audioUrl.startsWith('http')) {
          // HTTP URL，直接使用
          this.audioContext.src = audioUrl
          console.log('设置音频源:', this.audioContext.src)
          
          try {
            this.audioContext.play()
            this.setData({ currentPlaying: index })
          } catch (error) {
            console.error('音频播放错误:', error)
            wx.showToast({
              title: '播放失败',
              icon: 'none'
            })
          }
        } else {
          console.error('无效的音频URL:', audioUrl)
          wx.showToast({
            title: '音频文件不可用',
            icon: 'none'
          })
        }
      } else {
        console.error('音频上下文初始化失败')
        wx.showToast({
          title: '音频播放器初始化失败',
          icon: 'none'
        })
      }
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

  // 播放花絮视频
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
            // 使用微信内置视频播放器
            wx.previewMedia({
              sources: [{
                url: tempFile.tempFileURL,
                type: 'video',
                poster: this.data.packInfo.bonusVideoThumb || 'https://picsum.photos/300/200?random=1'
              }]
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
      // 直接使用URL
      wx.previewMedia({
        sources: [{
          url: videoUrl,
          type: 'video',
          poster: this.data.packInfo.bonusVideoThumb || 'https://picsum.photos/300/200?random=1'
        }]
      })
    }
  },

  // 购买弹窗相关方法已移除

  // 支付相关方法已移除

  // 分享设置
  onShareAppMessage() {
    const { packInfo } = this.data
    return {
      title: `${packInfo.actorName}的${packInfo.name} - 戏剧回响`,
      path: `/pages/voice-pack-detail/voice-pack-detail?packId=${this.data.packId}`,
      imageUrl: packInfo.photos[0] || '/images/share-cover.jpg'
    }
  },

  onShareTimeline() {
    const { packInfo } = this.data
    return {
      title: `${packInfo.actorName}的${packInfo.name} - 戏剧回响`,
      query: `packId=${this.data.packId}`,
      imageUrl: packInfo.photos[0] || '/images/share-cover.jpg'
    }
  }
})
