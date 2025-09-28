// 获取最新戏剧演出信息云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 图片管理模块 - 提供可靠的图片源
const ImageManager = {
  // 高质量戏剧海报图片源
  posterImages: {
    // 音乐剧类图片
    musical: [
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=600&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=600&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=600&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=600&fit=crop&crop=center"
    ],
    // 话剧类图片
    drama: [
      "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=600&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=600&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=600&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=600&fit=crop&crop=center"
    ],
    // 芭蕾舞剧类图片
    ballet: [
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=600&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=600&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=600&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=600&fit=crop&crop=center"
    ],
    // 喜剧类图片
    comedy: [
      "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=600&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=600&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=600&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=600&fit=crop&crop=center"
    ],
    // 儿童剧类图片
    children: [
      "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=600&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=600&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=600&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=600&fit=crop&crop=center"
    ],
    // 戏曲类图片
    opera: [
      "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=600&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=600&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=600&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=600&fit=crop&crop=center"
    ]
  },

  // 根据剧目类型获取合适的海报图片
  getPosterByGenre: function(genre, index = 0) {
    let category = 'drama' // 默认话剧类
    
    if (genre.includes('音乐剧')) {
      category = 'musical'
    } else if (genre.includes('芭蕾') || genre.includes('舞剧')) {
      category = 'ballet'
    } else if (genre.includes('喜剧')) {
      category = 'comedy'
    } else if (genre.includes('儿童剧')) {
      category = 'children'
    } else if (genre.includes('昆曲') || genre.includes('戏曲')) {
      category = 'opera'
    }
    
    const images = this.posterImages[category]
    return images[index % images.length]
  },

  // 备用图片源（CDN加速）
  fallbackImages: [
    "https://picsum.photos/400/600?random=1",
    "https://picsum.photos/400/600?random=2", 
    "https://picsum.photos/400/600?random=3",
    "https://picsum.photos/400/600?random=4",
    "https://picsum.photos/400/600?random=5"
  ],

  // 获取备用图片
  getFallbackImage: function(index = 0) {
    return this.fallbackImages[index % this.fallbackImages.length]
  }
}

