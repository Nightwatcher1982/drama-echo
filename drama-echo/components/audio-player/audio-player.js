Component({
  properties: {
    // 音频文件URL
    audioUrl: {
      type: String,
      value: ''
    },
    // 音频文件名称
    fileName: {
      type: String,
      value: ''
    },
    // 是否显示播放器
    show: {
      type: Boolean,
      value: false
    },
    // 唱片封面图片
    coverImage: {
      type: String,
      value: ''
    },
    // 播放列表
    playlist: {
      type: Array,
      value: []
    },
    // 当前播放索引
    currentIndex: {
      type: Number,
      value: 0
    }
  },

  data: {
    isPlaying: false,
    isPaused: false,
    currentTime: 0,
    duration: 0,
    audioContext: null,
    updateTimer: null,
    // 唱片机相关
    isRotating: false,
    rotationAngle: 0,
    rotationTimer: null,
    // 播放列表相关
    currentTrackIndex: 0,
    totalTracks: 0,
    currentTrack: null
  },

  lifetimes: {
    attached() {
      this.initAudioContext()
    },
    detached() {
      this.destroyAudioContext()
    }
  },

  observers: {
    'audioUrl': function(newUrl) {
      if (newUrl && this.data.audioContext) {
        this.data.audioContext.src = newUrl
        this.resetPlayer()
      }
    },
    'show': function(show) {
      if (!show) {
        this.stopAudio()
      }
    },
    'playlist': function(playlist) {
      this.setData({
        totalTracks: playlist.length,
        currentTrackIndex: this.data.currentIndex
      })
      if (playlist.length > 0) {
        this.setData({
          currentTrack: playlist[this.data.currentIndex]
        })
      }
    },
    'currentIndex': function(index) {
      this.setData({
        currentTrackIndex: index
      })
      if (this.data.playlist && this.data.playlist.length > 0) {
        this.setData({
          currentTrack: this.data.playlist[index]
        })
      }
    }
  },

  methods: {
    // 初始化音频上下文
    initAudioContext() {
      if (this.data.audioContext) {
        this.destroyAudioContext()
      }
      
      const audioContext = wx.createInnerAudioContext()
      
      // 设置iOS静音模式下也能播放声音
      audioContext.obeyMuteSwitch = false
      
      // 监听音频加载完成
      audioContext.onCanplay(() => {
        console.log('音频可以播放')
        this.setData({ duration: audioContext.duration || 0 })
      })
      
      // 监听播放开始
      audioContext.onPlay(() => {
        console.log('开始播放')
        this.setData({ isPlaying: true, isPaused: false, isRotating: true })
        this.startProgressUpdate()
        this.startRotation()
      })
      
      // 监听播放暂停
      audioContext.onPause(() => {
        console.log('播放暂停')
        this.setData({ isPlaying: false, isPaused: true, isRotating: false })
        this.stopProgressUpdate()
        this.stopRotation()
      })
      
      // 监听播放结束
      audioContext.onEnded(() => {
        console.log('播放结束')
        this.setData({ 
          isPlaying: false, 
          isPaused: false, 
          currentTime: 0,
          isRotating: false
        })
        this.stopProgressUpdate()
        this.stopRotation()
        // 自动播放下一首（只有在有播放列表时才自动播放）
        const playlist = this.data.playlist
        if (playlist && playlist.length > 1) {
          this.playNext()
        }
      })
      
      // 监听播放错误
      audioContext.onError((error) => {
        console.error('音频播放错误:', error)
        wx.showToast({
          title: '播放失败',
          icon: 'none'
        })
        this.resetPlayer()
      })
      
      // 监听时间更新
      audioContext.onTimeUpdate(() => {
        const currentTime = audioContext.currentTime || 0
        const duration = audioContext.duration || 0
        const progress = duration > 0 ? (currentTime / duration) * 100 : 0
        
        this.setData({
          currentTime: currentTime,
          progress: progress
        })
      })
      
      this.setData({ audioContext })
      
      if (this.data.audioUrl) {
        audioContext.src = this.data.audioUrl
      }
    },
    
    // 销毁音频上下文
    destroyAudioContext() {
      if (this.data.audioContext) {
        this.data.audioContext.destroy()
        this.setData({ audioContext: null })
      }
      this.stopProgressUpdate()
      this.stopRotation()
    },
    
    // 开始播放
    playAudio() {
      if (!this.data.audioContext || !this.data.audioUrl) {
        wx.showToast({
          title: '音频文件不存在',
          icon: 'none'
        })
        return
      }
      
      if (this.data.isPaused) {
        this.data.audioContext.play()
      } else {
        this.data.audioContext.src = this.data.audioUrl
        this.data.audioContext.play()
      }
    },
    
    // 暂停播放
    pauseAudio() {
      if (this.data.audioContext && this.data.isPlaying) {
        this.data.audioContext.pause()
      }
    },
    
    // 停止播放
    stopAudio() {
      if (this.data.audioContext) {
        this.data.audioContext.stop()
        this.resetPlayer()
      }
    },
    
    // 重置播放器
    resetPlayer() {
      this.setData({
        isPlaying: false,
        isPaused: false,
        currentTime: 0,
        isRotating: false,
        rotationAngle: 0
      })
      this.stopProgressUpdate()
      this.stopRotation()
    },
    
    // 开始进度更新
    startProgressUpdate() {
      this.stopProgressUpdate()
      this.data.updateTimer = setInterval(() => {
        if (this.data.audioContext && this.data.isPlaying) {
          const currentTime = this.data.audioContext.currentTime || 0
          const duration = this.data.audioContext.duration || 0
          
          this.setData({
            currentTime: currentTime,
            duration: duration
          })
        }
      }, 100)
    },
    
    // 停止进度更新
    stopProgressUpdate() {
      if (this.data.updateTimer) {
        clearInterval(this.data.updateTimer)
        this.setData({ updateTimer: null })
      }
    },
    
    // 进度条拖拽中
    onSliderChanging(e) {
      const value = e.detail.value
      this.setData({
        currentTime: value
      })
    },
    
    // 进度条拖拽结束
    onSliderChange(e) {
      const value = e.detail.value
      if (this.data.audioContext) {
        this.data.audioContext.seek(value)
        this.setData({
          currentTime: value
        })
      }
    },
    
    // 格式化时间显示
    formatTime(seconds) {
      if (!seconds || isNaN(seconds)) return '00:00'
      
      const mins = Math.floor(seconds / 60)
      const secs = Math.floor(seconds % 60)
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    },
    
    // 开始唱片旋转动画
    startRotation() {
      this.stopRotation()
      this.data.rotationTimer = setInterval(() => {
        this.setData({
          rotationAngle: (this.data.rotationAngle + 1) % 360
        })
      }, 50) // 每50ms旋转1度，约20秒转一圈
    },
    
    // 停止唱片旋转动画
    stopRotation() {
      if (this.data.rotationTimer) {
        clearInterval(this.data.rotationTimer)
        this.setData({ rotationTimer: null })
      }
    },
    
    // 播放上一首
    playPrevious() {
      const playlist = this.data.playlist
      const currentIndex = this.data.currentTrackIndex
      console.log('🔙 播放上一首，播放列表:', playlist)
      console.log('🔙 当前索引:', currentIndex)
      
      if (!playlist || playlist.length === 0) {
        console.log('🔙 播放列表为空，无法播放上一首')
        return
      }
      
      let newIndex = currentIndex - 1
      if (newIndex < 0) {
        newIndex = playlist.length - 1
      }
      
      console.log('🔙 新索引:', newIndex)
      
      this.setData({
        currentTrackIndex: newIndex
      })
      
      const track = playlist[newIndex]
      console.log('🔙 选择的音频:', track)
      
      if (track) {
        // 获取音频URL，支持多种字段名
        const audioUrl = track.audioUrl || track.fileId || track.previewUrl
        console.log('🔙 音频URL:', audioUrl)
        
        if (audioUrl) {
          this.playTrack(audioUrl, track.title || track.name || `语音${newIndex + 1}`)
        } else {
          console.log('🔙 音频URL为空')
        }
      } else {
        console.log('🔙 音频数据为空')
      }
    },
    
    // 播放下一首
    playNext() {
      const playlist = this.data.playlist
      const currentIndex = this.data.currentTrackIndex
      console.log('⏭️ 播放下一首，播放列表:', playlist)
      console.log('⏭️ 当前索引:', currentIndex)
      
      if (!playlist || playlist.length === 0) {
        console.log('⏭️ 播放列表为空，无法播放下一首')
        return
      }
      
      let newIndex = currentIndex + 1
      if (newIndex >= playlist.length) {
        newIndex = 0
      }
      
      console.log('⏭️ 新索引:', newIndex)
      
      this.setData({
        currentTrackIndex: newIndex
      })
      
      const track = playlist[newIndex]
      console.log('⏭️ 选择的音频:', track)
      
      if (track) {
        // 获取音频URL，支持多种字段名
        const audioUrl = track.audioUrl || track.fileId || track.previewUrl
        console.log('⏭️ 音频URL:', audioUrl)
        
        if (audioUrl) {
          this.playTrack(audioUrl, track.title || track.name || `语音${newIndex + 1}`)
        } else {
          console.log('⏭️ 音频URL为空')
        }
      } else {
        console.log('⏭️ 音频数据为空')
      }
    },
    
    // 播放指定音频
    playTrack(audioUrl, fileName) {
      console.log('🎵 播放音频:', audioUrl, fileName)
      
      // 如果是云存储路径，需要获取临时访问链接
      if (audioUrl && audioUrl.startsWith('cloud://')) {
        wx.showLoading({
          title: '加载音频中...'
        })
        
        wx.cloud.getTempFileURL({
          fileList: [audioUrl]
        }).then(res => {
          wx.hideLoading()
          if (res.fileList && res.fileList.length > 0 && res.fileList[0].status === 0) {
            const tempFileURL = res.fileList[0].tempFileURL
            this.data.audioContext.src = tempFileURL
            this.data.audioContext.play()
            this.setData({
              isPlaying: true,
              isPaused: false,
              fileName: fileName
            })
            this.startProgressUpdate()
            this.startRotation()
          } else {
            wx.showToast({ title: '音频文件访问失败', icon: 'none' })
          }
        }).catch(err => {
          wx.hideLoading()
          console.error('获取临时链接失败:', err)
          wx.showToast({ title: '音频加载失败', icon: 'none' })
        })
      } else if (audioUrl) {
        // HTTP URL 或其他直接可用的URL
        this.data.audioContext.src = audioUrl
        this.data.audioContext.play()
        this.setData({
          isPlaying: true,
          isPaused: false,
          fileName: fileName
        })
        this.startProgressUpdate()
        this.startRotation()
      } else {
        wx.showToast({ title: '音频文件不可用', icon: 'none' })
      }
    },
    
    // 关闭播放器
    closePlayer() {
      this.stopAudio()
      this.triggerEvent('close')
    }
  }
})
