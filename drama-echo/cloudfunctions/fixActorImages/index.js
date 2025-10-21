// 修复演员图片数据云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    console.log('🔧 开始修复演员图片数据...')
    
    // 获取所有演员数据
    const actorsResult = await db.collection('actors').get()
    console.log('演员数量:', actorsResult.data.length)
    
    const fixResults = []
    
    for (const actor of actorsResult.data) {
      const fixResult = {
        actorId: actor._id,
        actorName: actor.name,
        before: {
          imageUrl: actor.imageUrl,
          images: actor.images,
          imagesCount: actor.images ? actor.images.length : 0
        },
        after: {
          imageUrl: actor.imageUrl,
          images: actor.images,
          imagesCount: actor.images ? actor.images.length : 0
        },
        fixed: false,
        action: 'no_change'
      }
      
      // 检查是否需要修复
      if (actor.imageUrl && actor.images && actor.images.length > 0) {
        // 如果封面照片和详情页图片相同，清空详情页图片
        if (actor.images.includes(actor.imageUrl)) {
          const newImages = actor.images.filter(img => img !== actor.imageUrl)
          
          try {
            await db.collection('actors').doc(actor._id).update({
              data: {
                images: newImages
              }
            })
            
            fixResult.after.images = newImages
            fixResult.after.imagesCount = newImages.length
            fixResult.fixed = true
            fixResult.action = 'removed_duplicate_from_gallery'
            
            console.log(`✅ 修复演员 ${actor.name}: 从图片库中移除重复的封面照片`)
          } catch (error) {
            console.error(`❌ 修复演员 ${actor.name} 失败:`, error)
            fixResult.action = 'error'
            fixResult.error = error.message
          }
        }
      }
      
      fixResults.push(fixResult)
    }
    
    // 统计修复结果
    const stats = {
      total: fixResults.length,
      fixed: fixResults.filter(r => r.fixed).length,
      errors: fixResults.filter(r => r.action === 'error').length,
      noChange: fixResults.filter(r => r.action === 'no_change').length
    }
    
    return {
      code: 0,
      data: {
        stats,
        fixResults,
        sampleResults: fixResults.slice(0, 3) // 返回前3个修复结果
      },
      message: '演员图片数据修复完成'
    }
    
  } catch (error) {
    console.error('❌ 修复演员图片数据失败:', error)
    return {
      code: -1,
      message: error.message || '修复失败'
    }
  }
}