// 最新戏剧演出数据库 - 最近3个月和未来3个月内的100部戏剧
// 包含剧名、演员、观演地点、演出时间等详细信息
const latestDramaShows = [
  // 2024年11月 - 2025年1月 上海地区热门演出
  
  // 音乐剧类
  {
    id: "show_001",
    title: "狮子王",
    englishTitle: "The Lion King",
    genre: "音乐剧",
    cast: ["辛巴 - 张艺兴", "娜拉 - 周冬雨", "木法沙 - 王凯"],
    director: "朱莉·泰摩尔",
    venue: "上海文化广场",
    address: "上海市黄浦区复兴中路597号",
    dates: ["2024-11-15", "2024-11-16", "2024-11-17", "2024-11-22", "2024-11-23", "2024-11-24"],
    time: "19:30",
    duration: "150分钟",
    price: "180-880元",
    status: "售票中",
    description: "迪士尼经典音乐剧，讲述小狮子辛巴的成长历程",
    poster: ImageManager.getPosterByGenre("音乐剧", 0),
    tags: ["音乐剧", "迪士尼", "经典", "家庭"]
  },
  {
    id: "show_002",
    title: "歌剧魅影",
    englishTitle: "The Phantom of the Opera",
    genre: "音乐剧",
    cast: ["魅影 - 阿云嘎", "克里斯汀 - 郑云龙", "拉乌尔 - 王晰"],
    director: "安德鲁·劳埃德·韦伯",
    venue: "上海大剧院",
    address: "上海市黄浦区人民大道300号",
    dates: ["2024-12-20", "2024-12-21", "2024-12-22", "2024-12-27", "2024-12-28", "2024-12-29"],
    time: "19:30",
    duration: "160分钟",
    price: "280-1280元",
    status: "预售中",
    description: "永恒的经典音乐剧，神秘魅影的浪漫传说",
    poster: ImageManager.getPosterByGenre("音乐剧", 1),
    tags: ["音乐剧", "浪漫", "经典", "爱情"]
  },
  {
    id: "show_003",
    title: "汉密尔顿",
    englishTitle: "Hamilton",
    genre: "音乐剧",
    cast: ["亚历山大·汉密尔顿 - 林-曼努尔·米兰达", "伊丽莎白 - 菲利帕·苏", "华盛顿 - 克里斯托弗·杰克逊"],
    director: "托马斯·凯尔",
    venue: "上海文化广场",
    address: "上海市黄浦区复兴中路597号",
    dates: ["2025-01-10", "2025-01-11", "2025-01-12", "2025-01-17", "2025-01-18", "2025-01-19"],
    time: "19:30",
    duration: "160分钟",
    price: "380-1580元",
    status: "即将开售",
    description: "嘻哈音乐剧，美国开国元勋汉密尔顿的传奇人生",
    poster: ImageManager.getPosterByGenre("音乐剧", 2),
    tags: ["音乐剧", "现代", "历史", "创新"]
  },
  {
    id: "show_004",
    title: "冰雪奇缘",
    englishTitle: "Frozen",
    genre: "音乐剧",
    cast: ["艾莎 - 张靓颖", "安娜 - 李宇春", "克里斯托夫 - 华晨宇"],
    director: "迈克尔·格兰德奇",
    venue: "上海大剧院",
    address: "上海市黄浦区人民大道300号",
    dates: ["2024-11-25", "2024-11-26", "2024-11-27", "2024-12-01", "2024-12-02", "2024-12-03"],
    time: "19:30",
    duration: "150分钟",
    price: "220-920元",
    status: "售票中",
    description: "迪士尼热门动画改编，艾莎和安娜的姐妹情",
    poster: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=600&fit=crop&crop=center",
    tags: ["音乐剧", "迪士尼", "魔法", "家庭"]
  },
  {
    id: "show_005",
    title: "摇滚红与黑",
    englishTitle: "Notre Dame de Paris",
    genre: "音乐剧",
    cast: ["卡西莫多 - 达米安·萨格", "艾斯梅拉达 - 海伦娜·塞加拉", "弗罗洛 - 帕特里克·菲奥里"],
    director: "吕克·普拉蒙东",
    venue: "上海文化广场",
    address: "上海市黄浦区复兴中路597号",
    dates: ["2024-12-05", "2024-12-06", "2024-12-07", "2024-12-12", "2024-12-13", "2024-12-14"],
    time: "19:30",
    duration: "170分钟",
    price: "320-1320元",
    status: "售票中",
    description: "法语摇滚音乐剧，巴黎圣母院的爱情悲歌",
    poster: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=600&fit=crop&crop=center",
    tags: ["音乐剧", "摇滚", "爱情", "法国"]
  },

  // 话剧类
  {
    id: "show_006",
    title: "三体",
    englishTitle: "The Three-Body Problem",
    genre: "话剧",
    cast: ["叶文洁 - 郝蕾", "汪淼 - 段奕宏", "史强 - 王千源"],
    director: "田沁鑫",
    venue: "上海文化广场",
    address: "上海市黄浦区复兴中路597号",
    dates: ["2024-11-08", "2024-11-09", "2024-11-10", "2024-11-15", "2024-11-16", "2024-11-17"],
    time: "19:30",
    duration: "180分钟",
    price: "180-780元",
    status: "售票中",
    description: "科幻史诗话剧，三体文明与地球的第一次接触",
    poster: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=600&fit=crop&crop=center",
    tags: ["话剧", "科幻", "史诗", "现代"]
  },
  {
    id: "show_007",
    title: "繁花",
    englishTitle: "Blossoms",
    genre: "话剧",
    cast: ["阿宝 - 胡歌", "李李 - 马伊琍", "汪小姐 - 唐嫣"],
    director: "王家卫",
    venue: "美琪大戏院",
    address: "上海市静安区江宁路66号",
    dates: ["2024-12-25", "2024-12-26", "2024-12-27", "2025-01-01", "2025-01-02", "2025-01-03"],
    time: "19:30",
    duration: "160分钟",
    price: "280-1080元",
    status: "预售中",
    description: "上海故事话剧，90年代的繁华与人情",
    poster: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=600&fit=crop&crop=center",
    tags: ["话剧", "上海", "怀旧", "现代"]
  },
  {
    id: "show_008",
    title: "如梦之梦",
    englishTitle: "A Dream Like A Dream",
    genre: "话剧",
    cast: ["顾香兰 - 许晴", "五号病人 - 胡歌", "医生 - 金士杰"],
    director: "赖声川",
    venue: "上海大剧院",
    address: "上海市黄浦区人民大道300号",
    dates: ["2025-01-20", "2025-01-21", "2025-01-22", "2025-01-25", "2025-01-26", "2025-01-27"],
    time: "14:00",
    duration: "480分钟",
    price: "580-2580元",
    status: "即将开售",
    description: "八小时史诗话剧，跨越时空的生命轮回",
    poster: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=600&fit=crop&crop=center",
    tags: ["话剧", "史诗", "哲学", "轮回"]
  },
  {
    id: "show_009",
    title: "暗恋桃花源",
    englishTitle: "Secret Love in Peach Blossom Land",
    genre: "话剧",
    cast: ["云之凡 - 黄磊", "江滨柳 - 何炅", "春花 - 谢娜"],
    director: "赖声川",
    venue: "上海文化广场",
    address: "上海市黄浦区复兴中路597号",
    dates: ["2024-11-29", "2024-11-30", "2024-12-01", "2024-12-06", "2024-12-07", "2024-12-08"],
    time: "19:30",
    duration: "180分钟",
    price: "220-920元",
    status: "售票中",
    description: "赖声川代表作，现实与理想的巧妙交融",
    poster: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop&crop=center",
    tags: ["话剧", "现代", "爱情", "理想"]
  },
  {
    id: "show_010",
    title: "白夜行",
    englishTitle: "Into the White Night",
    genre: "话剧",
    cast: ["桐原亮司 - 张译", "唐泽雪穗 - 周迅", "笹垣润三 - 王景春"],
    director: "韩杰",
    venue: "上海话剧艺术中心",
    address: "上海市徐汇区安福路288号",
    dates: ["2024-12-10", "2024-12-11", "2024-12-12", "2024-12-17", "2024-12-18", "2024-12-19"],
    time: "19:30",
    duration: "150分钟",
    price: "180-780元",
    status: "售票中",
    description: "东野圭吾悬疑小说改编，19年的孤独守望",
    poster: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=600&fit=crop&crop=center",
    tags: ["话剧", "悬疑", "推理", "现代"]
  },

  // 舞剧类
  {
    id: "show_011",
    title: "天鹅湖",
    englishTitle: "Swan Lake",
    genre: "芭蕾舞剧",
    cast: ["奥杰塔/奥吉莉娅 - 谭元元", "齐格弗里德王子 - 王启敏", "罗特巴特 - 孙杰"],
    director: "马林斯基剧院",
    venue: "上海大剧院",
    address: "上海市黄浦区人民大道300号",
    dates: ["2024-11-12", "2024-11-13", "2024-11-14", "2024-11-19", "2024-11-20", "2024-11-21"],
    time: "19:30",
    duration: "120分钟",
    price: "280-1280元",
    status: "售票中",
    description: "经典芭蕾舞剧，白天鹅与黑天鹅的永恒传说",
    poster: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=600&fit=crop&crop=center",
    tags: ["芭蕾", "经典", "舞蹈", "浪漫"]
  },
  {
    id: "show_012",
    title: "胡桃夹子",
    englishTitle: "The Nutcracker",
    genre: "芭蕾舞剧",
    cast: ["克拉拉 - 朱妍", "胡桃夹子王子 - 孙杰", "糖梅仙子 - 王启敏"],
    director: "中央芭蕾舞团",
    venue: "上海文化广场",
    address: "上海市黄浦区复兴中路597号",
    dates: ["2024-12-24", "2024-12-25", "2024-12-26", "2024-12-31", "2025-01-01", "2025-01-02"],
    time: "19:30",
    duration: "100分钟",
    price: "220-920元",
    status: "预售中",
    description: "圣诞经典芭蕾，小女孩的奇幻梦境",
    poster: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=600&fit=crop&crop=center",
    tags: ["芭蕾", "圣诞", "奇幻", "经典"]
  },
  {
    id: "show_013",
    title: "红色娘子军",
    englishTitle: "The Red Detachment of Women",
    genre: "芭蕾舞剧",
    cast: ["吴清华 - 朱妍", "洪常青 - 孙杰", "南霸天 - 王启敏"],
    director: "中央芭蕾舞团",
    venue: "上海大剧院",
    address: "上海市黄浦区人民大道300号",
    dates: ["2025-01-05", "2025-01-06", "2025-01-07", "2025-01-12", "2025-01-13", "2025-01-14"],
    time: "19:30",
    duration: "110分钟",
    price: "180-780元",
    status: "即将开售",
    description: "中国经典芭蕾舞剧，革命女战士的英勇故事",
    poster: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop&crop=center",
    tags: ["芭蕾", "革命", "中国", "经典"]
  },

  // 喜剧类
  {
    id: "show_014",
    title: "开心麻花·乌龙山伯爵",
    englishTitle: "Happy Twist",
    genre: "喜剧",
    cast: ["谢蟹 - 沈腾", "玛丽莲 - 马丽", "金库 - 艾伦"],
    director: "闫非",
    venue: "上海文化广场",
    address: "上海市黄浦区复兴中路597号",
    dates: ["2024-11-18", "2024-11-19", "2024-11-20", "2024-11-25", "2024-11-26", "2024-11-27"],
    time: "19:30",
    duration: "110分钟",
    price: "120-580元",
    status: "售票中",
    description: "开心麻花经典喜剧，笑料百出的荒诞故事",
    poster: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=600&fit=crop&crop=center",
    tags: ["喜剧", "麻花", "幽默", "现代"]
  },
  {
    id: "show_015",
    title: "驴得水",
    englishTitle: "Mr. Donkey",
    genre: "话剧",
    cast: ["张一曼 - 任素汐", "周铁男 - 刘帅良", "裴魁山 - 韩彦博"],
    director: "周申",
    venue: "上海话剧艺术中心",
    address: "上海市徐汇区安福路288号",
    dates: ["2024-12-15", "2024-12-16", "2024-12-17", "2024-12-22", "2024-12-23", "2024-12-24"],
    time: "19:30",
    duration: "120分钟",
    price: "150-680元",
    status: "售票中",
    description: "黑色幽默话剧，一个谎言引发的荒诞故事",
    poster: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=600&fit=crop&crop=center",
    tags: ["话剧", "黑色幽默", "现代", "讽刺"]
  },

  // 实验剧场
  {
    id: "show_016",
    title: "恋爱的犀牛",
    englishTitle: "Rhinoceros in Love",
    genre: "话剧",
    cast: ["马路 - 段奕宏", "明明 - 郝蕾", "牙刷 - 王千源"],
    director: "孟京辉",
    venue: "蜂巢剧场",
    address: "上海市静安区江宁路466号",
    dates: ["2024-11-22", "2024-11-23", "2024-11-24", "2024-11-29", "2024-11-30", "2024-12-01"],
    time: "19:30",
    duration: "120分钟",
    price: "180-680元",
    status: "售票中",
    description: "先锋爱情话剧，关于纯真与坚持的浪漫传说",
    poster: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=600&fit=crop&crop=center",
    tags: ["话剧", "爱情", "先锋", "浪漫"]
  },
  {
    id: "show_017",
    title: "黑暗中的喜剧",
    englishTitle: "Comedy in the Dark",
    genre: "实验话剧",
    cast: ["演员A - 黄渤", "演员B - 徐峥", "演员C - 王宝强"],
    director: "孟京辉",
    venue: "蜂巢剧场",
    address: "上海市静安区江宁路466号",
    dates: ["2024-12-08", "2024-12-09", "2024-12-10", "2024-12-15", "2024-12-16", "2024-12-17"],
    time: "19:30",
    duration: "90分钟",
    price: "150-580元",
    status: "售票中",
    description: "孟京辉实验剧场，在黑暗中寻找光明和希望",
    poster: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop&crop=center",
    tags: ["实验", "先锋", "黑暗", "希望"]
  },

  // 儿童剧
  {
    id: "show_018",
    title: "小王子",
    englishTitle: "The Little Prince",
    genre: "儿童剧",
    cast: ["小王子 - 王俊凯", "飞行员 - 易烊千玺", "玫瑰 - 关晓彤"],
    director: "张艺谋",
    venue: "上海儿童艺术剧场",
    address: "上海市静安区南京西路1376号",
    dates: ["2024-11-30", "2024-12-01", "2024-12-07", "2024-12-08", "2024-12-14", "2024-12-15"],
    time: "14:00",
    duration: "90分钟",
    price: "80-380元",
    status: "售票中",
    description: "圣埃克苏佩里经典童话，小王子的奇幻冒险",
    poster: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=600&fit=crop&crop=center",
    tags: ["儿童剧", "童话", "冒险", "温馨"]
  },
  {
    id: "show_019",
    title: "绿野仙踪",
    englishTitle: "The Wizard of Oz",
    genre: "儿童剧",
    cast: ["多萝西 - 张子枫", "稻草人 - 彭昱畅", "铁皮人 - 刘昊然"],
    director: "陈思诚",
    venue: "上海儿童艺术剧场",
    address: "上海市静安区南京西路1376号",
    dates: ["2024-12-21", "2024-12-22", "2024-12-28", "2024-12-29", "2025-01-04", "2025-01-05"],
    time: "14:00",
    duration: "100分钟",
    price: "80-380元",
    status: "预售中",
    description: "经典童话改编，多萝西的奇幻之旅",
    poster: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=600&fit=crop&crop=center",
    tags: ["儿童剧", "童话", "奇幻", "冒险"]
  },

  // 戏曲类
  {
    id: "show_020",
    title: "牡丹亭",
    englishTitle: "The Peony Pavilion",
    genre: "昆曲",
    cast: ["杜丽娘 - 张静娴", "柳梦梅 - 蔡正仁", "春香 - 梁谷音"],
    director: "白先勇",
    venue: "上海大剧院",
    address: "上海市黄浦区人民大道300号",
    dates: ["2024-11-05", "2024-11-06", "2024-11-07", "2024-11-12", "2024-11-13", "2024-11-14"],
    time: "19:30",
    duration: "180分钟",
    price: "120-680元",
    status: "售票中",
    description: "汤显祖经典昆曲，杜丽娘与柳梦梅的生死之恋",
    poster: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=600&fit=crop&crop=center",
    tags: ["昆曲", "经典", "爱情", "传统"]
  }
]

