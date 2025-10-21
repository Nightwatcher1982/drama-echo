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
      let needsFix = false
      let fixAction = ''
      
      // 检查1：如果封面照片是detail_开头的，说明封面照片被错误设置
      if (actor.imageUrl && actor.imageUrl.includes('/detail_')) {
        needsFix = true
        fixAction = 'cover_is_detail_image'
      }
      
      // 检查2：如果封面照片和详情页图片相同，清空详情页图片
      if (actor.imageUrl && actor.images && actor.images.length > 0 && actor.images.includes(actor.imageUrl)) {
        needsFix = true
        fixAction = 'duplicate_images'
      }
      
      if (needsFix) {
        try {
          let updateData = {}
          
          if (fixAction === 'cover_is_detail_image') {
            // 如果封面照片是详情页图片，将详情页图片的第一张设为封面照片，清空详情页图片
            if (actor.images && actor.images.length > 0) {
              updateData.imageUrl = actor.images[0]
              updateData.images = []
              fixResult.action = 'fixed_cover_from_gallery'
            } else {
              // 如果没有详情页图片，清空封面照片
              updateData.imageUrl = ''
              fixResult.action = 'cleared_invalid_cover'
            }
          } else if (fixAction === 'duplicate_images') {
            // 清空重复的详情页图片
            const newImages = actor.images.filter(img => img !== actor.imageUrl)
            updateData.images = newImages
            fixResult.action = 'removed_duplicate_from_gallery'
          }
          
          if (Object.keys(updateData).length > 0) {
            await db.collection('actors').doc(actor._id).update({
              data: updateData
            })
            
            // 更新修复结果
            if (updateData.imageUrl !== undefined) {
              fixResult.after.imageUrl = updateData.imageUrl
            }
            if (updateData.images !== undefined) {
              fixResult.after.images = updateData.images
              fixResult.after.imagesCount = updateData.images.length
            }
            
            fixResult.fixed = true
            
            console.log(`✅ 修复演员 ${actor.name}: ${fixResult.action}`)
          }
        } catch (error) {
          console.error(`❌ 修复演员 ${actor.name} 失败:`, error)
          fixResult.action = 'error'
          fixResult.error = error.message
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
