// 语音包详情页测试脚本
// 在微信开发者工具控制台中运行

const app = getApp()

// 测试云函数调用
async function testVoicePackDetail() {
  console.log('=== 开始测试语音包详情页云函数 ===')
  
  try {
    // 测试现有的语音包ID
    const testPackIds = ['pack_001', 'pack_002', 'pack_003']
    
    for (const packId of testPackIds) {
      console.log(`\n测试语音包ID: ${packId}`)
      
      const result = await wx.cloud.callFunction({
        name: 'getVoicePackDetail',
        data: { packId }
      })
      
      console.log('云函数返回结果:', result.result)
      
      if (result.result && result.result.code === 0) {
        const data = result.result.data
        console.log('✅ 成功获取语音包详情:')
        console.log('- 语音包名称:', data.name)
        console.log('- 演员姓名:', data.actorName)
        console.log('- 语音数量:', data.voiceCount)
        console.log('- 照片数量:', data.photos?.length || 0)
        console.log('- 套餐价格:', data.packagePrice)
        console.log('- 原价:', data.originalPrice)
        console.log('- 节省金额:', data.saveAmount)
        
        if (data.voices && data.voices.length > 0) {
          console.log('- 语音列表:')
          data.voices.forEach((voice, index) => {
            console.log(`  ${index + 1}. ${voice.title} - ¥${voice.price / 100}`)
          })
        }
      } else {
        console.error('❌ 获取失败:', result.result?.message || '未知错误')
      }
    }
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error)
  }
  
  console.log('\n=== 测试完成 ===')
}

// 测试数据库状态
async function testDatabaseStatus() {
  console.log('=== 检查数据库状态 ===')
  
  try {
    const result = await wx.cloud.callFunction({
      name: 'initVoicePackDatabase',
      data: { action: 'checkStatus' }
    })
    
    console.log('数据库状态:', result.result)
    
  } catch (error) {
    console.error('检查数据库状态失败:', error)
  }
}

// 运行所有测试
async function runAllTests() {
  await testDatabaseStatus()
  await testVoicePackDetail()
}

// 导出测试函数
module.exports = {
  testVoicePackDetail,
  testDatabaseStatus,
  runAllTests
}

// 如果直接运行此脚本
if (typeof wx !== 'undefined') {
  runAllTests()
}
