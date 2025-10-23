const app = getApp()
const ShareImageHandler = require('../../utils/shareImageHandler.js')

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
    currentPackDetail: null,
    // 防止重复调用
    isUpdatingRanking: false,
    // 分享相关
    shareContent: null,
    // 虚拟支付支持检查
    isVirtualPaymentSupported: false
  },

  async onLoad(options) {
    const { actorId } = options
    
    // 初始化虚拟支付支持检查
    this.setData({
      isVirtualPaymentSupported: app.isVirtualPaymentSupported()
    })
    
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

  async onShow() {
    // 页面显示时智能判断是否需要更新数据
    if (this.data.actorId && !this.data.loading) {
      console.log('🔄 演员详情页面显示，检查数据更新')
      
      // 检查是否从语音包详情页返回（可能有购买操作）
      const pages = getCurrentPages()
      if (pages.length > 1) {
        const prevPage = pages[pages.length - 2]
        if (prevPage.route.includes('voice-pack-detail')) {
          console.log('📦 从语音包详情页返回，强制刷新数据')
          // 从语音包详情页返回，强制刷新所有数据
          await this.loadActorDetail()
          return
        }
      }
      
      const fanRanking = this.data.fanRanking || []
      
      // 如果排行榜为空，立即更新
      if (fanRanking.length === 0) {
        console.log('📊 页面显示时发现排行榜为空，立即更新')
        this.updateFanRanking()
      } else {
        // 检查数据是否过期
        const now = new Date()
        const hasOldData = fanRanking.some(item => {
          if (!item.updateTime) return true
          const updateTime = new Date(item.updateTime)
          const hoursDiff = (now - updateTime) / (1000 * 60 * 60)
          return hoursDiff > 1
        })
        
        if (hasOldData) {
          console.log('📊 页面显示时发现排行榜数据过期，立即更新')
          this.updateFanRanking()
        } else {
          console.log('📊 页面显示时排行榜数据看起来新鲜，但为了确保准确性，强制更新一次')
          // 即使数据看起来新鲜，也强制更新一次以确保准确性
          this.updateFanRanking()
        }
      }
    }
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
        
        // 格式化语音包价格（getActorDetail云函数已经包含了购买状态）
        const updatedVoicePacks = voicePacks.map(pack => ({
          ...pack,
          formattedPrice: this.data.isVirtualPaymentSupported ? (pack.price / 100).toFixed(2) : ''
          // isPurchased 字段已经由 getActorDetail 云函数设置
        }))
        
        this.setData({
          actor,
          voicePacks: updatedVoicePacks,
          fanRanking,
          userPurchasedCount,
          loading: false
        })

        // 设置页面标题为演员名字
        wx.setNavigationBarTitle({
          title: actor.name
        })
        
        console.log('✅ 演员详情加载完成，语音包数量:', updatedVoicePacks.length)
        console.log('📊 购买状态统计:', updatedVoicePacks.map(p => ({ name: p.name, isPurchased: p.isPurchased })))
        
        // 智能判断是否需要更新排行榜
        if (!fanRanking || fanRanking.length === 0) {
          console.log('📊 排行榜为空，需要更新')
          // 如果排行榜为空，立即更新（不延迟）
          this.updateFanRanking()
        } else {
          // 检查排行榜数据是否过期（超过1小时）
          const now = new Date()
          const hasOldData = fanRanking.some(item => {
            if (!item.updateTime) return true
            const updateTime = new Date(item.updateTime)
            const hoursDiff = (now - updateTime) / (1000 * 60 * 60)
            return hoursDiff > 1 // 超过1小时认为过期
          })
          
          if (hasOldData) {
            console.log('📊 排行榜数据过期，需要更新')
            this.updateFanRanking()
          } else {
            console.log('📊 排行榜数据新鲜，但为了确保准确性，强制更新一次')
            // 即使数据看起来新鲜，也强制更新一次以确保准确性
            this.updateFanRanking()
          }
        }
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

  // 手动刷新排行榜
  async refreshRanking() {
    console.log('🔄 用户手动刷新排行榜')
    await this.updateFanRanking()
  },

  // 显示奖励详情
  showRewardDetails() {
    const currentDate = new Date()
    const currentMonth = currentDate.getMonth() + 1
    const currentYear = currentDate.getFullYear()
    
    // 计算本月起始和结束日期
    const startDate = new Date(currentYear, currentMonth - 1, 1)
    const endDate = new Date(currentYear, currentMonth, 0)
    
    const startDateStr = `${currentMonth}月${startDate.getDate()}日`
    const endDateStr = `${currentMonth}月${endDate.getDate()}日`
    
    const rewardDetails = `🎁 月度奖励活动详情

📅 活动周期：${currentYear}年${startDateStr} - ${endDateStr}

🏆 排名奖励：

🥇 第一名：
• 亲签横版拍立得 2张
• NFC语音相框 1个
• 唱片冰箱贴 1个
• 限量光栅卡 1套（共6张）

🥈 第二名：
• 亲签横版拍立得 1张
• NFC语音唱片冰箱贴 1个
• 限量光栅卡 1套（共4张）

🥉 第三名：
• 亲签mini拍立得 1张
• NFC语音冰箱贴 1个
• 限量光栅卡 1套（共2张）

📞 领奖方式：
活动结束后，获奖用户需通过小程序后台联系，或小红书私信"戏剧回响"领取奖励。

💡 温馨提示：
• 排名以月末最后一天的数据为准
• 奖励将在活动结束后7个工作日内发放
• 如有疑问请联系客服`

    wx.showModal({
      title: '月度奖励活动',
      content: rewardDetails,
      showCancel: false,
      confirmText: '我知道了'
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
    const { actor, fanRanking } = this.data
    
    // 检查当前用户是否在排行榜中
    const currentUserRank = fanRanking.find(item => {
      // 这里需要获取当前用户的openid来匹配
      // 暂时使用一个简单的逻辑
      return false // 暂时不显示排名
    })
    
    let shareTitle = `${actor.name}的专属语音包`
    let shareDesc = '快来和我一起支持你喜欢的演员吧！'
    
    if (currentUserRank) {
      shareTitle = `我在《戏剧回响》中支持了${actor.name}！`
      shareDesc = `🏆 当前排名：第${currentUserRank.rank}名\n📦 已收藏：${currentUserRank.purchaseCount}个专属声音\n⭐ 支持等级：${currentUserRank.level}\n\n快来和我一起支持你喜欢的演员吧！`
    }
    
    return {
      title: shareTitle,
      path: `/pages/actor-detail/actor-detail?actorId=${this.data.actorId}`,
      imageUrl: '', // 可以设置演员头像
      desc: shareDesc
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
        // 检查虚拟支付支持
        if (!this.data.isVirtualPaymentSupported) {
          wx.showToast({
            title: '由于相关规范，iOS功能暂不可用',
            icon: 'none',
            duration: 2000
          })
          return
        }
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
        const { orderId, payParams, status } = result.result.data
        console.log('🆔 订单ID:', orderId)
        console.log('💰 支付参数:', payParams)
        console.log('📊 订单状态:', status)
        
        if (payParams && status === 'pending') {
          // 调起微信支付
          console.log('💰 调起微信支付...')
          await this.requestPayment(payParams, orderId, packId)
        } else {
          console.error('❌ 支付参数或状态异常')
          wx.showToast({
            title: '支付参数错误',
            icon: 'none'
          })
        }
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
      
      // 检查是否为开发环境或fallback模式
      if (payParams.paySign === 'test_signature_for_development' || payParams.paySign === 'fallback_signature_for_testing') {
        // 开发环境或fallback模式：模拟支付成功
        console.log('🎭 模拟支付成功（开发环境或fallback模式）')
        wx.hideLoading()
        
        // 模拟获取成功
        wx.showToast({
          title: '获取成功！',
          icon: 'success'
        })
        
        // 关闭弹窗
        this.closePackDetail()
        
        // 刷新页面数据，更新购买状态
        console.log('🔄 支付成功，刷新页面数据...')
        await this.loadActorDetail()
        console.log('✅ 页面数据刷新完成')
        
        // 延迟跳转到语音包详情页
        setTimeout(() => {
          wx.navigateTo({
            url: `/pages/voice-pack-detail/voice-pack-detail?packId=${packId}`
          })
        }, 1500)
        
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
          title: '获取成功！',
          icon: 'success'
        })
        
        // 关闭弹窗
        this.closePackDetail()
        
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
          await this.loadActorDetail()
          
          // 检查购买状态是否已更新
          const currentPack = this.data.voicePacks.find(pack => pack._id === packId)
          if (currentPack && currentPack.isPurchased) {
            console.log('✅ 购买状态已更新')
            purchaseStatusUpdated = true
          } else {
            console.log('⏳ 购买状态尚未更新，等待1秒后重试...')
            await new Promise(resolve => setTimeout(resolve, 1000))
            retryCount++
          }
        }
        
        if (!purchaseStatusUpdated) {
          console.log('⚠️ 购买状态更新超时，但继续跳转')
        }
        
        console.log('✅ 页面数据刷新完成')
        
        // 跳转到语音包详情页
        wx.navigateTo({
          url: `/pages/voice-pack-detail/voice-pack-detail?packId=${packId}`
        })
        
        return
      }
      
      // 生产环境：调起真实的微信支付
      const paymentResult = await wx.requestPayment({
        appId: payParams.appId,
        timeStamp: payParams.timeStamp,
        nonceStr: payParams.nonceStr,
        package: payParams.package,
        signType: payParams.signType,
        paySign: payParams.paySign
      })
      
      wx.hideLoading()
      
      // 获取成功
      wx.showToast({
        title: '获取成功！',
        icon: 'success'
      })
      
      // 关闭弹窗
      this.closePackDetail()
      
      // 直接创建购买记录（备用方案）
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
        await this.loadActorDetail()
        
        // 检查购买状态是否已更新
        const currentPack = this.data.voicePacks.find(pack => pack._id === packId)
        if (currentPack && currentPack.isPurchased) {
          console.log('✅ 购买状态已更新')
          purchaseStatusUpdated = true
        } else {
          console.log('⏳ 购买状态尚未更新，等待1秒后重试...')
          await new Promise(resolve => setTimeout(resolve, 1000))
          retryCount++
        }
      }
      
      if (!purchaseStatusUpdated) {
        console.log('⚠️ 购买状态更新超时，但继续跳转')
      }
      
      console.log('✅ 页面数据刷新完成')
      
      // 跳转到语音包详情页
      wx.navigateTo({
        url: `/pages/voice-pack-detail/voice-pack-detail?packId=${packId}`
      })
      
    } catch (error) {
      wx.hideLoading()
      console.error('支付失败:', error)
      
      if (error.errMsg.includes('cancel')) {
        wx.showToast({
          title: '操作已取消',
          icon: 'none'
        })
      } else {
        wx.showToast({
          title: '获取失败，请重试',
          icon: 'none'
        })
      }
    }
  },

  // 开发环境调试方法已移除，提升页面加载性能

  // 更新粉丝排行榜
  async updateFanRanking() {
    // 防止重复调用
    if (this.data.isUpdatingRanking) {
      console.log('🔄 排行榜正在更新中，跳过重复调用')
      return
    }
    
    try {
      this.setData({ isUpdatingRanking: true })
      console.log('🔄 更新粉丝排行榜，演员ID:', this.data.actorId)
      
      // 调用更新排行榜云函数，设置合理的超时时间
      const result = await Promise.race([
        wx.cloud.callFunction({
          name: 'updateFanRanking',
          data: { actorId: this.data.actorId }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('云函数调用超时')), 8000) // 8秒超时，给云函数更多时间
        )
      ])
      
      if (result.result.code === 0) {
        const data = result.result.data
        console.log('📊 排行榜数据:', data.rankings)
        
        
        // 更新页面数据
        this.setData({
          fanRanking: data.rankings
        })
        
        console.log('✅ 排行榜更新成功')
      } else {
        console.error('❌ 排行榜更新失败:', result.result.message)
      }
    } catch (error) {
      console.error('❌ 更新排行榜失败:', error)
      
      // 如果云函数超时或失败，静默处理，不影响页面主要功能
      if (error.message.includes('超时') || error.message.includes('timeout')) {
        console.log('🔄 云函数超时，排行榜更新失败，但不影响页面使用')
      }
    } finally {
      this.setData({ isUpdatingRanking: false })
    }
  },

  // 直接获取排行榜数据（备用方案）
  async getFanRankingDirectly() {
    try {
      console.log('📊 直接获取排行榜数据，演员ID:', this.data.actorId)
      
      const result = await wx.cloud.callFunction({
        name: 'getActorDetail',
        data: { actorId: this.data.actorId }
      })
      
      if (result.result.code === 0) {
        const { fanRanking } = result.result.data
        console.log('📊 直接获取的排行榜数据:', fanRanking)
        
        this.setData({
          fanRanking: fanRanking || []
        })
        
        console.log('✅ 直接获取排行榜成功')
      }
    } catch (error) {
      console.error('❌ 直接获取排行榜失败:', error)
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
  },

  // 设置分享内容
  async setShareContent(e) {
    const { packId, packName, packSales } = e.currentTarget.dataset
    const actorName = this.data.actor?.name || '演员'
    
    console.log('📤 设置分享内容:', { packId, packName, packSales, actorName })
    
    // 找到对应的语音包，获取第一张图片
    const voicePack = this.data.voicePacks.find(pack => pack._id === packId)
    
    // 优先使用演员封面图，然后是语音包图片
    const shareImage = this.data.actor?.coverImageUrl || 
                      this.data.actor?.imageUrl || 
                      voicePack?.images?.[0] || 
                      voicePack?.photos?.[0] || 
                      ''
    
    console.log('🖼️ 分享图片获取:', { 
      voicePack: voicePack?.name,
      actorCoverImage: this.data.actor?.coverImageUrl,
      actorImageUrl: this.data.actor?.imageUrl,
      voicePackImages: voicePack?.images,
      finalShareImage: shareImage
    })
    
    // 使用分享图片处理工具
    const shareContent = await ShareImageHandler.createShareContent(
      packName,
      `${actorName}专属语音包，已售${packSales}份`,
      `/pages/voice-pack-detail/voice-pack-detail?packId=${packId}`,
      shareImage
    )
    
    // 设置分享内容到页面数据
    this.setData({ shareContent })
    
    console.log('✅ 分享内容设置完成:', shareContent)
  },

  // 获取云存储图片的临时链接
  async getTempImageUrl(cloudUrl) {
    try {
      const tempRes = await wx.cloud.getTempFileURL({
        fileList: [cloudUrl]
      })
      
      if (tempRes.fileList && tempRes.fileList.length > 0 && tempRes.fileList[0].status === 0) {
        return tempRes.fileList[0].tempFileURL
      } else {
        console.error('获取临时链接失败:', tempRes.fileList[0]?.errMsg)
        return null
      }
    } catch (error) {
      console.error('获取临时链接异常:', error)
      return null
    }
  },

  // 页面分享配置
  onShareAppMessage() {
    const shareContent = this.data.shareContent
    if (shareContent) {
      return shareContent
    }
    
    // 默认分享内容
    const actorName = this.data.actor?.name || '演员'
    const defaultImage = this.data.actor?.coverImageUrl || 
                        this.data.actor?.imageUrl || 
                        '/images/modu.png'
    
    return {
      title: `${actorName}的专属空间`,
      desc: `来看看${actorName}的精彩语音包吧！`,
      path: `/pages/actor-detail/actor-detail?actorId=${this.data.actorId}`,
      imageUrl: defaultImage
    }
  },

  // 分享到朋友圈
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
    const actorName = this.data.actor?.name || '演员'
    const defaultImage = this.data.actor?.coverImageUrl || 
                        this.data.actor?.imageUrl || 
                        '/images/modu.png'
    
    return {
      title: `${actorName}的专属空间 - 精彩语音包`,
      query: `actorId=${this.data.actorId}`,
      imageUrl: defaultImage
    }
  }

})