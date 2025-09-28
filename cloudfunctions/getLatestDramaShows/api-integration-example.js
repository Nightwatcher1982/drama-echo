// API集成示例 - 演示如何集成外部戏剧演出API
const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// API配置
const API_CONFIG = {
  // 大麦网API配置 (需要申请API密钥)
  damai: {
    key: process.env.DAMAI_API_KEY || 'your_damai_api_key',
    baseUrl: 'https://api.damai.cn',
    endpoints: {
      shows: '/shows',
      venues: '/venues',
      artists: '/artists'
    }
  },
  
  // Ticketmaster API配置 (免费，每月500次调用)
  ticketmaster: {
    key: process.env.TICKETMASTER_API_KEY || 'your_ticketmaster_api_key',
    baseUrl: 'https://app.ticketmaster.com/discovery/v2',
    endpoints: {
      events: '/events.json',
      venues: '/venues.json',
      attractions: '/attractions.json'
    }
  },
  
  // 聚合数据API配置 (备选方案)
  juhe: {
    key: process.env.JUHE_API_KEY || 'your_juhe_api_key',
    baseUrl: 'http://v.juhe.cn',
    endpoints: {
      damai: '/damai/query'
    }
  }
}

// 从大麦网API获取演出信息
async function fetchShowsFromDamai(city = '上海', category = 'drama', limit = 50) {
  try {
    const response = await axios.get(`${API_CONFIG.damai.baseUrl}${API_CONFIG.damai.endpoints.shows}`, {
      params: {
        key: API_CONFIG.damai.key,
        city: city,
        category: category,
        limit: limit,
        format: 'json'
      },
      timeout: 10000
    })
    
    if (response.data && response.data.code === 0) {
      return response.data.data.shows || []
    } else {
      console.error('大麦网API返回错误:', response.data)
      return []
    }
  } catch (error) {
    console.error('大麦网API调用失败:', error.message)
    return []
  }
}

// 从Ticketmaster API获取演出信息
async function fetchShowsFromTicketmaster(city = 'Shanghai', classificationName = 'theatre', size = 50) {
  try {
    const response = await axios.get(`${API_CONFIG.ticketmaster.baseUrl}${API_CONFIG.ticketmaster.endpoints.events}`, {
      params: {
        apikey: API_CONFIG.ticketmaster.key,
        city: city,
        classificationName: classificationName,
        size: size,
        sort: 'date,asc'
      },
      timeout: 10000
    })
    
    if (response.data && response.data._embedded) {
      return response.data._embedded.events || []
    } else {
      console.error('Ticketmaster API返回错误:', response.data)
      return []
    }
  } catch (error) {
    console.error('Ticketmaster API调用失败:', error.message)
    return []
  }
}

// 从聚合数据API获取演出信息
async function fetchShowsFromJuhe(city = '上海') {
  try {
    const response = await axios.get(`${API_CONFIG.juhe.baseUrl}${API_CONFIG.juhe.endpoints.damai}`, {
      params: {
        key: API_CONFIG.juhe.key,
        city: city,
        format: 'json'
      },
      timeout: 10000
    })
    
    if (response.data && response.data.error_code === 0) {
      return response.data.result || []
    } else {
      console.error('聚合数据API返回错误:', response.data)
      return []
    }
  } catch (error) {
    console.error('聚合数据API调用失败:', error.message)
    return []
  }
}

// 数据格式转换 - 统一不同API的数据格式
function transformShowData(show, source = 'damai') {
  if (source === 'damai') {
    return {
      id: show.id || show.showId,
      title: show.title || show.showName,
      englishTitle: show.englishTitle || show.englishName || '',
      genre: show.genre || show.category || '演出',
      cast: show.cast || show.artists || [],
      director: show.director || '',
      venue: show.venue || show.venueName || '',
      address: show.address || show.venueAddress || '',
      dates: show.dates || show.showDates || [],
      time: show.time || show.showTime || '',
      duration: show.duration || show.showDuration || '',
      price: show.price || show.ticketPrice || '',
      status: show.status || show.saleStatus || '未知',
      description: show.description || show.showDesc || '',
      poster: show.poster || show.posterUrl || '',
      tags: show.tags || show.categories || []
    }
  } else if (source === 'ticketmaster') {
    return {
      id: show.id,
      title: show.name,
      englishTitle: show.name,
      genre: show.classifications?.[0]?.segment?.name || '演出',
      cast: show._embedded?.attractions?.[0]?.name ? [show._embedded.attractions[0].name] : [],
      director: '',
      venue: show._embedded?.venues?.[0]?.name || '',
      address: show._embedded?.venues?.[0]?.address?.line1 || '',
      dates: show.dates?.start?.dateTime ? [show.dates.start.dateTime.split('T')[0]] : [],
      time: show.dates?.start?.dateTime ? show.dates.start.dateTime.split('T')[1] : '',
      duration: '',
      price: show.priceRanges?.[0]?.min ? `${show.priceRanges[0].min}-${show.priceRanges[0].max} ${show.priceRanges[0].currency}` : '',
      status: show.dates?.status?.code === 'onsale' ? '售票中' : '未知',
      description: show.info || '',
      poster: show.images?.[0]?.url || '',
      tags: show.classifications?.map(c => c.segment?.name).filter(Boolean) || []
    }
  }
  
  return show
}

