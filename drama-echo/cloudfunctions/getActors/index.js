// 获取演员列表云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloud1-2gyb3dkq4c474fe4'
})

const db = cloud.database()
const _ = db.command

// 确保数据库集合存在并有数据
async function ensureCollectionsExist() {
  try {
    // 检查 actors 集合是否存在且有数据
    const actorsCount = await db.collection('actors').count()
    
    if (actorsCount.total === 0) {
      console.log('actors 集合为空，开始初始化示例数据...')
      await initSampleData()
    }
    
    console.log('数据库集合检查完成，演员数量:', actorsCount.total)
  } catch (error) {
    console.error('初始化数据库集合失败:', error)
    // 不抛出错误，继续执行主逻辑
  }
}

// 初始化示例数据
async function initSampleData() {
  try {
    // 初始化演员数据
    const actors = [
      {
        _id: 'actor_001',
        name: '李雨萱',
        bio: '古典戏剧表演艺术家，专攻昆曲与京剧，嗓音清亮，表演细腻动人',
        avatar: '/images/default-avatar.png',
        specialty: ['昆曲', '京剧', '古典诗词'],
        experience: '8年',
        fanCount: 15420,
        totalSales: 89650,
        isActive: true,
        icon: '🌸',
        tags: ['古典', '优雅', '传统'],
        createTime: new Date()
      },
      {
        _id: 'actor_002', 
        name: '陈墨轩',
        bio: '现代话剧演员，擅长情感表达，声音富有磁性，深受年轻观众喜爱',
        avatar: '/images/default-avatar.png',
        specialty: ['话剧', '音乐剧', '现代戏'],
        experience: '6年',
        fanCount: 23580,
        totalSales: 126780,
        isActive: true,
        icon: '🎭',
        tags: ['现代', '磁性', '深情'],
        createTime: new Date()
      },
      {
        _id: 'actor_003',
        name: '苏婉清',
        bio: '越剧名伶，花旦出身，声音甜美，擅长演绎古典爱情剧目',
        avatar: '/images/default-avatar.png',
        specialty: ['越剧', '花旦', '古典爱情'],
        experience: '10年',
        fanCount: 18930,
        totalSales: 95420,
        isActive: true,
        icon: '🌙',
        tags: ['甜美', '越剧', '花旦'],
        createTime: new Date()
      }
    ]
    
    // 初始化语音包数据  
    const voicePacks = [
      // 李雨萱的语音包
      { _id: 'pack_001', actorId: 'actor_001', name: '昆曲经典选段', icon: '🎵', price: 2999, description: '《牡丹亭》《桃花扇》等经典昆曲选段', isHot: true, sales: 432, isActive: true },
      { _id: 'pack_002', actorId: 'actor_001', name: '古诗词朗诵', icon: '📜', price: 1999, description: '李白杜甫经典诗词深情朗诵', isHot: false, sales: 298, isActive: true },
      
      // 陈墨轩的语音包
      { _id: 'pack_004', actorId: 'actor_002', name: '现代情感独白', icon: '💭', price: 2499, description: '深情款款的现代爱情独白集', isHot: true, sales: 567, isActive: true },
      { _id: 'pack_005', actorId: 'actor_002', name: '经典话剧片段', icon: '🎬', price: 2899, description: '《雷雨》《茶馆》经典话剧片段', isHot: true, sales: 445, isActive: true },
      
      // 苏婉清的语音包  
      { _id: 'pack_007', actorId: 'actor_003', name: '越剧经典唱段', icon: '🎭', price: 2699, description: '《红楼梦》《西厢记》越剧名段', isHot: true, sales: 389, isActive: true },
      { _id: 'pack_008', actorId: 'actor_003', name: '古典诗词吟唱', icon: '🌕', price: 2199, description: '配乐古典诗词吟唱，如梦如幻', isHot: false, sales: 267, isActive: true }
    ]
    
    // 添加演员数据
    for (const actor of actors) {
      await db.collection('actors').add({ data: actor })
    }
    
    // 添加语音包数据
    for (const pack of voicePacks) {
      await db.collection('voicePacks').add({ data: pack })
    }
    
    console.log('示例数据初始化完成')
  } catch (error) {
    console.error('初始化示例数据失败:', error)
  }
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  
  try {
    console.log('获取演员列表，用户:', OPENID)
    
    // 确保数据库集合存在并有数据
    await ensureCollectionsExist()
    
    // 获取所有未软删除的演员（排除 isActive === false），按更新时间倒序
    const result = await db.collection('actors')
      .where({
        isActive: _.neq(false)
      })
      .orderBy('updateTime', 'desc')
      .get()
    
    if (!result.data || result.data.length === 0) {
      console.log('演员数据为空')
      return {
        code: 0,
        data: [],
        message: '暂无演员数据'
      }
    }
    
    // 处理演员数据，获取对应的语音包预览并计算守护者计数
    const actorsWithPacks = await Promise.all(
      result.data.map(async (actor) => {
        // 获取该演员的热门语音包（最多4个）
        const packsResult = await db.collection('voicePacks')
          .where({
            actorId: actor._id,
            isActive: true
          })
          .orderBy('sales', 'desc')
          .limit(4)
          .get()
        
        // 计算守护者数量（购买过该演员语音包的唯一用户数）
        let guardianCount = 0
        try {
          const actorPackIds = (packsResult.data || []).map(p => p._id)
          if (actorPackIds.length > 0) {
            const $ = db.command
            const [newPurchasesRes, oldPurchasesRes] = await Promise.all([
              db.collection('user_purchases').where({ packId: $.in(actorPackIds), status: 'completed' }).get(),
              db.collection('userPurchases').where({ voicePackId: $.in(actorPackIds) }).get()
            ])
            const uniqueUsers = new Set()
            ;(newPurchasesRes.data || []).forEach(r => r._openid && uniqueUsers.add(r._openid))
            ;(oldPurchasesRes.data || []).forEach(r => r._openid && uniqueUsers.add(r._openid))
            guardianCount = uniqueUsers.size
            
            // 若数据库中的守护者统计为0或与计算不一致，尝试更新
            try {
              const current = actor.stats?.guardianCount || 0
              if (current !== guardianCount) {
                await db.collection('actors').doc(actor._id).update({
                  data: { 'stats.guardianCount': guardianCount }
                })
                console.log(`✅ 更新演员 ${actor.name} 守护者计数: ${current} -> ${guardianCount}`)
              }
            } catch (e) {
              console.log(`更新演员 ${actor.name} 守护者计数失败(可忽略):`, e.message)
            }
          }
        } catch (e) {
          console.log(`计算演员 ${actor.name} 守护者计数失败(可忽略):`, e.message)
        }
        
        return {
          ...actor,
          stats: {
            ...(actor.stats || {}),
            guardianCount
          },
          packs: packsResult.data.map(pack => ({
            icon: pack.icon,
            name: pack.name,
            price: `¥${(pack.price / 100).toFixed(0)}`
          }))
        }
      })
    )
    
    console.log('演员列表获取成功，数量:', actorsWithPacks.length)
    
    return {
      code: 0,
      data: actorsWithPacks,
      message: '获取成功'
    }
    
  } catch (error) {
    console.error('getActors error:', error)
    return {
      code: -1,
      message: error.message || '获取演员列表失败'
    }
  }
}