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
    console.log('开始查询语音包，actorId:', actorId)
    const voicePacksResult = await db.collection('voicePacks')
      .where({
        actorId: actorId,
        isActive: true
      })
      .orderBy('isHot', 'desc')
      .orderBy('sales', 'desc')
      .get()
    
    console.log('✅ 语音包查询结果:', voicePacksResult.data.length, '个语音包')
    if (voicePacksResult.data.length > 0) {
      console.log('语音包列表:', voicePacksResult.data.map(p => ({ id: p._id, name: p.name, actorId: p.actorId })))
    }
    
    // 3. 获取粉丝排行榜（前3名）
    const rankingResult = await db.collection('fanRanking')
      .where({
        actorId: actorId
      })
      .orderBy('rank', 'asc')
      .limit(3)
      .get()
    
    // 4. 检查当前用户是否购买过该演员的语音包
    // 先尝试从新集合查询
    let userPurchasesResult = await db.collection('user_purchases')
      .where({
        _openid: OPENID,
        status: 'completed' // 只获取已完成的购买记录
      })
      .get()
    
    console.log('新集合用户购买记录:', userPurchasesResult.data.length, '条')
    
    // 如果新集合没有数据，从旧集合查询
    if (userPurchasesResult.data.length === 0) {
      console.log('新集合无数据，从旧集合查询')
      userPurchasesResult = await db.collection('userPurchases')
        .where({
          _openid: OPENID,
          actorId: actorId
        })
        .get()
      console.log('旧集合用户购买记录:', userPurchasesResult.data.length, '条')
    }
    
    // 根据集合类型提取语音包ID
    const userPurchasedPacks = userPurchasesResult.data.map(p => {
      // 新集合使用 packId，旧集合使用 voicePackId
      return p.packId || p.voicePackId
    }).filter(id => id) // 过滤掉空值
    
    // 处理语音包数据，标记用户已购买的包，并返回文件列表（只返回必要字段）
    const processedVoicePacks = voicePacksResult.data.map(pack => {
      console.log(`📦 处理语音包: ${pack.name}`, {
        id: pack._id,
        sales: pack.sales,
        salesType: typeof pack.sales,
        isPurchased: userPurchasedPacks.includes(pack._id)
      })
      
      return {
        _id: pack._id,
        actorId: pack.actorId, // 添加 actorId 字段
        name: pack.name,
        icon: pack.icon,
        price: pack.price,
        description: pack.description,
        isHot: pack.isHot,
        sales: pack.sales || 0, // 确保销量不为undefined
        isPurchased: userPurchasedPacks.includes(pack._id),
        voiceFiles: (pack.voiceFiles || []).map(f => ({ id: f.id, name: f.name, fileId: f.fileId, duration: f.duration || 0, size: f.size || 0 })),
        // 添加调试信息
        debugInfo: {
          hasVoiceFiles: !!pack.voiceFiles,
          voiceFilesCount: pack.voiceFiles ? pack.voiceFiles.length : 0,
          voiceFilesList: pack.voiceFiles ? pack.voiceFiles.map(f => ({ name: f.name, fileId: f.fileId })) : [],
          originalSales: pack.sales,
          processedSales: pack.sales || 0
        }
      }
    })
    
    // 计算演员专属页面的封面图片URL
    // 优先使用图片库的第一张照片，如果没有则使用封面照片
    const actor = actorResult.data
    let coverImageUrl = null
    
    if (actor.images && actor.images.length > 0) {
      // 使用图片库的第一张照片作为专属页面封面
      coverImageUrl = actor.images[0]
      console.log('使用图片库第一张照片作为封面:', coverImageUrl)
    } else if (actor.imageUrl) {
      // 如果没有图片库，使用封面照片作为fallback
      coverImageUrl = actor.imageUrl
      console.log('使用封面照片作为fallback:', coverImageUrl)
    } else {
      console.log('演员没有图片库和封面照片，将显示占位符')
    }
    
    // 将计算出的封面图片URL添加到演员数据中
    const actorWithCoverImage = {
      ...actor,
      coverImageUrl: coverImageUrl
    }
    
    console.log('演员详情获取成功')
    console.log('封面照片(imageUrl):', actor.imageUrl)
    console.log('图片库(images):', actor.images)
    console.log('专属页面封面图片(coverImageUrl):', coverImageUrl)
    
    return {
      code: 0,
      data: {
        actor: actorWithCoverImage,
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