const app = getApp()

Page({
  data: {
    analysisData: null,
    clearResults: null,
    loading: false,
    confirmCode: '',
    showConfirmModal: false,
    selectedAction: '',
    actionDesc: ''
  },

  onLoad() {
    console.log('🧹 数据清理页面加载')
    this.analyzeData()
  },

  // 分析数据
  async analyzeData() {
    try {
      this.setData({ loading: true })
      
      const result = await wx.cloud.callFunction({
        name: 'clearAllData',
        data: { action: 'analyze' }
      })
      
      if (result.result.code === 0) {
        this.setData({ analysisData: result.result.data })
        console.log('📊 数据分析完成:', result.result.data)
      } else {
        wx.showToast({
          title: result.result.message || '分析失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('❌ 数据分析失败:', error)
      wx.showToast({
        title: '分析失败: ' + error.message,
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 显示确认弹窗
  showConfirmModal(e) {
    const action = e.currentTarget.dataset.action
    const actionMap = {
      'clear': { desc: '清理所有数据', warning: '这将删除所有演员、语音包、购买记录、许愿数据等，此操作不可恢复！' },
      'clearActors': { desc: '清理演员数据', warning: '这将删除所有演员信息，此操作不可恢复！' },
      'clearVoicePacks': { desc: '清理语音包数据', warning: '这将删除所有语音包信息，此操作不可恢复！' },
      'clearPurchases': { desc: '清理购买记录', warning: '这将删除所有用户购买记录，此操作不可恢复！' },
      'clearWishes': { desc: '清理许愿数据', warning: '这将删除所有许愿记录和点赞数据，此操作不可恢复！' },
      'clearUsers': { desc: '清理用户数据', warning: '这将删除所有用户数据，此操作不可恢复！' }
    }
    
    const actionInfo = actionMap[action]
    if (!actionInfo) {
      wx.showToast({ title: '未知操作', icon: 'none' })
      return
    }
    
    this.setData({
      selectedAction: action,
      actionDesc: actionInfo.desc,
      showConfirmModal: true,
      confirmCode: ''
    })
    
    wx.showModal({
      title: '⚠️ 危险操作确认',
      content: `${actionInfo.desc}\n\n${actionInfo.warning}\n\n请输入确认码: CLEAR_ALL_DATA_2024`,
      showCancel: true,
      cancelText: '取消',
      confirmText: '继续',
      success: (res) => {
        if (res.confirm) {
          // 用户确认，显示输入框
        } else {
          this.setData({ showConfirmModal: false })
        }
      }
    })
  },

  // 输入确认码
  onConfirmCodeInput(e) {
    this.setData({ confirmCode: e.detail.value })
  },

  // 执行清理操作
  async executeClear() {
    const { selectedAction, confirmCode } = this.data
    
    if (!confirmCode) {
      wx.showToast({ title: '请输入确认码', icon: 'none' })
      return
    }
    
    if (confirmCode !== 'CLEAR_ALL_DATA_2024') {
      wx.showToast({ title: '确认码错误', icon: 'none' })
      return
    }
    
    try {
      this.setData({ loading: true, showConfirmModal: false })
      
      const result = await wx.cloud.callFunction({
        name: 'clearAllData',
        data: { 
          action: selectedAction,
          confirmCode: confirmCode
        }
      })
      
      if (result.result.code === 0) {
        this.setData({ clearResults: result.result.data })
        
        wx.showModal({
          title: '✅ 清理完成',
          content: this.getClearResultMessage(result.result.data),
          showCancel: false,
          confirmText: '确定'
        })
        
        // 重新分析数据
        this.analyzeData()
      } else {
        wx.showToast({
          title: result.result.message || '清理失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('❌ 数据清理失败:', error)
      wx.showToast({
        title: '清理失败: ' + error.message,
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 获取清理结果消息
  getClearResultMessage(data) {
    if (typeof data === 'object' && data !== null) {
      const results = Object.entries(data)
        .filter(([key, value]) => value.success !== false)
        .map(([key, value]) => `${value.desc || key}: ${value.deleted || 0} 条`)
        .join('\n')
      
      return results || '清理完成'
    }
    return '清理完成'
  },

  // 取消操作
  cancelClear() {
    this.setData({ 
      showConfirmModal: false,
      confirmCode: '',
      selectedAction: ''
    })
  },

  // 刷新数据
  refreshData() {
    this.analyzeData()
  }
})



