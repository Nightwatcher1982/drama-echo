// 调试演员图片数据云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    console.log('🔍 开始调试演员图片数据...')
    
    // 获取所有演员数据
    const actorsResult = await db.collection('actors').get()
    console.log('演员数量:', actorsResult.data.length)
    
    // 分析每个演员的图片数据
    const actorImageAnalysis = actorsResult.data.map(actor => {
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
      code: 0,
      data: {
        totalActors: actorsResult.data.length,
        issues,
        actorImageAnalysis,
        sampleActors: actorImageAnalysis.slice(0, 3) // 返回前3个演员的详细信息
      },
      message: '演员图片数据调试完成'
    }
    
  } catch (error) {
    console.error('❌ 调试演员图片数据失败:', error)
    return {
      code: -1,
      message: error.message || '调试失败'
    }
  }
}
