// 媒体文件上传管理云函数（支持语音和图片）
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 管理员OpenID列表
const adminOpenIds = [
  'o1JKg5VC5Fe27QBwNZ2d0DPyKImU', // nightwatcher
]

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  
  // 验证管理员权限
  if (!adminOpenIds.includes(OPENID)) {
    // 检查是否为nightwatcher用户
    const userInfo = event.userInfo
    if (!userInfo || !userInfo.nickName || userInfo.nickName.toLowerCase() !== 'nightwatcher') {
      return {
        code: -1,
        message: '无权限执行此操作'
      }
    }
  }
  
  const { action, type, actorId, packId, fileData } = event
  
  try {
    switch (action) {
      case 'uploadActorImage':
        return await uploadActorImage(actorId, fileData)
      case 'uploadVoiceFile':
        return await uploadVoiceFile(packId, fileData)
      case 'deleteFile':
        return await deleteCloudFile(fileData.fileId)
      case 'getUploadUrl':
        return await getUploadUrl(type, actorId || packId)
      default:
        return {
          code: -1,
          message: '未知操作类型'
        }
    }
  } catch (error) {
    console.error('uploadMediaFiles error:', error)
    return {
      code: -1,
      message: error.message || '操作失败'
    }
  }
}

// 上传演员图片
async function uploadActorImage(actorId, fileData) {
  try {
    // 更新演员信息中的图片URL
    await db.collection('actors').doc(actorId).update({
      data: {
        imageUrl: fileData.cloudUrl,
        imageUpdateTime: new Date()
      }
    })
    
    return {
      code: 0,
      message: '演员图片上传成功',
      data: {
        imageUrl: fileData.cloudUrl
      }
    }
  } catch (error) {
    throw new Error('更新演员图片失败: ' + error.message)
  }
}

// 上传语音文件信息
async function uploadVoiceFile(packId, fileData) {
  try {
    // 获取语音包
    const packResult = await db.collection('voicePacks').doc(packId).get()
    if (!packResult.data) {
      throw new Error('语音包不存在')
    }
    
    const voicePack = packResult.data
    const voiceFiles = voicePack.voiceFiles || []
    
    // 创建新的语音文件记录
    const newFile = {
      id: `file_${Date.now()}`,
      name: fileData.name,
      fileId: fileData.cloudUrl,
      duration: fileData.duration || 30,
      description: fileData.description || '',
      size: fileData.size,
      createTime: new Date(),
      updateTime: new Date()
    }
    
    // 添加到语音文件列表
    voiceFiles.push(newFile)
    
    // 更新语音包
    await db.collection('voicePacks').doc(packId).update({
      data: {
        voiceFiles: voiceFiles,
        updateTime: new Date()
      }
    })
    
    // 更新演员统计
    await updateActorStats(voicePack.actorId)
    
    return {
      code: 0,
      message: '语音文件上传成功',
      data: newFile
    }
  } catch (error) {
    throw new Error('保存语音文件失败: ' + error.message)
  }
}

// 删除云存储文件
async function deleteCloudFile(fileId) {
  try {
    if (!fileId || !fileId.startsWith('cloud://')) {
      throw new Error('无效的文件ID')
    }
    
    await cloud.deleteFile({
      fileList: [fileId]
    })
    
    return {
      code: 0,
      message: '文件删除成功'
    }
  } catch (error) {
    throw new Error('删除文件失败: ' + error.message)
  }
}

// 获取上传URL（为前端直传准备）
async function getUploadUrl(type, targetId) {
  try {
    // 生成云存储路径
    let cloudPath = ''
    if (type === 'actor-image') {
      cloudPath = `actors/${targetId}/avatar_${Date.now()}.jpg`
    } else if (type === 'voice-file') {
      cloudPath = `voice-packs/${targetId}/voice_${Date.now()}.mp3`
    } else {
      throw new Error('未知的文件类型')
    }
    
    // 生成临时上传链接
    const res = await cloud.getTempFileURL({
      fileList: [{
        fileID: `cloud://${process.env.ENV}/${cloudPath}`,
        maxAge: 60 * 60 // 1小时有效期
      }]
    })
    
    return {
      code: 0,
      message: '获取上传链接成功',
      data: {
        cloudPath: cloudPath,
        uploadUrl: res.fileList[0].tempFileURL
      }
    }
  } catch (error) {
    throw new Error('获取上传链接失败: ' + error.message)
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
    let totalVoiceFiles = 0
    
    // 统计所有语音文件数量
    packs.forEach(pack => {
      totalVoiceFiles += (pack.voiceFiles || []).length
    })
    
    // 更新演员统计
    await db.collection('actors').doc(actorId).update({
      data: {
        'stats.voicePackCount': voicePackCount,
        'stats.totalVoiceFiles': totalVoiceFiles,
        updateTime: new Date()
      }
    })
    
    console.log(`更新演员 ${actorId} 统计信息: 语音包${voicePackCount}个, 语音文件${totalVoiceFiles}个`)
    
  } catch (error) {
    console.error('更新演员统计信息失败:', error)
    // 不影响主流程
  }
}