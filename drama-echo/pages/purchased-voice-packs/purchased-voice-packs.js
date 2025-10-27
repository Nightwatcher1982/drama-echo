const app = getApp()

Page({
  data: {
    purchasedPacks: [],
    loading: true,
    empty: false
  },

  onLoad() {
    this.loadPurchasedPacks()
  },

  onShow() {
    this.loadPurchasedPacks()
  },

  // 加载已购买的语音包
  async loadPurchasedPacks() {
    try {
      this.setData({ loading: true })
      
      if (!app.globalData.cloudEnabled) {
        this.setData({ 
          loading: false, 
          empty: true,
          purchasedPacks: []
        })
        return
      }

      const res = await wx.cloud.callFunction({
        name: 'getUserPurchases',
        data: {
          userId: 'current' // 使用当前用户的openid
        }
      })

      if (res.result.code === 0) {
        const purchases = res.result.data.purchases || []
        // 为每个购买记录添加购买份数（如果没有的话）
        const processedPacks = purchases.map(p => ({
          ...p,
          purchaseCount: p.purchaseCount || 1
        }))
        this.setData({
          purchasedPacks: processedPacks,
          loading: false,
          empty: processedPacks.length === 0
        })
      } else {
        throw new Error(res.result.message || '获取购买记录失败')
      }
    } catch (error) {
      console.error('加载已购买语音包失败:', error)
      this.setData({
        loading: false,
        empty: true,
        purchasedPacks: []
      })
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 跳转到语音包详情页
  goToPackDetail(e) {
    const packId = e.currentTarget.dataset.packId
    if (packId) {
      wx.navigateTo({
        url: `/pages/voice-pack-detail/voice-pack-detail?packId=${packId}`
      })
    }
  },

  // 播放语音包
  playPack(e) {
    const packId = e.currentTarget.dataset.packId
    if (packId) {
      wx.navigateTo({
        url: `/pages/voice-pack-detail/voice-pack-detail?packId=${packId}&autoPlay=true`
      })
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadPurchasedPacks().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '我的语音包收藏',
      path: '/pages/purchased-voice-packs/purchased-voice-packs',
      imageUrl: 'cloud://cloud1-2gyb3dkq4c474fe4.636c-cloud1-2gyb3dkq4c474fe4-1371126028/images/xjhx-logo.png'
    }
  }
})
