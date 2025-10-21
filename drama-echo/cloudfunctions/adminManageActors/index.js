// 后台管理演员云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 安全配置加载
const secureConfig = require('../utils/secureConfig')

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { action, actorData, actorId, userInfo, adminPassword } = event
  
  try {
    // 安全权限验证
    const hasPermission = secureConfig.validateAdminPermission(adminPassword, OPENID)
    secureConfig.log('info', '权限验证', { 
      hasPermission, 
      action, 
      timestamp: new Date().toISOString() 
    })
    
    if (!hasPermission) {
      secureConfig.log('warn', '权限验证失败', { openId: OPENID, action })
      return { code: -1, message: '无权限访问，仅管理员可使用此功能' }
    }

    secureConfig.log('info', '管理员操作', {
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
    secureConfig.log('error', 'adminManageActors error', { error: error.message })
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
  console.log('🔍 更新演员数据:', {
    actorId,
    actorData: {
      name: actorData.name,
      imageUrl: actorData.imageUrl,
      images: actorData.images,
      imagesCount: actorData.images ? actorData.images.length : 0
    }
  })
  
  const updateData = {
    ...actorData,
    // 保障 images 最多5张
    ...(Array.isArray(actorData.images) ? { images: actorData.images.slice(0, 5) } : {}),
    updateTime: new Date()
  }
  
  // 移除强制设置 imageUrl 的逻辑，让 imageUrl 独立管理
  // 只有在没有明确设置 imageUrl 且 images 数组不为空时，才使用 images[0] 作为 imageUrl
  if (!actorData.imageUrl && Array.isArray(actorData.images) && actorData.images.length > 0) {
    updateData.imageUrl = actorData.images[0]
    console.log('⚠️ 没有设置封面照片，使用图片库第一张作为封面照片')
  }
  
  console.log('📝 最终更新数据:', {
    name: updateData.name,
    imageUrl: updateData.imageUrl,
    images: updateData.images,
    imagesCount: updateData.images ? updateData.images.length : 0
  })
  
  await db.collection('actors').doc(actorId).update({
    data: updateData
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