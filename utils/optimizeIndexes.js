/**
 * 数据库索引优化工具函数
 * 可以在任何页面中调用此函数来优化数据库索引
 */

// 优化数据库索引
export async function optimizeDatabaseIndexes() {
  try {
    wx.showLoading({
      title: '优化中...',
      mask: true
    })

    const result = await wx.cloud.callFunction({
      name: 'optimizeDatabaseIndexes',
      data: {}
    })

    wx.hideLoading()

    if (result.result.code === 0) {
      const data = result.result.data
      console.log('索引优化成功:', data)
      
      // 显示成功消息
      wx.showModal({
        title: '优化成功',
        content: `数据库索引优化完成！\n\n创建索引数量: ${data.totalIndexes}\n\n查询性能将显著提升。`,
        showCancel: false,
        confirmText: '知道了'
      })

      return {
        success: true,
        data: data
      }
    } else {
      throw new Error(result.result.message || '优化失败')
    }
  } catch (error) {
    wx.hideLoading()
    console.error('索引优化失败:', error)
    
    wx.showModal({
      title: '优化失败',
      content: `索引优化失败: ${error.message}\n\n请检查网络连接或稍后重试。`,
      showCancel: false,
      confirmText: '知道了'
    })

    return {
      success: false,
      error: error.message
    }
  }
}

// 检查是否需要优化索引
export async function checkIndexOptimization() {
  try {
    // 这里可以添加检查逻辑，比如检查某些查询的性能
    // 暂时返回 true，表示建议进行优化
    return {
      needOptimization: true,
      reason: '建议进行数据库索引优化以提升查询性能'
    }
  } catch (error) {
    console.error('检查索引优化状态失败:', error)
    return {
      needOptimization: false,
      error: error.message
    }
  }
}



