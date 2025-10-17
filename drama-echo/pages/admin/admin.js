const app = getApp()

Page({
  data: {
    // 身份验证
    isAuthenticated: false,
    adminPassword: '',
    
    // 主导航
    activeMainTab: 'mall', // mall, voice-echo
    
    // 商品数据
    gifts: {},
    currentProducts: [],
    activeCategory: 'physical',
    
    // 统计数据
    totalProducts: 0,
    totalStock: 0,
    outOfStockCount: 0,
    
    // 分类名称映射
    categoryNames: {
      physical: '实物商品',
      digital: '数字商品',
      experience: '体验商品'
    },
    
    // 编辑相关
    showEditModal: false,
    editingProduct: {},
    
    // 删除相关
    showDeleteModal: false,
    deletingProduct: {},
    
    // 临时图片路径
    tempImagePath: '',
    
    // 戏剧回响管理相关
    actors: [],
    voicePacks: [],
    selectedActorId: '',
    selectedActorName: '',
    
    // 演员编辑相关
    showActorModal: false,
    editingActor: {},
    
    // 语音包编辑相关
    showPackModal: false,
    editingPack: {}
  },

  onLoad() {
    this.loadGiftsData()
    this.checkAuthStatus()
  },

  onShow() {
    this.loadGiftsData()
    this.updateStats()
  },

  // 检查身份验证状态
  checkAuthStatus() {
    const authStatus = wx.getStorageSync('adminAuth')
    if (authStatus && authStatus.authenticated && Date.now() - authStatus.timestamp < 3600000) { // 1小时有效
      this.setData({ isAuthenticated: true })
      this.updateStats()
    }
  },

  // 密码输入
  onPasswordInput(e) {
    this.setData({ adminPassword: e.detail.value })
  },

  // 身份验证
  authenticate() {
    const password = this.data.adminPassword
    if (password === 'modu2024' || password === 'admin123') { // 简单的密码验证
      wx.setStorageSync('adminAuth', {
        authenticated: true,
        timestamp: Date.now()
      })
      this.setData({ 
        isAuthenticated: true,
        adminPassword: ''
      })
      this.updateStats()
      wx.showToast({
        title: '验证成功',
        icon: 'success'
      })
    } else {
      wx.showToast({
        title: '密码错误',
        icon: 'none'
      })
    }
  },

  // 加载商品数据
  loadGiftsData() {
    // 从本地存储加载商品数据，如果没有则使用默认数据
    let giftsData = wx.getStorageSync('mallGiftsData')
    
    if (!giftsData) {
      // 初始化默认商品数据
      giftsData = {
        physical: [
          {
            id: 'p1',
            name: '戏剧主题马克杯',
            emoji: '☕',
            description: '精美陶瓷材质',
            fullDescription: '采用优质陶瓷制作，印有经典戏剧台词，容量350ml，适合日常使用。让每一次品茗都充满戏剧气息。',
            price: 200,
            stock: 15,
            category: 'physical',
            imageUrl: ''
          },
          {
            id: 'p2',
            name: '魔都戏剧帆布包',
            emoji: '👜',
            description: '环保帆布材质',
            fullDescription: '100%纯棉帆布制作，印有魔都戏剧专属logo，大容量设计，是文艺青年的必备单品。',
            price: 300,
            stock: 12,
            category: 'physical',
            imageUrl: ''
          },
          {
            id: 'p3',
            name: '戏剧台词书签套装',
            emoji: '🔖',
            description: '经典台词精选',
            fullDescription: '精选10张经典戏剧台词书签，采用优质卡纸印制，每张都是一句经典台词的艺术呈现。',
            price: 150,
            stock: 20,
            category: 'physical',
            imageUrl: ''
          },
          {
            id: 'p4',
            name: '戏剧面具摆件',
            emoji: '🎭',
            description: '树脂工艺品',
            fullDescription: '精美树脂材质制作的戏剧面具摆件，象征着喜剧与悲剧，是戏剧爱好者的收藏佳品。',
            price: 500,
            stock: 8,
            category: 'physical',
            imageUrl: ''
          }
        ],
        digital: [
          {
            id: 'd1',
            name: '专属头像框',
            emoji: '🖼️',
            description: '戏剧主题设计',
            fullDescription: '专为戏剧爱好者设计的头像框，多种风格可选，让你的头像更加个性化。',
            price: 50,
            stock: 999,
            category: 'digital',
            imageUrl: ''
          },
          {
            id: 'd2',
            name: '高清戏剧壁纸包',
            emoji: '🌅',
            description: '精选戏剧场景',
            fullDescription: '包含20张高清戏剧主题壁纸，涵盖经典剧目场景，适配各种设备尺寸。',
            price: 80,
            stock: 999,
            category: 'digital',
            imageUrl: ''
          },
          {
            id: 'd3',
            name: '戏剧音效包',
            emoji: '🎵',
            description: '经典音效合集',
            fullDescription: '收录经典戏剧音效，包括掌声、钟声、雨声等，为你的创作添加戏剧氛围。',
            price: 120,
            stock: 999,
            category: 'digital',
            imageUrl: ''
          }
        ],
        experience: [
          {
            id: 'e1',
            name: '戏剧讲座门票',
            emoji: '🎤',
            description: '专家现场分享',
            fullDescription: '邀请戏剧界知名专家现场分享戏剧知识，深度解析经典剧目，提升戏剧鉴赏能力。',
            price: 800,
            stock: 5,
            category: 'experience',
            imageUrl: ''
          },
          {
            id: 'e2',
            name: '后台探访机会',
            emoji: '🚪',
            description: '剧院后台参观',
            fullDescription: '难得的剧院后台参观机会，了解戏剧制作幕后故事，与演员近距离接触。',
            price: 1000,
            stock: 3,
            category: 'experience',
            imageUrl: ''
          },
          {
            id: 'e3',
            name: '戏剧工作坊体验',
            emoji: '🎨',
            description: '亲身参与创作',
            fullDescription: '专业导师指导的戏剧工作坊，学习表演技巧，体验戏剧创作的乐趣。',
            price: 1200,
            stock: 0,
            category: 'experience',
            imageUrl: ''
          }
        ]
      }
      this.saveGiftsData(giftsData)
    }
    
    this.setData({ 
      gifts: giftsData,
      currentProducts: giftsData[this.data.activeCategory] || []
    })
    
    // 同步更新mall页面的数据
    this.syncMallData(giftsData)
  },

  // 保存商品数据
  saveGiftsData(giftsData) {
    wx.setStorageSync('mallGiftsData', giftsData)
    // 同步更新mall页面的数据
    this.syncMallData(giftsData)
  },

  // 同步商品数据到商城页面
  syncMallData(giftsData) {
    // 更新app的全局数据（如果mall页面有使用的话）
    if (app.globalData) {
      app.globalData.mallGifts = giftsData
    }
  },

  // 切换分类
  switchCategory(e) {
    const category = e.currentTarget.dataset.category
    this.setData({
      activeCategory: category,
      currentProducts: this.data.gifts[category] || []
    })
  },

  // 更新统计数据
  updateStats() {
    const gifts = this.data.gifts
    let totalProducts = 0
    let totalStock = 0
    let outOfStockCount = 0
    
    Object.keys(gifts).forEach(category => {
      gifts[category].forEach(product => {
        totalProducts++
        totalStock += product.stock
        if (product.stock <= 0) {
          outOfStockCount++
        }
      })
    })
    
    this.setData({
      totalProducts,
      totalStock,
      outOfStockCount
    })
  },

  // 添加商品
  addProduct() {
    this.setData({
      showEditModal: true,
      editingProduct: {
        id: '',
        name: '',
        emoji: '🎭',
        description: '',
        fullDescription: '',
        price: 0,
        stock: 0,
        category: this.data.activeCategory,
        imageUrl: ''
      }
    })
  },

  // 编辑商品
  editProduct(e) {
    const productId = e.currentTarget.dataset.id
    const product = this.findProductById(productId)
    if (product) {
      this.setData({
        showEditModal: true,
        editingProduct: { ...product }
      })
    }
  },

  // 复制商品
  copyProduct(e) {
    const productId = e.currentTarget.dataset.id
    const product = this.findProductById(productId)
    if (product) {
      const newProduct = {
        ...product,
        id: this.generateProductId(),
        name: product.name + ' (副本)'
      }
      this.setData({
        showEditModal: true,
        editingProduct: newProduct
      })
    }
  },

  // 删除商品
  deleteProduct(e) {
    const productId = e.currentTarget.dataset.id
    const product = this.findProductById(productId)
    if (product) {
      this.setData({
        showDeleteModal: true,
        deletingProduct: product
      })
    }
  },

  // 确认删除
  confirmDelete() {
    const productId = this.data.deletingProduct.id
    const category = this.data.deletingProduct.category
    const gifts = { ...this.data.gifts }
    
    gifts[category] = gifts[category].filter(p => p.id !== productId)
    
    this.setData({
      gifts,
      currentProducts: gifts[this.data.activeCategory] || [],
      showDeleteModal: false,
      deletingProduct: {}
    })
    
    this.saveGiftsData(gifts)
    this.updateStats()
    
    wx.showToast({
      title: '删除成功',
      icon: 'success'
    })
  },

  // 商品输入处理
  onProductInput(e) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value
    const editingProduct = { ...this.data.editingProduct }
    
    if (field === 'price' || field === 'stock') {
      editingProduct[field] = parseInt(value) || 0
    } else {
      editingProduct[field] = value
    }
    
    this.setData({ editingProduct })
  },

  // 选择分类
  selectCategory(e) {
    const category = e.currentTarget.dataset.category
    const editingProduct = { ...this.data.editingProduct }
    editingProduct.category = category
    this.setData({ editingProduct })
  },

  // 选择图片
  chooseImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0]
        
        // 由于是小程序本地开发，我们只保存临时路径
        // 在实际部署时，这里应该上传到云存储
        const editingProduct = { ...this.data.editingProduct }
        editingProduct.imageUrl = tempFilePath
        
        this.setData({ 
          editingProduct,
          tempImagePath: tempFilePath
        })
        
        wx.showToast({
          title: '图片选择成功',
          icon: 'success'
        })
      },
      fail: (err) => {
        wx.showToast({
          title: '图片选择失败',
          icon: 'none'
        })
      }
    })
  },

  // 移除图片
  removeImage() {
    const editingProduct = { ...this.data.editingProduct }
    editingProduct.imageUrl = ''
    this.setData({ 
      editingProduct,
      tempImagePath: ''
    })
  },

  // 保存商品
  saveProduct() {
    const product = this.data.editingProduct
    
    // 验证必填字段
    if (!product.name.trim()) {
      wx.showToast({
        title: '请输入商品名称',
        icon: 'none'
      })
      return
    }
    
    if (!product.description.trim()) {
      wx.showToast({
        title: '请输入商品描述',
        icon: 'none'
      })
      return
    }
    
    if (product.price <= 0) {
      wx.showToast({
        title: '请输入有效价格',
        icon: 'none'
      })
      return
    }
    
    const gifts = { ...this.data.gifts }
    const category = product.category
    
    if (!product.id) {
      // 新增商品
      product.id = this.generateProductId()
      gifts[category].push(product)
    } else {
      // 更新商品
      const index = gifts[category].findIndex(p => p.id === product.id)
      if (index !== -1) {
        gifts[category][index] = product
      }
    }
    
    this.setData({
      gifts,
      currentProducts: gifts[this.data.activeCategory] || [],
      showEditModal: false,
      editingProduct: {}
    })
    
    this.saveGiftsData(gifts)
    this.updateStats()
    
    wx.showToast({
      title: '保存成功',
      icon: 'success'
    })
  },

  // 批量导入
  batchImport() {
    wx.showModal({
      title: '批量导入',
      content: '此功能将从剪贴板导入JSON格式的商品数据。请确保数据格式正确。',
      confirmText: '导入',
      success: (res) => {
        if (res.confirm) {
          // 模拟导入功能
          wx.showToast({
            title: '导入功能开发中',
            icon: 'none'
          })
        }
      }
    })
  },

  // 导出数据
  exportData() {
    const giftsData = this.data.gifts
    const jsonString = JSON.stringify(giftsData, null, 2)
    
    wx.setClipboardData({
      data: jsonString,
      success: () => {
        wx.showModal({
          title: '导出成功',
          content: '商品数据已复制到剪贴板，可以粘贴到文件中保存。',
          showCancel: false
        })
      }
    })
  },

  // 工具函数：根据ID查找商品
  findProductById(id) {
    for (const category in this.data.gifts) {
      const product = this.data.gifts[category].find(p => p.id === id)
      if (product) return product
    }
    return null
  },

  // 生成商品ID
  generateProductId() {
    const category = this.data.editingProduct.category
    const prefix = category.charAt(0)
    const timestamp = Date.now().toString().slice(-6)
    return `${prefix}${timestamp}`
  },

  // 隐藏编辑模态框
  hideEditModal() {
    this.setData({
      showEditModal: false,
      editingProduct: {},
      tempImagePath: ''
    })
  },

  // 隐藏删除模态框
  hideDeleteModal() {
    this.setData({
      showDeleteModal: false,
      deletingProduct: {}
    })
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 阻止点击事件冒泡
  },

  // 跳转到语音包管理
  goToVoiceAdmin() {
    wx.navigateTo({
      url: '/pages/voice-admin/voice-admin'
    })
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: '魔都戏剧 - 后台管理',
      path: '/pages/index/index'
    }
  },

  // ================== 戏剧回响管理相关方法 ==================

  // 切换主标签页
  switchMainTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ activeMainTab: tab })
    
    if (tab === 'voice-echo') {
      this.loadActors()
    }
  },

  // 加载演员列表
  async loadActors() {
    try {
      wx.showLoading({ title: '加载中...' })
      
      const res = await wx.cloud.callFunction({
        name: 'adminManageActors',
        data: { action: 'list' }
      })
      
      if (res.result.code === 0) {
        this.setData({ actors: res.result.data })
      } else {
        throw new Error(res.result.message)
      }
    } catch (error) {
      console.error('加载演员失败:', error)
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 刷新演员列表
  refreshActors() {
    this.loadActors()
  },

  // 显示添加演员弹窗
  showAddActorModal() {
    this.setData({
      showActorModal: true,
      editingActor: {
        name: '',
        title: '',
        description: '',
        status: 'offline'
      }
    })
  },

  // 编辑演员
  editActor(e) {
    const actor = e.currentTarget.dataset.actor
    this.setData({
      showActorModal: true,
      editingActor: { ...actor }
    })
  },

  // 隐藏演员弹窗
  hideActorModal() {
    this.setData({
      showActorModal: false,
      editingActor: {}
    })
  },

  // 演员输入处理
  onActorInput(e) {
    const { field } = e.currentTarget.dataset
    const { value } = e.detail
    const editingActor = { ...this.data.editingActor }
    editingActor[field] = value
    this.setData({ editingActor })
  },

  // 演员状态改变
  onActorStatusChange(e) {
    const status = e.detail.value
    const editingActor = { ...this.data.editingActor }
    editingActor.status = status
    this.setData({ editingActor })
  },

  // 保存演员
  async saveActor() {
    const actor = this.data.editingActor
    
    // 验证必填字段
    if (!actor.name.trim()) {
      wx.showToast({
        title: '请输入演员姓名',
        icon: 'none'
      })
      return
    }

    try {
      wx.showLoading({ title: '保存中...' })
      
      const action = actor._id ? 'update' : 'create'
      const res = await wx.cloud.callFunction({
        name: 'adminManageActors',
        data: {
          action,
          actorId: actor._id,
          actorData: actor
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
      wx.hideLoading()
    }
  },

  // 管理语音包
  async manageVoicePacks(e) {
    const actorId = e.currentTarget.dataset.actorId
    const actor = this.data.actors.find(a => a._id === actorId)
    
    this.setData({
      selectedActorId: actorId,
      selectedActorName: actor ? actor.name : ''
    })
    
    await this.loadVoicePacks(actorId)
  },

  // 加载语音包列表
  async loadVoicePacks(actorId) {
    try {
      wx.showLoading({ title: '加载中...' })
      
      const res = await wx.cloud.callFunction({
        name: 'adminManageVoicePacks',
        data: {
          action: 'list',
          actorId
        }
      })
      
      if (res.result.code === 0) {
        // 为语音包添加格式化价格
        const voicePacks = res.result.data.map(pack => ({
          ...pack,
          formattedPrice: (pack.price / 100).toFixed(2)
        }))
        this.setData({ voicePacks })
      } else {
        throw new Error(res.result.message)
      }
    } catch (error) {
      console.error('加载语音包失败:', error)
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 清除选中的演员
  clearSelectedActor() {
    this.setData({
      selectedActorId: '',
      selectedActorName: '',
      voicePacks: []
    })
  },

  // 显示添加语音包弹窗
  showAddPackModal() {
    this.setData({
      showPackModal: true,
      editingPack: {
        actorId: this.data.selectedActorId,
        name: '',
        icon: '🎵',
        price: 0,
        displayPrice: '0.00', // 用于显示的格式化价格
        description: '',
        isHot: false
      }
    })
  },

  // 编辑语音包
  editVoicePack(e) {
    const pack = e.currentTarget.dataset.pack
    this.setData({
      showPackModal: true,
      editingPack: { 
        ...pack,
        displayPrice: (pack.price / 100).toFixed(2) // 用于显示的格式化价格
      }
    })
  },

  // 隐藏语音包弹窗
  hidePackModal() {
    this.setData({
      showPackModal: false,
      editingPack: {}
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

  // 语音包价格输入处理
  onPackPriceInput(e) {
    const { value } = e.detail
    const price = Math.round(parseFloat(value || 0) * 100) // 转换为分
    const editingPack = { ...this.data.editingPack }
    editingPack.price = price
    editingPack.displayPrice = value // 保存用户输入的显示价格
    this.setData({ editingPack })
  },

  // 语音包热门状态改变
  onPackHotChange(e) {
    const isHot = e.detail.value
    const editingPack = { ...this.data.editingPack }
    editingPack.isHot = isHot
    this.setData({ editingPack })
  },

  // 保存语音包
  async savePack() {
    const pack = this.data.editingPack
    
    // 验证必填字段
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
          packData: pack
        }
      })
      
      if (res.result.code === 0) {
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        })
        this.hidePackModal()
        this.loadVoicePacks(this.data.selectedActorId)
        this.loadActors() // 刷新演员统计数据
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

  // 删除语音包
  async deleteVoicePack(e) {
    const packId = e.currentTarget.dataset.packId
    
    const res = await new Promise(resolve => {
      wx.showModal({
        title: '确认删除',
        content: '确定要删除这个语音包吗？',
        success: resolve
      })
    })

    if (!res.confirm) return

    try {
      wx.showLoading({ title: '删除中...' })
      
      const deleteRes = await wx.cloud.callFunction({
        name: 'adminManageVoicePacks',
        data: {
          action: 'delete',
          packId
        }
      })
      
      if (deleteRes.result.code === 0) {
        wx.showToast({
          title: '删除成功',
          icon: 'success'
        })
        this.loadVoicePacks(this.data.selectedActorId)
        this.loadActors() // 刷新演员统计数据
      } else {
        throw new Error(deleteRes.result.message)
      }
    } catch (error) {
      console.error('删除语音包失败:', error)
      wx.showToast({
        title: error.message || '删除失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  }
}) 