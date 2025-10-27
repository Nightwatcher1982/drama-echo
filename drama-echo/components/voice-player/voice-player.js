// 唱片机风格语音播放器组件
Component({
  properties: {
    // 是否显示播放器
    isOpen: {
      type: Boolean,
      value: false
    },
    // 当前语音包
    currentPack: {
      type: Object,
      value: {}
    },
    // 当前演员
    currentActor: {
      type: Object,
      value: {}
    },
    // 播放列表
    playlist: {
      type: Array,
      value: []
    }
  },

  data: {
    // 播放状态
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    currentIndex: 0,
    
    // 音量控制
    volume: 80,
    
    // 播放列表
    showPlaylist: false,
    
    // 播放模式：sequential(顺序), repeat(重复), random(随机)
    playMode: 'sequential',
    playModeIcons: {
      sequential: '🔄',
      repeat: '🔁', 
      random: '🔀'
    },
    playModeTexts: {
      sequential: '顺序播放',
      repeat: '单曲循环',
      random: '随机播放'
    },
    
    // 音频上下文
    audioContext: null,
    progressTimer: null
  },

  lifetimes: {
    attached() {
      console.log('语音播放器组件初始化')
    },
    
    detached() {
      this.cleanup()
    }
  },

  observers: {
    'playlist, currentPack': function(playlist, currentPack) {
      if (playlist && playlist.length > 0 && currentPack && currentPack._id) {
        // 找到当前语音包在播放列表中的位置
        const index = playlist.findIndex(item => item.packId === currentPack._id)
        if (index >= 0) {
          this.setData({ currentIndex: index })
        }
      }
    }
  },

  methods: {
    // 播放/暂停切换
    togglePlay() {
      if (this.data.isPlaying) {
        this.pauseAudio()
      } else {
        this.playAudio()
      }
    },

    // 播放音频
    async playAudio() {
      const { playlist, currentIndex } = this.data
      if (!playlist || playlist.length === 0) {
        wx.showToast({
          title: '没有可播放的内容',
          icon: 'none'
        })
        return
      }

      const currentTrack = playlist[currentIndex]
      if (!currentTrack || !currentTrack.fileId) {
        wx.showToast({
          title: '音频文件不存在',
          icon: 'none'
        })
        return
      }

      try {
        // 如果已经有音频在播放，先停止
        if (this.data.audioContext) {
          this.data.audioContext.destroy()
        }

        // 创建新的音频上下文
        const audioContext = wx.createInnerAudioContext()
        
        // 设置iOS静音模式下也能播放声音
        audioContext.obeyMuteSwitch = false
        
        // 防下载设置
        audioContext.src = currentTrack.fileId
        audioContext.autoplay = false
        audioContext.volume = this.data.volume / 100

        // 音频事件监听
        audioContext.onPlay(() => {
          console.log('开始播放:', currentTrack.name)
          this.setData({ isPlaying: true })
          this.startProgressTimer()
        })

        audioContext.onPause(() => {
          console.log('暂停播放')
          this.setData({ isPlaying: false })
          this.stopProgressTimer()
        })

        audioContext.onStop(() => {
          console.log('停止播放')
          this.setData({ 
            isPlaying: false,
            currentTime: 0
          })
          this.stopProgressTimer()
        })

        audioContext.onEnded(() => {
          console.log('播放结束')
          this.setData({ 
            isPlaying: false,
            currentTime: 0
          })
          this.stopProgressTimer()
          this.playNext() // 自动播放下一首
        })

        audioContext.onError((err) => {
          console.error('音频播放错误:', err)
          wx.showToast({
            title: '播放失败',
            icon: 'none'
          })
          this.setData({ isPlaying: false })
        })

        audioContext.onCanplay(() => {
          this.setData({ 
            duration: Math.floor(audioContext.duration) || currentTrack.duration || 0
          })
        })

        // 保存音频上下文
        this.setData({ audioContext })
        
        // 开始播放
        audioContext.play()

      } catch (error) {
        console.error('创建音频上下文失败:', error)
        wx.showToast({
          title: '播放器初始化失败',
          icon: 'none'
        })
      }
    },

    // 暂停音频
    pauseAudio() {
      const { audioContext } = this.data
      if (audioContext) {
        audioContext.pause()
      }
    },

    // 停止音频
    stopAudio() {
      const { audioContext } = this.data
      if (audioContext) {
        audioContext.stop()
      }
      this.stopProgressTimer()
    },

    // 上一首
    playPrevious() {
      const { currentIndex, playlist, playMode } = this.data
      let newIndex = currentIndex

      if (playMode === 'random') {
        newIndex = Math.floor(Math.random() * playlist.length)
      } else {
        newIndex = currentIndex - 1
        if (newIndex < 0) {
          newIndex = playlist.length - 1
        }
      }

      this.setData({ currentIndex: newIndex })
      this.stopAudio()
      setTimeout(() => {
        this.playAudio()
      }, 100)
    },

    // 下一首
    playNext() {
      const { currentIndex, playlist, playMode } = this.data
      let newIndex = currentIndex

      if (playMode === 'repeat') {
        // 单曲循环，继续播放当前歌曲
        newIndex = currentIndex
      } else if (playMode === 'random') {
        newIndex = Math.floor(Math.random() * playlist.length)
      } else {
        // 顺序播放
        newIndex = currentIndex + 1
        if (newIndex >= playlist.length) {
          newIndex = 0
        }
      }

      this.setData({ currentIndex: newIndex })
      this.stopAudio()
      setTimeout(() => {
        this.playAudio()
      }, 100)
    },

    // 播放指定曲目
    playTrack(e) {
      const index = e.currentTarget.dataset.index
      this.setData({ currentIndex: index })
      this.stopAudio()
      setTimeout(() => {
        this.playAudio()
      }, 100)
    },

    // 音量控制
    onVolumeChange(e) {
      const volume = e.detail.value
      this.setData({ volume })
      
      const { audioContext } = this.data
      if (audioContext) {
        audioContext.volume = volume / 100
      }
    },

    // 进度控制
    onProgressChange(e) {
      const newTime = e.detail.value
      this.setData({ currentTime: newTime })
      
      const { audioContext } = this.data
      if (audioContext) {
        audioContext.seek(newTime)
      }
    },

    // 进度拖拽中
    onProgressChanging(e) {
      const newTime = e.detail.value
      this.setData({ currentTime: newTime })
    },

    // 切换播放模式
    togglePlayMode() {
      const modes = ['sequential', 'repeat', 'random']
      const currentModeIndex = modes.indexOf(this.data.playMode)
      const nextModeIndex = (currentModeIndex + 1) % modes.length
      const newMode = modes[nextModeIndex]
      
      this.setData({ playMode: newMode })
      
      wx.showToast({
        title: this.data.playModeTexts[newMode],
        icon: 'none',
        duration: 1000
      })
    },

    // 切换播放列表显示
    togglePlaylist() {
      this.setData({ 
        showPlaylist: !this.data.showPlaylist 
      })
    },

    // 开始进度计时器
    startProgressTimer() {
      this.stopProgressTimer() // 先清除已有的计时器
      
      this.data.progressTimer = setInterval(() => {
        const { audioContext } = this.data
        if (audioContext && this.data.isPlaying) {
          this.setData({
            currentTime: Math.floor(audioContext.currentTime)
          })
        }
      }, 1000)
    },

    // 停止进度计时器
    stopProgressTimer() {
      if (this.data.progressTimer) {
        clearInterval(this.data.progressTimer)
        this.setData({ progressTimer: null })
      }
    },

    // 格式化时间显示
    formatTime(seconds) {
      if (!seconds || isNaN(seconds)) return '00:00'
      
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    },

    // 关闭播放器
    closePlayer() {
      this.triggerEvent('close')
      this.cleanup()
    },

    // 清理资源
    cleanup() {
      this.stopAudio()
      
      const { audioContext } = this.data
      if (audioContext) {
        audioContext.destroy()
        this.setData({ audioContext: null })
      }
      
      this.setData({
        isPlaying: false,
        currentTime: 0,
        duration: 0
      })
    },

    // 阻止事件冒泡
    stopPropagation() {
      // 阻止点击播放器主体时关闭
    }
  }
})