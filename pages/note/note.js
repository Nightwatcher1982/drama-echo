const app = getApp()

Page({
  data: {
    mode: 'create', // create, edit, view
    noteId: null,
    pageTitle: '添加记录',
    
    // 表单数据
    dramaTitle: '',
    watchDate: '',
    watchTime: '',
    venue: '',
    stage: '',
    seatArea: '',
    seatRow: '',
    seatNumber: '',
    ticketPrice: '',
    selectedActors: [],
    selectedActorsText: '',
    purchaseChannel: '',
    ticketImages: [],
    selectedCalendar: '默认剧历',
    displaySetting: '公开',
    isPending: false,
    remarks: '',
    
    // 热门剧目搜索相关
    showSearchSection: false,
    searchValue: '',
    searchResults: [],
    isSearching: false,
    
    // 选择器数据
    dramaList: [
      { name: '悲惨世界', id: 'les_miserables' },
      { name: '歌剧魅影', id: 'phantom' },
      { name: '猫', id: 'cats' },
      { name: '西贡小姐', id: 'miss_saigon' },
      { name: '妈妈咪呀', id: 'mamma_mia' }
    ],
    dramaIndex: -1,
    

    
    stageList: [
      { name: '大剧场', id: 'main_stage' },
      { name: '中剧场', id: 'medium_stage' },
      { name: '小剧场', id: 'small_stage' },
      { name: '实验剧场', id: 'experimental_stage' }
    ],
    stageIndex: -1,
    

    
    channelList: [
      { name: '大麦网', id: 'damai' },
      { name: '猫眼', id: 'maoyan' },
      { name: '淘票票', id: 'taopiaopiao' },
      { name: '官方渠道', id: 'official' },
      { name: '其他', id: 'other' }
    ],
    channelIndex: -1,
    
    calendarList: [
      { name: '默认剧历', id: 'default' },
      { name: '个人剧历', id: 'personal' },
      { name: '收藏剧历', id: 'favorite' }
    ],
    calendarIndex: 0,
    
    displayOptions: ['公开', '仅自己可见', '好友可见'],
    displayIndex: 0,
    
    // 统计数据
    views: 0,
    likes: 0,
    shares: 0,
    
    // 图片预览
    showImagePreview: false,
    previewImageUrl: ''
  },

  async onLoad(options) {
    // 检查登录状态
    if (!app.checkLoginStatus()) {
      wx.showModal({
        title: '需要登录',
        content: '请先登录后再使用戏剧记录功能',
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

    const { mode = 'create', id, date } = options
    
    // 准备setData的数据对象，避免undefined值
    const updateData = {
      mode,
      pageTitle: mode === 'create' ? '添加记录' : mode === 'edit' ? '编辑记录' : '查看记录'
    }
    
    // 只有当id存在时才设置noteId
    if (id) {
      updateData.noteId = id
    }
    
    this.setData(updateData)

    if (mode !== 'create' && id) {
      await this.loadNoteData(id)
    }

    // 设置日期（从日历页面传递的日期或今天）
    if (mode === 'create') {
      let dateStr
      if (date) {
        dateStr = date
      } else {
        const today = new Date()
        dateStr = today.getFullYear() + '-' + 
                  String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                  String(today.getDate()).padStart(2, '0')
      }
      this.setData({
        watchDate: dateStr
      })
    }
  },

  // 加载笔记数据
  async loadNoteData(noteId) {
    try {
      wx.showLoading({ title: '加载中...' })
      
      const res = await wx.cloud.callFunction({
        name: 'getRecord',
        data: { recordId: noteId }
      })
      
      if (res.result.code === 0) {
        this.populateNoteData(res.result.data)
      } else {
        throw new Error(res.result.message)
      }
    } catch (error) {
      console.error('加载记录数据失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 填充笔记数据到表单
  populateNoteData(note) {
    // 处理演员数据，将数组转换为文本
    const selectedActors = note.selectedActors || []
    const selectedActorsText = selectedActors.join('、')
    
    this.setData({
      dramaTitle: note.dramaTitle || '',
      watchDate: note.watchDate || '',
      watchTime: note.watchTime || '',
      venue: note.venue || '',
      stage: note.stage || '',
      seatArea: note.seatArea || '',
      seatRow: note.seatRow || '',
      seatNumber: note.seatNumber || '',
      ticketPrice: note.ticketPrice || '',
      selectedActors: selectedActors,
      selectedActorsText: selectedActorsText,
      purchaseChannel: note.purchaseChannel || '',
      ticketImages: note.ticketImages || [],
      selectedCalendar: note.selectedCalendar || '默认剧历',
      displaySetting: note.displaySetting || '公开',
      isPending: note.isPending || false,
      remarks: note.remarks || '',
      views: note.views || 0,
      likes: note.likes || 0,
      shares: note.shares || 0
    })
  },

  // 剧目名称输入
  onDramaTitleInput(e) {
    this.setData({
      dramaTitle: e.detail.value
    })
  },

  // 显示/隐藏搜索区域
  toggleSearchSection() {
    this.setData({
      showSearchSection: !this.data.showSearchSection,
      searchResults: []
    })
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({
      searchValue: e.detail.value
    })
  },

  // 搜索热门剧目
  async searchDramaShows() {
    const query = this.data.searchValue.trim()
    if (!query) {
      wx.showToast({
        title: '请输入搜索关键词',
        icon: 'none'
      })
      return
    }

    this.setData({
      isSearching: true
    })

    try {
      // 使用模拟数据替代已删除的云函数
      const mockShows = [
        { id: '1', title: '《哈姆雷特》', subtitle: '莎士比亚经典悲剧', year: '2024' },
        { id: '2', title: '《罗密欧与朱丽叶》', subtitle: '莎士比亚经典爱情剧', year: '2024' },
        { id: '3', title: '《麦克白》', subtitle: '莎士比亚经典悲剧', year: '2024' },
        { id: '4', title: '《李尔王》', subtitle: '莎士比亚经典悲剧', year: '2024' },
        { id: '5', title: '《奥赛罗》', subtitle: '莎士比亚经典悲剧', year: '2024' }
      ]
      
      // 简单的关键词匹配
      const filteredShows = mockShows.filter(show => 
        show.title.includes(query) || show.subtitle.includes(query)
      )

      this.setData({
        searchResults: filteredShows
      })
      
      if (filteredShows.length === 0) {
        wx.showToast({
          title: '未找到相关剧目',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('搜索失败:', error)
      wx.showToast({
        title: '搜索失败',
        icon: 'error'
      })
    } finally {
      this.setData({
        isSearching: false
      })
    }
  },

  // 选择搜索结果
  selectSearchResult(e) {
    const show = e.currentTarget.dataset.show
    const selectedActors = show.cast || []
    const selectedActorsText = selectedActors.join('、')
    
    this.setData({
      dramaTitle: show.title,
      venue: show.venue,
      selectedActors: selectedActors,
      selectedActorsText: selectedActorsText,
      searchValue: '',
      searchResults: [],
      showSearchSection: false
    })

    // 如果搜索结果包含海报，自动添加到票根图片
    if (show.poster && show.poster !== '/images/modu.png') {
      this.setData({
        ticketImages: [show.poster, ...this.data.ticketImages]
      })
    }

    wx.showToast({
      title: '已自动填充剧目信息',
      icon: 'success'
    })
  },

  // 清除搜索
  clearSearch() {
    this.setData({
      searchValue: '',
      searchResults: []
    })
  },

  // 日期选择
  onDateChange(e) {
    this.setData({
      watchDate: e.detail.value
    })
  },

  // 时间选择
  onTimeChange(e) {
    this.setData({
      watchTime: e.detail.value
    })
  },

  // 观演地点输入
  onVenueInput(e) {
    this.setData({
      venue: e.detail.value
    })
  },

  // 场地选择
  onStageChange(e) {
    const index = e.detail.value
    const stage = this.data.stageList[index]
    this.setData({
      stageIndex: index,
      stage: stage.name
    })
  },

  // 座位区域输入
  onSeatAreaInput(e) {
    this.setData({
      seatArea: e.detail.value
    })
  },

  // 座位排数输入
  onSeatRowInput(e) {
    this.setData({
      seatRow: e.detail.value
    })
  },

  // 座位号输入
  onSeatNumberInput(e) {
    this.setData({
      seatNumber: e.detail.value
    })
  },

  // 票价输入
  onTicketPriceInput(e) {
    this.setData({
      ticketPrice: e.detail.value
    })
  },

  // 演员输入
  onActorsInput(e) {
    const inputText = e.detail.value
    // 将输入的文本按逗号分割，去除空格，过滤空字符串
    const actors = inputText.split(',').map(actor => actor.trim()).filter(actor => actor.length > 0)
    
    this.setData({
      selectedActorsText: inputText,
      selectedActors: actors
    })
  },

  // 购买渠道选择
  onChannelChange(e) {
    const index = e.detail.value
    const channel = this.data.channelList[index]
    this.setData({
      channelIndex: index,
      purchaseChannel: channel.name
    })
  },

  // 票根图片选择
  chooseTicketImage() {
    wx.chooseImage({
      count: 9 - this.data.ticketImages.length,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.uploadTicketImages(res.tempFilePaths)
      }
    })
  },

  // 上传票根图片
  async uploadTicketImages(filePaths) {
    try {
      wx.showLoading({ title: '上传中...' })
      
      const uploadPromises = filePaths.map(filePath => {
        return wx.cloud.uploadFile({
          cloudPath: `tickets/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`,
          filePath: filePath
        })
      })
      
      const results = await Promise.all(uploadPromises)
      const newImages = results.map(result => result.fileID)
      
      this.setData({
        ticketImages: [...this.data.ticketImages, ...newImages]
      })
      
      wx.showToast({
        title: '上传成功',
        icon: 'success'
      })
    } catch (error) {
      console.error('上传票根图片失败:', error)
      wx.showToast({
        title: '上传失败',
        icon: 'error'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 删除票根图片
  deleteTicketImage(e) {
    const index = e.currentTarget.dataset.index
    const ticketImages = [...this.data.ticketImages]
    ticketImages.splice(index, 1)
    this.setData({
      ticketImages: ticketImages
    })
  },

  // 预览票根图片
  previewTicketImage(e) {
    const url = e.currentTarget.dataset.url
    this.setData({
      showImagePreview: true,
      previewImageUrl: url
    })
  },

  // 日历选择
  onCalendarChange(e) {
    const index = e.detail.value
    const calendar = this.data.calendarList[index]
    this.setData({
      calendarIndex: index,
      selectedCalendar: calendar.name
    })
  },

  // 显示设置选择
  onDisplayChange(e) {
    const index = e.detail.value
    const setting = this.data.displayOptions[index]
    this.setData({
      displayIndex: index,
      displaySetting: setting
    })
  },

  // 待定行程选择
  onPendingChange(e) {
    this.setData({
      isPending: e.detail.value.includes('pending')
    })
  },

  // 备注输入
  onRemarksInput(e) {
    this.setData({
      remarks: e.detail.value
    })
  },

  // 隐藏图片预览
  hideImagePreview() {
    this.setData({
      showImagePreview: false,
      previewImageUrl: ''
    })
  },

  // 保存记录
  async saveNote() {
    // 验证必填字段
    if (!this.data.dramaTitle) {
      wx.showToast({
        title: '请选择剧目名称',
        icon: 'none'
      })
      return
    }
    
    if (!this.data.watchDate) {
      wx.showToast({
        title: '请选择日期',
        icon: 'none'
      })
      return
    }
    
    if (!this.data.watchTime) {
      wx.showToast({
        title: '请选择时间',
        icon: 'none'
      })
      return
    }

    try {
      wx.showLoading({ title: '保存中...' })
      
      const recordData = {
        dramaTitle: this.data.dramaTitle,
        watchDate: this.data.watchDate,
        watchTime: this.data.watchTime,
        venue: this.data.venue,
        stage: this.data.stage,
        seatArea: this.data.seatArea,
        seatRow: this.data.seatRow,
        seatNumber: this.data.seatNumber,
        ticketPrice: this.data.ticketPrice,
        selectedActors: this.data.selectedActors,
        purchaseChannel: this.data.purchaseChannel,
        ticketImages: this.data.ticketImages,
        selectedCalendar: this.data.selectedCalendar,
        displaySetting: this.data.displaySetting,
        isPending: this.data.isPending,
        remarks: this.data.remarks
      }

      const res = await wx.cloud.callFunction({
        name: 'saveRecord',
        data: { 
          recordData, 
          mode: this.data.mode 
        }
      })

      if (res.result.code === 0) {
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        })

        // 返回上一页
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        throw new Error(res.result.message)
      }

    } catch (error) {
      console.error('保存记录失败:', error)
      wx.showToast({
        title: '保存失败',
        icon: 'error'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 保存到云端（已废弃，使用云函数）
  async saveToCloud(noteData) {
    const db = wx.cloud.database()
    const result = await db.collection('notes').add({
      data: noteData
    })
    return result
  },

  // 更新到云端（已废弃，使用云函数）
  async updateToCloud(noteData) {
    const db = wx.cloud.database()
    const { _id, ...updateData } = noteData
    const result = await db.collection('notes').doc(_id).update({
      data: updateData
    })
    return result
  },

  // 进入编辑模式
  enterEditMode() {
    this.setData({
      mode: 'edit',
      pageTitle: '编辑记录'
    })
  },

  // 分享记录
  async shareNote() {
    try {
      await wx.showShareMenu({
        withShareTicket: true,
        menus: ['shareAppMessage', 'shareTimeline']
      })
    } catch (error) {
      console.error('分享失败:', error)
    }
  },

  // 查看会员详情
  viewMemberDetails() {
    wx.showModal({
      title: '会员功能',
      content: '开通会员可享受高级备注功能，支持更长的文字记录和更多自定义选项。',
      confirmText: '立即开通',
      cancelText: '稍后再说',
      success: (res) => {
        if (res.confirm) {
          // 跳转到会员页面
          wx.navigateTo({
            url: '/pages/mall/mall'
          })
        }
      }
    })
  },

  // 分享给朋友
  onShareAppMessage() {
    return {
      title: `我在${this.data.venue}观看了《${this.data.dramaTitle}》`,
      path: `/pages/note/note?mode=view&id=${this.data.noteId}`,
      imageUrl: this.data.ticketImages[0] || '/images/modu.png'
    }
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: `我在${this.data.venue}观看了《${this.data.dramaTitle}》`,
      query: `mode=view&id=${this.data.noteId}`,
      imageUrl: this.data.ticketImages[0] || '/images/modu.png'
    }
  }
}) 