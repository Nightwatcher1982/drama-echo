// 修复销售数据关联关系
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const { action } = event
    
    if (action === 'analyzeData') {
      // 分析数据关联情况
      const voicePacksResult = await db.collection('voicePacks').get()
      const purchaseResult = await db.collection('user_purchases').get()
      
      const packIds = voicePacksResult.data.map(pack => pack._id)
      const purchasePackIds = purchaseResult.data.map(p => p.packId).filter(Boolean)
      
      const matchingIds = packIds.filter(packId => purchasePackIds.includes(packId))
      const unmatchedPurchases = purchasePackIds.filter(purchaseId => !packIds.includes(purchaseId))
      
      // 分析未匹配的购买记录
      const unmatchedPurchasesData = purchaseResult.data.filter(p => 
        !packIds.includes(p.packId)
      ).slice(0, 10) // 只取前10个作为样本
      
      return {
        code: 0,
        data: {
          totalVoicePacks: voicePacksResult.data.length,
          totalPurchases: purchaseResult.data.length,
          matchingIds: matchingIds,
          unmatchedPurchases: unmatchedPurchases.slice(0, 10),
          unmatchedPurchasesData: unmatchedPurchasesData,
          matchRate: packIds.length > 0 ? Math.round((matchingIds.length / packIds.length) * 100) : 0
        },
        message: '数据分析完成'
      }
    }
    
    if (action === 'createMapping') {
      // 创建ID映射关系
      const voicePacksResult = await db.collection('voicePacks').get()
      const purchaseResult = await db.collection('user_purchases').get()
      
      // 按名称匹配语音包和购买记录
      const mappingResults = []
      
      for (const purchase of purchaseResult.data) {
        if (!purchase.packId) continue
        
        // 尝试通过名称匹配
        const matchedPack = voicePacksResult.data.find(pack => {
          // 这里需要根据实际情况调整匹配逻辑
          // 暂时使用简单的包含匹配
          return pack.name && purchase.packId.includes(pack.name.substring(0, 2))
        })
        
        if (matchedPack) {
          mappingResults.push({
            purchaseId: purchase._id,
            oldPackId: purchase.packId,
            newPackId: matchedPack._id,
            packName: matchedPack.name,
            amount: purchase.amount
          })
        }
      }
      
      return {
        code: 0,
        data: {
          mappingResults: mappingResults.slice(0, 20), // 只返回前20个
          totalMappings: mappingResults.length
        },
        message: '映射关系创建完成'
      }
    }
    
    if (action === 'updatePurchases') {
      // 更新购买记录的packId
      const { mappings } = event
      
      if (!mappings || !Array.isArray(mappings)) {
        return {
          code: -1,
          message: '缺少映射数据'
        }
      }
      
      const updateResults = []
      
      for (const mapping of mappings) {
        try {
          await db.collection('user_purchases').doc(mapping.purchaseId).update({
            data: {
              packId: mapping.newPackId,
              originalPackId: mapping.oldPackId // 保留原始ID作为备份
            }
          })
          
          updateResults.push({
            purchaseId: mapping.purchaseId,
            status: 'success',
            oldPackId: mapping.oldPackId,
            newPackId: mapping.newPackId
          })
        } catch (error) {
          updateResults.push({
            purchaseId: mapping.purchaseId,
            status: 'error',
            error: error.message
          })
        }
      }
      
      return {
        code: 0,
        data: {
          updateResults: updateResults,
          successCount: updateResults.filter(r => r.status === 'success').length,
          errorCount: updateResults.filter(r => r.status === 'error').length
        },
        message: '购买记录更新完成'
      }
    }
    
    if (action === 'cleanupData') {
      // 清理脏数据 - 只删除真正未匹配的购买记录
      const purchaseResult = await db.collection('user_purchases').get()
      const voicePacksResult = await db.collection('voicePacks').get()
      
      const packIds = voicePacksResult.data.map(pack => pack._id)
      const unmatchedPurchases = purchaseResult.data.filter(p => 
        !packIds.includes(p.packId)
      )
      
      console.log(`找到 ${unmatchedPurchases.length} 条真正未匹配的购买记录，准备清理`)
      
      const deleteResults = []
      
      for (const purchase of unmatchedPurchases) {
        try {
          await db.collection('user_purchases').doc(purchase._id).remove()
          deleteResults.push({
            purchaseId: purchase._id,
            packId: purchase.packId,
            status: 'deleted'
          })
        } catch (error) {
          deleteResults.push({
            purchaseId: purchase._id,
            packId: purchase.packId,
            status: 'error',
            error: error.message
          })
        }
      }
      
      return {
        code: 0,
        data: {
          deletedPurchases: deleteResults,
          totalDeleted: deleteResults.filter(r => r.status === 'deleted').length,
          totalErrors: deleteResults.filter(r => r.status === 'error').length,
          message: unmatchedPurchases.length === 0 ? '没有需要清理的脏数据' : `清理了 ${deleteResults.filter(r => r.status === 'deleted').length} 条脏数据`
        },
        message: '脏数据清理完成'
      }
    }
    
    if (action === 'createMissingPacks') {
      // 为有购买记录但没有对应语音包的packId创建语音包
      const purchaseResult = await db.collection('user_purchases').get()
      const voicePacksResult = await db.collection('voicePacks').get()
      
      const existingPackIds = voicePacksResult.data.map(pack => pack._id)
      const purchasePackIds = [...new Set(purchaseResult.data.map(p => p.packId).filter(Boolean))]
      
      const missingPackIds = purchasePackIds.filter(packId => !existingPackIds.includes(packId))
      
      console.log(`现有语音包ID:`, existingPackIds)
      console.log(`购买记录中的packId:`, purchasePackIds)
      console.log(`缺失的packId:`, missingPackIds)
      
      const createResults = []
      
      for (const packId of missingPackIds) {
        // 统计这个packId的购买数据
        const purchases = purchaseResult.data.filter(p => p.packId === packId)
        const totalAmount = purchases.reduce((sum, p) => sum + (p.amount || 0), 0)
        const avgAmount = totalAmount / purchases.length
        
        const newPack = {
          _id: packId,
          name: `语音包_${packId.substring(packId.length - 6)}`,
          price: Math.round(avgAmount),
          sales: purchases.length,
          actorId: 'actor_001', // 默认演员
          description: '从购买记录自动创建的语音包',
          icon: '🎵',
          isActive: true,
          createTime: new Date(),
          updateTime: new Date(),
          isAutoCreated: true
        }
        
        try {
          await db.collection('voicePacks').add({ data: newPack })
          createResults.push({
            packId: packId,
            packName: newPack.name,
            sales: purchases.length,
            price: newPack.price,
            status: 'created'
          })
        } catch (error) {
          createResults.push({
            packId: packId,
            status: 'error',
            error: error.message
          })
        }
      }
      
      return {
        code: 0,
        data: {
          createResults: createResults,
          totalCreated: createResults.filter(r => r.status === 'created').length,
          totalErrors: createResults.filter(r => r.status === 'error').length,
          debugInfo: {
            existingPackIds: existingPackIds,
            purchasePackIds: purchasePackIds,
            missingPackIds: missingPackIds
          }
        },
        message: '缺失语音包创建完成'
      }
    }
    
    if (action === 'updateVoicePackSales') {
      // 更新语音包的销量字段，使其与实际购买记录一致
      const voicePacksResult = await db.collection('voicePacks').get()
      const purchaseResult = await db.collection('user_purchases').get()
      
      // 统计每个语音包的实际购买次数
      const salesMap = new Map()
      purchaseResult.data.forEach(purchase => {
        const packId = purchase.packId
        if (packId) {
          salesMap.set(packId, (salesMap.get(packId) || 0) + 1)
        }
      })
      
      const updateResults = []
      
      for (const pack of voicePacksResult.data) {
        const actualSales = salesMap.get(pack._id) || 0
        const currentSales = pack.sales || 0
        
        if (actualSales !== currentSales) {
          try {
            await db.collection('voicePacks').doc(pack._id).update({
              data: {
                sales: actualSales,
                updateTime: new Date()
              }
            })
            
            updateResults.push({
              packId: pack._id,
              packName: pack.name,
              oldSales: currentSales,
              newSales: actualSales,
              status: 'updated'
            })
          } catch (error) {
            updateResults.push({
              packId: pack._id,
              packName: pack.name,
              status: 'error',
              error: error.message
            })
          }
        }
      }
      
      return {
        code: 0,
        data: {
          updateResults: updateResults,
          totalUpdated: updateResults.filter(r => r.status === 'updated').length,
          totalErrors: updateResults.filter(r => r.status === 'error').length
        },
        message: '语音包销量更新完成'
      }
    }
    
    return {
      code: -1,
      message: '未知操作'
    }
    
  } catch (error) {
    console.error('修复销售数据失败:', error)
    return {
      code: -1,
      message: error.message
    }
  }
}
