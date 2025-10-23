// 调试演员数据页面
Page({
  data: {
    actorId: '',
    actorData: null,
    loading: false
  },

  onLoad(options) {
    if (options.actorId) {
      this.setData({ actorId: options.actorId })
      this.loadActorData()
    }
  },

  async loadActorData() {
    try {
      this.setData({ loading: true })
      
      const res = await wx.cloud.callFunction({
        name: 'getActorDetail',
        data: { actorId: this.data.actorId }
      })

      if (res.result.code === 0) {
        this.setData({ 
          actorData: res.result.data.actor,
          loading: false 
        })
        
        console.log('演员数据:', res.result.data.actor)
        console.log('封面照片URL:', res.result.data.actor.coverImageUrl)
        console.log('图片库:', res.result.data.actor.images)
        console.log('封面照片:', res.result.data.actor.imageUrl)
      } else {
        throw new Error(res.result.message)
      }
    } catch (error) {
      console.error('加载演员数据失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
      this.setData({ loading: false })
    }
  },

  copyData() {
    const data = JSON.stringify(this.data.actorData, null, 2)
    wx.setClipboardData({
      data: data,
      success: () => {
        wx.showToast({
          title: '数据已复制',
          icon: 'success'
        })
      }
    })
  }
})








