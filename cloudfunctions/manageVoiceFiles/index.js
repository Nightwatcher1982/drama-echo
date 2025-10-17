// 语音文件管理云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

const ADMIN_PASSWORDS = ['voice2024', 'admin123']

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { adminPassword } = event
  const isAdmin = ADMIN_PASSWORDS.includes(String(adminPassword || ''))
  if (!isAdmin) return { code: -1, message: '无权限执行此操作' }
  
  const { action, packId, fileId, fileData } = event
  
  try {
    switch (action) {
      case 'add':
        return await addVoiceFile(packId, fileData)
      case 'update':
        return await updateVoiceFile(packId, fileId, fileData)
      case 'delete':
        return await deleteVoiceFile(packId, fileId)
      case 'list':
        return await getVoiceFiles(packId)
      default:
        return {
          code: -1,
          message: '未知操作类型'
        }
    }
  } catch (error) {
    console.error('manageVoiceFiles error:', error)
    return {
      code: -1,
      message: error.message || '操作失败'
    }
  }
}

// 添加语音文件
async function addVoiceFile(packId, fileData) {
  // 获取语音包
  const packResult = await db.collection('voicePacks').doc(packId).get()
  if (!packResult.data) {
    throw new Error('语音包不存在')
  }
  
  const voicePack = packResult.data
  const voiceFiles = voicePack.voiceFiles || []
  
  // 检查文件ID是否重复
  const existingFile = voiceFiles.find(f => f.id === fileData.id)
  if (existingFile) {
    throw new Error('文件ID已存在')
  }
  
  // 添加新文件
  voiceFiles.push(fileData)
  
  // 更新语音包
  await db.collection('voicePacks').doc(packId).update({
    data: {
      voiceFiles: voiceFiles,
      updateTime: new Date()
    }
  })
  
  // 更新演员统计中的语音包数量
  await updateActorStats(voicePack.actorId)
  
  return {
    code: 0,
    message: '添加语音文件成功',
    data: fileData
  }
}

// 更新语音文件
async function updateVoiceFile(packId, fileId, fileData) {
  // 获取语音包
  const packResult = await db.collection('voicePacks').doc(packId).get()
  if (!packResult.data) {
    throw new Error('语音包不存在')
  }
  
  const voicePack = packResult.data
  const voiceFiles = voicePack.voiceFiles || []
  
  // 查找要更新的文件
  const fileIndex = voiceFiles.findIndex(f => f.id === fileId)
  if (fileIndex === -1) {
    throw new Error('语音文件不存在')
  }
  
  // 更新文件信息，保留原有的id和createTime
  voiceFiles[fileIndex] = {
    ...voiceFiles[fileIndex],
    ...fileData,
    id: fileId, // 确保ID不变
    createTime: voiceFiles[fileIndex].createTime // 保留创建时间
  }
  
  // 更新语音包
  await db.collection('voicePacks').doc(packId).update({
    data: {
      voiceFiles: voiceFiles,
      updateTime: new Date()
    }
  })
  
  return {
    code: 0,
    message: '更新语音文件成功',
    data: voiceFiles[fileIndex]
  }
}

// 删除语音文件
async function deleteVoiceFile(packId, fileId) {
  // 获取语音包
  const packResult = await db.collection('voicePacks').doc(packId).get()
  if (!packResult.data) {
    throw new Error('语音包不存在')
  }
  
  const voicePack = packResult.data
  const voiceFiles = voicePack.voiceFiles || []
  
  // 查找要删除的文件
  const fileIndex = voiceFiles.findIndex(f => f.id === fileId)
  if (fileIndex === -1) {
    throw new Error('语音文件不存在')
  }
  
  const deletedFile = voiceFiles[fileIndex]
  
  // 从数组中移除文件
  voiceFiles.splice(fileIndex, 1)
  
  // 更新语音包
  await db.collection('voicePacks').doc(packId).update({
    data: {
      voiceFiles: voiceFiles,
      updateTime: new Date()
    }
  })
  
  // 删除云存储中的文件（如果需要）
  if (deletedFile.fileId && deletedFile.fileId.startsWith('cloud://')) {
    try {
      await cloud.deleteFile({
        fileList: [deletedFile.fileId]
      })
      console.log('删除云存储文件成功:', deletedFile.fileId)
    } catch (error) {
      console.warn('删除云存储文件失败:', error)
      // 不影响主流程，只记录警告
    }
  }
  
  // 更新演员统计
  await updateActorStats(voicePack.actorId)
  
  return {
    code: 0,
    message: '删除语音文件成功',
    data: deletedFile
  }
}

// 获取语音文件列表
async function getVoiceFiles(packId) {
  const packResult = await db.collection('voicePacks').doc(packId).get()
  if (!packResult.data) {
    throw new Error('语音包不存在')
  }
  
  const voiceFiles = packResult.data.voiceFiles || []
  
  return {
    code: 0,
    message: '获取语音文件列表成功',
    data: voiceFiles
  }
}

// 更新演员统计信息
async function updateActorStats(actorId) {
  try {
    // 获取该演员的所有语音包
    const packsResult = await db.collection('voicePacks')
      .where({
        actorId: actorId,
        isActive: true
      })
      .get()
    
    const packs = packsResult.data
    const voicePackCount = packs.length
    const totalSales = packs.reduce((sum, pack) => sum + (pack.sales || 0), 0)
    
    // 更新演员统计
    await db.collection('actors').doc(actorId).update({
      data: {
        'stats.voicePackCount': voicePackCount,
        'stats.totalSales': totalSales,
        updateTime: new Date()
      }
    })
    
    console.log(`更新演员 ${actorId} 统计信息: 语音包${voicePackCount}个, 总销量${totalSales}`)
    
  } catch (error) {
    console.error('更新演员统计信息失败:', error)
    // 不影响主流程
  }
}