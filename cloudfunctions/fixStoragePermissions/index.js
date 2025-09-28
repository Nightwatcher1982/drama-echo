const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloud1-2gyb3dkq4c474fe4'
})

exports.main = async (event, context) => {
  try {
    console.log('开始检查云存储文件权限...')
    
    // 检查演员头像文件权限
    const fileList = [
      'cloud://cloud1-2gyb3dkq4c474fe4.636c-cloud1-2gyb3dkq4c474fe4-1371126028/actors/1758443740207/gallery_1758443740207_1m4bn9yavxi.jpg'
    ]
    
    const result = await cloud.getTempFileURL({
      fileList: fileList
    })
    
    console.log('文件权限检查结果:', result)
    
    if (result.fileList && result.fileList.length > 0) {
      const file = result.fileList[0]
      if (file.status === 0) {
        console.log('✅ 文件权限正常，可以访问')
        return {
          code: 0,
          data: {
            fileUrl: file.tempFileURL,
            size: file.size,
            contentType: file.contentType
          },
          message: '文件权限正常'
        }
      } else {
        console.log('❌ 文件权限问题:', file.errMsg)
        return {
          code: -1,
          message: `文件权限问题: ${file.errMsg}`,
          suggestion: '请在云开发控制台修改文件权限为"所有用户可读"'
        }
      }
    }
    
    return {
      code: -1,
      message: '未找到文件'
    }
    
  } catch (error) {
    console.error('权限检查失败:', error)
    return {
      code: -1,
      message: error.message
    }
  }
}
