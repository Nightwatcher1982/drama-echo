const app = getApp()

Page({
  data: {
    actorId: '',
    actor: null,
    voicePacks: [],
    fanRanking: [],
    userPurchasedCount: 0,
    loading: true,
    // 语音播放器相关
    showVoicePlayer: false,
    currentVoicePack: null,
    voicePlaylist: [],
    // 语音包详情弹窗相关
    showPackDetailModal: false,
    currentPackDetail: null
  },

  async onLoad(options) {
    const { actorId } = options
    if (!actorId) {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
      return
    }

    this.setData({ actorId })
    await this.loadActorDetail()
  },

  // 加载演员详情数据
  async loadActorDetail() {
    try {
      wx.showLoading({ title: '加载中...' })

      const res = await wx.cloud.callFunction({
        name: 'getActorDetail',
        data: { actorId: this.data.actorId }
      })

      if (res.result.code === 0) {
        const { actor, voicePacks, fanRanking, userPurchasedCount } = res.result.data
        
        this.setData({
          actor,
          voicePacks,
          fanRanking,
          userPurchasedCount,
          loading: false
        })
        
        // 获取用户购买记录
        const userPurchases = await this.getUserPurchases()
        
        // 格式化语音包价格并更新购买状态
        const updatedVoicePacks = voicePacks.map(pack => {
          const isPurchased = userPurchases.some(purchase => purchase.packId === pack._id)
          return {
            ...pack,
            formattedPrice: (pack.price / 100).toFixed(2),
            isPurchased: isPurchased
          }
        })
        this.setData({ voicePacks: updatedVoicePacks })

        // 设置页面标题为演员名字
        wx.setNavigationBarTitle({
          title: actor.name + ' 专属空间'
        })
      } else {
        throw new Error(res.result.message || '获取演员详情失败')
      }

    } catch (error) {
      console.error('加载演员详情失败:', error)
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

  // 获取用户购买记录
  async getUserPurchases() {
    try {
      const userInfo = await this.getUserInfo()
      if (!userInfo) {
        return []
      }
      
      const result = await wx.cloud.callFunction({
        name: 'getUserPurchases',
        data: { userId: userInfo.openid }
      })
      
      if (result.result.code === 0) {
        return result.result.data.purchases || []
      } else {
        console.error('获取用户购买记录失败:', result.result.message)
        return []
      }
    } catch (error) {
      console.error('获取用户购买记录失败:', error)
      // 如果云函数不存在，返回空数组，不影响页面显示
      if (error.errMsg && error.errMsg.includes('FUNCTION_NOT_FOUND')) {
        console.log('getUserPurchases云函数未部署，跳过购买记录检查')
        return []
      }
      return []
    }
  },

  // 多选功能已移除

  // 多选相关方法已移除

  // 批量购买功能已移除，改为单个购买

  // 查看完整榜单
  viewFullRanking() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  },

  // 播放语音包预览
  previewVoicePack(e) {
    const { packId, isPurchased } = e.currentTarget.dataset
    
    if (!isPurchased) {
      wx.showToast({
        title: '购买后可播放',
        icon: 'none'
      })
      return
    }

    // TODO: 实现语音播放功能
    wx.showToast({
      title: '播放功能开发中',
      icon: 'none'
    })
  },

  // 跳转到语音包详情页
  goToPackDetail(e) {
    const { packId } = e.currentTarget.dataset
    
    wx.navigateTo({
      url: `/pages/voice-pack-detail/voice-pack-detail?packId=${packId}`
    })
  },

  // 分享演员
  onShareAppMessage() {
    const { actor } = this.data
    return {
      title: `${actor.name}的专属语音包`,
      path: `/pages/actor-detail/actor-detail?actorId=${this.data.actorId}`,
      imageUrl: '' // 可以设置演员头像
    }
  },
  
  // 多选相关方法已移除

  // 语音播放器相关方法
  
  // 预览语音包（播放按钮点击）
  async previewVoicePack(e) {
    // 安全地阻止事件冒泡
    if (e && e.stopPropagation) {
      e.stopPropagation()
    }
    
    const packId = e.currentTarget.dataset.packId
    const isPurchased = e.currentTarget.dataset.isPurchased
    
    console.log('播放语音包:', { packId, isPurchased, dataValue: e.currentTarget.dataset.isPurchased })
    
    // 开发环境：跳过购买检查，所有语音包都可以播放
    const developmentMode = true
    
    if (!developmentMode) {
      // 生产环境：检查购买状态
      if (!isPurchased && isPurchased !== 'true' && isPurchased !== true) {
        wx.showToast({
          title: '请先购买该语音包',
          icon: 'none'
        })
        return
      }
    } else {
      // 开发环境：显示提示信息
      console.log('🎵 开发模式：允许播放所有语音包')
    }
    
    try {
      wx.showLoading({ title: '加载语音包...' })
      
      // 获取语音包的详细内容
      const res = await wx.cloud.callFunction({
        name: 'getVoicePackContent',
        data: { 
          packId,
          actorId: this.data.actorId
        }
      })
      
      if (res.result.code === 0) {
        const voicePackContent = res.result.data
        
        if (!voicePackContent || !voicePackContent.voiceFiles || voicePackContent.voiceFiles.length === 0) {
          wx.hideLoading()
          wx.showToast({
            title: '该语音包暂无内容',
            icon: 'none'
          })
          return
        }
        
        // 获取用户已购买的所有语音包（开发环境：假设用户拥有所有语音包）
        const userOwnedPacks = developmentMode ? this.data.voicePacks : 
          this.data.voicePacks.filter(pack => pack.isPurchased)
        
        // 构建完整播放列表：当前语音包 + 用户拥有的其他语音包
        let fullPlaylist = []
        
        // 添加当前选择的语音包到播放列表开头
        if (voicePackContent.voiceFiles && voicePackContent.voiceFiles.length > 0) {
          const currentPackTracks = voicePackContent.voiceFiles.map((file, index) => ({
            id: `${packId}_${index}`,
            packId: packId,
            packName: this.data.voicePacks.find(p => p._id === packId)?.name || '语音包',
            name: file.name || `语音${index + 1}`,
            fileId: file.fileId || `demo_audio_${packId}_${index}`, // 开发环境使用模拟文件ID
            duration: file.duration || 180 + Math.random() * 120, // 模拟时长 3-5分钟
            cover: this.data.actor?.avatar || '/images/default-avatar.png'
          }))
          fullPlaylist.push(...currentPackTracks)
        }
        
        // 添加其他拥有的语音包到播放列表（用于自动播放）
        for (const pack of userOwnedPacks) {
          if (pack._id !== packId) { // 跳过当前正在播放的
            // 模拟每个语音包有2-3个音频文件
            const trackCount = 2 + Math.floor(Math.random() * 2)
            for (let i = 0; i < trackCount; i++) {
              fullPlaylist.push({
                id: `${pack._id}_${i}`,
                packId: pack._id,
                packName: pack.name,
                name: `${pack.name} - 第${i + 1}段`,
                fileId: `demo_audio_${pack._id}_${i}`, // 开发环境使用模拟文件ID
                duration: 150 + Math.random() * 180, // 模拟时长 2.5-5.5分钟
                cover: this.data.actor?.avatar || '/images/default-avatar.png'
              })
            }
          }
        }
        
        // 获取当前语音包信息
        const currentPack = this.data.voicePacks.find(pack => pack._id === packId)
        
        wx.hideLoading()
        
        console.log('构建播放列表完成:', { 
          currentPack: currentPack?.name, 
          totalTracks: fullPlaylist.length,
          ownedPacks: userOwnedPacks.length 
        })
        
        // 打开语音播放器
        this.setData({
          showVoicePlayer: true,
          currentVoicePack: {
            _id: packId,
            name: currentPack?.name || '语音包',
            icon: currentPack?.icon || '🎵',
            artist: this.data.actor?.name || '演员'
          },
          voicePlaylist: fullPlaylist
        })
        
      } else {
        wx.hideLoading()
        wx.showToast({
          title: res.result.message || '加载失败',
          icon: 'none'
        })
      }
      
    } catch (error) {
      wx.hideLoading()
      console.error('加载语音包内容失败:', error)
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      })
    }
  },
  
  // 关闭语音播放器
  closeVoicePlayer() {
    this.setData({
      showVoicePlayer: false,
      currentVoicePack: null,
      voicePlaylist: []
    })
  },

  // 显示语音包详情弹窗
  async showPackDetail(e) {
    const packId = e.currentTarget.dataset.packId
    console.log('🎯 显示语音包详情:', packId)
    
    if (!packId) {
      console.log('❌ 语音包ID为空')
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      })
      return
    }
    
    try {
      wx.showLoading({ title: '加载中...' })
      
      console.log('📞 调用getVoicePackDetail云函数...')
      console.log('📤 请求参数:', { packId: packId })
      
      // 调用云函数获取语音包详细信息
      const res = await wx.cloud.callFunction({
        name: 'getVoicePackDetail',
        data: { packId: packId }
      })
      
      console.log('📥 语音包详情云函数返回结果:', res)
      wx.hideLoading()
      
      if (res.result && res.result.code === 0) {
        const packDetail = res.result.data
        console.log('📦 语音包详情数据:', packDetail)
        
        if (packDetail && packDetail._id) {
          console.log('✅ 设置弹窗数据')
          this.setData({
            showPackDetailModal: true,
            currentPackDetail: packDetail
          })
        } else {
          console.error('❌ 语音包详情数据格式错误:', packDetail)
          wx.showToast({
            title: '数据格式错误',
            icon: 'none'
          })
        }
      } else {
        console.error('❌ 获取语音包详情失败:', res.result)
        wx.showToast({
          title: res.result?.message || '加载失败',
          icon: 'none'
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('💥 加载语音包详情异常:', error)
      console.error('💥 错误详情:', {
        errMsg: error.errMsg,
        errCode: error.errCode,
        stack: error.stack
      })
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      })
    }
  },

  // 关闭语音包详情弹窗
  closePackDetail() {
    this.setData({
      showPackDetailModal: false,
      currentPackDetail: null
    })
  },

  // 从弹窗进入语音包详情页或发起支付
  async goToPackDetailFromModal() {
    console.log('🎯 开始处理购买流程...')
    console.log('📊 当前弹窗数据:', this.data.currentPackDetail)
    
    if (this.data.currentPackDetail) {
      const packDetail = this.data.currentPackDetail
      const packId = packDetail._id
      
      console.log('📦 语音包ID:', packId)
      console.log('💰 是否已购买:', packDetail.isPurchased)
      
      // 检查是否已购买
      if (packDetail.isPurchased) {
        console.log('✅ 已购买，直接进入详情页')
        // 已购买，直接进入详情页
        this.closePackDetail()
        wx.navigateTo({
          url: `/pages/voice-pack-detail/voice-pack-detail?packId=${packId}`
        })
      } else {
        console.log('🛒 未购买，开始支付流程...')
        // 未购买，先尝试检查云函数是否可用
        try {
          console.log('🔍 测试云函数是否存在...')
          // 先测试云函数是否存在
          const testResult = await wx.cloud.callFunction({
            name: 'createOrder',
            data: { test: true }
          })
          console.log('✅ 云函数测试结果:', testResult)
          // 如果云函数存在，发起支付
          await this.createOrderAndPay(packId)
        } catch (error) {
          console.log('❌ 云函数测试失败:', error)
          // 如果云函数不存在，直接跳转到详情页（模拟已购买状态）
          if (error.errMsg && error.errMsg.includes('FUNCTION_NOT_FOUND')) {
            console.log('🚫 云函数不存在，显示免费开放提示')
            wx.showModal({
              title: '提示',
              content: '支付功能暂未部署，将为您免费开放此语音包',
              showCancel: false,
              success: () => {
                this.closePackDetail()
                wx.navigateTo({
                  url: `/pages/voice-pack-detail/voice-pack-detail?packId=${packId}`
                })
              }
            })
          } else {
            console.log('⚠️ 其他错误，继续尝试支付流程')
            // 其他错误，发起支付
            await this.createOrderAndPay(packId)
          }
        }
      }
    } else {
      console.error('❌ currentPackDetail 为空，无法跳转')
      wx.showToast({
        title: '数据错误，请重试',
        icon: 'none'
      })
    }
  },

  // 创建订单并支付
  async createOrderAndPay(packId) {
    console.log('🚀 开始创建订单流程...')
    console.log('📦 语音包ID:', packId)
    
    try {
      wx.showLoading({ title: '创建订单中...' })
      
      // 获取用户信息
      console.log('👤 获取用户信息...')
      const userInfo = await this.getUserInfo()
      console.log('👤 用户信息:', userInfo)
      
      if (!userInfo) {
        console.log('❌ 用户信息为空')
        wx.hideLoading()
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        })
        return
      }
      
      // 调用创建订单云函数
      console.log('📞 调用创建订单云函数...')
      console.log('📤 请求参数:', {
        packId: packId,
        userId: userInfo.openid,
        openid: userInfo.openid
      })
      
      const result = await wx.cloud.callFunction({
        name: 'createOrder',
        data: {
          packId: packId,
          userId: userInfo.openid,
          openid: userInfo.openid
        }
      })
      
      console.log('📥 云函数返回结果:', result)
      wx.hideLoading()
      
      if (result.result.code === 0) {
        console.log('✅ 订单创建成功')
        const { orderId, payParams } = result.result.data
        console.log('🆔 订单ID:', orderId)
        console.log('💳 支付参数:', payParams)
        
        // 调起微信支付
        await this.requestPayment(payParams, orderId, packId)
      } else {
        console.log('❌ 订单创建失败:', result.result)
        wx.showToast({
          title: result.result.message || '创建订单失败',
          icon: 'none'
        })
      }
      
    } catch (error) {
      wx.hideLoading()
      console.error('💥 创建订单异常:', error)
      console.error('💥 错误详情:', {
        errMsg: error.errMsg,
        errCode: error.errCode,
        stack: error.stack
      })
      
      // 如果云函数不存在，提示用户
      if (error.errMsg && error.errMsg.includes('FUNCTION_NOT_FOUND')) {
        console.log('🚫 云函数不存在，显示免费开放提示')
        wx.showModal({
          title: '提示',
          content: '支付功能暂未部署，将为您免费开放此语音包',
          showCancel: false,
          success: () => {
            // 直接跳转到详情页
            wx.navigateTo({
              url: `/pages/voice-pack-detail/voice-pack-detail?packId=${packId}`
            })
          }
        })
      } else {
        console.log('⚠️ 其他错误，显示通用错误提示')
        wx.showToast({
          title: '创建订单失败',
          icon: 'none'
        })
      }
    }
  },

  // 调起微信支付
  async requestPayment(payParams, orderId, packId) {
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
        title: '支付成功！',
        icon: 'success'
      })
      
      // 关闭弹窗
      this.closePackDetail()
      
      // 刷新页面数据，更新购买状态
      await this.loadActorDetail()
      
      // 延迟跳转到语音包详情页
      setTimeout(() => {
        wx.navigateTo({
          url: `/pages/voice-pack-detail/voice-pack-detail?packId=${packId}`
        })
      }, 1500)
      
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
    console.log('🔍 开始获取用户信息...')
    
    try {
      // 先尝试从缓存获取
      let userInfo = wx.getStorageSync('userInfo')
      console.log('💾 缓存中的用户信息:', userInfo)
      
      if (!userInfo || !userInfo.openid) {
        console.log('📞 缓存中没有用户信息，调用登录云函数...')
        
        // 调用登录云函数获取用户信息
        const result = await wx.cloud.callFunction({
          name: 'login'
        })
        
        console.log('📥 登录云函数返回结果:', result)
        
        if (result.result && result.result.code === 0) {
          userInfo = {
            openid: result.result.openid,
            appid: result.result.appid,
            unionid: result.result.unionid
          }
          wx.setStorageSync('userInfo', userInfo)
          console.log('✅ 用户信息获取成功:', userInfo)
        } else {
          console.error('❌ 登录云函数返回错误:', result.result)
          return null
        }
      } else {
        console.log('✅ 从缓存获取用户信息成功')
      }
      
      return userInfo
    } catch (error) {
      console.error('💥 获取用户信息异常:', error)
      console.error('💥 错误详情:', {
        errMsg: error.errMsg,
        errCode: error.errCode,
        stack: error.stack
      })
      return null
    }
  }
})