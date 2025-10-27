// 语音包管理后台
const app = getApp()

Page({
  data: {
    // 身份验证
    isAuthenticated: false,
    adminPassword: '',
    
    // 数据
    actors: [],
    voicePacks: [],
    selectedActorId: '',
    selectedActorName: '',
    
    // 弹窗状态
    showPackModal: false,
    showFileModal: false,
    
    // 编辑数据
    editingPack: {
      images: [],
      bonusVideoUrl: '',
      bonusVideoThumb: '',
      bonusVideoTitle: '',
      bonusVideoDuration: '',
      bonusVideoCoverUploaded: false
    },
    editingFile: {},
    currentPackId: '',
    
    // 音频播放器相关
    showAudioPlayer: false,
    currentAudioUrl: '',
    currentAudioFileName: '',
    
    // 上传状态
    uploading: false,
    
    // 统计数据
    stats: {
      totalPacks: 0,
      totalFiles: 0,
      totalSales: 0,
      totalRevenue: 0
    },
    // 演员编辑
    showActorModal: false,
    editingActor: {
      _id: '',
      name: '',
      title: '',
      description: '',
      avatar: '',
      imageUrl: ''
    },
    tempImagePath: ''
  },

  onLoad() {
    this.checkAuthStatus()
  },

  // 检查身份验证状态
  checkAuthStatus() {
    const authStatus = wx.getStorageSync('voiceAdminAuth')
    const hasValidToken = !!(authStatus && authStatus.authenticated && authStatus.adminPassword && (Date.now() - authStatus.timestamp < 3600000))
    this.setData({ isAuthenticated: hasValidToken })
    if (hasValidToken) {
      this.loadActors()
    }
  },

  // 密码输入
  onPasswordInput(e) {
    this.setData({ adminPassword: e.detail.value })
  },

  // 身份验证
  authenticate() {
    const password = this.data.adminPassword
    if (password === 'voice2024' || password === 'admin123') {
      wx.setStorageSync('voiceAdminAuth', { authenticated: true, timestamp: Date.now(), adminPassword: password })
      this.setData({ isAuthenticated: true, adminPassword: '' })
      wx.showToast({ title: '验证成功', icon: 'success' })
    } else {
      wx.showToast({ title: '密码错误', icon: 'none' })
    }
  },

  // 加载演员列表
  async loadActors() {
    try {
      wx.showLoading({ title: '加载演员...' })
      
      const res = await wx.cloud.callFunction({
        name: 'getActors'
      })
      
      if (res.result.code === 0) {
        this.setData({ actors: res.result.data })
      }
    } catch (error) {
      console.error('加载演员失败:', error)
      wx.showToast({
        title: '加载演员失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 选择演员
  async selectActor(e) {
    const actorId = e.currentTarget.dataset.actorId
    const actor = this.data.actors.find(a => a._id === actorId)
    
    this.setData({
      selectedActorId: actorId,
      selectedActorName: actor ? actor.name : ''
    })
    
    await this.loadVoicePacks(actorId)
  },

  // 显示编辑演员弹窗
  showEditActorModal() {
    const actor = this.data.actors.find(a => a._id === this.data.selectedActorId)
    if (!actor) {
      wx.showToast({ title: '请先选择演员', icon: 'none' })
      return
    }
    this.setData({
      showActorModal: true,
      editingActor: { ...actor },
      tempImagePath: ''
    })
  },

  // 演员信息输入
  onActorInput(e) {
    const { field } = e.currentTarget.dataset
    const { value } = e.detail
    const editingActor = { ...this.data.editingActor }
    editingActor[field] = value
    this.setData({ editingActor })
  },

  // 选择并压缩演员图片
  async chooseActorImage() {
    try {
      const res = await wx.chooseMedia({ count: 1, mediaType: ['image'], sourceType: ['album', 'camera'] })
      const tempPath = res.tempFiles[0].tempFilePath
      // 压缩到中等质量，适配展示
      let finalPath = tempPath
      try {
        const compressRes = await wx.compressImage({ src: tempPath, quality: 60 })
        finalPath = compressRes.tempFilePath
      } catch (e) {
        console.warn('图片压缩失败，使用原图:', e)
      }
      this.setData({ tempImagePath: finalPath })
      wx.showToast({ title: '图片已选择', icon: 'success' })
    } catch (error) {
      if (error && String(error.errMsg || '').includes('cancel')) return
      console.error('选择图片失败:', error)
      wx.showToast({ title: '选择图片失败', icon: 'none' })
    }
  },

  // 保存演员
  async saveActor() {
    const actor = { ...this.data.editingActor }
    if (!actor.name || !actor.name.trim()) {
      wx.showToast({ title: '请输入演员名字', icon: 'none' })
      return
    }
    try {
      wx.showLoading({ title: '保存中...' })
      // 如有新图片，先上传
      let imageUrl = actor.imageUrl
      if (this.data.tempImagePath) {
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath: `actors/${actor._id || this.data.selectedActorId || Date.now()}/avatar_${Date.now()}.jpg`,
          filePath: this.data.tempImagePath
        })
        imageUrl = uploadRes.fileID
      }
      const adminPassword = (wx.getStorageSync('voiceAdminAuth') || {}).adminPassword
      const action = actor._id ? 'update' : 'create'
      const res = await wx.cloud.callFunction({
        name: 'adminManageActors',
        data: {
          action,
          actorId: actor._id || this.data.selectedActorId,
          adminPassword,
          actorData: {
            name: actor.name,
            title: actor.title || '',
            description: actor.description || '',
            avatar: actor.avatar || '',
            imageUrl: imageUrl,
            status: actor.status || 'online',
            tags: actor.tags || []
          }
        }
      })
      if (res.result.code === 0) {
        wx.showToast({ title: '保存成功', icon: 'success' })
        this.hideActorModal()
        await this.loadActors()
      } else {
        throw new Error(res.result.message)
      }
    } catch (error) {
      console.error('保存演员失败:', error)
      wx.showToast({ title: error.message || '保存失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  hideActorModal() {
    this.setData({ showActorModal: false, editingActor: {}, tempImagePath: '' })
  },

  // 加载语音包
  async loadVoicePacks(actorId) {
    try {
      wx.showLoading({ title: '加载语音包...' })
      
      const res = await wx.cloud.callFunction({
        name: 'adminManageVoicePacks',
        data: {
          action: 'list',
          actorId,
          adminPassword: (wx.getStorageSync('voiceAdminAuth') || {}).adminPassword
        }
      })
      
      if (res.result.code === 0) {
        const voicePacks = res.result.data.map(pack => ({
          ...pack,
          priceValue: (pack.price / 100).toFixed(1),
          priceUnit: '个回响',
          formattedPrice: `${(pack.price / 100).toFixed(1)}个回响`,
          showFiles: false
        }))
        
        this.setData({ voicePacks })
        this.updateStats()
      }
    } catch (error) {
      console.error('加载语音包失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 更新统计数据
  updateStats() {
    const { voicePacks } = this.data
    const totalPacks = voicePacks.length
    const totalFiles = voicePacks.reduce((sum, pack) => sum + (pack.voiceFiles ? pack.voiceFiles.length : 0), 0)
    const totalSales = voicePacks.reduce((sum, pack) => sum + pack.sales, 0)
    const totalRevenue = (voicePacks.reduce((sum, pack) => sum + pack.sales * pack.price, 0) / 100).toFixed(2)
    
    this.setData({
      stats: {
        totalPacks,
        totalFiles,
        totalSales,
        totalRevenue
      }
    })
  },

  // 显示创建语音包弹窗
  showAddPackModal() {
    this.setData({
      showPackModal: true,
      editingPack: {
        actorId: this.data.selectedActorId,
        name: '',
        icon: '🎵',
        price: 0,
        displayPrice: '0.00',
        description: '',
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

  // 语音包输入处理
  onPackInput(e) {
    const { field } = e.currentTarget.dataset
    const { value } = e.detail
    const editingPack = { ...this.data.editingPack }
    editingPack[field] = value
    this.setData({ editingPack })
  },

  // 价格输入处理
  onPackPriceInput(e) {
    const { value } = e.detail
    const price = Math.round(parseFloat(value || 0) * 100)
    const editingPack = { ...this.data.editingPack }
    editingPack.price = price
    editingPack.displayPrice = value
    this.setData({ editingPack })
  },

  // 热门状态改变
  onPackHotChange(e) {
    const editingPack = { ...this.data.editingPack }
    editingPack.isHot = e.detail.value.length > 0
    this.setData({ editingPack })
  },

  // 启用状态改变
  onPackActiveChange(e) {
    const editingPack = { ...this.data.editingPack }
    editingPack.isActive = e.detail.value.length > 0
    this.setData({ editingPack })
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
          packData: pack,
          adminPassword: (wx.getStorageSync('voiceAdminAuth') || {}).adminPassword
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
    const voicePacks = this.data.voicePacks.map(pack => {
      if (pack._id === packId) {
        return { ...pack, showFiles: !pack.showFiles }
      }
      return pack
    })
    this.setData({ voicePacks })
  },

  // 显示添加语音文件弹窗
  showAddFileModal(e) {
    const packId = e.currentTarget.dataset.packId
    this.setData({
      showFileModal: true,
      currentPackId: packId,
      editingFile: {
        name: '',
        duration: 30,
        description: '',
        tempFilePath: '',
        fileName: ''
      }
    })
  },

  // 编辑语音文件
  editVoiceFile(e) {
    const file = e.currentTarget.dataset.file
    const packId = e.currentTarget.dataset.packId
    
    this.setData({
      showFileModal: true,
      currentPackId: packId,
      editingFile: {
        ...file,
        tempFilePath: '',
        fileName: ''
      }
    })
  },

  // 语音文件输入处理
  onFileInput(e) {
    const { field } = e.currentTarget.dataset
    const { value } = e.detail
    const editingFile = { ...this.data.editingFile }
    editingFile[field] = value
    this.setData({ editingFile })
  },

  // 选择语音文件
  chooseVoiceFile() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['mp3', 'wav', 'aac', 'm4a'],
      success: async (res) => {
        const file = res.tempFiles[0]
        if (file.size && file.size > 20 * 1024 * 1024) {
          wx.showToast({ title: '音频文件不能超过20MB', icon: 'none' })
          return
        }
        
        const editingFile = { ...this.data.editingFile }
        editingFile.tempFilePath = file.path
        editingFile.fileName = file.name || (file.path ? file.path.split('/').pop() : `audio_${Date.now()}`)
        editingFile.size = file.size
        
        // 自动获取音频文件的真实时长
        try {
          wx.showLoading({ title: '获取音频时长...' })
          const realDuration = await this.getAudioDuration(file.path)
          editingFile.duration = realDuration
          console.log('🎵 获取到真实音频时长:', realDuration, '秒')
        } catch (error) {
          console.error('🎵 获取音频时长失败:', error)
          // 如果获取失败，使用默认值
          editingFile.duration = 30
        } finally {
          wx.hideLoading()
        }
        
        this.setData({ editingFile })
        wx.showToast({ title: '文件选择成功', icon: 'success' })
      },
      fail: (err) => {
        console.error('选择文件失败:', err)
        wx.showToast({ title: '选择文件失败', icon: 'none' })
      }
    })
  },

  // 移除语音文件
  removeVoiceFile() {
    const editingFile = { ...this.data.editingFile }
    editingFile.tempFilePath = ''
    editingFile.fileName = ''
    editingFile.size = ''
    this.setData({ editingFile })
  },

  // 预览音频
  previewAudio() {
    const { tempFilePath, fileName, name } = this.data.editingFile
    if (!tempFilePath) {
      wx.showToast({
        title: '没有音频文件',
        icon: 'none'
      })
      return
    }

    // 使用新的音频播放器组件
    this.setData({
      showAudioPlayer: true,
      currentAudioUrl: tempFilePath,
      currentAudioFileName: fileName || name || '音频文件'
    })
  },

  // 保存语音文件
  async saveVoiceFile() {
    const file = this.data.editingFile
    
    if (!file.name.trim()) {
      wx.showToast({
        title: '请输入文件名称',
        icon: 'none'
      })
      return
    }
    
    // 对于新文件，必须选择音频文件
    if (!file.id && !file.tempFilePath) {
      wx.showToast({
        title: '请选择音频文件',
        icon: 'none'
      })
      return
    }

    // 检查当前文件数量
    const currentPack = this.data.voicePacks.find(pack => pack._id === this.data.currentPackId)
    const currentFileList = currentPack ? (currentPack.voiceFiles || []) : []
    console.log('📊 语音管理页面 - 当前文件数量:', currentFileList.length)
    console.log('📊 语音管理页面 - 当前文件列表:', currentFileList)

    try {
      this.setData({ uploading: true })
      wx.showLoading({ title: '上传中...' })
      
      let cloudFileId = file.fileId
      
      // 如果有新文件需要上传
      if (file.tempFilePath) {
        console.log('📤 语音管理页面 - 开始上传音频文件:', file.fileName)
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath: `voice-packs/${this.data.currentPackId}/${Date.now()}_${file.fileName}`,
          filePath: file.tempFilePath
        })
        cloudFileId = uploadRes.fileID
        console.log('✅ 语音管理页面 - 音频文件上传成功:', cloudFileId)
      }
      
      // 创建或更新语音文件对象
      const fileData = {
        id: file.id || `file_${Date.now()}`,
        name: file.name,
        fileId: cloudFileId,
        duration: parseInt(file.duration) || 30,
        description: file.description,
        size: file.size,
        createTime: file.createTime || new Date(),
        updateTime: new Date()
      }
      
      let updatedFileList
      if (file.id) {
        // 更新现有文件
        updatedFileList = currentFileList.map(f => f.id === file.id ? fileData : f)
        console.log('🔄 语音管理页面 - 更新现有文件')
      } else {
        // 添加新文件
        updatedFileList = [...currentFileList, fileData]
        console.log('➕ 语音管理页面 - 添加新文件')
      }
      
      console.log('📋 语音管理页面 - 更新后的文件列表长度:', updatedFileList.length)
      console.log('📋 语音管理页面 - 更新后的文件列表:', updatedFileList)
      
      // 调用云函数更新语音包的文件列表
      console.log('🔄 语音管理页面 - 调用云函数更新文件列表...')
      const res = await wx.cloud.callFunction({
        name: 'adminManageVoicePacks',
        data: {
          action: 'upload',
          packId: this.data.currentPackId,
          adminPassword: (wx.getStorageSync('voiceAdminAuth') || {}).adminPassword,
          voiceFiles: updatedFileList
        }
      })
      
      console.log('📥 语音管理页面 - 云函数返回结果:', res.result)
      
      if (res.result.code === 0) {
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        })
        this.hideFileModal()
        this.loadVoicePacks(this.data.selectedActorId)
      } else {
        throw new Error(res.result.message)
      }

    } catch (error) {
      console.error('❌ 语音管理页面 - 保存语音文件失败:', error)
      wx.showToast({
        title: error.message || '保存失败',
        icon: 'none'
      })
    } finally {
      this.setData({ uploading: false })
      wx.hideLoading()
    }
  },

  // 播放语音文件
  playVoiceFile(e) {
    const file = e.currentTarget.dataset.file
    
    // 使用新的音频播放器组件
    this.setData({
      showAudioPlayer: true,
      currentAudioUrl: file.fileId,
      currentAudioFileName: file.name || '语音文件'
    })
  },

  // 删除语音文件
  async deleteVoiceFile(e) {
    const fileId = e.currentTarget.dataset.fileId
    const packId = e.currentTarget.dataset.packId
    
    const confirm = await new Promise(resolve => {
      wx.showModal({
        title: '确认删除',
        content: '确定要删除这个语音文件吗？此操作无法撤销。',
        success: resolve
      })
    })
    
    if (!confirm.confirm) return
    
    try {
      wx.showLoading({ title: '删除中...' })
      
      // 获取当前语音包的文件列表
      const currentPack = this.data.voicePacks.find(pack => pack._id === packId)
      const currentFileList = currentPack ? (currentPack.voiceFiles || []) : []
      
      // 移除要删除的文件
      const updatedFileList = currentFileList.filter(f => f.id !== fileId)
      
      // 调用云函数更新语音包的文件列表
      const res = await wx.cloud.callFunction({
        name: 'adminManageVoicePacks',
        data: {
          action: 'upload',
          packId: packId,
          adminPassword: (wx.getStorageSync('voiceAdminAuth') || {}).adminPassword,
          voiceFiles: updatedFileList
        }
      })
      
      if (res.result.code === 0) {
        wx.showToast({
          title: '删除成功',
          icon: 'success'
        })
        this.loadVoicePacks(this.data.selectedActorId)
      } else {
        throw new Error(res.result.message)
      }
    } catch (error) {
      console.error('删除失败:', error)
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 隐藏语音文件弹窗
  hideFileModal() {
    this.setData({
      showFileModal: false,
      editingFile: {},
      currentPackId: ''
    })
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 阻止点击事件冒泡
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
      wx.hideLoading()
      console.error('选择图片失败:', error)
      wx.showToast({ title: '上传失败', icon: 'none' })
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
        maxDuration: 300, // 5分钟
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
      wx.hideLoading()
      console.error('选择视频失败:', error)
      wx.showToast({ title: '上传失败', icon: 'none' })
    }
  },

  // 移除花絮视频
  removeBonusVideo() {
    const editingPack = { ...this.data.editingPack }
    editingPack.bonusVideoUrl = ''
    editingPack.bonusVideoThumb = ''
    editingPack.bonusVideoTitle = ''
    editingPack.bonusVideoDuration = ''
    editingPack.bonusVideoCoverUploaded = false
    this.setData({ editingPack })
  },

  // 选择视频封面
  async chooseVideoCover() {
    try {
      const res = await wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })
      
      if (res.tempFilePaths && res.tempFilePaths.length > 0) {
        wx.showLoading({ title: '上传封面中...' })
        
        const fileName = `video-cover-${Date.now()}.jpg`
        const cloudPath = `voice-packs/${this.data.editingPack._id || 'temp'}/${fileName}`
        
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath,
          filePath: res.tempFilePaths[0]
        })
        
        const editingPack = { ...this.data.editingPack }
        editingPack.bonusVideoThumb = uploadRes.fileID
        editingPack.bonusVideoCoverUploaded = true
        
        this.setData({ editingPack })
        wx.hideLoading()
        wx.showToast({ title: '封面上传成功', icon: 'success' })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('选择封面失败:', error)
      wx.showToast({ title: '上传失败', icon: 'none' })
    }
  },

  // 格式化时长
  formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  },

  // 关闭音频播放器
  closeAudioPlayer() {
    this.setData({
      showAudioPlayer: false,
      currentAudioUrl: '',
      currentAudioFileName: ''
    })
  },

  // 获取音频文件的真实时长
  getAudioDuration(audioPath) {
    return new Promise((resolve, reject) => {
      if (!audioPath) {
        reject(new Error('音频路径为空'))
        return
      }
      
      // 创建音频上下文
      const audioContext = wx.createInnerAudioContext()
      
      // 设置iOS静音模式下也能播放声音
      audioContext.obeyMuteSwitch = false
      
      audioContext.src = audioPath
      
      // 监听音频加载完成事件
      audioContext.onCanplay(() => {
        // 获取音频时长
        const duration = audioContext.duration
        audioContext.destroy()
        
        if (duration && duration > 0) {
          resolve(Math.floor(duration)) // 返回整数秒数
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
  }
})