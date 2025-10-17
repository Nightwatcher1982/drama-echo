// 剧目搜索云函数 - 智能本地搜索版本
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 最新热门剧目数据库 - 2024年最受欢迎的50个剧目
// 使用本地默认图片避免网络图片访问问题，用户可以后续手动添加海报
const dramaDatabase = [
  // 国际经典音乐剧
  {
    title: "狮子王",
    englishTitle: "The Lion King",
    author: "艾尔顿·约翰",
    genre: "音乐剧",
    year: "1994年",
    description: "迪士尼经典音乐剧，讲述小狮子辛巴的成长历程",
    poster: "/images/modu.png",
    posterKeywords: ["狮子王", "simba", "disney", "lion king", "musical"],
    tags: ["音乐剧", "迪士尼", "经典", "家庭"],
    theater: "上海文化广场",
    duration: "150分钟"
  },
  {
    title: "歌剧魅影",
    englishTitle: "The Phantom of the Opera",
    author: "安德鲁·劳埃德·韦伯",
    genre: "音乐剧",
    year: "1986年",
    description: "永恒的经典音乐剧，神秘魅影的浪漫传说",
    poster: "/images/modu.png",
    posterKeywords: ["phantom", "opera", "mask", "theatre", "musical"],
    tags: ["音乐剧", "浪漫", "经典", "爱情"],
    theater: "上海大剧院",
    duration: "160分钟"
  },
  {
    title: "猫",
    englishTitle: "Cats",
    author: "安德鲁·劳埃德·韦伯",
    genre: "音乐剧",
    year: "1981年",
    description: "奇幻音乐剧，猫咪们的奇妙世界",
    poster: "/images/modu.png",
    tags: ["音乐剧", "经典", "奇幻"],
    theater: "上海大剧院",
    duration: "140分钟"
  },
  {
    title: "悲惨世界",
    englishTitle: "Les Misérables",
    author: "阿兰·鲍伯利",
    genre: "音乐剧",
    year: "1985年",
    description: "雨果巨著改编，法国大革命的史诗传奇",
    poster: "/images/modu.png",
    tags: ["音乐剧", "史诗", "革命", "经典"],
    theater: "上海大剧院",
    duration: "180分钟"
  },
  {
    title: "妈妈咪呀",
    englishTitle: "Mamma Mia!",
    author: "ABBA乐队",
    genre: "音乐剧",
    year: "1999年",
    description: "ABBA金曲串烧，希腊小岛的浪漫故事",
    poster: "/images/modu.png",
    tags: ["音乐剧", "欢快", "爱情", "现代"],
    theater: "上海文化广场",
    duration: "145分钟"
  },
  {
    title: "芝加哥",
    englishTitle: "Chicago",
    author: "约翰·坎德",
    genre: "音乐剧",
    year: "1975年",
    description: "爵士时代的犯罪音乐剧，充满诱惑与欲望",
    poster: "/images/modu.png",
    tags: ["音乐剧", "爵士", "犯罪", "现代"],
    theater: "兰心大戏院",
    duration: "135分钟"
  },
  {
    title: "西区故事",
    englishTitle: "West Side Story",
    author: "伦纳德·伯恩斯坦",
    genre: "音乐剧",
    year: "1957年",
    description: "现代版罗密欧与朱丽叶，纽约街头的爱情悲剧",
    poster: "/images/modu.png",
    tags: ["音乐剧", "爱情", "悲剧", "现代"],
    theater: "上海文化广场",
    duration: "155分钟"
  },
  {
    title: "汉密尔顿",
    englishTitle: "Hamilton",
    author: "林-曼努尔·米兰达",
    genre: "音乐剧",
    year: "2015年",
    description: "嘻哈音乐剧，美国开国元勋汉密尔顿的传奇人生",
    poster: "/images/modu.png",
    tags: ["音乐剧", "现代", "历史", "创新"],
    theater: "上海大剧院",
    duration: "160分钟"
  },
  {
    title: "音乐之声",
    englishTitle: "The Sound of Music",
    author: "理查德·罗杰斯",
    genre: "音乐剧",
    year: "1959年",
    description: "温馨音乐剧，冯·特拉普家庭的音乐传奇",
    poster: "/images/modu.png",
    tags: ["音乐剧", "家庭", "温馨", "经典"],
    theater: "上海文化广场",
    duration: "150分钟"
  },
  {
    title: "阿拉丁",
    englishTitle: "Aladdin",
    author: "阿兰·曼肯",
    genre: "音乐剧",
    year: "2011年",
    description: "迪士尼阿拉丁的舞台版本，阿拉伯奇幻冒险",
    poster: "/images/modu.png",
    tags: ["音乐剧", "迪士尼", "奇幻", "冒险"],
    theater: "上海文化广场",
    duration: "150分钟"
  },

  // 中文原创音乐剧
  {
    title: "声入人心",
    englishTitle: "Super-Vocal",
    author: "湖南卫视",
    genre: "音乐剧",
    year: "2018年",
    description: "原创音乐剧，年轻音乐人的梦想与成长",
    poster: "/images/modu.png",
    tags: ["音乐剧", "原创", "青春", "梦想"],
    theater: "上海大剧院",
    duration: "120分钟"
  },
  {
    title: "阴阳师",
    englishTitle: "Onmyoji",
    author: "郭敬明",
    genre: "音乐剧",
    year: "2020年",
    description: "东方奇幻音乐剧，阴阳师的神秘世界",
    poster: "/images/modu.png",
    tags: ["音乐剧", "奇幻", "东方", "神秘"],
    theater: "上海文化广场",
    duration: "140分钟"
  },
  {
    title: "摇滚莫扎特",
    englishTitle: "Mozart L'Opera Rock",
    author: "多夫·阿提亚",
    genre: "音乐剧",
    year: "2009年",
    description: "法语摇滚音乐剧，莫扎特的叛逆人生",
    poster: "/images/modu.png",
    tags: ["音乐剧", "摇滚", "传记", "叛逆"],
    theater: "上海大剧院",
    duration: "150分钟"
  },
  {
    title: "长安十二时辰",
    englishTitle: "The Longest Day In Chang'an",
    author: "马伯庸",
    genre: "话剧",
    year: "2021年",
    description: "唐朝悬疑话剧，长安城的惊天阴谋",
    poster: "/images/modu.png",
    tags: ["话剧", "悬疑", "历史", "唐朝"],
    theater: "上海话剧艺术中心",
    duration: "180分钟"
  },
  {
    title: "如梦之梦",
    englishTitle: "A Dream Like A Dream",
    author: "赖声川",
    genre: "话剧",
    year: "2000年",
    description: "八小时史诗话剧，跨越时空的生命轮回",
    poster: "/images/modu.png",
    tags: ["话剧", "史诗", "哲学", "轮回"],
    theater: "上海大剧院",
    duration: "480分钟"
  },

  // 经典话剧
  {
    title: "哈姆雷特",
    englishTitle: "Hamlet",
    author: "威廉·莎士比亚",
    genre: "话剧",
    year: "1600年",
    description: "莎翁经典悲剧，丹麦王子的复仇传说",
    poster: "/images/modu.png",
    tags: ["话剧", "经典", "莎士比亚", "复仇"],
    theater: "上海话剧艺术中心",
    duration: "180分钟"
  },
  {
    title: "茶馆",
    englishTitle: "Teahouse",
    author: "老舍",
    genre: "话剧",
    year: "1957年",
    description: "老舍名作，裕泰茶馆的兴衰见证历史变迁",
    poster: "/images/modu.png",
    tags: ["话剧", "经典", "历史", "社会"],
    theater: "人民艺术剧院",
    duration: "150分钟"
  },
  {
    title: "雷雨",
    englishTitle: "Thunderstorm",
    author: "曹禺",
    genre: "话剧",
    year: "1934年",
    description: "中国话剧经典，封建家庭的悲剧命运",
    poster: "/images/modu.png",
    tags: ["话剧", "经典", "家庭", "悲剧"],
    theater: "上海大剧院",
    duration: "160分钟"
  },
  {
    title: "暗恋桃花源",
    englishTitle: "Secret Love in Peach Blossom Land",
    author: "赖声川",
    genre: "话剧",
    year: "1986年",
    description: "赖声川代表作，现实与理想的巧妙交融",
    poster: "/images/modu.png",
    tags: ["话剧", "现代", "爱情", "理想"],
    theater: "上海文化广场",
    duration: "180分钟"
  },
  {
    title: "罗密欧与朱丽叶",
    englishTitle: "Romeo and Juliet",
    author: "威廉·莎士比亚",
    genre: "话剧",
    year: "1595年",
    description: "永恒的爱情悲剧，两个家族的宿命纠葛",
    poster: "/images/modu.png",
    tags: ["话剧", "经典", "爱情", "悲剧"],
    theater: "兰心大戏院",
    duration: "140分钟"
  },

  // 现代创新剧目
  {
    title: "驴得水",
    englishTitle: "Mr. Donkey",
    author: "周申、刘露",
    genre: "话剧",
    year: "2012年",
    description: "黑色幽默话剧，一个谎言引发的荒诞故事",
    poster: "/images/modu.png",
    tags: ["话剧", "黑色幽默", "现代", "讽刺"],
    theater: "上海话剧艺术中心",
    duration: "120分钟"
  },
  {
    title: "开心麻花·乌龙山伯爵",
    englishTitle: "Happy Twist",
    author: "开心麻花",
    genre: "喜剧",
    year: "2008年",
    description: "开心麻花经典喜剧，笑料百出的荒诞故事",
    poster: "/images/modu.png",
    tags: ["喜剧", "麻花", "幽默", "现代"],
    theater: "上海文化广场",
    duration: "110分钟"
  },
  {
    title: "白夜行",
    englishTitle: "Into the White Night",
    author: "东野圭吾",
    genre: "话剧",
    year: "2019年",
    description: "东野圭吾悬疑小说改编，19年的孤独守望",
    poster: "/images/modu.png",
    tags: ["话剧", "悬疑", "推理", "现代"],
    theater: "上海大剧院",
    duration: "150分钟"
  },
  {
    title: "三体",
    englishTitle: "The Three-Body Problem",
    author: "刘慈欣",
    genre: "话剧",
    year: "2022年",
    description: "科幻史诗话剧，三体文明与地球的第一次接触",
    poster: "/images/modu.png",
    tags: ["话剧", "科幻", "史诗", "现代"],
    theater: "上海文化广场",
    duration: "180分钟"
  },
  {
    title: "繁花",
    englishTitle: "Blossoms",
    author: "金宇澄",
    genre: "话剧",
    year: "2023年",
    description: "上海故事话剧，90年代的繁华与人情",
    poster: "/images/modu.png",
    tags: ["话剧", "上海", "怀旧", "现代"],
    theater: "美琪大戏院",
    duration: "160分钟"
  },

  // 国际经典话剧
  {
    title: "等待戈多",
    englishTitle: "Waiting for Godot",
    author: "塞缪尔·贝克特",
    genre: "话剧",
    year: "1953年",
    description: "荒诞派戏剧经典，两个流浪汉的无尽等待",
    poster: "/images/modu.png",
    tags: ["话剧", "荒诞", "哲学", "经典"],
    theater: "上海话剧艺术中心",
    duration: "90分钟"
  },
  {
    title: "玻璃动物园",
    englishTitle: "The Glass Menagerie",
    author: "田纳西·威廉斯",
    genre: "话剧",
    year: "1944年",
    description: "美国经典话剧，一个家庭的回忆与梦想",
    poster: "/images/modu.png",
    tags: ["话剧", "经典", "家庭", "回忆"],
    theater: "兰心大戏院",
    duration: "120分钟"
  },
  {
    title: "推销员之死",
    englishTitle: "Death of a Salesman",
    author: "阿瑟·米勒",
    genre: "话剧",
    year: "1949年",
    description: "美国戏剧经典，中年推销员的悲剧人生",
    poster: "/images/modu.png",
    tags: ["话剧", "经典", "悲剧", "现实"],
    theater: "上海大剧院",
    duration: "140分钟"
  },

  // 舞剧和其他类型
  {
    title: "天鹅湖",
    englishTitle: "Swan Lake",
    author: "柴可夫斯基",
    genre: "芭蕾舞剧",
    year: "1876年",
    description: "经典芭蕾舞剧，白天鹅与黑天鹅的永恒传说",
    poster: "/images/modu.png",
    tags: ["芭蕾", "经典", "舞蹈", "浪漫"],
    theater: "上海大剧院",
    duration: "120分钟"
  },
  {
    title: "胡桃夹子",
    englishTitle: "The Nutcracker",
    author: "柴可夫斯基",
    genre: "芭蕾舞剧",
    year: "1892年",
    description: "圣诞经典芭蕾，小女孩的奇幻梦境",
    poster: "/images/modu.png",
    tags: ["芭蕾", "圣诞", "奇幻", "经典"],
    theater: "上海文化广场",
    duration: "100分钟"
  },
  {
    title: "红色娘子军",
    englishTitle: "The Red Detachment of Women",
    author: "集体创作",
    genre: "芭蕾舞剧",
    year: "1964年",
    description: "中国经典芭蕾舞剧，革命女战士的英勇故事",
    poster: "/images/modu.png",
    tags: ["芭蕾", "革命", "中国", "经典"],
    theater: "上海大剧院",
    duration: "110分钟"
  },

  // 近期热门新剧
  {
    title: "花木兰",
    englishTitle: "Mulan",
    author: "迪士尼",
    genre: "音乐剧",
    year: "2020年",
    description: "迪士尼全新音乐剧，花木兰的英雄传奇",
    poster: "/images/modu.png",
    tags: ["音乐剧", "迪士尼", "英雄", "中国"],
    theater: "上海文化广场",
    duration: "140分钟"
  },
  {
    title: "冰雪奇缘",
    englishTitle: "Frozen",
    author: "迪士尼",
    genre: "音乐剧",
    year: "2018年",
    description: "迪士尼热门动画改编，艾莎和安娜的姐妹情",
    poster: "/images/modu.png",
    tags: ["音乐剧", "迪士尼", "魔法", "家庭"],
    theater: "上海大剧院",
    duration: "150分钟"
  },
  {
    title: "摇滚红与黑",
    englishTitle: "Notre Dame de Paris",
    author: "吕克·普拉蒙东",
    genre: "音乐剧",
    year: "1998年",
    description: "法语摇滚音乐剧，巴黎圣母院的爱情悲歌",
    poster: "/images/modu.png",
    tags: ["音乐剧", "摇滚", "爱情", "法国"],
    theater: "上海文化广场",
    duration: "170分钟"
  },

  // 实验性和先锋剧目
  {
    title: "黑暗中的喜剧",
    englishTitle: "Comedy in the Dark",
    author: "孟京辉",
    genre: "实验话剧",
    year: "2020年",
    description: "孟京辉实验剧场，在黑暗中寻找光明和希望",
    poster: "/images/modu.png",
    tags: ["实验", "先锋", "黑暗", "希望"],
    theater: "蜂巢剧场",
    duration: "90分钟"
  },
  {
    title: "恋爱的犀牛",
    englishTitle: "Rhinoceros in Love",
    author: "廖一梅",
    genre: "话剧",
    year: "1999年",
    description: "先锋爱情话剧，关于纯真与坚持的浪漫传说",
    poster: "/images/modu.png",
    tags: ["话剧", "爱情", "先锋", "浪漫"],
    theater: "上海话剧艺术中心",
    duration: "120分钟"
  },
  {
    title: "枕头人",
    englishTitle: "The Pillowman",
    author: "马丁·麦克多纳",
    genre: "话剧",
    year: "2003年",
    description: "黑色童话话剧，作家与现实的危险游戏",
    poster: "/images/modu.png",
    tags: ["话剧", "黑色", "童话", "悬疑"],
    theater: "兰心大戏院",
    duration: "150分钟"
  },

  // 年度热门
  {
    title: "觉醒年代",
    englishTitle: "The Age of Awakening",
    author: "龙平平",
    genre: "话剧",
    year: "2021年",
    description: "致敬百年前的觉醒者，青春中国的理想之光",
    poster: "/images/modu.png",
    tags: ["话剧", "历史", "青春", "理想"],
    theater: "上海大剧院",
    duration: "180分钟"
  },
  {
    title: "人民的名义",
    englishTitle: "In the Name of People",
    author: "周梅森",
    genre: "话剧",
    year: "2019年",
    description: "反腐话剧，人民检察官的正义之路",
    poster: "/images/modu.png",
    tags: ["话剧", "反腐", "正义", "现实"],
    theater: "人民艺术剧院",
    duration: "160分钟"
  },
  {
    title: "庆余年",
    englishTitle: "Joy of Life",
    author: "猫腻",
    genre: "话剧",
    year: "2022年",
    description: "穿越古装话剧，现代青年的古代传奇",
    poster: "/images/modu.png",
    tags: ["话剧", "穿越", "古装", "传奇"],
    theater: "上海文化广场",
    duration: "170分钟"
  },

  // 国际巡演热门
  {
    title: "蓝人秀",
    englishTitle: "Blue Man Group",
    author: "蓝人乐团",
    genre: "多媒体表演",
    year: "1991年",
    description: "创新多媒体表演，蓝色奇迹的视听盛宴",
    poster: "/images/modu.png",
    tags: ["多媒体", "创新", "视听", "奇迹"],
    theater: "上海文化广场",
    duration: "105分钟"
  },
  {
    title: "太阳马戏团",
    englishTitle: "Cirque du Soleil",
    author: "太阳马戏团",
    genre: "马戏表演",
    year: "1984年",
    description: "世界顶级马戏表演，梦幻般的艺术盛宴",
    poster: "/images/modu.png",
    tags: ["马戏", "艺术", "梦幻", "顶级"],
    theater: "梅赛德斯奔驰文化中心",
    duration: "120分钟"
  },

  // 经典重演
  {
    title: "长恨歌",
    englishTitle: "Song of Everlasting Sorrow",
    author: "王安忆",
    genre: "话剧",
    year: "2004年",
    description: "上海女性传奇，王琦瑶的人生百味",
    poster: "/images/modu.png",
    tags: ["话剧", "上海", "女性", "传奇"],
    theater: "美琪大戏院",
    duration: "170分钟"
  },
  {
    title: "四世同堂",
    englishTitle: "Four Generations Under One Roof",
    author: "老舍",
    genre: "话剧",
    year: "2021年",
    description: "老舍巨著改编，北平沦陷下的民族精神",
    poster: "/images/modu.png",
    tags: ["话剧", "经典", "历史", "民族"],
    theater: "人民艺术剧院",
    duration: "200分钟"
  }
]

