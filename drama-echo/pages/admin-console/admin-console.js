const app = getApp()

Page({
  data: {
    isAuthed: false,
    adminPassword: '',
    currentModule: 'content', // 'content', 'data', 'system'
    actors: [],
    selectedActorId: '',
    selectedActorName: '',
    voicePacks: [],
    showPackModal: false,
    editingPack: {
      images: [],
      bonusVideoUrl: '',
      bonusVideoThumb: '',
      bonusVideoTitle: '',
      bonusVideoDuration: '',
      bonusVideoCoverUploaded: false
    },
    showFileModal: false,
    editingFile: {},
    fileList: [],
    showActorModal: false,
    editingActor: {},
    tempImagePath: '',
    actorImages: [],
    // 添加loading状态跟踪
    loadingStack: [],
    // 音频播放器相关
    showAudioPlayer: false,
    currentAudioUrl: '',
    currentAudioFileName: '',
    // 音频文件编辑状态
    isEditingExistingFile: false
  },

  onLoad() {
    console.log('admin-console 页面加载')
    const token = wx.getStorageSync('adminConsoleAuth')
    const allow = ['voice2024', 'admin123']
    const ok = !!(token && allow.includes(token.adminPassword) && Date.now() - token.ts < 3600000)
    console.log('认证状态:', ok, 'token:', token)
    this.setData({ isAuthed: ok })
    if (ok) {
      console.log('已认证，开始加载演员数据')
      this.loadActors()
    } else {
      console.log('未认证，等待用户登录')
    }
  },

  // Loading状态跟踪辅助方法
  showLoadingWithTrack(title, methodName) {
    const loadingId = `${methodName}_${Date.now()}`
    console.log(`[Loading] ${methodName}: 调用 showLoading, ID: ${loadingId}`)
    this.data.loadingStack.push(loadingId)
    console.log(`[Loading] 当前loading栈:`, this.data.loadingStack)
    wx.showLoading({ title })
    return loadingId
  },

  hideLoadingWithTrack(methodName, loadingId) {
    console.log(`[Loading] ${methodName}: 调用 hideLoading, ID: ${loadingId}`)
    const index = this.data.loadingStack.indexOf(loadingId)
    if (index > -1) {
      this.data.loadingStack.splice(index, 1)
      console.log(`[Loading] 移除loading ID: ${loadingId}`)
    } else {
      console.log(`[Loading] 警告: 未找到loading ID: ${loadingId}`)
    }
    console.log(`[Loading] 当前loading栈:`, this.data.loadingStack)
    try {
      wx.hideLoading()
      console.log(`[Loading] ${methodName}: hideLoading 调用成功`)
    } catch (error) {
      console.log(`[Loading] ${methodName}: hideLoading 调用失败:`, error)
    }
  },

  getAdminPassword() {
    const allow = ['voice2024', 'admin123']
    const a = wx.getStorageSync('adminConsoleAuth')
    if (a && allow.includes(a.adminPassword)) return a.adminPassword
    const b = wx.getStorageSync('voiceAdminAuth')
    if (b && allow.includes(b.adminPassword)) return b.adminPassword
    // 尝试使用当前输入框中的密码（未点击登录时自动鉴权）
    const typed = (this.data.adminPassword || '').trim()
    if (allow.includes(typed)) {
      wx.setStorageSync('adminConsoleAuth', { adminPassword: typed, ts: Date.now() })
      wx.setStorageSync('voiceAdminAuth', { authenticated: true, timestamp: Date.now(), adminPassword: typed })
      this.setData({ isAuthed: true })
      return typed
    }
    return ''
  },

  ensureAuthed() {
    const pwd = this.getAdminPassword()
    return !!pwd
  },

  onPwdInput(e) { this.setData({ adminPassword: e.detail.value }) },
  async login() {
    const pwd = (this.data.adminPassword || '').trim()
    
    if (!pwd) {
      wx.showToast({ title: '请输入密码', icon: 'none' })
      return
    }
    
    // 调用云函数验证密码
    try {
      wx.showLoading({ title: '验证中...' })
      
      const result = await wx.cloud.callFunction({
        name: 'checkAdminPermission',
        data: { adminPassword: pwd }
      })
      
      wx.hideLoading()
      
      if (result.result.code === 0 && result.result.data.hasPermission) {
        // 密码正确，设置认证状态
        wx.setStorageSync('adminConsoleAuth', { adminPassword: pwd, ts: Date.now() })
        // 兼容其他后台页
        wx.setStorageSync('voiceAdminAuth', { authenticated: true, timestamp: Date.now(), adminPassword: pwd })
        this.setData({ isAuthed: true, adminPassword: '' })
        
        wx.showToast({ title: '登录成功', icon: 'success' })
        this.loadActors()
      } else {
        wx.showToast({ title: '密码错误', icon: 'none' })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('登录验证失败:', error)
      wx.showToast({ title: '验证失败', icon: 'none' })
    }
  },

  async loadActors() {
    try {
      wx.showLoading({ title: '加载演员...' })
      
      const res = await wx.cloud.callFunction({ name: 'getActors' })
      const list = res.result && res.result.data ? res.result.data : []
      
      // 兜底过滤：排除软删除（isActive === false），并按 updateTime 降序
      const actors = list
        .filter(a => a.isActive !== false)
        .sort((a,b) => new Date(b.updateTime || 0) - new Date(a.updateTime || 0))
      
      this.setData({ actors })
      
      if (actors.length === 0) {
        wx.showToast({ title: '暂无演员数据', icon: 'none' })
      }
    } catch (e) {
      wx.showToast({ title: '加载失败: ' + (e.message || '未知错误'), icon: 'none' })
    } finally { 
      wx.hideLoading() 
    }
  },

  onPickActor(e) {
    if (!this.data.isAuthed && !this.ensureAuthed()) {
      wx.showToast({ title: '请先登录后台', icon: 'none' })
      return
    }
    
    const idx = Number(e.detail.value)
    const actor = this.data.actors[idx]
    
    if (!actor) {
      wx.showToast({ title: '选择失败，请重试', icon: 'none' })
      return
    }
    
    this.setData({ selectedActorId: actor._id, selectedActorName: actor.name })
    this.loadVoicePacks(actor._id)
  },

  // 直接选择演员（备用方法）
  selectActorDirect(e) {
    console.log('🎯 点击演员卡片', e)
    const actor = e.currentTarget.dataset.actor
    console.log('🎭 获取到的演员数据:', actor)
    
    if (!actor) {
      console.log('❌ 演员数据为空')
      wx.showToast({ title: '选择失败', icon: 'none' })
      return
    }
    
    console.log('✅ 设置选中演员:', actor._id, actor.name)
    this.setData({ 
      selectedActorId: actor._id, 
      selectedActorName: actor.name 
    })
    
    console.log('📊 当前选中状态:', this.data.selectedActorId)
    this.loadVoicePacks(actor._id)
    wx.showToast({ title: `已选择: ${actor.name}`, icon: 'success' })
  },

  // 阻止事件冒泡
  stopPropagation(e) {
    console.log('🛑 阻止事件冒泡')
    // 这个方法只是用来阻止事件冒泡，不需要其他逻辑
  },

  // 获取演员语音包数量
  getActorVoicePackCount(actorId) {
    const voicePacks = this.data.voicePacks || []
    return voicePacks.filter(pack => pack.actorId === actorId).length
  },

  async loadVoicePacks(actorId) {
    console.log('=== loadVoicePacks 开始 ===')
    console.log('loadVoicePacks: 参数 actorId:', actorId)
    
    if (!this.data.isAuthed && !this.ensureAuthed()) {
      console.log('loadVoicePacks: 未认证，返回')
      wx.showToast({ title: '请先登录后台', icon: 'none' })
      return
    }
    
    let loadingId = null
    try {
      loadingId = this.showLoadingWithTrack('加载语音包...', 'loadVoicePacks')
      
      console.log('loadVoicePacks: 调用云函数 adminManageVoicePacks')
      const res = await wx.cloud.callFunction({
        name: 'adminManageVoicePacks',
        data: {
          action: 'list',
          actorId,
          adminPassword: this.getAdminPassword()
        }
      })
      
      console.log('loadVoicePacks: 云函数返回结果:', res)
      
      if (res.result.code === 0) {
        console.log('loadVoicePacks: 处理语音包数据')
        const voicePacks = (res.result.data || []).map(p => ({
          ...p,
          priceValue: (p.price / 100).toFixed(1),
          priceUnit: '个回响',
          formattedPrice: `${(p.price / 100).toFixed(1)}个回响`
        }))
        console.log('loadVoicePacks: 处理后的语音包数据:', voicePacks)
        this.setData({ voicePacks })
        console.log('loadVoicePacks: 数据设置完成')
      } else {
        console.log('loadVoicePacks: 加载失败，错误信息:', res.result.message)
        throw new Error(res.result.message)
      }
    } catch (e) {
      console.error('loadVoicePacks: 捕获到异常:', e)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally { 
      console.log('loadVoicePacks: 进入 finally 块，调用 hideLoading')
      if (loadingId) {
        this.hideLoadingWithTrack('loadVoicePacks', loadingId)
      }
      console.log('=== loadVoicePacks 结束 ===')
    }
  },

  openPackModal(e) {
    const pack = e && e.currentTarget && e.currentTarget.dataset ? e.currentTarget.dataset.pack : null
    console.log('openPackModal: 编辑的语音包:', pack)
    
    this.setData({ 
      showPackModal: true, 
      editingPack: pack ? { 
        ...pack, 
        displayPrice: (pack.price / 100).toFixed(2),
        images: Array.isArray(pack.images) ? pack.images : [],
        bonusVideoUrl: pack.bonusVideoUrl || '',
        bonusVideoThumb: pack.bonusVideoThumb && !pack.bonusVideoThumb.startsWith('/') ? pack.bonusVideoThumb : '',
        bonusVideoTitle: pack.bonusVideoTitle || '',
        bonusVideoDuration: pack.bonusVideoDuration || ''
      } : { 
        name: '', 
        icon: '🎵', 
        description: '', 
        price: 0, 
        displayPrice: '0.00',
        images: [],
        bonusVideoUrl: '',
        bonusVideoThumb: '',
        bonusVideoTitle: '',
        bonusVideoDuration: '',
        actorId: this.data.selectedActorId // 确保关联到选中的演员
      } 
    })
    
    console.log('openPackModal: 设置后的editingPack:', this.data.editingPack)
  },
  closePackModal() { 
    this.setData({ 
      showPackModal: false, 
      editingPack: {
        images: [],
        bonusVideoUrl: '',
        bonusVideoThumb: '',
        bonusVideoTitle: '',
        bonusVideoDuration: ''
      }
    }) 
  },
  onPackInput(e) { const f = e.currentTarget.dataset.field; const v = e.detail.value; const p = { ...this.data.editingPack }; p[f] = v; this.setData({ editingPack: p }) },
  onPackPriceInput(e) { const v = e.detail.value; const p = { ...this.data.editingPack }; p.price = Math.round(parseFloat(v || 0) * 100); p.displayPrice = v; this.setData({ editingPack: p }) },
  async savePack() {
    console.log('=== savePack 开始 ===')
    const p = this.data.editingPack
    console.log('保存的语音包数据:', p)
    
    if (!p.name || !p.name.trim()) return wx.showToast({ title: '请输入语音包名称', icon: 'none' })
    if (!p.price || p.price <= 0) return wx.showToast({ title: '请输入有效价格', icon: 'none' })
    if (!this.ensureAuthed()) return wx.showToast({ title: '请先登录后台', icon: 'none' })
    
    let loadingId = null
    try {
      loadingId = this.showLoadingWithTrack('保存中...', 'savePack')
      
      console.log('savePack: 调用云函数 adminManageVoicePacks')
      
      // 准备数据，移除_id字段避免更新错误
      const packData = { ...p }
      delete packData._id // 移除_id字段，避免数据库更新错误
      
      const res = await wx.cloud.callFunction({
        name: 'adminManageVoicePacks',
        data: {
          action: p._id ? 'update' : 'create',
          packId: p._id,
          adminPassword: this.getAdminPassword(),
          packData: { ...packData, actorId: this.data.selectedActorId }
        }
      })
      
      console.log('savePack: 云函数返回结果:', res)
      
      if (res.result.code === 0) {
        console.log('savePack: 保存成功，显示成功提示')
        wx.showToast({ title: '保存成功', icon: 'success' })
        
        console.log('savePack: 关闭弹窗')
        this.closePackModal()
        
        console.log('savePack: 设置延迟刷新，1000ms后调用 loadVoicePacks')
        // 延迟刷新列表，避免loading冲突
        setTimeout(() => {
          console.log('savePack: 延迟刷新开始，调用 loadVoicePacks')
          this.loadVoicePacks(this.data.selectedActorId)
        }, 1000)
      } else { 
        console.log('savePack: 保存失败，错误信息:', res.result.message)
        throw new Error(res.result.message) 
      }
    } catch (e) { 
      console.log('savePack: 捕获到异常:', e)
      wx.showToast({ title: e.message || '保存失败', icon: 'none' }) 
    } finally { 
      console.log('savePack: 进入 finally 块，调用 hideLoading')
      if (loadingId) {
        this.hideLoadingWithTrack('savePack', loadingId)
      }
      console.log('=== savePack 结束 ===')
    }
  },

  async deletePack(e) {
    const packId = e.currentTarget.dataset.packId
    const confirm = await new Promise(resolve => { wx.showModal({ title:'确认删除', content:'将软删除该语音包，确定吗？', success: resolve }) })
    if (!confirm.confirm) return
    try {
      wx.showLoading({ title: '删除中...' })
      const res = await wx.cloud.callFunction({ name: 'adminManageVoicePacks', data: { action: 'delete', packId, adminPassword: this.getAdminPassword() } })
      if (res.result.code === 0) { 
        wx.showToast({ title: '删除成功', icon:'success' })
        // 延迟刷新列表，避免loading冲突
        setTimeout(() => {
          this.loadVoicePacks(this.data.selectedActorId)
        }, 500)
      }
      else throw new Error(res.result.message)
    } catch (e) { wx.showToast({ title: e.message || '删除失败', icon:'none' }) }
    finally { try { wx.hideLoading() } catch(_){} }
  },

  openEditActor(e) {
    console.log('🔧 点击编辑演员按钮', e)
    console.log('🔧 事件类型:', e.type)
    console.log('🔧 事件目标:', e.target)
    console.log('🔧 当前目标:', e.currentTarget)
    
    const actor = e.currentTarget.dataset.actor
    console.log('🎭 获取到的演员数据:', actor)
    
    if (!actor) {
      // 如果没有传递演员数据，尝试从selectedActorId获取
      const a = this.data.actors.find(x => x._id === this.data.selectedActorId)
      console.log('🔍 从selectedActorId查找演员:', a)
      if (!a) return wx.showToast({ title: '未选择演员', icon: 'none' })
      actor = a
    }
    
    console.log('✅ 准备打开编辑模态框，演员数据:', actor)
    
    // 封面照片和图片库独立管理，不互相影响
    this.setData({ 
      showActorModal: true, 
      editingActor: { ...actor }, 
      tempImagePath: '', // 编辑时不设置tempImagePath，只有用户选择新图片时才设置
      actorImages: actor.images || [] // 图片库独立管理
    })
    
    console.log('🎯 编辑模态框状态已更新')
    console.log('🎯 showActorModal:', this.data.showActorModal)
  },
  openCreateActor() {
    this.setData({ showActorModal: true, editingActor: { name: '', title: '', description: '', avatar: '' }, tempImagePath: '', actorImages: [] })
  },
  async deleteActor(e) {
    const actorId = e.currentTarget.dataset.actorId
    const targetActorId = actorId || this.data.selectedActorId
    if (!targetActorId) return wx.showToast({ title: '未选择演员', icon:'none' })
    const confirm = await new Promise(resolve => { wx.showModal({ title:'确认删除', content:'删除为软删除，可在数据库恢复。确定删除该演员？', success: resolve }) })
    if (!confirm.confirm) return
    try {
      wx.showLoading({ title: '删除中...' })
      const res = await wx.cloud.callFunction({ name: 'adminManageActors', data: { action: 'delete', actorId: targetActorId, adminPassword: this.getAdminPassword() } })
      if (res.result.code === 0) { 
        wx.showToast({ title: '删除成功', icon:'success' })
        this.setData({ selectedActorId:'', selectedActorName:'', showActorModal:false })
        // 延迟刷新列表，避免loading冲突
        setTimeout(() => {
          this.loadActors()
        }, 500)
      }
      else throw new Error(res.result.message)
    } catch(e) { wx.showToast({ title: e.message || '删除失败', icon:'none' }) }
    finally { try { wx.hideLoading() } catch(_){} }
  },
  closeActorModal() { this.setData({ showActorModal: false, editingActor: {}, tempImagePath: '', actorImages: [] }) },
  onActorInput(e) { const f = e.currentTarget.dataset.field; const v = e.detail.value; const a = { ...this.data.editingActor }; a[f] = v; this.setData({ editingActor: a }) },
  async chooseActorImage() {
    try {
      const res = await wx.chooseMedia({ count: 1, mediaType: ['image'] })
      const p = res.tempFiles[0].tempFilePath
      let out = p
      try { const cr = await wx.compressImage({ src: p, quality: 60 }); out = cr.tempFilePath } catch(_){}
      this.setData({ tempImagePath: out })
    } catch (e) { if (!(e && String(e.errMsg||'').includes('cancel'))) wx.showToast({ title: '选择图片失败', icon: 'none' }) }
  },
  async addActorImages() {
    try {
      const remain = 5 - this.data.actorImages.length
      if (remain <= 0) return wx.showToast({ title: '已达上限', icon: 'none' })
      const res = await wx.chooseMedia({ count: remain, mediaType: ['image'] })
      const paths = res.tempFiles.map(f => f.tempFilePath)
      const uploaded = []
      wx.showLoading({ title: '上传中...' })
      for (const p of paths) {
        let filePath = p
        try { const cr = await wx.compressImage({ src: p, quality: 60 }); filePath = cr.tempFilePath } catch(_){}
        const up = await wx.cloud.uploadFile({ cloudPath: `actors/${this.data.selectedActorId || Date.now()}/gallery_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`, filePath })
        uploaded.push(up.fileID)
      }
      const newList = (this.data.actorImages.concat(uploaded)).slice(0, 5)
      this.setData({ actorImages: newList })
      wx.showToast({ title: '已添加', icon: 'success' })
    } catch (e) { if (!(e && String(e.errMsg||'').includes('cancel'))) wx.showToast({ title: '添加失败', icon: 'none' }) }
    finally { try { wx.hideLoading() } catch(_){} }
  },
  removeActorImage(e) {
    const url = e.currentTarget.dataset.url
    const list = this.data.actorImages.filter(u => u !== url)
    this.setData({ actorImages: list })
  },

  // ====== 音频管理 ======
  openFileModal(e) {
    const packId = e.currentTarget.dataset.packId
    const pack = (this.data.voicePacks || []).find(p => p._id === packId) || { voiceFiles: [] }
    this.setData({ showFileModal: true, currentPackId: packId, editingFile: { name: '', duration: 30, description: '' }, uploading: false, fileList: pack.voiceFiles || [] })
  },
  closeFileModal() { this.setData({ showFileModal: false, editingFile: {}, currentPackId: '', isEditingExistingFile: false }) },
  onFileInput(e) { const f = e.currentTarget.dataset.field; const v = e.detail.value; const file = { ...this.data.editingFile }; file[f] = v; this.setData({ editingFile: file }) },
  chooseAudioFile() {
    wx.chooseMessageFile({ 
      count: 1, 
      type: 'file', 
      extension: ['mp3','wav','aac','m4a'], 
      success: async (res) => {
        const f = res.tempFiles[0]
        if (f.size && f.size > 20 * 1024 * 1024) { 
          wx.showToast({ title: '文件不能超过20MB', icon: 'none' }); 
          return 
        }
        
        const file = { ...this.data.editingFile }
        file.tempFilePath = f.path
        file.fileName = f.name || (f.path ? f.path.split('/').pop() : `audio_${Date.now()}`)
        file.size = f.size
        
        // 自动获取音频文件的真实时长
        try {
          wx.showLoading({ title: '获取音频时长...' })
          const realDuration = await this.getAudioDuration(f.path)
          file.duration = realDuration
          console.log('🎵 获取到真实音频时长:', realDuration, '秒')
        } catch (error) {
          console.error('🎵 获取音频时长失败:', error)
          // 如果获取失败，使用默认值
          file.duration = 30
        } finally {
          wx.hideLoading()
        }
        
        this.setData({ editingFile: file })
      }, 
      fail: (err) => { 
        if (!(err && String(err.errMsg||'').includes('cancel'))) 
          wx.showToast({ title: '选择失败', icon:'none' }) 
      } 
    })
  },
  previewSelectedAudio() {
    const f = this.data.editingFile
    if (!f || !f.tempFilePath) return wx.showToast({ title: '请先选择音频', icon:'none' })
    
    // 使用新的音频播放器组件
    this.setData({
      showAudioPlayer: true,
      currentAudioUrl: f.tempFilePath,
      currentAudioFileName: f.fileName || f.name || '音频文件'
    })
  },
  async saveAudioFile() {
    const f = this.data.editingFile
    if (!f.name || !f.name.trim()) return wx.showToast({ title: '请输入文件名称', icon:'none' })
    
    // 检查当前文件数量
    const currentFileList = this.data.fileList || []
    console.log('📊 当前文件数量:', currentFileList.length)
    console.log('📊 当前文件列表:', currentFileList)
    
    try {
      this.setData({ uploading: true })
      wx.showLoading({ title: this.data.isEditingExistingFile ? '更新中...' : '上传中...' })
      
      let updatedFileList = [...currentFileList]
      
      if (this.data.isEditingExistingFile) {
        // 编辑现有文件
        console.log('🔧 编辑现有音频文件:', f.name)
        const fileIndex = updatedFileList.findIndex(file => file.id === f.id)
        if (fileIndex !== -1) {
          updatedFileList[fileIndex] = {
            ...updatedFileList[fileIndex],
            name: f.name,
            duration: parseInt(f.duration) || updatedFileList[fileIndex].duration,
            description: f.description || '',
            updateTime: new Date()
          }
        }
      } else {
        // 添加新文件
        if (!f.tempFilePath) return wx.showToast({ title: '请选择音频文件', icon:'none' })
        
        // 上传音频文件到云存储
        console.log('📤 开始上传音频文件:', f.fileName)
        const up = await wx.cloud.uploadFile({ 
          cloudPath: `voice-packs/${this.data.currentPackId}/${Date.now()}_${f.fileName}`, 
          filePath: f.tempFilePath 
        })
        console.log('✅ 音频文件上传成功:', up.fileID)
        
        // 创建新的语音文件对象
        const newFile = {
          id: `file_${Date.now()}`,
          name: f.name,
          fileId: up.fileID,
          duration: parseInt(f.duration) || 30,
          description: f.description || '',
          size: f.size,
          createTime: new Date(),
          updateTime: new Date()
        }
        
        updatedFileList = [...currentFileList, newFile]
      }
      
      console.log('📋 更新后的文件列表长度:', updatedFileList.length)
      console.log('📋 更新后的文件列表:', updatedFileList)
      
      // 调用云函数更新语音包的文件列表
      console.log('🔄 调用云函数更新文件列表...')
      const res = await wx.cloud.callFunction({ 
        name: 'adminManageVoicePacks', 
        data: { 
          action: 'upload', 
          packId: this.data.currentPackId, 
          adminPassword: this.getAdminPassword(),
          voiceFiles: updatedFileList
        } 
      })
      
      console.log('📥 云函数返回结果:', res.result)
      
      if (res.result.code === 0) {
        wx.showToast({ title: this.data.isEditingExistingFile ? '更新成功' : '保存成功', icon:'success' })
        // 更新本地文件列表
        this.setData({ 
          fileList: updatedFileList, 
          editingFile: { name: '', duration: 30, description: '' },
          isEditingExistingFile: false
        })
        // 延迟刷新列表，避免loading冲突
        setTimeout(() => {
          this.loadVoicePacks(this.data.selectedActorId)
        }, 500)
      } else {
        throw new Error(res.result.message)
      }
    } catch (e) {
      console.error('❌ 保存音频失败:', e);
      wx.showToast({ title: e.message || '保存失败', icon:'none' })
    } finally {
      this.setData({ uploading: false });
      try { wx.hideLoading() } catch(_){}
    }
  },
  previewExistingAudio(e) {
    const src = e.currentTarget.dataset.src
    if (!src) return
    
    // 使用新的音频播放器组件
    this.setData({
      showAudioPlayer: true,
      currentAudioUrl: src,
      currentAudioFileName: '已上传的音频文件'
    })
  },
  
  // 编辑现有音频文件
  editExistingAudio(e) {
    const file = e.currentTarget.dataset.file
    console.log('🔧 编辑音频文件:', file)
    
    if (!file) return wx.showToast({ title: '文件数据错误', icon: 'none' })
    
    // 设置编辑状态
    this.setData({
      editingFile: { ...file },
      isEditingExistingFile: true
    })
    
    console.log('✅ 进入音频文件编辑模式')
  },
  async deleteExistingAudio(e) {
    const id = e.currentTarget.dataset.id
    const confirm = await new Promise(resolve => { wx.showModal({ title:'确认删除', content:'确定删除该音频文件？', success: resolve }) })
    if (!confirm.confirm) return
    try {
      wx.showLoading({ title: '删除中...' })
      
      // 获取当前文件列表，移除要删除的文件
      const currentFileList = this.data.fileList || []
      const updatedFileList = currentFileList.filter(f => f.id !== id)
      
      // 调用云函数更新语音包的文件列表
      const res = await wx.cloud.callFunction({ 
        name: 'adminManageVoicePacks', 
        data: { 
          action: 'upload', 
          packId: this.data.currentPackId, 
          adminPassword: this.getAdminPassword(),
          voiceFiles: updatedFileList
        } 
      })
      
      if (res.result.code === 0) {
        wx.showToast({ title: '删除成功', icon:'success' })
        // 更新本地文件列表
        this.setData({ fileList: updatedFileList })
        // 延迟刷新列表
        setTimeout(() => {
          this.loadVoicePacks(this.data.selectedActorId)
        }, 500)
      } else {
        throw new Error(res.result.message)
      }
    } catch (err) { 
      wx.showToast({ title: err.message || '删除失败', icon:'none' }) 
    } finally { 
      try { wx.hideLoading() } catch(_){} 
    }
  },
  async saveActor() {
    const a = { ...this.data.editingActor }
    if (!a.name || !a.name.trim()) {
      wx.showToast({ title: '请输入演员名称', icon: 'none' })
      return
    }
    if (!this.ensureAuthed()) {
      wx.showToast({ title: '请先登录后台', icon: 'none' })
      return
    }
    
    try {
      wx.showLoading({ title: '保存中...' })
      
      let imageUrl = a.imageUrl
      // 只有当用户真正选择了新图片时才上传
      if (this.data.tempImagePath && this.data.tempImagePath.trim() !== '' && !this.data.tempImagePath.startsWith('cloud://')) {
        try {
          console.log('开始上传新图片:', this.data.tempImagePath)
          const up = await wx.cloud.uploadFile({ 
            cloudPath: `actors/${a._id || this.data.selectedActorId || Date.now()}/avatar_${Date.now()}.jpg`, 
            filePath: this.data.tempImagePath 
          })
          imageUrl = up.fileID
          console.log('图片上传成功:', imageUrl)
        } catch (uploadError) {
          console.error('图片上传失败:', uploadError)
          wx.hideLoading()
          wx.showToast({ title: '图片上传失败: ' + (uploadError.message || '未知错误'), icon: 'none' })
          return
        }
      } else {
        console.log('没有选择新图片，使用原有图片URL:', imageUrl)
      }
      
      const res = await wx.cloud.callFunction({
        name: 'adminManageActors',
        data: {
          action: a._id ? 'update' : 'create',
          actorId: a._id || this.data.selectedActorId,
          adminPassword: this.getAdminPassword(),
          actorData: { name: a.name, title: a.title||'', description: a.description||'', avatar: a.avatar||'', imageUrl, images: this.data.actorImages, status: a.status||'online', tags: a.tags||[] }
        }
      })
      
      if (res.result.code === 0) { 
        wx.hideLoading() // 先关闭loading
        wx.showToast({ title: '保存成功', icon: 'success' })
        this.closeActorModal()
        // 延迟刷新列表，避免loading冲突
        setTimeout(() => {
          this.loadActors()
        }, 500)
      }
      else {
        wx.hideLoading() // 先关闭loading
        throw new Error(res.result.message)
      }
    } catch (e) { 
      wx.hideLoading() // 先关闭loading
      wx.showToast({ title: e.message || '保存失败', icon: 'none' }) 
    }
  },

  // ====== 图片和视频上传管理 ======
  async choosePackImage() {
    console.log('=== choosePackImage 开始 ===')
    console.log('choosePackImage: 当前图片数量:', this.data.editingPack.images.length)
    
    let loadingId = null
    try {
      console.log('choosePackImage: 调用 wx.chooseImage')
      const res = await wx.chooseImage({
        count: 5 - this.data.editingPack.images.length,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })
      
      console.log('choosePackImage: 选择结果:', res)
      
      if (res.tempFilePaths && res.tempFilePaths.length > 0) {
        loadingId = this.showLoadingWithTrack('上传中...', 'choosePackImage')
        
        console.log('choosePackImage: 开始上传图片，数量:', res.tempFilePaths.length)
        const uploadPromises = res.tempFilePaths.map(async (tempFilePath, index) => {
          console.log(`choosePackImage: 上传第${index + 1}张图片:`, tempFilePath)
          const fileName = `voice-pack-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`
          
          // 使用选中的演员ID或临时ID作为路径
          const packId = this.data.editingPack._id || `temp_${Date.now()}`
          const cloudPath = `voice-packs/${packId}/${fileName}`
          
          console.log(`choosePackImage: 云存储路径:`, cloudPath)
          
          try {
            const uploadRes = await wx.cloud.uploadFile({
              cloudPath,
              filePath: tempFilePath
            })
            
            console.log(`choosePackImage: 第${index + 1}张图片上传结果:`, uploadRes)
            return uploadRes.fileID
          } catch (uploadError) {
            console.error(`choosePackImage: 第${index + 1}张图片上传失败:`, uploadError)
            throw new Error(`第${index + 1}张图片上传失败: ${uploadError.errMsg || '未知错误'}`)
          }
        })
        
        console.log('choosePackImage: 等待所有图片上传完成')
        const uploadedUrls = await Promise.all(uploadPromises)
        console.log('choosePackImage: 所有图片上传完成，URLs:', uploadedUrls)
        
        const editingPack = { ...this.data.editingPack }
        editingPack.images = [...editingPack.images, ...uploadedUrls]
        
        console.log('choosePackImage: 更新编辑包数据:', editingPack)
        console.log('choosePackImage: 更新后的图片数组:', editingPack.images)
        this.setData({ editingPack })
        
        this.hideLoadingWithTrack('choosePackImage', loadingId)
        wx.showToast({ title: '上传成功', icon: 'success' })
        console.log('=== choosePackImage 成功结束 ===')
      }
    } catch (error) {
      console.log('choosePackImage: 捕获到异常:', error)
      // 确保在错误情况下也隐藏loading
      if (loadingId) {
        this.hideLoadingWithTrack('choosePackImage', loadingId)
      }
      
      // 检查是否是用户取消操作
      if (error.errMsg && error.errMsg.includes('cancel')) {
        console.log('choosePackImage: 用户取消操作，不显示错误提示')
        return
      }
      
      console.log('choosePackImage: 显示错误提示')
      wx.showToast({ title: '上传失败: ' + (error.errMsg || '未知错误'), icon: 'none' })
      console.log('=== choosePackImage 异常结束 ===')
    }
  },

  removePackImage(e) {
    const index = e.currentTarget.dataset.index
    console.log('🗑️ 删除图片，索引:', index)
    
    if (index === undefined || index === null) {
      console.error('❌ 删除图片失败：索引无效')
      wx.showToast({ title: '删除失败', icon: 'none' })
      return
    }
    
    const editingPack = { ...this.data.editingPack }
    console.log('🗑️ 删除前图片数量:', editingPack.images.length)
    
    if (!editingPack.images || editingPack.images.length <= index) {
      console.error('❌ 删除图片失败：图片数组无效或索引超出范围')
      wx.showToast({ title: '删除失败', icon: 'none' })
      return
    }
    
    editingPack.images.splice(index, 1)
    console.log('🗑️ 删除后图片数量:', editingPack.images.length)
    
    this.setData({ editingPack })
    wx.showToast({ title: '删除成功', icon: 'success' })
  },

  previewImage(e) {
    const index = e.currentTarget.dataset.index
    wx.previewImage({
      current: this.data.editingPack.images[index],
      urls: this.data.editingPack.images
    })
  },

  async chooseBonusVideo() {
    console.log('=== chooseBonusVideo 开始 ===')
    
    let loadingId = null
    try {
      console.log('chooseBonusVideo: 调用 wx.chooseVideo')
      const res = await wx.chooseVideo({
        sourceType: ['album', 'camera'],
        maxDuration: 60, // 微信小程序限制最大60秒
        camera: 'back'
      })
      
      console.log('chooseBonusVideo: 选择结果:', res)
      
      if (res.tempFilePath) {
        loadingId = this.showLoadingWithTrack('上传视频中...', 'chooseBonusVideo')
        
        const fileName = `bonus-video-${Date.now()}.mp4`
        const cloudPath = `voice-packs/${this.data.editingPack._id || 'temp'}/${fileName}`
        
        console.log('chooseBonusVideo: 云存储路径:', cloudPath)
        console.log('chooseBonusVideo: 开始上传视频')
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath,
          filePath: res.tempFilePath
        })
        
        console.log('chooseBonusVideo: 视频上传结果:', uploadRes)
        
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
        
        console.log('chooseBonusVideo: 更新编辑包数据:', editingPack)
        this.setData({ editingPack })
        
        this.hideLoadingWithTrack('chooseBonusVideo', loadingId)
        wx.showToast({ title: '视频上传成功', icon: 'success' })
        console.log('=== chooseBonusVideo 成功结束 ===')
      }
    } catch (error) {
      console.log('chooseBonusVideo: 捕获到异常:', error)
      // 确保在错误情况下也隐藏loading
      if (loadingId) {
        this.hideLoadingWithTrack('chooseBonusVideo', loadingId)
      }
      
      // 检查是否是用户取消操作
      if (error.errMsg && error.errMsg.includes('cancel')) {
        console.log('chooseBonusVideo: 用户取消操作，不显示错误提示')
        return
      }
      
      console.log('chooseBonusVideo: 显示错误提示')
      wx.showToast({ title: '上传失败: ' + (error.errMsg || '未知错误'), icon: 'none' })
      console.log('=== chooseBonusVideo 异常结束 ===')
    }
  },

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

  // 跳转到数据管理页面
  goToDataManagement() {
    wx.navigateTo({
      url: '/pages/admin-data/admin-data'
    })
  },


  goToFixSalesData() {
    wx.navigateTo({
      url: '/pages/fix-sales-data/fix-sales-data'
    })
  },

  // 优化数据库索引
  async optimizeDatabaseIndexes() {
    try {
      wx.showModal({
        title: '性能分析',
        content: '此操作将分析数据库性能并提供索引优化建议。是否继续？',
        success: async (res) => {
          if (res.confirm) {
            try {
              wx.showLoading({
                title: '分析中...',
                mask: true
              })

              const result = await wx.cloud.callFunction({
                name: 'optimizeDatabaseIndexes',
                data: {}
              })

              wx.hideLoading()

              if (result.result.code === 0) {
                const data = result.result.data
                let message = `数据库性能分析完成！\n\n`
                message += `分析集合数量: ${data.totalCollections}\n\n`
                message += `分析结果:\n`
                data.analysis.slice(0, 5).forEach(item => {
                  message += `• ${item}\n`
                })
                if (data.analysis.length > 5) {
                  message += `• ... 还有 ${data.analysis.length - 5} 项分析结果\n`
                }

                wx.showModal({
                  title: '分析完成',
                  content: message,
                  confirmText: '查看建议',
                  cancelText: '知道了',
                  success: (res) => {
                    if (res.confirm) {
                      // 显示详细建议
                      const recommendations = data.recommendations.join('\n')
                      wx.showModal({
                        title: '索引优化建议',
                        content: recommendations,
                        showCancel: false,
                        confirmText: '知道了'
                      })
                    }
                  }
                })
              } else {
                wx.showToast({
                  title: '分析失败',
                  icon: 'error'
                })
              }
            } catch (error) {
              wx.hideLoading()
              console.error('索引优化失败:', error)
              wx.showToast({
                title: '优化失败',
                icon: 'error'
              })
            }
          }
        }
      })
    } catch (error) {
      console.error('索引优化失败:', error)
      wx.showToast({
        title: '优化失败',
        icon: 'error'
      })
    }
  },

  },

  // 跳转到许愿池管理页面
  goToWishPoolAdmin() {
    wx.showToast({
      title: '功能已下线',
      icon: 'none',
      duration: 2000
    })
  },

  // 跳转到索引优化页面
  goToOptimizeIndexes() {
    wx.navigateTo({
      url: '/pages/optimize-indexes/optimize-indexes'
    })
  },

  // 跳转到数据清理页面
  goToClearData() {
    wx.navigateTo({
      url: '/pages/clear-data/clear-data'
    })
  },

  // 切换模块
  switchModule(e) {
    const module = e.currentTarget.dataset.module
    this.setData({
      currentModule: module
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


