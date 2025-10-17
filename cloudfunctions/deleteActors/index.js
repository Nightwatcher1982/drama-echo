// 删除演员数据的云函数
const cloud = require('wx-server-sdk')

// 初始化云开发环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { action, actorId } = event
  
  try {
    console.log('开始删除演员数据，操作类型:', action, '演员ID:', actorId)
    
    if (action === 'deleteAll') {
      // 删除所有演员数据
      return await deleteAllActors()
    } else if (action === 'deleteOne') {
      // 删除指定演员
      if (!actorId) {
        return {
          code: -1,
          message: '缺少演员ID参数'
        }
      }
      return await deleteOneActor(actorId)
    } else if (action === 'checkActors') {
      // 检查当前演员数据
      return await checkActors()
    } else {
      return {
        code: -1,
        message: '未知操作类型'
      }
    }
    
  } catch (error) {
    console.error('删除演员数据失败:', error)
    return {
      code: -1,
      message: error.message || '删除失败'
    }
  }
}

// 删除所有演员数据
async function deleteAllActors() {
  const results = []
  
  try {
    // 1. 删除 actors 集合中的所有数据
    const actorsResult = await db.collection('actors').get()
    if (actorsResult.data.length > 0) {
      for (const doc of actorsResult.data) {
        await db.collection('actors').doc(doc._id).remove()
      }
      results.push(`删除了 ${actorsResult.data.length} 个演员文档`)
    }
    
    // 2. 删除 fanRanking 集合中的所有数据
    const fanRankingResult = await db.collection('fanRanking').get()
    if (fanRankingResult.data.length > 0) {
      for (const doc of fanRankingResult.data) {
        await db.collection('fanRanking').doc(doc._id).remove()
      }
      results.push(`删除了 ${fanRankingResult.data.length} 个粉丝排行榜文档`)
    }
    
    // 3. 删除 userPurchases 集合中的所有数据
    const userPurchasesResult = await db.collection('userPurchases').get()
    if (userPurchasesResult.data.length > 0) {
      for (const doc of userPurchasesResult.data) {
        await db.collection('userPurchases').doc(doc._id).remove()
      }
      results.push(`删除了 ${userPurchasesResult.data.length} 个用户购买记录文档`)
    }
    
    return {
      code: 0,
      message: '演员数据删除成功',
      data: results
    }
    
  } catch (error) {
    throw new Error('删除演员数据时出错: ' + error.message)
  }
}

// 删除指定演员
async function deleteOneActor(actorId) {
  const results = []
  
  try {
    // 1. 删除指定演员
    const actorResult = await db.collection('actors').doc(actorId).get()
    if (actorResult.data) {
      await db.collection('actors').doc(actorId).remove()
      results.push(`删除了演员: ${actorResult.data.name}`)
    } else {
      results.push(`演员 ${actorId} 不存在`)
    }
    
    // 2. 删除该演员的粉丝排行榜数据
    const fanRankingResult = await db.collection('fanRanking')
      .where({ actorId: actorId })
      .get()
    if (fanRankingResult.data.length > 0) {
      for (const doc of fanRankingResult.data) {
        await db.collection('fanRanking').doc(doc._id).remove()
      }
      results.push(`删除了 ${fanRankingResult.data.length} 个粉丝排行榜文档`)
    }
    
    // 3. 删除该演员的用户购买记录
    const userPurchasesResult = await db.collection('userPurchases')
      .where({ actorId: actorId })
      .get()
    if (userPurchasesResult.data.length > 0) {
      for (const doc of userPurchasesResult.data) {
        await db.collection('userPurchases').doc(doc._id).remove()
      }
      results.push(`删除了 ${userPurchasesResult.data.length} 个用户购买记录文档`)
    }
    
    return {
      code: 0,
      message: '指定演员删除成功',
      data: results
    }
    
  } catch (error) {
    throw new Error('删除指定演员时出错: ' + error.message)
  }
}

// 检查当前演员数据
async function checkActors() {
  try {
    const collections = ['actors', 'fanRanking', 'userPurchases']
    const results = {}
    
    for (const collection of collections) {
      try {
        const result = await db.collection(collection).count()
        results[collection] = {
          exists: true,
          count: result.total
        }
      } catch (error) {
        results[collection] = {
          exists: false,
          count: 0
        }
      }
    }
    
    // 获取演员列表
    try {
      const actorsResult = await db.collection('actors').get()
      results.actorsList = actorsResult.data.map(actor => ({
        id: actor._id,
        name: actor.name,
        title: actor.title
      }))
    } catch (error) {
      results.actorsList = []
    }
    
    return {
      code: 0,
      message: '演员数据状态检查完成',
      data: results
    }
    
  } catch (error) {
    throw new Error('检查演员数据状态时出错: ' + error.message)
  }
}
