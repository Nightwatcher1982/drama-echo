// 分享图片处理工具
class ShareImageHandler {
  
  // 处理分享图片URL
  static async processShareImage(originalImageUrl) {
    console.log('🖼️ 处理分享图片URL:', originalImageUrl)
    
    // 如果是本地图片，直接返回
    if (!originalImageUrl || originalImageUrl.startsWith('/images/')) {
      console.log('✅ 使用本地图片:', originalImageUrl)
      return originalImageUrl || '/images/modu.png'
    }
    
    // 如果是云存储图片，获取临时链接
    if (originalImageUrl.startsWith('cloud://')) {
      try {
        console.log('🔄 获取云存储临时链接...')
        const tempRes = await wx.cloud.getTempFileURL({
          fileList: [originalImageUrl]
        })
        
        if (tempRes.fileList && tempRes.fileList.length > 0 && tempRes.fileList[0].status === 0) {
          const tempUrl = tempRes.fileList[0].tempFileURL
          console.log('✅ 获取临时链接成功:', tempUrl)
          
          // 验证图片是否可访问
          const isValid = await this.validateImageUrl(tempUrl)
          if (isValid) {
            console.log('✅ 图片验证通过，使用临时链接')
            return tempUrl
          } else {
            console.log('❌ 图片验证失败，使用备用图片')
            return '/images/modu.png'
          }
        } else {
          console.log('❌ 获取临时链接失败，使用备用图片')
          return '/images/modu.png'
        }
      } catch (error) {
        console.error('❌ 处理云存储图片失败:', error)
        return '/images/modu.png'
      }
    }
    
    // 如果是HTTP/HTTPS链接，验证后返回
    if (originalImageUrl.startsWith('http')) {
      console.log('🔗 验证HTTP图片链接...')
      const isValid = await this.validateImageUrl(originalImageUrl)
      if (isValid) {
        console.log('✅ HTTP图片验证通过')
        return originalImageUrl
      } else {
        console.log('❌ HTTP图片验证失败，使用备用图片')
        return '/images/modu.png'
      }
    }
    
    // 其他情况使用备用图片
    console.log('⚠️ 未知图片格式，使用备用图片')
    return '/images/modu.png'
  }
  
  // 验证图片URL是否有效
  static validateImageUrl(imageUrl) {
    return new Promise((resolve) => {
      if (!imageUrl || imageUrl === '/images/modu.png') {
        resolve(true)
        return
      }
      
      // 使用wx.getImageInfo来验证图片
      wx.getImageInfo({
        src: imageUrl,
        success: (res) => {
          console.log('✅ 图片验证成功:', res)
          resolve(true)
        },
        fail: (error) => {
          console.log('❌ 图片验证失败:', error)
          resolve(false)
        }
      })
      
      // 设置超时
      setTimeout(() => {
        console.log('⏰ 图片验证超时')
        resolve(false)
      }, 3000)
    })
  }
  
  // 创建分享内容
  static async createShareContent(title, desc, path, imageUrl) {
    console.log('📤 创建分享内容:', { title, desc, path, imageUrl })
    
    const processedImageUrl = await this.processShareImage(imageUrl)
    
    const shareContent = {
      title: title || '戏剧回响',
      desc: desc || '精彩戏剧内容分享',
      path: path || '/pages/index/index',
      imageUrl: processedImageUrl
    }
    
    console.log('✅ 分享内容创建完成:', shareContent)
    return shareContent
  }
}

module.exports = ShareImageHandler