// 主函数 - 获取演出信息
async function getShowsFromAPI(city = '上海', category = 'drama', limit = 50) {
  let shows = []
  
  // 尝试从大麦网API获取数据
  try {
    const damaiShows = await fetchShowsFromDamai(city, category, limit)
    if (damaiShows.length > 0) {
      shows = damaiShows.map(show => transformShowData(show, 'damai'))
      console.log(`从大麦网API获取到 ${shows.length} 个演出信息`)
      return shows
    }
  } catch (error) {
    console.error('大麦网API调用失败，尝试其他API:', error.message)
  }
  
  // 如果大麦网API失败，尝试Ticketmaster API
  try {
    const ticketmasterShows = await fetchShowsFromTicketmaster(city, 'theatre', limit)
    if (ticketmasterShows.length > 0) {
      shows = ticketmasterShows.map(show => transformShowData(show, 'ticketmaster'))
      console.log(`从Ticketmaster API获取到 ${shows.length} 个演出信息`)
      return shows
    }
  } catch (error) {
    console.error('Ticketmaster API调用失败，尝试聚合数据API:', error.message)
  }
  
  // 最后尝试聚合数据API
  try {
    const juheShows = await fetchShowsFromJuhe(city)
    if (juheShows.length > 0) {
      shows = juheShows.map(show => transformShowData(show, 'damai'))
      console.log(`从聚合数据API获取到 ${shows.length} 个演出信息`)
      return shows
    }
  } catch (error) {
    console.error('所有API调用都失败了:', error.message)
  }
  
  // 如果所有API都失败，返回空数组
  console.log('所有API调用都失败，返回空数据')
  return []
}

// 搜索演出信息
async function searchShowsFromAPI(query, city = '上海') {
  try {
    const allShows = await getShowsFromAPI(city, 'drama', 100)
    
    if (!query || query.trim() === '') {
      return allShows
    }
    
    const searchText = query.toLowerCase()
    const searchResults = allShows.filter(show => {
      return (
        (show.title && show.title.toLowerCase().includes(searchText)) ||
        (show.englishTitle && show.englishTitle.toLowerCase().includes(searchText)) ||
        (show.genre && show.genre.toLowerCase().includes(searchText)) ||
        (show.cast && show.cast.some(actor => actor.toLowerCase().includes(searchText))) ||
        (show.venue && show.venue.toLowerCase().includes(searchText)) ||
        (show.tags && show.tags.some(tag => tag.toLowerCase().includes(searchText))) ||
        (show.description && show.description.toLowerCase().includes(searchText))
      )
    })
    
    return searchResults
  } catch (error) {
    console.error('搜索演出信息失败:', error.message)
    return []
  }
}

// 云函数入口
exports.main = async (event, context) => {
  const { action, query, city, category, limit } = event
  
  try {
    console.log('API集成云函数调用，操作类型:', action)
    
    if (action === 'getAll') {
      // 获取所有演出信息
      const shows = await getShowsFromAPI(city || '上海', category || 'drama', limit || 50)
      
      return {
        code: 0,
        data: {
          shows: shows,
          total: shows.length,
          message: `从API获取到 ${shows.length} 个演出信息`,
          source: 'external_api'
        }
      }
    } else if (action === 'search') {
      // 搜索演出
      if (!query) {
        return {
          code: -1,
          message: '搜索关键词不能为空'
        }
      }
      
      const searchResults = await searchShowsFromAPI(query, city || '上海')
      
      return {
        code: 0,
        data: {
          shows: searchResults,
          total: searchResults.length,
          message: `找到 ${searchResults.length} 个相关演出`,
          source: 'external_api'
        }
      }
    } else {
      return {
        code: -1,
        message: '不支持的操作类型'
      }
    }
  } catch (error) {
    console.error('API集成云函数执行失败:', error)
    return {
      code: -1,
      message: '获取演出信息失败',
      error: error.message
    }
  }
}

// 导出函数供测试使用
module.exports = {
  getShowsFromAPI,
  searchShowsFromAPI,
  fetchShowsFromDamai,
  fetchShowsFromTicketmaster,
  fetchShowsFromJuhe,
  transformShowData
} 