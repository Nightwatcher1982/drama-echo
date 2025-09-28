// 戏剧回响后台管理
const app = getApp()

Page({
  data: {
    // 身份验证
    isAuthenticated: false,
    adminPassword: '',
    
    // 主导航标签
    activeTab: 'actors', // actors, voicepacks, stats
    
    // 演员数据
    actors: [],
    selectedActorId: '',
    selectedActor: null,
    
    // 语音包数据
    voicePacks: [],
    selectedPackId: '',
    
    // 统计数据
    stats: {
      totalActors: 0,
      totalPacks: 0,
      totalFiles: 0,
      totalSales: 0,
      totalRevenue: 0
    },
    
    // 弹窗状态
    showActorModal: false,
    showPackModal: false,
    showFileModal: false,
    
    // 编辑数据
    editingActor: {
      name: '',
      title: '',
      description: '',
      avatar: '',
      imageUrl: '',
      tags: [],
      status: 'offline'
    },
    editingPack: {
      name: '',
      price: 0,
      description: '',
      icon: '🎵',
      images: [],
      bonusVideoUrl: '',
      bonusVideoThumb: '',
      bonusVideoTitle: '',
      bonusVideoDuration: '',
      isHot: false,
      isActive: true
    },
    editingFile: {
      name: '',
      duration: 30,
      description: ''
    },
    
    // 上传状态
    uploadingImage: false,
    uploadingAudio: false,
    tempImagePath: '',
    tempAudioPath: '',
    
    // 标签选项
    tagOptions: ['热门', '新人', '实力派', '青年演员', '资深演员'],
    statusOptions: [
      { value: 'online', label: '在线' },
      { value: 'offline', label: '离线' }
    ]
  },

  onLoad() {
    this.checkAuthStatus()
  },

  onShow() {
    if (this.data.isAuthenticated) {
      this.loadData()
    }
  },

  // 检查身份验证状态
  checkAuthStatus() {
    const userInfo = app.globalData.userProfile
    
    // nightwatcher用户自动验证
    const isNightWatcher = userInfo && userInfo.nickName && 
      userInfo.nickName.toLowerCase() === 'nightwatcher'
    
    if (isNightWatcher) {
      this.setData({ isAuthenticated: true })
      this.loadData()
      console.log('🎭 nightwatcher用户自动获得管理员权限')
      return
    }
    
    // 其他用户检查存储的验证状态
    const authStatus = wx.getStorageSync('adminVoiceAuth')
    if (authStatus && authStatus.authenticated && Date.now() - authStatus.timestamp < 3600000) {
      this.setData({ isAuthenticated: true })
      this.loadData()
    }
  },

  // 身份验证
  authenticate() {
    const password = this.data.adminPassword
    if (password === 'voice2024' || password === 'admin123') {
      wx.setStorageSync('adminVoiceAuth', { authenticated: true, timestamp: Date.now(), adminPassword: password })
      this.setData({ isAuthenticated: true, adminPassword: '' })
      this.loadData()
      wx.showToast({ title: '验证成功', icon: 'success' })
    } else {
      wx.showToast({ title: '密码错误', icon: 'none' })
    }
  },

  // 密码输入
  onPasswordInput(e) {
    this.setData({ adminPassword: e.detail.value })
  },

  // 切换标签
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab })
    
    if (tab === 'stats') {
      this.loadStats()
    }
  },

  // 加载数据
  async loadData() {
    this.loadActors()
    if (this.data.activeTab === 'stats') {
      this.loadStats()
    }
  },

  // 加载演员列表
  async loadActors() {
    try {
      wx.showLoading({ title: '加载中...' })
      
      const res = await wx.cloud.callFunction({
        name: 'getActors'
      })
      
      wx.hideLoading()
      
      if (res.result.code === 0) {
        this.setData({
          actors: res.result.data,
          stats: {
            ...this.data.stats,
            totalActors: res.result.data.length
          }
        })
      } else {
        wx.showToast({
          title: res.result.message || '加载失败',
          icon: 'none'
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('加载演员列表失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 选择演员
  selectActor(e) {
    const actor = e.currentTarget.dataset.actor
    this.setData({
      selectedActorId: actor._id,
      selectedActor: actor
    })
    this.loadVoicePacks(actor._id)
  },

  // 加载语音包列表
  async loadVoicePacks(actorId) {
    if (!actorId) return
    
    try {
      wx.showLoading({ title: '加载语音包...' })
      
      const res = await wx.cloud.callFunction({
        name: 'adminManageVoicePacks',
        data: {
          action: 'list',
          actorId: actorId,
          adminPassword: (wx.getStorageSync('adminVoiceAuth') || {}).adminPassword
        }
      })
      
      wx.hideLoading()
      
      if (res.result.code === 0) {
        const packs = res.result.data.map(pack => ({
          ...pack,
          formattedPrice: (pack.price / 100).toFixed(2)
        }))
        
        this.setData({
          voicePacks: packs,
          stats: {
            ...this.data.stats,
            totalPacks: packs.length
          }
        })
      } else {
        wx.showToast({
          title: res.result.message || '加载失败',
          icon: 'none'
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('加载语音包失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 显示添加演员弹窗
  showAddActorModal() {
    this.setData({
      showActorModal: true,
      editingActor: {
        name: '',
        title: '',
        description: '',
        avatar: '👤',
        imageUrl: '',
        tags: [],
        status: 'offline'
      },
      tempImagePath: ''
    })
  },

  // 编辑演员
  editActor(e) {
    const actor = e.currentTarget.dataset.actor
    this.setData({
      showActorModal: true,
      editingActor: { ...actor },
      tempImagePath: actor.imageUrl || ''
    })
  },

  // 演员信息输入
  onActorInput(e) {
    const { field } = e.currentTarget.dataset
    const { value } = e.detail
    this.setData({
      [`editingActor.${field}`]: value
    })
  },

  // 选择演员头像表情
  selectAvatar(e) {
    const avatar = e.currentTarget.dataset.avatar
    this.setData({
      'editingActor.avatar': avatar
    })
  },

  // 标签选择
  onTagChange(e) {
    this.setData({
      'editingActor.tags': e.detail.value
    })
  },

  // 状态选择
  onStatusChange(e) {
    this.setData({
      'editingActor.status': e.detail.value
    })
  },

  // 选择演员图片
  async chooseActorImage() {
    try {
      const res = await wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera']
      })
      
      const tempPath = res.tempFiles[0].tempFilePath
      this.setData({ 
        tempImagePath: tempPath,
        'editingActor.tempImagePath': tempPath
      })
      
      wx.showToast({
        title: '图片选择成功',
        icon: 'success'
      })
    } catch (error) {
      // 用户主动取消选择时不提示为错误
      if (error && error.errMsg && String(error.errMsg).includes('cancel')) {
        console.log('用户取消选择图片')
        return
      }
      console.error('选择图片失败:', error)
      wx.showToast({ title: '选择图片失败', icon: 'none' })
    }
  },

  // 移除演员图片
  removeActorImage() {
    this.setData({
      tempImagePath: '',
      'editingActor.tempImagePath': '',
      'editingActor.imageUrl': ''
    })
  },

  // 保存演员信息
  async saveActor() {
    const actor = this.data.editingActor
    
    if (!actor.name.trim()) {
      wx.showToast({
        title: '请输入演员名字',
        icon: 'none'
      })
      return
    }
    
    try {
      this.setData({ uploadingImage: true })
      wx.showLoading({ title: '保存中...' })
      
      // 如果有新图片需要上传
      let imageUrl = actor.imageUrl
      if (actor.tempImagePath) {
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath: `actors/${actor._id || Date.now()}/avatar_${Date.now()}.jpg`,
          filePath: actor.tempImagePath
        })
        imageUrl = uploadRes.fileID
      }
      
      // 保存演员信息
      const actorData = {
        name: actor.name,
        title: actor.title || '',
        description: actor.description || '',
        avatar: actor.avatar || '👤',
        imageUrl: imageUrl,
        tags: actor.tags || [],
        status: actor.status || 'offline',
        stats: actor.stats || {
          voicePackCount: 0,
          guardianCount: 0,
          totalSales: 0,
          totalVoiceFiles: 0
        }
      }
      
      const action = actor._id ? 'update' : 'create'
      const res = await wx.cloud.callFunction({
        name: 'adminManageActors',
        data: {
          action,
          actorId: actor._id,
          actorData,
          adminPassword: (wx.getStorageSync('adminVoiceAuth') || {}).adminPassword
        }
      })
      
      if (res.result.code === 0) {
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        })
        this.hideActorModal()
        this.loadActors()
      } else {
        throw new Error(res.result.message)
      }
    } catch (error) {
      console.error('保存演员失败:', error)
      wx.showToast({
        title: error.message || '保存失败',
        icon: 'none'
      })
    } finally {
      this.setData({ uploadingImage: false })
      wx.hideLoading()
    }
  },

  // 隐藏演员弹窗
  hideActorModal() {
    this.setData({
      showActorModal: false,
      editingActor: {},
      tempImagePath: ''
    })
  },

  // 显示添加语音包弹窗
  showAddPackModal() {
    if (!this.data.selectedActorId) {
      wx.showToast({
        title: '请先选择演员',
        icon: 'none'
      })
      return
    }
    
    this.setData({
      showPackModal: true,
      editingPack: {
        actorId: this.data.selectedActorId,
        name: '',
        price: 0,
        displayPrice: '0.00',
        description: '',
        icon: '🎵',
        images: [],
        bonusVideoUrl: '',
        bonusVideoThumb: '',
        bonusVideoTitle: '',
        bonusVideoDuration: '',
        isHot: false,
        isActive: true
      }
    })
  },

  // 编辑语音包
  editPack(e) {
    const pack = e.currentTarget.dataset.pack
    this.setData({
      showPackModal: true,
      editingPack: {
        ...pack,
        displayPrice: (pack.price / 100).toFixed(2),
        images: pack.images || [],
        bonusVideoUrl: pack.bonusVideoUrl || '',
        bonusVideoThumb: pack.bonusVideoThumb && !pack.bonusVideoThumb.startsWith('/') ? pack.bonusVideoThumb : 'https://picsum.photos/300/200?random=1',
        bonusVideoTitle: pack.bonusVideoTitle || '',
        bonusVideoDuration: pack.bonusVideoDuration || ''
      }
    })
  },

  // 语音包信息输入
  onPackInput(e) {
    const { field } = e.currentTarget.dataset
    const { value } = e.detail
    this.setData({
      [`editingPack.${field}`]: value
    })
  },

  // 价格输入
  onPriceInput(e) {
    const value = e.detail.value
    const price = Math.round(parseFloat(value || 0) * 100)
    this.setData({
      'editingPack.price': price,
      'editingPack.displayPrice': value
    })
  },

  // 热门状态改变
  onHotChange(e) {
    this.setData({
      'editingPack.isHot': e.detail.value
    })
  },

  // 启用状态改变
  onActiveChange(e) {
    this.setData({
      'editingPack.isActive': e.detail.value
    })
  },

  // 保存语音包
  async savePack() {
    const pack = this.data.editingPack
    
    if (!pack.name.trim()) {
      wx.showToast({
        title: '请输入语音包名称',
        icon: 'none'
      })
      return
    }
    
    if (pack.price <= 0) {
      wx.showToast({
        title: '请输入有效价格',
        icon: 'none'
      })
      return
    }
    
    try {
      wx.showLoading({ title: '保存中...' })
      
      const action = pack._id ? 'update' : 'create'
      const res = await wx.cloud.callFunction({
        name: 'adminManageVoicePacks',
        data: {
          action,
          packId: pack._id,
          packData: {
            actorId: pack.actorId || this.data.selectedActorId,
            name: pack.name,
            price: pack.price,
            description: pack.description || '',
            icon: pack.icon || '🎵',
            isHot: pack.isHot || false,
            isActive: pack.isActive !== false,
            voiceFiles: pack.voiceFiles || []
          },
          adminPassword: (wx.getStorageSync('adminVoiceAuth') || {}).adminPassword
        }
      })
      
      if (res.result.code === 0) {
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        })
        this.hidePackModal()
        this.loadVoicePacks(this.data.selectedActorId)
      } else {
        throw new Error(res.result.message)
      }
    } catch (error) {
      console.error('保存语音包失败:', error)
      wx.showToast({
        title: error.message || '保存失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 隐藏语音包弹窗
  hidePackModal() {
    this.setData({
      showPackModal: false,
      editingPack: {}
    })
  },

  // 管理语音文件
  manageVoiceFiles(e) {
    const packId = e.currentTarget.dataset.packId
    wx.navigateTo({
      url: `/pages/voice-file-manager/voice-file-manager?packId=${packId}`
    })
  },

  // 加载统计数据
  async loadStats() {
    try {
      wx.showLoading({ title: '加载统计...' })
      
      // 这里可以调用云函数获取统计数据
      // 暂时使用本地计算
      const stats = {
        totalActors: this.data.actors.length,
        totalPacks: this.data.voicePacks.length,
        totalFiles: 0,
        totalSales: 0,
        totalRevenue: 0
      }
      
      // 计算总文件数和销售额
      this.data.voicePacks.forEach(pack => {
        stats.totalFiles += (pack.voiceFiles || []).length
        stats.totalSales += pack.sales || 0
        stats.totalRevenue += (pack.sales || 0) * pack.price
      })
      
      stats.totalRevenue = (stats.totalRevenue / 100).toFixed(2)
      
      this.setData({ stats })
      wx.hideLoading()
    } catch (error) {
      wx.hideLoading()
      console.error('加载统计失败:', error)
      wx.showToast({
        title: '加载统计失败',
        icon: 'none'
      })
    }
  },

  // 退出登录
  logout() {
    wx.removeStorageSync('adminVoiceAuth')
    this.setData({
      isAuthenticated: false,
      adminPassword: ''
    })
    wx.showToast({
      title: '已退出',
      icon: 'success'
    })
  },

  // 选择语音包图片
  async choosePackImage() {
    try {
      const res = await wx.chooseImage({
        count: 5 - this.data.editingPack.images.length,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })
      
      if (res.tempFilePaths && res.tempFilePaths.length > 0) {
        wx.showLoading({ title: '上传中...' })
        
        const uploadPromises = res.tempFilePaths.map(async (tempFilePath) => {
          const fileName = `voice-pack-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`
          const cloudPath = `voice-packs/${this.data.editingPack._id || 'temp'}/${fileName}`
          
          const uploadRes = await wx.cloud.uploadFile({
            cloudPath,
            filePath: tempFilePath
          })
          
          return uploadRes.fileID
        })
        
        const uploadedUrls = await Promise.all(uploadPromises)
        
        const editingPack = { ...this.data.editingPack }
        editingPack.images = [...editingPack.images, ...uploadedUrls]
        
        this.setData({ editingPack })
        wx.hideLoading()
        wx.showToast({ title: '上传成功', icon: 'success' })
      }
    } catch (error) {
      // 确保在错误情况下也隐藏loading
      try { wx.hideLoading() } catch(_) {}
      console.error('选择图片失败:', error)
      
      // 检查是否是用户取消操作
      if (error.errMsg && error.errMsg.includes('cancel')) {
        // 用户取消，不显示错误提示
        return
      }
      
      wx.showToast({ title: '上传失败: ' + (error.errMsg || '未知错误'), icon: 'none' })
    }
  },

  // 移除语音包图片
  removePackImage(e) {
    const index = e.currentTarget.dataset.index
    const editingPack = { ...this.data.editingPack }
    editingPack.images.splice(index, 1)
    this.setData({ editingPack })
  },

  // 预览图片
  previewImage(e) {
    const index = e.currentTarget.dataset.index
    wx.previewImage({
      current: this.data.editingPack.images[index],
      urls: this.data.editingPack.images
    })
  },

  // 选择花絮视频
  async chooseBonusVideo() {
    try {
      const res = await wx.chooseVideo({
        sourceType: ['album', 'camera'],
        maxDuration: 60, // 微信小程序限制最大60秒
        camera: 'back'
      })
      
      if (res.tempFilePath) {
        wx.showLoading({ title: '上传视频中...' })
        
        const fileName = `bonus-video-${Date.now()}.mp4`
        const cloudPath = `voice-packs/${this.data.editingPack._id || 'temp'}/${fileName}`
        
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath,
          filePath: res.tempFilePath
        })
        
        // 生成视频缩略图
        const thumbFileName = `bonus-thumb-${Date.now()}.jpg`
        const thumbCloudPath = `voice-packs/${this.data.editingPack._id || 'temp'}/${thumbFileName}`
        
        // 使用网络地址作为默认缩略图，因为poster只支持网络地址
        const thumbUrl = 'https://picsum.photos/300/200?random=1'
        
        const editingPack = { ...this.data.editingPack }
        editingPack.bonusVideoUrl = uploadRes.fileID
        editingPack.bonusVideoThumb = thumbUrl
        editingPack.bonusVideoTitle = '花絮视频'
        editingPack.bonusVideoDuration = this.formatDuration(res.duration)
        
        this.setData({ editingPack })
        wx.hideLoading()
        wx.showToast({ title: '视频上传成功', icon: 'success' })
      }
    } catch (error) {
      // 确保在错误情况下也隐藏loading
      try { wx.hideLoading() } catch(_) {}
      console.error('选择视频失败:', error)
      
      // 检查是否是用户取消操作
      if (error.errMsg && error.errMsg.includes('cancel')) {
        // 用户取消，不显示错误提示
        return
      }
      
      wx.showToast({ title: '上传失败: ' + (error.errMsg || '未知错误'), icon: 'none' })
    }
  },

  // 移除花絮视频
  removeBonusVideo() {
    const editingPack = { ...this.data.editingPack }
    editingPack.bonusVideoUrl = ''
    editingPack.bonusVideoThumb = ''
    editingPack.bonusVideoTitle = ''
    editingPack.bonusVideoDuration = ''
    this.setData({ editingPack })
  },

  // 格式化时长
  formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }
})