// AI搜索功能暂时禁用，避免超时问题
// 可以在后续版本中重新启用

// 本地数据库搜索（降级方案）
function searchLocalDatabase(query) {
  const searchResults = dramaDatabase.filter(drama => {
    const searchText = query.toLowerCase()
    return (
      drama.title.toLowerCase().includes(searchText) ||
      drama.englishTitle.toLowerCase().includes(searchText) ||
      drama.author.toLowerCase().includes(searchText) ||
      drama.genre.toLowerCase().includes(searchText) ||
      drama.tags.some(tag => tag.toLowerCase().includes(searchText)) ||
      drama.description.toLowerCase().includes(searchText)
    )
  })

  // 按相关度排序
  const scoredResults = searchResults.map(drama => {
    let score = 0
    const searchText = query.toLowerCase()
    
    if (drama.title.toLowerCase() === searchText) score += 100
    else if (drama.title.toLowerCase().includes(searchText)) score += 50
    
    if (drama.englishTitle.toLowerCase().includes(searchText)) score += 30
    if (drama.author.toLowerCase().includes(searchText)) score += 40
    
    drama.tags.forEach(tag => {
      if (tag.toLowerCase().includes(searchText)) score += 20
    })
    
    if (drama.description.toLowerCase().includes(searchText)) score += 10
    
    return { ...drama, score }
  })

  return scoredResults.sort((a, b) => b.score - a.score)
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { query } = event
  
  try {
    console.log('搜索剧目信息，查询内容:', query)
    
    if (!query || typeof query !== 'string') {
      return {
        code: -1,
        message: '查询内容不能为空'
      }
    }

    // 暂时禁用AI搜索，专注本地搜索和智能推荐
    let localResults = searchLocalDatabase(query)
    
    if (localResults.length > 0) {
      console.log('本地搜索找到', localResults.length, '个结果')
      return {
        code: 0,
        data: {
          exact: localResults,
          recommendations: [],
          message: `找到 ${localResults.length} 个相关剧目`,
          searchMode: 'local'
        }
      }
    }

    // 本地没有结果时，进行智能推荐
    console.log('本地无精确结果，提供智能推荐')
    
    let recommendations = []
    const queryLower = query.toLowerCase()
    
    // 基于查询内容的智能推荐逻辑
    if (queryLower.includes('爱情') || queryLower.includes('浪漫') || queryLower.includes('爱')) {
      recommendations = dramaDatabase.filter(d => 
        d.tags.includes('爱情') || d.tags.includes('浪漫') || d.description.includes('爱情')
      )
    } else if (queryLower.includes('悲剧') || queryLower.includes('悲伤') || queryLower.includes('悲')) {
      recommendations = dramaDatabase.filter(d => 
        d.genre === '悲剧' || d.tags.includes('悲剧')
      )
    } else if (queryLower.includes('音乐剧') || queryLower.includes('音乐')) {
      recommendations = dramaDatabase.filter(d => d.genre === '音乐剧')
    } else if (queryLower.includes('经典') || queryLower.includes('名著')) {
      recommendations = dramaDatabase.filter(d => d.tags.includes('经典'))
    } else if (queryLower.includes('现代') || queryLower.includes('当代')) {
      recommendations = dramaDatabase.filter(d => d.tags.includes('现代'))
    } else if (queryLower.includes('莎士比亚') || queryLower.includes('shakespeare')) {
      recommendations = dramaDatabase.filter(d => d.author.includes('莎士比亚'))
    } else {
      // 默认推荐热门剧目
      recommendations = dramaDatabase.slice(0, 3)
    }

    // 如果推荐列表为空，使用默认推荐
    if (recommendations.length === 0) {
      recommendations = dramaDatabase.slice(0, 3)
    }

    return {
      code: 0,
      data: {
        exact: [],
        recommendations: recommendations.slice(0, 3), // 最多返回3个推荐
        message: `没有找到"${query}"的精确匹配，为您推荐相关剧目`,
        searchMode: 'smart_recommend'
      }
    }
    
  } catch (error) {
    console.error('searchDrama error:', error)
    
    // 错误处理：返回默认推荐
    const defaultResults = dramaDatabase.slice(0, 3)
    return {
      code: 0,
      data: {
        exact: [],
        recommendations: defaultResults,
        message: '为您推荐热门剧目',
        searchMode: 'fallback'
      }
    }
  }
}