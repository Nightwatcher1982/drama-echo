// 后台管理演员云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

const ADMIN_PASSWORDS = ['voice2024', 'admin123']

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { action, actorData, actorId, userInfo, adminPassword } = event
  
  try {
    // 生产环境权限验证 - 基于用户昵称或 OpenID
    // 密码鉴权（统一口径）
    const hasPermission = ADMIN_PASSWORDS.includes(String(adminPassword || ''))
    console.log('🔐 权限验证(密码):', { hasPermission, openId: OPENID, action, ts: new Date().toISOString() })
    if (!hasPermission) return { code: -1, message: '无权限访问，仅管理员可使用此功能' }

    console.log('✅ 管理员操作:', {
      action: action,
      user: userInfo?.nickName,
      timestamp: new Date().toISOString()
    })
    
    switch (action) {
      case 'list':
        return await listActors()
      case 'create':
        return await createActor(actorData)
      case 'update':
        return await updateActor(actorId, actorData)
      case 'delete':
        return await deleteActor(actorId)
      default:
        return {
          code: -1,
          message: '无效的操作类型'
        }
    }
  } catch (error) {
    console.error('adminManageActors error:', error)
    return {
      code: -1,
      message: error.message || '操作失败'
    }
  }
}

// 获取演员列表
async function listActors() {
  const result = await db.collection('actors')
    .orderBy('sortOrder', 'asc')
    .get()
  
  return {
    code: 0,
    data: result.data,
    message: '获取成功'
  }
}

// 创建演员
async function createActor(actorData) {
  const actorId = `actor_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
  
  const actor = {
    _id: actorId,
    name: actorData.name,
    englishName: actorData.englishName || '',
    avatar: actorData.avatar || actorData.name.charAt(0),
    title: actorData.title,
    description: actorData.description,
    imageUrl: actorData.imageUrl || (Array.isArray(actorData.images) && actorData.images.length > 0 ? actorData.images[0] : ''),
    images: Array.isArray(actorData.images) ? actorData.images.slice(0, 5) : [],
    status: actorData.status || 'offline',
    tags: actorData.tags || [],
    stats: {
      guardianCount: 0,
      voicePackCount: 0,
      totalSales: 0
    },
    slideColor: actorData.slideColor || 'slide1',
    sortOrder: actorData.sortOrder || 999,
    isActive: true,
    createTime: new Date(),
    updateTime: new Date()
  }
  
  await db.collection('actors').add({
    data: actor
  })
  
  return {
    code: 0,
    data: actor,
    message: '创建成功'
  }
}

// 更新演员
async function updateActor(actorId, actorData) {
  await db.collection('actors').doc(actorId).update({
    data: {
      ...actorData,
      // 保障 images 最多5张，并同步首图到 imageUrl
      ...(Array.isArray(actorData.images) ? { images: actorData.images.slice(0, 5) } : {}),
      ...(Array.isArray(actorData.images) && actorData.images.length > 0 ? { imageUrl: actorData.images[0] } : {}),
      updateTime: new Date()
    }
  })
  
  return {
    code: 0,
    message: '更新成功'
  }
}

// 删除演员
async function deleteActor(actorId) {
  // 软删除
  await db.collection('actors').doc(actorId).update({
    data: {
      isActive: false,
      updateTime: new Date()
    }
  })
  
  return {
    code: 0,
    message: '删除成功'
  }
}