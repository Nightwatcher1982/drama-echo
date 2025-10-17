const cloud = require('wx-server-sdk')

// 初始化云开发环境
cloud.init({
  env: 'cloud1-2gyb3dkq4c474fe4'
})

const db = cloud.database()

// 主函数
exports.main = async (event, context) => {
  const { userId, status, page = 1, pageSize = 10 } = event
  
  try {
    console.log('获取用户订单:', { userId, status, page, pageSize })
    
    if (!userId) {
      return {
        code: -1,
        message: '用户ID不能为空'
      }
    }
    
    // 构建查询条件
    let whereCondition = {
      userId: userId
    }
    
    if (status) {
      whereCondition.status = status
    }
    
    // 计算分页
    const skip = (page - 1) * pageSize
    
    // 查询订单列表
    const result = await db.collection('orders')
      .where(whereCondition)
      .orderBy('createTime', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get()
    
    // 获取总数
    const countResult = await db.collection('orders')
      .where(whereCondition)
      .count()
    
    // 格式化订单数据
    const orders = result.data.map(order => ({
      orderId: order._id,
      packName: order.packName,
      actorName: order.actorName,
      amount: order.amount,
      status: order.status,
      createTime: order.createTime,
      payTime: order.payTime,
      refundTime: order.refundTime,
      description: order.description
    }))
    
    return {
      code: 0,
      message: '获取订单列表成功',
      data: {
        orders: orders,
        total: countResult.total,
        page: page,
        pageSize: pageSize,
        totalPages: Math.ceil(countResult.total / pageSize)
      }
    }
    
  } catch (error) {
    console.error('获取用户订单失败:', error)
    return {
      code: -1,
      message: '获取用户订单失败: ' + error.message
    }
  }
}
