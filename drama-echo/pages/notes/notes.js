const app = getApp()

Page({
  data: {
    searchText: '',
    activeFilter: 'all',
    notesList: [],
    filteredNotes: [],
    totalNotes: 0,
    totalShows: 0,
    favoriteTheater: '-',
    totalEarned: 0
  },

  async onLoad() {
    // 检查登录状态
    if (!app.checkLoginStatus()) {
      wx.showModal({
        title: '需要登录',
        content: '请先登录后再使用戏剧笔记功能',
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
    }

    this.loadNotes()
  },

  onShow() {
    this.loadNotes()
  },

  // 加载笔记列表
  async loadNotes() {
    try {
      if (app.globalData.cloudEnabled) {
        // 从云端加载观剧记录
        const res = await wx.cloud.callFunction({
          name: 'getRecords'
        })
        
        if (res.result.code === 0) {
          this.processNotes(res.result.data)
        } else {
          console.error('云端加载记录失败:', res.result.message)
          this.loadLocalNotes()
        }
      } else {
        this.loadLocalNotes()
      }
    } catch (error) {
      console.error('加载记录失败:', error)
      this.loadLocalNotes()
    }
  },

  // 加载本地笔记
  loadLocalNotes() {
    const userData = app.globalData.userData || {}
    const notes = userData.dramaNotes || []
    this.processNotes(notes)
  },

  // 处理笔记数据
  processNotes(notes) {
    // 处理评分星星显示
    const processedNotes = notes.map(note => ({
      ...note,
      ratingStars: this.generateRatingStars(note.rating),
      watchDate: this.formatDate(note.watchDate),
      content: this.truncateText(note.remarks || note.content || '', 50),
      // 处理封面图片：优先使用票根图片，其次使用旧版图片
      coverImage: note.ticketImages && note.ticketImages.length > 0 ? note.ticketImages[0] : 
                 (note.images && note.images.length > 0 ? note.images[0] : 'cloud://cloud1-2gyb3dkq4c474fe4.636c-cloud1-2gyb3dkq4c474fe4-1371126028/images/xjhx-logo.png'),
      // 兼容旧版数据
      theater: note.venue || note.theater || '',
      id: note._id || note.id
    }))

    // 按创建时间排序
    processedNotes.sort((a, b) => new Date(b.createTime || b.updateTime || 0) - new Date(a.createTime || a.updateTime || 0))

    this.setData({
      notesList: processedNotes,
      filteredNotes: processedNotes
    })

    this.calculateStats(processedNotes)
    this.applyFilter()
  },

  // 生成评分星星
  generateRatingStars(rating) {
    if (!rating) return []
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 >= 0.5

    for (let i = 0; i < fullStars; i++) {
      stars.push('⭐')
    }
    if (hasHalfStar) {
      stars.push('🌟')
    }
    return stars
  },

  // 格式化日期
  formatDate(dateStr) {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}月${date.getDate()}日`
  },

  // 截断文本
  truncateText(text, length) {
    if (!text) return ''
    return text.length > length ? text.slice(0, length) + '...' : text
  },

  // 计算统计数据
  calculateStats(notes) {
    const totalNotes = notes.length
    const totalShows = notes.length // 每个记录对应一场演出
    
    // 统计最常去的剧院
    const theaterCount = {}
    notes.forEach(note => {
      const theater = note.venue || note.theater
      if (theater) {
        theaterCount[theater] = (theaterCount[theater] || 0) + 1
      }
    })
    
    const favoriteTheater = Object.keys(theaterCount).length > 0 
      ? Object.keys(theaterCount).reduce((a, b) => theaterCount[a] > theaterCount[b] ? a : b)
      : '-'

    // 计算获得的总积分 (每个记录50分 + 分享奖励)
    const totalEarned = totalNotes * 50 + notes.reduce((sum, note) => sum + (note.shareCount || 0) * 50, 0)

    this.setData({
      totalNotes,
      totalShows,
      favoriteTheater,
      totalEarned
    })
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({
      searchText: e.detail.value
    })
    this.applyFilter()
  },

  // 执行搜索
  onSearch() {
    this.applyFilter()
  },

  // 切换筛选
  switchFilter(e) {
    const filter = e.currentTarget.dataset.filter
    this.setData({
      activeFilter: filter
    })
    this.applyFilter()
  },

  // 应用筛选和搜索
  applyFilter() {
    let filtered = [...this.data.notesList]
    
    // 应用搜索
    if (this.data.searchText.trim()) {
      const searchText = this.data.searchText.toLowerCase()
      filtered = filtered.filter(note => 
        (note.dramaTitle || '').toLowerCase().includes(searchText) ||
        (note.theater || '').toLowerCase().includes(searchText) ||
        (note.content || '').toLowerCase().includes(searchText)
      )
    }

    // 应用筛选
    switch (this.data.activeFilter) {
      case 'recent':
        // 最近30天
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        filtered = filtered.filter(note => {
          const createTime = new Date(note.createTime || note.updateTime || 0)
          return createTime > thirtyDaysAgo
        })
        break
      case 'favorite':
        // 收藏的（评分4星以上）
        filtered = filtered.filter(note => (note.rating || 0) >= 4)
        break
      // 'all' 不需要额外筛选
    }

    // 更新显示的记录列表
    this.setData({
      filteredNotes: filtered
    })
  },

  // 创建新笔记
  createNewNote() {
    wx.navigateTo({
      url: '/pages/note/note?mode=create'
    })
  },

  // 查看笔记详情
  viewNote(e) {
    const noteId = e.currentTarget.dataset.noteId
    wx.navigateTo({
      url: `/pages/note/note?mode=view&id=${noteId}`
    })
  },

  // 编辑笔记
  editNote(e) {
    e.stopPropagation()
    const noteId = e.currentTarget.dataset.noteId
    wx.navigateTo({
      url: `/pages/note/note?mode=edit&id=${noteId}`
    })
  },

  // 分享笔记
  async shareNote(e) {
    e.stopPropagation()
    const noteId = e.currentTarget.dataset.noteId
    
    try {
      // 更新分享计数
      await this.updateShareCount(noteId)
      
      // 给用户奖励积分
      app.addPoints(50, '分享戏剧笔记')
      
      wx.showToast({
        title: '分享成功，获得50戏剧币！',
        icon: 'success'
      })
      
      // 重新加载数据
      this.loadNotes()
      
    } catch (error) {
      console.error('分享失败:', error)
      wx.showToast({
        title: '分享失败',
        icon: 'none'
      })
    }
  },

  // 更新分享计数
  async updateShareCount(noteId) {
    if (app.globalData.cloudEnabled) {
      await wx.cloud.callFunction({
        name: 'updateNoteShareCount',
        data: { noteId }
      })
    } else {
      // 本地更新
      const userData = app.globalData.userData || {}
      const notes = userData.dramaNotes || []
      const note = notes.find(n => n.id === noteId)
      if (note) {
        note.shares = (note.shares || 0) + 1
        note.shareCount = (note.shareCount || 0) + 1
        app.saveUserData()
      }
    }
  },

  // 分享到微信
  onShareAppMessage() {
    return {
      title: '我的戏剧笔记 - 戏剧回响',
      path: '/pages/notes/notes',
      imageUrl: 'cloud://cloud1-2gyb3dkq4c474fe4.636c-cloud1-2gyb3dkq4c474fe4-1371126028/images/xjhx-logo.png'
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadNotes().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 图片加载错误处理
  onImageError(e) {
    console.log('笔记缩略图加载失败:', e.detail)
  },

  // 图片加载成功
  onImageLoad(e) {
    console.log('笔记缩略图加载成功:', e.detail)
  }
}) 