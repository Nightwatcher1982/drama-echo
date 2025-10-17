const cloud = require('wx-server-sdk')

// 初始化 cloud
cloud.init({ env: 'cloud1-2gyb3dkq4c474fe4' })

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { packId, actorId } = event

  try {
    console.log('获取语音包内容:', { packId, actorId, openid: wxContext.OPENID })

    if (!packId) {
      return {
        code: 1,
        message: '缺少语音包ID参数',
        data: null
      }
    }

    // 1. 验证用户是否购买了该语音包
    const purchaseQuery = await db.collection('userPurchases')
      .where({
        openid: wxContext.OPENID,
        packId: packId,
        status: 'completed' // 只有已完成的购买才能播放
      })
      .get()

    if (purchaseQuery.data.length === 0) {
      return {
        code: 1,
        message: '您尚未购买该语音包，无法播放',
        data: null
      }
    }

    // 2. 获取语音包详细信息
    const packRes = await db.collection('voicePacks')
      .doc(packId)
      .get()

    if (!packRes.data) {
      return {
        code: 1,
        message: '语音包不存在',
        data: null
      }
    }

    const voicePack = packRes.data

    // 3. 获取语音文件内容
    let voiceFiles = []
    
    if (voicePack.voiceFiles && voicePack.voiceFiles.length > 0) {
      // 从语音包中直接获取文件信息
      voiceFiles = voicePack.voiceFiles.map(file => ({
        name: file.name || file.fileName || '未命名',
        fileId: file.fileId,
        duration: file.duration || 0,
        size: file.size || 0
      }))
    } else {
      // 如果没有语音文件，返回空数据
      console.log('语音包中没有找到语音文件:', packId)
      return {
        code: 0,
        message: '该语音包暂无语音内容',
        data: {
          packId,
          packName: voicePack.name,
          actorId: voicePack.actorId,
          voiceFiles: []
        }
      }
    }

    // 4. 记录播放日志（可选）
    try {
      await db.collection('voicePlayLogs').add({
        data: {
          openid: wxContext.OPENID,
          packId: packId,
          actorId: actorId,
          playTime: new Date(),
          fileCount: voiceFiles.length
        }
      })
    } catch (logError) {
      console.warn('记录播放日志失败:', logError)
      // 不影响主要功能
    }

    console.log(`语音包内容加载成功: ${packId}, 文件数: ${voiceFiles.length}`)

    return {
      code: 0,
      message: '获取成功',
      data: {
        packId,
        packName: voicePack.name,
        packIcon: voicePack.icon,
        actorId: voicePack.actorId,
        voiceFiles: voiceFiles
      }
    }

  } catch (error) {
    console.error('获取语音包内容失败:', error)
    return {
      code: 1,
      message: '服务器错误',
      data: null
    }
  }
}