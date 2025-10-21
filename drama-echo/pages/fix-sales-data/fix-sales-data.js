// 修复销售数据页面
Page({
  data: {
    analysisResult: null,
    mappingResult: null,
    updateResult: null,
    loading: false,
    currentStep: 1
  },

  onLoad() {
    console.log('修复销售数据页面加载')
  },

  // 步骤1：分析数据
  async analyzeData() {
    try {
      this.setData({ loading: true, currentStep: 1 })
      
      const res = await wx.cloud.callFunction({
        name: 'fixSalesData',
        data: {
          action: 'analyzeData'
        }
      })
      
      if (res.result.code === 0) {
        this.setData({
          analysisResult: res.result.data,
          loading: false
        })
        console.log('数据分析结果:', res.result.data)
        
        wx.showModal({
          title: '数据分析完成',
          content: `匹配率：${res.result.data.matchRate}%\n未匹配购买记录：${res.result.data.unmatchedPurchases.length}个`,
          showCancel: false
        })
      } else {
        throw new Error(res.result.message)
      }
    } catch (error) {
      console.error('分析数据失败:', error)
      wx.showToast({
        title: '分析失败',
        icon: 'none'
      })
      this.setData({ loading: false })
    }
  },

  // 步骤2：创建映射关系
  async createMapping() {
    try {
      this.setData({ loading: true, currentStep: 2 })
      
      const res = await wx.cloud.callFunction({
        name: 'fixSalesData',
        data: {
          action: 'createMapping'
        }
      })
      
      if (res.result.code === 0) {
        this.setData({
          mappingResult: res.result.data,
          loading: false
        })
        console.log('映射关系结果:', res.result.data)
        
        wx.showModal({
          title: '映射关系创建完成',
          content: `找到 ${res.result.data.totalMappings} 个可能的映射关系`,
          showCancel: false
        })
      } else {
        throw new Error(res.result.message)
      }
    } catch (error) {
      console.error('创建映射关系失败:', error)
      wx.showToast({
        title: '创建失败',
        icon: 'none'
      })
      this.setData({ loading: false })
    }
  },

  // 步骤3：清理脏数据
  async cleanupData() {
    try {
      this.setData({ loading: true, currentStep: 3 })
      
      const res = await wx.cloud.callFunction({
        name: 'fixSalesData',
        data: {
          action: 'cleanupData'
        }
      })
      
      if (res.result.code === 0) {
        this.setData({
          updateResult: res.result.data,
          loading: false
        })
        console.log('脏数据清理结果:', res.result.data)
        
        wx.showModal({
          title: '脏数据清理完成',
          content: `成功删除 ${res.result.data.totalDeleted} 条脏数据`,
          showCancel: false
        })
      } else {
        throw new Error(res.result.message)
      }
    } catch (error) {
      console.error('清理脏数据失败:', error)
      wx.showToast({
        title: '清理失败',
        icon: 'none'
      })
      this.setData({ loading: false })
    }
  },

  // 步骤4：创建缺失的语音包
  async createMissingPacks() {
    try {
      this.setData({ loading: true, currentStep: 4 })
      
      const res = await wx.cloud.callFunction({
        name: 'fixSalesData',
        data: {
          action: 'createMissingPacks'
        }
      })
      
      if (res.result.code === 0) {
        this.setData({
          updateResult: res.result.data,
          loading: false
        })
        console.log('缺失语音包创建结果:', res.result.data)
        
        if (res.result.data.debugInfo) {
          console.log('调试信息:', res.result.data.debugInfo)
        }
        
        wx.showModal({
          title: '缺失语音包创建完成',
          content: `成功创建 ${res.result.data.totalCreated} 个语音包\n\n调试信息已输出到控制台`,
          showCancel: false
        })
      } else {
        throw new Error(res.result.message)
      }
    } catch (error) {
      console.error('创建缺失语音包失败:', error)
      wx.showToast({
        title: '创建失败',
        icon: 'none'
      })
      this.setData({ loading: false })
    }
  },

  // 步骤5：更新语音包销量
  async updateVoicePackSales() {
    try {
      this.setData({ loading: true, currentStep: 5 })
      
      const res = await wx.cloud.callFunction({
        name: 'fixSalesData',
        data: {
          action: 'updateVoicePackSales'
        }
      })
      
      if (res.result.code === 0) {
        this.setData({
          updateResult: res.result.data,
          loading: false
        })
        console.log('语音包销量更新结果:', res.result.data)
        
        wx.showModal({
          title: '销量更新完成',
          content: `成功更新 ${res.result.data.totalUpdated} 个语音包的销量`,
          showCancel: false
        })
      } else {
        throw new Error(res.result.message)
      }
    } catch (error) {
      console.error('更新语音包销量失败:', error)
      wx.showToast({
        title: '更新失败',
        icon: 'none'
      })
      this.setData({ loading: false })
    }
  },

  // 复制结果
  copyResult() {
    const result = this.data.analysisResult || this.data.mappingResult || this.data.updateResult
    if (result) {
      wx.setClipboardData({
        data: JSON.stringify(result, null, 2),
        success: () => {
          wx.showToast({
            title: '已复制到剪贴板',
            icon: 'success'
          })
        }
      })
    }
  },

  // 重置数据
  resetData() {
    this.setData({
      analysisResult: null,
      mappingResult: null,
      updateResult: null,
      currentStep: 1
    })
  }
})
