const app = getApp()

Page({
  data: {
    zodiacSigns: [
      { name: '白羊座', en: 'Aries', dates: '3/21-4/19', symbol: '♈' },
      { name: '金牛座', en: 'Taurus', dates: '4/20-5/20', symbol: '♉' },
      { name: '双子座', en: 'Gemini', dates: '5/21-6/21', symbol: '♊' },
      { name: '巨蟹座', en: 'Cancer', dates: '6/22-7/22', symbol: '♋' },
      { name: '狮子座', en: 'Leo', dates: '7/23-8/22', symbol: '♌' },
      { name: '处女座', en: 'Virgo', dates: '8/23-9/22', symbol: '♍' },
      { name: '天秤座', en: 'Libra', dates: '9/23-10/23', symbol: '♎' },
      { name: '天蝎座', en: 'Scorpio', dates: '10/24-11/21', symbol: '♏' },
      { name: '射手座', en: 'Sagittarius', dates: '11/22-12/21', symbol: '♐' },
      { name: '摩羯座', en: 'Capricorn', dates: '12/22-1/19', symbol: '♑' },
      { name: '水瓶座', en: 'Aquarius', dates: '1/20-2/18', symbol: '♒' },
      { name: '双鱼座', en: 'Pisces', dates: '2/19-3/20', symbol: '♓' }
    ]
  },
  
  onLoad() {
    console.log('星座选择页面加载')
  },
  
  selectZodiac(e) {
    const zodiac = e.currentTarget.dataset.zodiac;
    console.log('选择星座:', zodiac);
    
    // 保存用户选择的星座
    const userData = app.globalData.userData
    if (userData) {
      userData.zodiacSign = zodiac.name
      app.saveUserData()
      console.log('星座已保存:', zodiac.name)
    }
    
    // 触觉反馈
    wx.vibrateShort()
    
    // 显示成功提示
    wx.showToast({
      title: `已选择${zodiac.name}`,
      icon: 'success',
      duration: 1500
    })
    
    // 延迟返回上级页面
    setTimeout(() => {
      wx.navigateBack()
    }, 1500)
  },
  
  // 分享功能
  onShareAppMessage() {
    return {
      title: '选择你的星座 - 魔都戏剧',
      path: '/pages/zodiac/zodiac',
      imageUrl: 'cloud://cloud1-2gyb3dkq4c474fe4.636c-cloud1-2gyb3dkq4c474fe4-1371126028/images/xjhx-logo.png'
    }
  }
}) 