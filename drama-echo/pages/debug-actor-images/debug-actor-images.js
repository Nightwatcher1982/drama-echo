// 调试演员图片数据页面
Page({
  data: {
    debugInfo: null,
    loading: false
  },

  onLoad() {
    console.log('🔍 调试演员图片数据页面加载')
  },

  // 调试演员图片数据
  async debugActorImages() {
    try {
      this.setData({ loading: true })
      console.log('🔍 开始调试演员图片数据...')

      // 先尝试调用云函数
      try {
        const res = await wx.cloud.callFunction({
          name: 'debugActorImages'
        })

        if (res.result.code === 0) {
          this.setData({
            debugInfo: res.result.data
          })
          
          console.log('✅ 调试数据获取成功:', res.result.data)
          
          const { issues, totalActors } = res.result.data
          
          wx.showModal({
            title: '演员图片数据调试结果',
            content: `总演员数: ${totalActors}\n\n问题统计:\n• 既无封面照片也无图片库: ${issues.noImages}个\n• 无封面照片但有图片库: ${issues.noCoverButHasGallery}个\n• 封面照片和图片库都存在: ${issues.hasBoth}个\n\n详细信息请查看控制台`,
            showCancel: false
          })
          return
        }
      } catch (cloudError) {
        console.log('云函数调用失败，使用备用方案:', cloudError)
      }

      // 备用方案：直接调用getActors云函数进行分析
      const res = await wx.cloud.callFunction({
        name: 'getActors'
      })

      if (res.result.code === 0) {
        const actorsData = res.result.data
        console.log('✅ 获取演员数据成功:', actorsData.length, '个演员')
        
        // 分析演员图片数据
        const analysis = this.analyzeActorImages(actorsData)
        
        this.setData({
          debugInfo: analysis
        })
        
        wx.showModal({
          title: '演员图片数据调试结果（备用方案）',
          content: `总演员数: ${analysis.totalActors}\n\n问题统计:\n• 既无封面照片也无图片库: ${analysis.issues.noImages}个\n• 无封面照片但有图片库: ${analysis.issues.noCoverButHasGallery}个\n• 封面照片和图片库都存在: ${analysis.issues.hasBoth}个\n\n详细信息请查看控制台`,
          showCancel: false
        })
      } else {
        throw new Error(res.result.message || '获取演员数据失败')
      }
    } catch (error) {
      console.error('❌ 调试演员图片数据失败:', error)
      wx.showToast({
        title: error.message || '调试失败',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 分析演员图片数据（备用方案）
  analyzeActorImages(actorsData) {
    const actorImageAnalysis = actorsData.map(actor => {
      const analysis = {
        actorId: actor._id,
        actorName: actor.name,
        imageUrl: actor.imageUrl, // 封面照片
        images: actor.images, // 图片库
        imagesCount: actor.images ? actor.images.length : 0,
        hasImageUrl: !!actor.imageUrl,
        hasImages: !!(actor.images && actor.images.length > 0),
        issues: []
      }
      
      // 检查潜在问题
      if (!analysis.hasImageUrl && !analysis.hasImages) {
        analysis.issues.push('既无封面照片也无图片库')
      } else if (!analysis.hasImageUrl && analysis.hasImages) {
        analysis.issues.push('无封面照片，但有图片库')
      } else if (analysis.hasImageUrl && analysis.hasImages) {
        analysis.issues.push('封面照片和图片库都存在')
      }
      
      return analysis
    })
    
    // 统计问题
    const issues = {
      noImages: actorImageAnalysis.filter(a => a.issues.includes('既无封面照片也无图片库')).length,
      noCoverButHasGallery: actorImageAnalysis.filter(a => a.issues.includes('无封面照片，但有图片库')).length,
      hasBoth: actorImageAnalysis.filter(a => a.issues.includes('封面照片和图片库都存在')).length
    }
    
    return {
      totalActors: actorsData.length,
      issues,
      actorImageAnalysis,
      sampleActors: actorImageAnalysis.slice(0, 3) // 返回前3个演员的详细信息
    }
  }
})
