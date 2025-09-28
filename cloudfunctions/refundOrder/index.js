const cloud = require('wx-server-sdk')
const crypto = require('crypto')

// 初始化云开发环境
cloud.init({
  env: 'cloud1-2gyb3dkq4c474fe4'
})

const db = cloud.database()

// 微信支付配置
const WECHAT_PAY_CONFIG = {
  appid: 'wxa7e86bc1f0369892',
  mch_id: '1728007358',
  api_key: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6' // 请替换为您的API密钥
}

// 生成随机字符串
function generateNonceStr() {
  return Math.random().toString(36).substr(2, 15)
}

// 生成签名
function generateSign(params, apiKey) {
  const sortedKeys = Object.keys(params).sort()
  let stringA = ''
  sortedKeys.forEach(key => {
    if (params[key] && key !== 'sign') {
      stringA += `${key}=${params[key]}&`
    }
  })
  const stringSignTemp = stringA + `key=${apiKey}`
  return crypto.createHash('md5').update(stringSignTemp, 'utf8').digest('hex').toUpperCase()
}

// 生成退款单号
function generateRefundNo() {
  const now = new Date()
  const timestamp = now.getTime()
  const random = Math.random().toString(36).substr(2, 6)
  return `refund_${timestamp}_${random}`
}

// 调用微信支付退款接口
async function callWechatRefund(refundData) {
  const params = {
    appid: WECHAT_PAY_CONFIG.appid,
    mch_id: WECHAT_PAY_CONFIG.mch_id,
    nonce_str: generateNonceStr(),
    out_trade_no: refundData.orderNo,
    out_refund_no: refundData.refundNo,
    total_fee: refundData.totalFee,
    refund_fee: refundData.refundFee,
    refund_desc: refundData.refundDesc || '用户申请退款'
  }
  
  // 生成签名
  params.sign = generateSign(params, WECHAT_PAY_CONFIG.api_key)
  
  // 构建XML请求体
  let xmlBody = '<xml>'
  Object.keys(params).forEach(key => {
    xmlBody += `<${key}><![CDATA[${params[key]}]]></${key}>`
  })
  xmlBody += '</xml>'
  
  try {
    const response = await cloud.callFunction({
      name: 'httpRequest',
      data: {
        url: 'https://api.mch.weixin.qq.com/secapi/pay/refund',
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml'
        },
        body: xmlBody
      }
    })
    
    return response.result
  } catch (error) {
    console.error('调用微信退款接口失败:', error)
    throw error
  }
}

// 解析XML响应
function parseXML(xmlString) {
  const result = {}
  const regex = /<(\w+)><!\[CDATA\[(.*?)\]\]><\/\1>/g
  let match
  
  while ((match = regex.exec(xmlString)) !== null) {
    result[match[1]] = match[2]
  }
  
  return result
}

// 主函数
exports.main = async (event, context) => {
  const { orderId, refundReason, refundAmount } = event
  
  try {
    console.log('开始处理退款:', { orderId, refundReason, refundAmount })
    
    // 1. 获取订单信息
    const orderResult = await db.collection('orders').doc(orderId).get()
    if (!orderResult.data) {
      return {
        code: -1,
        message: '订单不存在'
      }
    }
    
    const orderData = orderResult.data
    
    // 2. 检查订单状态
    if (orderData.status !== 'paid') {
      return {
        code: -1,
        message: '只有已支付的订单才能申请退款'
      }
    }
    
    // 3. 检查是否已经退款
    if (orderData.status === 'refunded') {
      return {
        code: -1,
        message: '该订单已经退款'
      }
    }
    
    // 4. 确定退款金额
    const refundFee = refundAmount || orderData.amount
    
    // 5. 生成退款单号
    const refundNo = generateRefundNo()
    
    // 6. 调用微信退款接口
    const refundResult = await callWechatRefund({
      orderNo: orderId,
      refundNo: refundNo,
      totalFee: orderData.amount,
      refundFee: refundFee,
      refundDesc: refundReason || '用户申请退款'
    })
    
    console.log('微信退款响应:', refundResult)
    
    // 7. 解析退款响应
    const refundData = parseXML(refundResult)
    
    if (refundData.return_code === 'SUCCESS' && refundData.result_code === 'SUCCESS') {
      // 8. 更新订单状态
      await db.collection('orders').doc(orderId).update({
        data: {
          status: 'refunded',
          refundId: refundData.refund_id,
          refundTime: new Date(),
          refundAmount: refundFee,
          refundReason: refundReason || '用户申请退款'
        }
      })
      
      // 9. 更新用户购买记录状态
      await db.collection('user_purchases').where({
        orderId: orderId
      }).update({
        data: {
          status: 'refunded'
        }
      })
      
      return {
        code: 0,
        message: '退款申请成功',
        data: {
          refundId: refundData.refund_id,
          refundNo: refundNo,
          refundAmount: refundFee
        }
      }
    } else {
      console.error('微信退款失败:', refundData)
      return {
        code: -1,
        message: refundData.return_msg || '微信退款失败'
      }
    }
    
  } catch (error) {
    console.error('处理退款失败:', error)
    return {
      code: -1,
      message: '处理退款失败: ' + error.message
    }
  }
}
