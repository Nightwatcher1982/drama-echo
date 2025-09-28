const app = getApp()
const adminConfig = require('../../utils/adminConfig')

Page({
  data: {
    // 管理员列表
    adminList: [],
    nicknameAdmins: [],
    
    // 配置信息
    developmentMode: false,
    totalAdmins: 0,
    
    // 添加新管理员
    showAddModal: false,
    newAdminOpenId: '',
    newAdminRemark: '',
    newAdminNickname: '',
    addType: 'openid', // 'openid' or 'nickname'
    
    // 当前用户信息
    currentUserInfo: null,
    currentOpenId: '',
    isCurrentUserAdmin: false
  },

  onLoad() {
    this.loadAdminConfig()
    this.loadCurrentUserInfo()
  },

  onShow() {
    this.loadAdminConfig()
  },

  // 加载管理员配置
  loadAdminConfig() {
    const config = adminConfig.getAdminConfig()
    
    // 处理OpenID管理员列表
    const adminList = config.adminOpenIds.map((openid, index) => ({
      id: `openid_${index}`,
      openid: openid,
      type: 'openid',
      remark: this.getOpenIdRemark(openid),
      isOriginal: index === 0 // 第一个是原始管理员，不能删除
    }))

    // 处理昵称管理员列表
    const nicknameAdmins = config.specialNicknameAdmins.map((nickname, index) => ({
      id: `nickname_${index}`,
      nickname: nickname,
      type: 'nickname',
      isOriginal: nickname === 'nightwatcher' // nightwatcher是原始管理员
    }))

    this.setData({
      adminList,
      nicknameAdmins,
      developmentMode: config.developmentConfig.allowAllUsers,
      totalAdmins: config.totalAdmins
    })
  },

  // 获取OpenID的备注信息
  getOpenIdRemark(openid) {
    const remarks = {
      'o1JKg5VC5Fe27QBwNZ2d0DPyKImU': '原始管理员'
    }
    return remarks[openid] || '管理员'
  },

  // 加载当前用户信息
  loadCurrentUserInfo() {
    const userInfo = app.globalData.userProfile
    const openid = app.globalData.openid
    const isAdmin = adminConfig.isAdmin(openid, userInfo)

    this.setData({
      currentUserInfo: userInfo,
      currentOpenId: openid,
      isCurrentUserAdmin: isAdmin
    })
  },

  // 显示添加管理员弹窗
  showAddAdminModal(e) {
    const type = e.currentTarget.dataset.type || 'openid'
    this.setData({
      showAddModal: true,
      addType: type,
      newAdminOpenId: '',
      newAdminRemark: '',
      newAdminNickname: ''
    })
  },

  // 隐藏添加管理员弹窗
  hideAddModal() {
    this.setData({
      showAddModal: false
    })
  },

  // 输入新管理员OpenID
  onOpenIdInput(e) {
    this.setData({
      newAdminOpenId: e.detail.value
    })
  },

  // 输入管理员备注
  onRemarkInput(e) {
    this.setData({
      newAdminRemark: e.detail.value
    })
  },

  // 输入管理员昵称
  onNicknameInput(e) {
    this.setData({
      newAdminNickname: e.detail.value
    })
  },

  // 确认添加管理员
  confirmAddAdmin() {
    const { addType, newAdminOpenId, newAdminRemark, newAdminNickname } = this.data

    if (addType === 'openid') {
      if (!newAdminOpenId.trim()) {
        wx.showToast({
          title: '请输入OpenID',
          icon: 'none'
        })
        return
      }

      // 检查是否已存在
      if (adminConfig.ADMIN_OPENIDS.includes(newAdminOpenId.trim())) {
        wx.showToast({
          title: '该OpenID已是管理员',
          icon: 'none'
        })
        return
      }

      // 显示添加说明
      wx.showModal({
        title: '添加管理员',
        content: `即将添加新的管理员：\n\nOpenID: ${newAdminOpenId}\n备注: ${newAdminRemark || '无'}\n\n⚠️ 注意：这需要在代码中手动添加，请查看控制台的详细说明。`,
        confirmText: '查看说明',
        success: (res) => {
          if (res.confirm) {
            this.showAddInstructions('openid', newAdminOpenId, newAdminRemark)
          }
        }
      })

    } else {
      if (!newAdminNickname.trim()) {
        wx.showToast({
          title: '请输入昵称',
          icon: 'none'
        })
        return
      }

      // 显示添加说明
      wx.showModal({
        title: '添加管理员',
        content: `即将添加新的管理员：\n\n昵称: ${newAdminNickname}\n\n⚠️ 注意：基于昵称的权限不够安全，建议使用OpenID方式。`,
        confirmText: '查看说明',
        success: (res) => {
          if (res.confirm) {
            this.showAddInstructions('nickname', newAdminNickname)
          }
        }
      })
    }

    this.hideAddModal()
  },

  // 显示添加说明
  showAddInstructions(type, value, remark = '') {
    if (type === 'openid') {
      console.log('🔧 添加新管理员OpenID说明:')
      console.log('1. 打开文件: utils/adminConfig.js')
      console.log('2. 在 ADMIN_OPENIDS 数组中添加:')
      console.log(`   '${value}', // ${remark || '新管理员'}`)
      console.log('3. 保存文件并重启小程序')
      console.log('')
      console.log('完整示例:')
      console.log('const ADMIN_OPENIDS = [')
      console.log('  \'o1JKg5VC5Fe27QBwNZ2d0DPyKImU\', // 原始管理员')
      console.log(`  '${value}', // ${remark || '新管理员'}`)
      console.log(']')
    } else {
      console.log('🔧 添加新管理员昵称说明:')
      console.log('1. 打开文件: utils/adminConfig.js')
      console.log('2. 在 SPECIAL_NICKNAME_ADMINS 数组中添加:')
      console.log(`   '${value}',`)
      console.log('3. 保存文件并重启小程序')
    }

    wx.showToast({
      title: '说明已输出到控制台',
      icon: 'success'
    })
  },

  // 复制OpenID
  copyOpenId(e) {
    const openid = e.currentTarget.dataset.openid
    wx.setClipboardData({
      data: openid,
      success: () => {
        wx.showToast({
          title: 'OpenID已复制',
          icon: 'success'
        })
      }
    })
  },

  // 复制当前用户OpenID
  copyCurrentOpenId() {
    wx.setClipboardData({
      data: this.data.currentOpenId,
      success: () => {
        wx.showToast({
          title: '你的OpenID已复制',
          icon: 'success'
        })
      }
    })
  },

  // 切换开发模式说明
  toggleDevModeInfo() {
    const { developmentMode } = this.data
    wx.showModal({
      title: '开发模式说明',
      content: `当前状态: ${developmentMode ? '开启' : '关闭'}\n\n开启时：所有用户都有管理员权限\n关闭时：只有配置的管理员有权限\n\n要修改此设置，请编辑 utils/adminConfig.js 文件中的 DEVELOPMENT_CONFIG.allowAllUsers 值。`,
      showCancel: false,
      confirmText: '我知道了'
    })
  }
})