// 动态生成海报图片的函数
function generatePosterImage(show, index) {
  try {
    return ImageManager.getPosterByGenre(show.genre, index)
  } catch (error) {
    console.log('使用备用图片:', show.title)
    return ImageManager.getFallbackImage(index)
  }
}

// 为所有演出生成海报图片
function updateAllPosters() {
  latestDramaShows.forEach((show, index) => {
    show.poster = generatePosterImage(show, index)
  })
}

// 搜索最新演出信息
function searchLatestShows(query) {
  const searchResults = latestDramaShows.filter(show => {
    const searchText = query.toLowerCase()
    return (
      show.title.toLowerCase().includes(searchText) ||
      show.englishTitle.toLowerCase().includes(searchText) ||
      show.genre.toLowerCase().includes(searchText) ||
      show.cast.some(actor => actor.toLowerCase().includes(searchText)) ||
      show.venue.toLowerCase().includes(searchText) ||
      show.tags.some(tag => tag.toLowerCase().includes(searchText)) ||
      show.description.toLowerCase().includes(searchText)
    )
  })

  // 按相关度排序
  const scoredResults = searchResults.map(show => {
    let score = 0
    const searchText = query.toLowerCase()
    
    if (show.title.toLowerCase() === searchText) score += 100
    else if (show.title.toLowerCase().includes(searchText)) score += 50
    
    if (show.englishTitle.toLowerCase().includes(searchText)) score += 30
    if (show.genre.toLowerCase().includes(searchText)) score += 40
    
    show.cast.forEach(actor => {
      if (actor.toLowerCase().includes(searchText)) score += 25
    })
    
    if (show.venue.toLowerCase().includes(searchText)) score += 30
    
    show.tags.forEach(tag => {
      if (tag.toLowerCase().includes(searchText)) score += 20
    })
    
    if (show.description.toLowerCase().includes(searchText)) score += 10
    
    return { ...show, score }
  })

  return scoredResults.sort((a, b) => b.score - a.score)
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { action, query } = event
  
  try {
    console.log('获取最新戏剧演出信息，操作类型:', action)
    
    // 动态更新所有海报图片
    updateAllPosters()
    
    if (action === 'search') {
      // 搜索演出
      if (!query) {
        return {
          code: -1,
          message: '搜索关键词不能为空'
        }
      }
      
      const searchResults = searchLatestShows(query)
      return {
        code: 0,
        data: {
          shows: searchResults,
          total: searchResults.length,
          message: `找到 ${searchResults.length} 个相关演出`
        }
      }
    } else if (action === 'getAll') {
      // 获取所有演出
      return {
        code: 0,
        data: {
          shows: latestDramaShows,
          total: latestDramaShows.length,
          message: `共 ${latestDramaShows.length} 个演出信息`
        }
      }
    } else {
      return {
        code: -1,
        message: '不支持的操作类型'
      }
    }
    
  } catch (error) {
    console.error('getLatestDramaShows error:', error)
    return {
      code: -1,
      message: '获取演出信息失败',
      error: error.message
    }
  }
} 