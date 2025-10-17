const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    console.log('开始创建许愿池相关索引...')
    
    // 创建 wish_likes 集合的复合索引
    // 这个索引用于快速查询用户是否已经点赞过某个许愿
    try {
      await db.collection('wish_likes').createIndex({
        keys: {
          wishId: 1,
          userId: 1
        },
        options: {
          unique: true, // 确保同一用户不能对同一许愿重复点赞
          name: 'wish_user_unique'
        }
      })
      console.log('✅ wish_likes 复合索引创建成功')
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ wish_likes 复合索引已存在')
      } else {
        console.error('❌ wish_likes 复合索引创建失败:', error)
      }
    }

    // 创建 wishes 集合的索引
    try {
      // 按愿力数量排序的索引
      await db.collection('wishes').createIndex({
        keys: {
          wishCount: -1,
          createdAt: -1
        },
        options: {
          name: 'wish_count_time'
        }
      })
      console.log('✅ wishes 愿力时间索引创建成功')
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ wishes 愿力时间索引已存在')
      } else {
        console.error('❌ wishes 愿力时间索引创建失败:', error)
      }
    }

    // 创建按用户和日期查询的索引
    try {
      await db.collection('wishes').createIndex({
        keys: {
          userId: 1,
          createdAt: -1
        },
        options: {
          name: 'wish_user_time'
        }
      })
      console.log('✅ wishes 用户时间索引创建成功')
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ wishes 用户时间索引已存在')
      } else {
        console.error('❌ wishes 用户时间索引创建失败:', error)
      }
    }

    return {
      code: 0,
      message: '索引创建完成',
      data: {
        indexes: [
          'wish_likes: wishId + userId (unique)',
          'wishes: wishCount + createdAt',
          'wishes: userId + createdAt'
        ]
      }
    }

  } catch (error) {
    console.error('创建索引失败:', error)
    return {
      code: -1,
      message: '创建索引失败: ' + error.message,
      data: null
    }
  }
}



