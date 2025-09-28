// 获取演员详情和相关数据云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloud1-2gyb3dkq4c474fe4'
})

const db = cloud.database()

// 删除自动初始化逻辑 - 不再自动创建示例数据

// 删除示例数据初始化函数

// 删除语音包示例数据初始化函数

// 删除粉丝排行榜示例数据初始化函数

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { actorId } = event
  
  try {
    console.log('获取演员详情，演员ID:', actorId, '用户:', OPENID)
    
    if (!actorId) {
      return {
        code: -1,
        message: '演员ID不能为空'
      }
    }
    
    // 不再自动初始化数据，直接查询现有数据
    
    // 1. 获取演员基本信息
    const actorResult = await db.collection('actors')
      .doc(actorId)
      .get()
    
    if (!actorResult.data) {
      return {
        code: -1,
        message: '演员不存在'
      }
    }
    
    // 2. 获取该演员的所有语音包（携带语音文件）
    // 优先从新集合 voice_packs 中获取数据
    console.log('开始查询新集合 voice_packs，actorId:', actorId)
    let voicePacksResult = await db.collection('voice_packs')
      .where({
        actorId: actorId,
        isActive: true
      })
      .orderBy('isHot', 'desc')
      .orderBy('sales', 'desc')
      .get()
    
    console.log('新集合查询结果:', voicePacksResult.data.length, '个语音包')
    if (voicePacksResult.data.length > 0) {
      console.log('新集合中的语音包:', voicePacksResult.data.map(p => ({ id: p._id, name: p.name, actorId: p.actorId })))
    }
    
    // 如果新集合中没有数据，从旧集合中获取
    if (voicePacksResult.data.length === 0) {
      console.log('新集合中无数据，从旧集合获取')
      voicePacksResult = await db.collection('voicePacks')
        .where({
          actorId: actorId,
          isActive: true
        })
        .orderBy('isHot', 'desc')
        .orderBy('sales', 'desc')
        .get()
      console.log('旧集合查询结果:', voicePacksResult.data.length, '个语音包')
    } else {
      console.log('✅ 使用新集合数据，共', voicePacksResult.data.length, '个语音包')
    }
    
    // 3. 获取粉丝排行榜（前5名）
    const rankingResult = await db.collection('fanRanking')
      .where({
        actorId: actorId
      })
      .orderBy('purchaseCount', 'desc')
      .orderBy('totalSpent', 'desc')
      .limit(5)
      .get()
    
    // 4. 检查当前用户是否购买过该演员的语音包
    const userPurchasesResult = await db.collection('userPurchases')
      .where({
        _openid: OPENID,
        actorId: actorId
      })
      .get()
    
    const userPurchasedPacks = userPurchasesResult.data.map(p => p.voicePackId)
    
    // 处理语音包数据，标记用户已购买的包，并返回文件列表（只返回必要字段）
    const processedVoicePacks = voicePacksResult.data.map(pack => ({
      _id: pack._id,
      actorId: pack.actorId, // 添加 actorId 字段
      name: pack.name,
      icon: pack.icon,
      price: pack.price,
      description: pack.description,
      isHot: pack.isHot,
      sales: pack.sales,
      isPurchased: userPurchasedPacks.includes(pack._id),
      voiceFiles: (pack.voiceFiles || []).map(f => ({ id: f.id, name: f.name, fileId: f.fileId, duration: f.duration || 0, size: f.size || 0 })),
      // 添加调试信息
      debugInfo: {
        hasVoiceFiles: !!pack.voiceFiles,
        voiceFilesCount: pack.voiceFiles ? pack.voiceFiles.length : 0,
        voiceFilesList: pack.voiceFiles ? pack.voiceFiles.map(f => ({ name: f.name, fileId: f.fileId })) : []
      }
    }))
    
    console.log('演员详情获取成功')
    
    return {
      code: 0,
      data: {
        actor: actorResult.data,
        voicePacks: processedVoicePacks,
        fanRanking: rankingResult.data,
        userPurchasedCount: userPurchasedPacks.length
      },
      message: '获取成功'
    }
    
  } catch (error) {
    console.error('getActorDetail error:', error)
    return {
      code: -1,
      message: error.message || '获取演员详情失败'
    }
  }
}