// 调试守护者计数页面
Page({
  data: {
    actorId: '676f8b5a5f8b5a5f8b5a5f8b', // 孙一城的演员ID
    debugInfo: {},
    loading: false
  },

  onLoad() {
    console.log('🔍 调试守护者计数页面加载')
    this.debugGuardianCount()
  },

  // 调试守护者计数
  async debugGuardianCount() {
    this.setData({ loading: true })
    
    try {
      console.log('🔍 开始调试守护者计数...')
      
      const db = wx.cloud.database()
      const actorId = this.data.actorId
      
      // 1. 获取演员信息
      const actorResult = await db.collection('actors').doc(actorId).get()
      const actor = actorResult.data
      
      // 2. 获取该演员的所有语音包
      const voicePacksResult = await db.collection('voicePacks')
        .where({
          actorId: actorId,
          isActive: true
        })
        .get()
      
      const packIds = voicePacksResult.data.map(pack => pack._id)
      
      // 3. 查询新集合的购买记录
      const newPurchasesResult = await db.collection('user_purchases')
        .where({
          packId: db.command.in(packIds),
          status: 'completed'
        })
        .get()
      
      // 4. 查询旧集合的购买记录
      const oldPurchasesResult = await db.collection('userPurchases')
        .where({
          voicePackId: db.command.in(packIds),
          actorId: actorId
        })
        .get()
      
      // 5. 统计唯一用户
      const uniqueUsers = new Set()
      newPurchasesResult.data.forEach(purchase => {
        uniqueUsers.add(purchase._openid)
      })
      oldPurchasesResult.data.forEach(purchase => {
        uniqueUsers.add(purchase._openid)
      })
      
      const debugInfo = {
        actor: {
          id: actor._id,
          name: actor.name,
          currentGuardianCount: actor.stats?.guardianCount || 0
        },
        voicePacks: {
          count: voicePacksResult.data.length,
          packIds: packIds,
          packNames: voicePacksResult.data.map(p => p.name)
        },
        purchases: {
          newCollection: {
            count: newPurchasesResult.data.length,
            records: newPurchasesResult.data.map(p => ({
              openid: p._openid,
              packId: p.packId,
              status: p.status,
              purchaseTime: p.purchaseTime
            }))
          },
          oldCollection: {
            count: oldPurchasesResult.data.length,
            records: oldPurchasesResult.data.map(p => ({
              openid: p._openid,
              voicePackId: p.voicePackId,
              actorId: p.actorId
            }))
          }
        },
        guardianCount: {
          calculated: uniqueUsers.size,
          uniqueUsers: Array.from(uniqueUsers)
        }
      }
      
      this.setData({ debugInfo })
      
      console.log('🔍 调试信息:', debugInfo)
      
      // 显示调试结果
      wx.showModal({
        title: '调试结果',
        content: `演员: ${actor.name}\n当前守护者计数: ${actor.stats?.guardianCount || 0}\n计算出的守护者计数: ${uniqueUsers.size}\n\n语音包数量: ${voicePacksResult.data.length}\n新集合购买记录: ${newPurchasesResult.data.length}条\n旧集合购买记录: ${oldPurchasesResult.data.length}条\n\n唯一用户数: ${uniqueUsers.size}人`,
        showCancel: false
      })
      
    } catch (error) {
      console.error('❌ 调试失败:', error)
      wx.showModal({
        title: '调试失败',
        content: error.message || '调试失败',
        showCancel: false
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 手动更新守护者计数
  async updateGuardianCount() {
    this.setData({ loading: true })
    
    try {
      console.log('🔄 手动更新守护者计数...')
      
      const res = await wx.cloud.callFunction({
        name: 'updateActorGuardianCount',
        data: { actorId: this.data.actorId }
      })

      if (res.result.code === 0) {
        const { guardianCount, uniqueUsers } = res.result.data
        
        wx.showModal({
          title: '更新成功',
          content: `守护者计数已更新为: ${guardianCount}\n\n购买用户数量: ${uniqueUsers.length}人\n\n用户列表:\n${uniqueUsers.join('\n')}`,
          showCancel: false
        })
        
        // 重新调试以查看更新后的结果
        setTimeout(() => {
          this.debugGuardianCount()
        }, 1000)
        
        console.log('✅ 守护者计数更新成功:', guardianCount)
      } else {
        throw new Error(res.result.message)
      }
    } catch (error) {
      console.error('❌ 更新守护者计数失败:', error)
      wx.showModal({
        title: '更新失败',
        content: error.message || '更新失败',
        showCancel: false
      })
    } finally {
      this.setData({ loading: false })
    }
  }
})








