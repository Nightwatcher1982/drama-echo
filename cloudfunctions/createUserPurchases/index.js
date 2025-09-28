const cloud = require('wx-server-sdk')

// 初始化 cloud
cloud.init({ env: 'cloud1-2gyb3dkq4c474fe4' })

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  console.log('为用户创建购买记录，用户OpenID:', wxContext.OPENID)

  try {
    if (!wxContext.OPENID) {
      return {
        code: -1,
        message: '用户未登录，无法创建购买记录'
      }
    }

    // 检查用户是否已有购买记录
    const existingPurchases = await db.collection('userPurchases')
      .where({
        _openid: wxContext.OPENID
      })
      .get()

    if (existingPurchases.data.length > 0) {
      console.log('用户已有购买记录，数量:', existingPurchases.data.length)
      return {
        code: 0,
        message: '用户购买记录已存在',
        data: {
          existingPurchases: existingPurchases.data.length,
          purchases: existingPurchases.data.map(p => ({
            voicePackId: p.voicePackId,
            actorId: p.actorId,
            purchaseTime: p.purchaseTime
          }))
        }
      }
    }

    // 创建模拟购买记录
    const purchaseRecords = [
      {
        _openid: wxContext.OPENID,
        actorId: 'actor_001',
        voicePackId: 'pack_001',
        orderId: `demo_order_${Date.now()}_1`,
        purchaseTime: new Date(),
        price: 2999,
        status: 'paid'
      },
      {
        _openid: wxContext.OPENID,
        actorId: 'actor_001', 
        voicePackId: 'pack_002',
        orderId: `demo_order_${Date.now()}_2`,
        purchaseTime: new Date(),
        price: 1999,
        status: 'paid'
      },
      {
        _openid: wxContext.OPENID,
        actorId: 'actor_002',
        voicePackId: 'pack_004',
        orderId: `demo_order_${Date.now()}_3`,
        purchaseTime: new Date(),
        price: 2499,
        status: 'paid'
      },
      {
        _openid: wxContext.OPENID,
        actorId: 'actor_003',
        voicePackId: 'pack_007',
        orderId: `demo_order_${Date.now()}_4`,
        purchaseTime: new Date(),
        price: 2699,
        status: 'paid'
      }
    ]

    console.log('开始创建购买记录，数量:', purchaseRecords.length)

    // 批量插入购买记录
    const insertPromises = purchaseRecords.map(async (record) => {
      try {
        const result = await db.collection('userPurchases').add({ data: record })
        console.log(`✅ 购买记录创建成功: ${record.voicePackId}`)
        return {
          voicePackId: record.voicePackId,
          actorId: record.actorId,
          success: true
        }
      } catch (error) {
        console.error(`❌ 购买记录创建失败: ${record.voicePackId}`, error)
        return {
          voicePackId: record.voicePackId,
          actorId: record.actorId,
          success: false,
          error: error.message
        }
      }
    })

    const results = await Promise.all(insertPromises)
    const successCount = results.filter(r => r.success).length
    const failCount = results.length - successCount

    console.log(`购买记录创建完成，成功: ${successCount}, 失败: ${failCount}`)

    return {
      code: 0,
      message: `用户购买记录创建完成！成功 ${successCount} 个`,
      data: {
        openid: wxContext.OPENID,
        totalRecords: results.length,
        successCount: successCount,
        failCount: failCount,
        records: results,
        message: '现在可以播放已购买的语音包了！'
      }
    }

  } catch (error) {
    console.error('创建用户购买记录失败:', error)
    return {
      code: -1,
      message: error.message || '创建购买记录失败',
      data: null
    }
  }
}