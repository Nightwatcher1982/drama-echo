// 后台管理语音包云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

const ADMIN_PASSWORDS = ['voice2024', 'admin123']

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { action, packData, packId, actorId, userInfo, adminPassword } = event
  
  try {
    // 密码鉴权（统一口径）
    const hasPermission = ADMIN_PASSWORDS.includes(String(adminPassword || ''))
    console.log('🎵 语音包管理权限验证(密码):', { hasPermission, openId: OPENID, action, ts: new Date().toISOString() })
    if (!hasPermission) return { code: -1, message: '无权限访问，仅管理员可使用此功能' }

    switch (action) {
      case 'list':
        return await listVoicePacks(actorId)
      case 'create':
        return await createVoicePack(packData)
      case 'update':
        return await updateVoicePack(packId, packData)
      case 'delete':
        return await deleteVoicePack(packId)
      case 'upload':
        return await handleVoiceUpload(packId, event.voiceFiles)
      default:
        return {
          code: -1,
          message: '无效的操作类型'
        }
    }
  } catch (error) {
    console.error('adminManageVoicePacks error:', error)
    return {
      code: -1,
      message: error.message || '操作失败'
    }
  }
}

// 获取语音包列表
async function listVoicePacks(actorId) {
  const whereCondition = { isActive: true }
  if (actorId) {
    whereCondition.actorId = actorId
  }
  
  const result = await db.collection('voicePacks')
    .where(whereCondition)
    .orderBy('createTime', 'desc')
    .get()
  
  return {
    code: 0,
    data: result.data,
    message: '获取成功'
  }
}

// 创建语音包
async function createVoicePack(packData) {
  const packId = `pack_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
  
  const voicePack = {
    _id: packId,
    actorId: packData.actorId,
    name: packData.name,
    icon: packData.icon || '🎵',
    price: packData.price, // 分为单位
    description: packData.description || '',
    isHot: packData.isHot || false,
    sales: 0,
    voiceFiles: packData.voiceFiles || [],
    isActive: true,
    createTime: new Date(),
    updateTime: new Date()
  }
  
  await db.collection('voicePacks').add({
    data: voicePack
  })
  
  // 更新演员的语音包数量
  await db.collection('actors').doc(packData.actorId).update({
    data: {
      'stats.voicePackCount': _.inc(1),
      updateTime: new Date()
    }
  })
  
  return {
    code: 0,
    data: voicePack,
    message: '创建成功'
  }
}

// 更新语音包
async function updateVoicePack(packId, packData) {
  await db.collection('voicePacks').doc(packId).update({
    data: {
      ...packData,
      updateTime: new Date()
    }
  })
  
  return {
    code: 0,
    message: '更新成功'
  }
}

// 删除语音包
async function deleteVoicePack(packId) {
  // 获取语音包信息
  const packResult = await db.collection('voicePacks').doc(packId).get()
  if (!packResult.data) {
    return {
      code: -1,
      message: '语音包不存在'
    }
  }
  
  const pack = packResult.data
  
  // 软删除语音包
  await db.collection('voicePacks').doc(packId).update({
    data: {
      isActive: false,
      updateTime: new Date()
    }
  })
  
  // 更新演员的语音包数量
  await db.collection('actors').doc(pack.actorId).update({
    data: {
      'stats.voicePackCount': _.inc(-1),
      updateTime: new Date()
    }
  })
  
  return {
    code: 0,
    message: '删除成功'
  }
}

// 处理语音文件上传
async function handleVoiceUpload(packId, voiceFiles) {
  // 这里实现语音文件的处理逻辑
  // 由于微信小程序的限制，可能需要通过其他方式处理文件上传
  
  await db.collection('voicePacks').doc(packId).update({
    data: {
      voiceFiles: voiceFiles,
      updateTime: new Date()
    }
  })
  
  return {
    code: 0,
    message: '语音文件上传成功'
  }
}