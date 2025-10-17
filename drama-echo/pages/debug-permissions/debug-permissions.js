// 权限调试页面
Page({
  data: {
    debugInfo: [],
    userInfo: null,
    cloudFiles: [],
    testResults: []
  },

  onLoad() {
    this.getUserInfo()
    this.testCloudStorageAccess()
    this.checkUserLoginStatus()
  },

  // 获取用户信息
  async getUserInfo() {
    try {
      const app = getApp()
      
      // 优先从全局数据获取
      if (app.globalData.userProfile) {
        this.setData({ userInfo: app.globalData.userProfile })
        this.addDebugInfo('从全局数据获取用户信息', app.globalData.userProfile)
        return
      }
      
      // 从本地存储获取
      const localUserInfo = wx.getStorageSync('userProfile')
      if (localUserInfo) {
        this.setData({ userInfo: localUserInfo })
        this.addDebugInfo('从本地存储获取用户信息', localUserInfo)
        return
      }
      
      // 尝试获取用户授权
      const userInfo = await wx.getUserProfile({
        desc: '用于调试权限'
      })
      this.setData({ userInfo: userInfo.userInfo })
      this.addDebugInfo('通过授权获取用户信息', userInfo.userInfo)
    } catch (error) {
      this.addDebugInfo('用户信息获取失败', error)
      this.setData({ userInfo: null })
    }
  },

  // 测试云存储访问
  async testCloudStorageAccess() {
    this.addDebugInfo('开始测试云存储访问权限...')
    
    // 测试1: 检查云开发环境
    try {
      const app = getApp()
      const cloudEnabled = app.globalData.cloudEnabled
      const env = wx.cloud ? wx.cloud.DYNAMIC_CURRENT_ENV : '未初始化'
      
      this.addDebugInfo('云开发环境', {
        cloudEnabled: cloudEnabled,
        env: env,
        wxCloudAvailable: !!wx.cloud
      })
    } catch (error) {
      this.addDebugInfo('云开发环境检查失败', error)
    }

    // 测试2: 尝试获取云存储文件列表
    try {
      const result = await wx.cloud.callFunction({
        name: 'getActors',
        data: {}
      })
      
      if (result.result && result.result.data) {
        const actors = result.result.data
        this.addDebugInfo('演员数据获取成功', `共${actors.length}个演员`)
        
        // 提取所有图片URL
        const allImages = []
        actors.forEach(actor => {
          if (actor.images) {
            actor.images.forEach(img => {
              if (img && img.startsWith('cloud://')) {
                allImages.push({
                  actorName: actor.name,
                  imageUrl: img
                })
              }
            })
          }
        })
        
        this.setData({ cloudFiles: allImages })
        this.addDebugInfo('云存储图片列表', `共${allImages.length}个云存储图片`)
      }
    } catch (error) {
      this.addDebugInfo('获取演员数据失败', error)
    }
  },

  // 测试单个图片访问
  async testSingleImage(e) {
    const { imageUrl } = e.currentTarget.dataset
    this.addDebugInfo(`测试图片访问: ${imageUrl}`)
    
    try {
      const tempRes = await wx.cloud.getTempFileURL({
        fileList: [imageUrl]
      })
      
      this.addDebugInfo('临时链接获取结果', tempRes)
      
      if (tempRes.fileList && tempRes.fileList.length > 0) {
        const fileResult = tempRes.fileList[0]
        const result = {
          fileID: fileResult.fileID,
          status: fileResult.status,
          errMsg: fileResult.errMsg,
          success: fileResult.status === 0
        }
        
        this.addDebugInfo('文件访问结果', result)
        
        // 添加到测试结果
        const testResults = this.data.testResults
        testResults.push({
          imageUrl,
          result,
          timestamp: new Date().toLocaleTimeString()
        })
        this.setData({ testResults })
      }
    } catch (error) {
      this.addDebugInfo('图片访问异常', error)
    }
  },

  // 测试所有图片
  async testAllImages() {
    this.addDebugInfo('开始测试所有云存储图片...')
    
    for (const file of this.data.cloudFiles) {
      await this.testSingleImage({ currentTarget: { dataset: { imageUrl: file.imageUrl } } })
      // 添加延迟避免请求过快
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  },

  // 检查数据库权限
  async checkDatabasePermissions() {
    this.addDebugInfo('检查数据库权限...')
    
    try {
      // 测试读取权限
      const db = wx.cloud.database()
      const result = await db.collection('actors').limit(1).get()
      this.addDebugInfo('数据库读取权限', '正常')
    } catch (error) {
      this.addDebugInfo('数据库读取权限', `失败: ${error.message}`)
    }
  },

  // 添加调试信息
  addDebugInfo(title, content) {
    const debugInfo = this.data.debugInfo
    debugInfo.push({
      title,
      content: typeof content === 'object' ? JSON.stringify(content, null, 2) : content,
      timestamp: new Date().toLocaleTimeString()
    })
    this.setData({ debugInfo })
  },

  // 清空调试信息
  clearDebugInfo() {
    this.setData({ 
      debugInfo: [],
      testResults: []
    })
  },

  // 检查用户登录状态
  checkUserLoginStatus() {
    const app = getApp()
    
    this.addDebugInfo('用户登录状态检查', {
      userLoggedIn: app.globalData.userLoggedIn,
      userOpenId: app.globalData.userOpenId,
      userProfile: app.globalData.userProfile ? {
        nickName: app.globalData.userProfile.nickName,
        avatarUrl: app.globalData.userProfile.avatarUrl ? '有头像' : '无头像',
        isCustomized: app.globalData.userProfile.isCustomized
      } : null,
      cloudEnabled: app.globalData.cloudEnabled
    })
    
    // 检查登录状态是否有效
    const loginStatusValid = app.checkLoginStatus()
    this.addDebugInfo('登录状态有效性', loginStatusValid)
  },

  // 刷新用户状态
  async refreshUserState() {
    this.addDebugInfo('开始刷新用户状态...')
    
    try {
      const app = getApp()
      
      // 1. 重新初始化用户登录
      await app.initUserLogin()
      
      // 2. 重新获取用户信息
      await this.getUserInfo()
      
      // 3. 重新检查登录状态
      this.checkUserLoginStatus()
      
      this.addDebugInfo('用户状态刷新完成', '成功')
      
    } catch (error) {
      this.addDebugInfo('用户状态刷新失败', error)
    }
  },

  // 复制调试信息
  copyDebugInfo() {
    const debugText = this.data.debugInfo.map(item => 
      `[${item.timestamp}] ${item.title}: ${item.content}`
    ).join('\n')
    
    wx.setClipboardData({
      data: debugText,
      success: () => {
        wx.showToast({
          title: '调试信息已复制',
          icon: 'success'
        })
      }
    })
  },

  // 测试微信分享
  async testWeChatShare() {
    this.addDebugInfo('开始测试微信分享...')
    
    // 获取第一个可用的图片URL
    const testImage = this.data.cloudFiles[0]?.imageUrl
    if (!testImage) {
      this.addDebugInfo('没有可用的测试图片')
      return
    }
    
    this.addDebugInfo('测试分享图片URL', testImage)
    
    try {
      let finalImageUrl = testImage
      
      // 如果是云存储路径，需要获取临时链接
      if (testImage && testImage.startsWith('cloud://')) {
        this.addDebugInfo('检测到云存储图片，获取临时链接...')
        
        const tempRes = await wx.cloud.getTempFileURL({
          fileList: [testImage]
        })
        
        if (tempRes.fileList && tempRes.fileList.length > 0 && tempRes.fileList[0].status === 0) {
          finalImageUrl = tempRes.fileList[0].tempFileURL
          this.addDebugInfo('临时链接获取成功', finalImageUrl)
        } else {
          this.addDebugInfo('临时链接获取失败', tempRes.fileList[0]?.errMsg)
          finalImageUrl = '/images/modu.png' // 使用备用图片
        }
      }
      
      // 设置分享内容
      this.setData({
        shareContent: {
          title: '测试分享 - 戏剧回响',
          desc: '这是一个分享测试',
          path: '/pages/index/index',
          imageUrl: finalImageUrl
        }
      })
      
      this.addDebugInfo('分享内容已设置', this.data.shareContent)
      
      // 显示分享菜单
      wx.showShareMenu({
        withShareTicket: true,
        success: () => {
          this.addDebugInfo('分享菜单显示成功')
        },
        fail: (error) => {
          this.addDebugInfo('分享菜单显示失败', error)
        }
      })
      
    } catch (error) {
      this.addDebugInfo('分享测试失败', error)
    }
  },

  // 测试不同图片源
  async testDifferentImageSources() {
    this.addDebugInfo('开始测试不同图片源...')
    
    const testUrls = [
      '/images/modu.png', // 本地图片
      'https://636c-cloud1-2gyb3dkq4c474fe4-1371126028.tcb.qcloud.la/actors/actor_1759115760868_fmt081/gallery_1759117516119_7zo7g584wug.jpg', // 云存储临时链接
      'https://thirdwx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTJd...', // 微信头像
    ]
    
    for (const url of testUrls) {
      this.addDebugInfo(`测试图片源: ${url}`)
      
      // 设置分享内容
      this.setData({
        shareContent: {
          title: `测试分享 - ${url.substring(0, 20)}...`,
          desc: '图片源测试',
          path: '/pages/index/index',
          imageUrl: url
        }
      })
      
      // 等待一下再测试下一个
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  },

  // 页面分享配置
  onShareAppMessage() {
    const shareContent = this.data.shareContent
    if (shareContent) {
      this.addDebugInfo('执行分享', shareContent)
      return shareContent
    }
    
    return {
      title: '权限调试工具',
      path: '/pages/debug-permissions/debug-permissions',
      imageUrl: '/images/modu.png'
    }
  }
})
