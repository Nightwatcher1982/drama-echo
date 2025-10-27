const app = getApp()

Component({
  properties: {
    show: {
      type: Boolean,
      value: false
    },
    title: {
      type: String,
      value: '授权登录'
    },
    subtitle: {
      type: String,
      value: '为了给您提供更好的服务体验'
    }
  },

  data: {
    // 组件内部数据
  },

  methods: {
    // 确认授权
    async onConfirm() {
      try {
        wx.showLoading({
          title: '授权中...',
          mask: true
        })

        // 调用app中的授权方法
        await app.authorizeUser()
        
        wx.hideLoading()
        
        // 触发成功事件
        this.triggerEvent('success', {
          message: '授权成功'
        })
        
        // 关闭弹窗
        this.triggerEvent('close')
        
        wx.showToast({
          title: '授权成功！',
          icon: 'success'
        })
        
      } catch (error) {
        wx.hideLoading()
        console.error('授权失败:', error)
        
        if (error.errMsg && (error.errMsg.includes('deny') || error.errMsg.includes('cancel'))) {
          wx.showToast({
            title: '授权已取消',
            icon: 'none'
          })
        } else {
          wx.showToast({
            title: '授权失败，请重试',
            icon: 'none'
          })
        }
      }
    },

    // 取消授权
    onCancel() {
      this.triggerEvent('cancel')
      this.triggerEvent('close')
    }
  }
})
