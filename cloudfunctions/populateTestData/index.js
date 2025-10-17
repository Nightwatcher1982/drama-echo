const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    console.log('开始填充测试数据...')
    
    // 清空现有数据 - 先查询再删除
    const zodiacRecords = await db.collection('zodiac_quotes').get()
    if (zodiacRecords.data.length > 0) {
      for (let record of zodiacRecords.data) {
        await db.collection('zodiac_quotes').doc(record._id).remove()
      }
    }
    
    const moodRecords = await db.collection('mood_quotes').get()
    if (moodRecords.data.length > 0) {
      for (let record of moodRecords.data) {
        await db.collection('mood_quotes').doc(record._id).remove()
      }
    }
    
    // 星座数据
    const zodiacData = [
      // 白羊座
      {
        zodiac: '白羊座',
        chinese: '年轻的心永远燃烧着希望之火！',
        english: 'Young hearts forever burn with the fire of hope!',
        fortune: '今日适合开始新的项目，你的创新精神如先锋戏剧般引人瞩目。爱情运势佳，可能会遇到志同道合的人。在外滩的春风里，一切都充满了可能。',
        play: '仲夏夜之梦',
        theater: '兰心大戏院'
      },
      {
        zodiac: '白羊座',
        chinese: '冲破黎明的第一道曙光属于勇者！',
        english: 'The first ray of dawn belongs to the brave!',
        fortune: '清晨的能量为你加持，如开场前的期待般令人兴奋。今日宜大胆表达自己，你的直率会赢得欣赏。静安寺的钟声为你的决定助威。',
        play: '麦克白',
        theater: '上海大剧院'
      },
      {
        zodiac: '白羊座',
        chinese: '战鼓已响，舞台的聚光灯等待着你！',
        english: 'The drums are beating, the spotlight awaits you!',
        fortune: '今日是展现才华的绝佳时机，你的表现将如独角戏般精彩。贵人运强，可能获得重要指导。在人民广场的人潮中，你是最独特的存在。',
        play: '奥赛罗',
        theater: '上海文化广场'
      },
      // 金牛座
      {
        zodiac: '金牛座',
        chinese: '稳重如山，美好终将降临于你。',
        english: 'Steady as a mountain, beauty shall come to thee.',
        fortune: '今日适合深耕细作，如经典话剧中的精彩独白，需要时间沉淀。财运稳定上升，感情生活和谐。在上海的梧桐叶下，细品生活的美好。',
        play: '樱桃园',
        theater: '兰心大戏院'
      },
      {
        zodiac: '金牛座',
        chinese: '慢工出细活，今日是收获的好时光。',
        english: 'Slow and steady work brings fine results, today is harvest time.',
        fortune: '你的耐心将在今日得到回报，如《茶馆》中老北京的岁月沉淀。投资理财运势佳，适合做长远规划。梧桐叶正黄，你的坚持也即将开花结果。',
        play: '茶馆',
        theater: '上海人民艺术剧院'
      },
      {
        zodiac: '金牛座',
        chinese: '岁月静好，美好如约而至。',
        english: 'Time flows gently, beauty arrives as promised.',
        fortune: '今日宜享受生活的美好细节，你的品味会得到认可。适合进行艺术创作或欣赏。思南公馆的优雅氛围与你的气质完美契合。',
        play: '海鸥',
        theater: '话剧艺术中心'
      },
      // 双子座  
      {
        zodiac: '双子座',
        chinese: '机智的言语是你今日最锐利的武器。',
        english: 'Witty words are thy sharpest weapon today.',
        fortune: '今日你的思维敏捷如莎翁笔下的智者，适合沟通交流和学习新知。会有意外的好消息传来。在繁华的南京路上，你的智慧闪闪发光。',
        play: '仲夏夜之梦',
        theater: '美琪大戏院'
      },
      {
        zodiac: '双子座',
        chinese: '好奇心是打开世界大门的钥匙。',
        english: 'Curiosity is the key that opens the world doors.',
        fortune: '你的多才多艺如《十二夜》中的机灵角色，今日社交运爆棚。新的学习机会或合作邀请即将到来。在上海的国际氛围中，你如鱼得水。',
        play: '十二夜',
        theater: '上海戏剧学院'
      },
      {
        zodiac: '双子座',
        chinese: '变化是生活的调味品，拥抱它吧！',
        english: 'Change is the spice of life, embrace it!',
        fortune: '今日适合尝试新事物，你的适应能力会让你游刃有余。可能收到多个邀请，选择困难但都是好机会。在复兴公园的多元文化中找到灵感。',
        play: '皆大欢喜',
        theater: '上海大剧院'
      },
      // 巨蟹座
      {
        zodiac: '巨蟹座',
        chinese: '温柔的月光指引着你的心灵归途。',
        english: 'Gentle moonlight guides thy soul journey home.',
        fortune: '今日情感丰富，如戏剧中动人的情感戏份。家庭关系和谐，工作上得到长辈支持。黄浦江畔的温柔晚风，诉说着你内心的温暖。',
        play: '玻璃动物园',
        theater: '上海大剧院'
      },
      {
        zodiac: '巨蟹座',
        chinese: '家是心灵的港湾，爱是永恒的主题。',
        english: 'Home is the harbor of the soul, love is the eternal theme.',
        fortune: '今日家庭运势极佳，与亲友的联系会带来温暖。直觉敏锐，适合处理情感问题。在复兴公园的绿荫下，感受生活的美好。',
        play: '家',
        theater: '上海话剧艺术中心'
      },
      {
        zodiac: '巨蟹座',
        chinese: '母性的光辉，照亮前行的路。',
        english: 'Maternal radiance lights the path forward.',
        fortune: '关怀他人会让你获得内心满足，今日特别适合帮助别人。可能收到感谢或好评。在儿童艺术剧场，重拾童心的纯真。',
        play: '蓝鸟',
        theater: '中国福利会儿童艺术剧场'
      },
      // 狮子座
      {
        zodiac: '狮子座',
        chinese: '王者风范今日尽显，舞台属于你！',
        english: 'Royal presence shines today, the stage is yours!',
        fortune: '今日你如舞台中央的主角，魅力无人能挡。领导能力得到认可，但要避免过于自我。在外滩的璀璨灯光中，你就是最耀眼的那个。',
        play: '李尔王',
        theater: '上海文化广场'
      },
      {
        zodiac: '狮子座',
        chinese: '骄傲的雄狮，统领自己的王国。',
        english: 'Proud lion rules its own kingdom.',
        fortune: '自信心爆棚的一天，你的魅力会吸引众人关注。适合发表演讲或展示才华。在人民广场的聚光灯下，你就是最亮的星。',
        play: '哈姆雷特',
        theater: '上海大剧院'
      },
      {
        zodiac: '狮子座',
        chinese: '光芒四射，如烈日当空。',
        english: 'Radiant brilliance like the blazing sun.',
        fortune: '今日是展现个人魅力的最佳时机，你的表现会让人印象深刻。可能获得重要的认可或奖励。在梅赛德斯奔驰文化中心，做最闪亮的主角。',
        play: '奥赛罗',
        theater: '梅赛德斯奔驰文化中心'
      },
      // 处女座
      {
        zodiac: '处女座',
        chinese: '完美主义者，细节中藏着成功的秘密。',
        english: 'Perfectionist, success hides in the details.',
        fortune: '今日适合处理细节工作，如导演精心雕琢每个镜头。健康运势良好，工作效率极高。在上海的精致生活中，你的完美主义得到最好的体现。',
        play: '海鸥',
        theater: '上海戏剧学院'
      },
      {
        zodiac: '处女座',
        chinese: '精益求精，是你的人生座右铭。',
        english: 'Excellence is your life motto.',
        fortune: '今日的认真态度会得到回报，工作中的严谨让你脱颖而出。适合做计划和整理。在静安寺的庄严氛围中，修炼内心的宁静。',
        play: '万尼亚舅舅',
        theater: '上海话剧艺术中心'
      },
      {
        zodiac: '处女座',
        chinese: '低调的优雅，深藏不露的才华。',
        english: 'Understated elegance, hidden talent.',
        fortune: '你的专业能力会在今日得到展现，虽然不张扬但效果显著。健康方面需要关注细节。在上海图书馆，知识为你提供力量。',
        play: '日出',
        theater: '中国大戏院'
      },
      // 天秤座
      {
        zodiac: '天秤座',
        chinese: '和谐之美如诗如画，平衡是你的艺术。',
        english: 'Harmonious beauty like poetry, balance is thy art.',
        fortune: '今日社交运势极佳，如戏剧中的社交名媛。人际关系顺利，合作项目进展顺利。在上海的国际氛围中，你的优雅魅力尽显。',
        play: '威尼斯商人',
        theater: '兰心大戏院'
      },
      {
        zodiac: '天秤座',
        chinese: '美的使者，带来和谐与平静。',
        english: 'Messenger of beauty, bringing harmony and peace.',
        fortune: '你的审美眼光今日特别准确，适合进行艺术相关的决定。感情运势上升，可能遇到心仪的人。在新天地的优雅环境中，享受生活之美。',
        play: '茶花女',
        theater: '上海大剧院'
      },
      {
        zodiac: '天秤座',
        chinese: '公正的天平，权衡万事万物。',
        english: 'The scales of justice, weighing all things.',
        fortune: '今日适合做重要决定，你的判断力会帮助你做出正确选择。人际关系中扮演调解者角色。在外白渡桥上，思考人生的平衡点。',
        play: '哈姆雷特',
        theater: '上海话剧艺术中心'
      },
      // 天蝎座
      {
        zodiac: '天蝎座',
        chinese: '深邃的灵魂，真相在黑暗中闪闪发光。',
        english: 'Profound soul, truth glitters in the darkness.',
        fortune: '今日直觉敏锐，如悬疑剧中的侦探。适合深入研究和调查，会发现重要线索。在上海的神秘夜色中，你的洞察力无人能及。',
        play: '麦克白',
        theater: '上海话剧艺术中心'
      },
      {
        zodiac: '天蝎座',
        chinese: '神秘的力量，洞悉一切隐秘。',
        english: 'Mysterious power, seeing through all secrets.',
        fortune: '你的第六感特别准确，能够看透表象。适合处理复杂的人际关系问题。在城隍庙的香烟缭绕中，寻找内心的答案。',
        play: '奥赛罗',
        theater: 'ET聚场'
      },
      {
        zodiac: '天蝎座',
        chinese: '凤凰涅槃，在变革中重生。',
        english: 'Phoenix reborn, renewed through transformation.',
        fortune: '今日是转变的好时机，勇于面对内心的恐惧会带来成长。可能有重要的人生感悟。在朱家角的古镇中，感受时光的变迁。',
        play: '暴风雨',
        theater: '上海戏剧学院'
      },
      // 射手座
      {
        zodiac: '射手座',
        chinese: '自由的风带你飞向远方的舞台。',
        english: 'Winds of freedom carry thee to distant stages.',
        fortune: '今日冒险精神旺盛，如史诗剧中的探险家。旅行运势佳，会有新的学习机会。在上海这座国际都市中，世界为你敞开大门。',
        play: '暴风雨',
        theater: '美琪大戏院'
      },
      {
        zodiac: '射手座',
        chinese: '箭在弦上，目标就在前方。',
        english: 'Arrow on the string, target ahead.',
        fortune: '目标明确的一天，你的行动力会让人刮目相看。适合制定长远计划。在上海的高架桥上，看见未来的方向。',
        play: '罗密欧与朱丽叶',
        theater: '上海文化广场'
      },
      {
        zodiac: '射手座',
        chinese: '哲学家的智慧，探索人生的意义。',
        english: 'Philosopher wisdom, exploring life meaning.',
        fortune: '今日思维开阔，适合学习和探索新知识。可能会有重要的人生感悟。在复旦大学的学术氛围中，找到智慧的源泉。',
        play: '等待戈多',
        theater: '上海戏剧学院'
      },
      // 摩羯座
      {
        zodiac: '摩羯座',
        chinese: '坚持不懈的努力，终将登上成功的顶峰。',
        english: 'Persistent effort shall reach success summit.',
        fortune: '今日务实精神如经典正剧般稳重。事业运势上升，长期规划开始显现成果。在上海的摩天大楼间，你的坚持终将开花结果。',
        play: '推销员之死',
        theater: '上海文化广场'
      },
      {
        zodiac: '摩羯座',
        chinese: '山羊攀登高峰，一步一个脚印。',
        english: 'Mountain goat climbs peaks, step by step.',
        fortune: '稳步前进的一天，你的踏实会得到认可。适合处理重要的工作事务。在金茂大厦的高度，俯瞰自己的成就。',
        play: '樱桃园',
        theater: '兰心大戏院'
      },
      {
        zodiac: '摩羯座',
        chinese: '责任与使命，是你前进的动力。',
        english: 'Responsibility and mission drive you forward.',
        fortune: '今日承担的责任会带来意想不到的收获。权威地位得到巩固。在人民大会堂的庄严中，感受使命的重量。',
        play: '茶馆',
        theater: '上海人民艺术剧院'
      },
      // 水瓶座
      {
        zodiac: '水瓶座',
        chinese: '独特的思想如前卫戏剧般引人深思。',
        english: 'Unique thoughts provoke like avant-garde theater.',
        fortune: '今日创新思维活跃，如实验戏剧般突破传统。适合尝试新事物，会有意外收获。在充满创意的上海，你的前卫思想找到了最佳舞台。',
        play: '等待戈多',
        theater: '上海戏剧学院'
      },
      {
        zodiac: '水瓶座',
        chinese: '水瓶倾倒，智慧之泉涌流不息。',
        english: 'Aquarius pours, wisdom flows endlessly.',
        fortune: '灵感如泉涌，今日的想法都很有价值。适合参与群体活动，你的独特见解会受到欢迎。在M50创意园，与同道中人交流。',
        play: '六个寻找剧作家的角色',
        theater: '上海当代艺术博物馆'
      },
      {
        zodiac: '水瓶座',
        chinese: '未来主义者，活在明天的世界里。',
        english: 'Futurist, living in tomorrow world.',
        fortune: '今日对未来的预见特别准确，适合做前瞻性的规划。科技运势佳，可能接触到新的技术。在陆家嘴的现代化环境中，拥抱未来。',
        play: '机器人与弗兰克',
        theater: 'ET聚场'
      },
      // 双鱼座
      {
        zodiac: '双鱼座',
        chinese: '梦境与现实交织，诗意在心中流淌。',
        english: 'Dreams and reality intertwine, poetry flows within.',
        fortune: '今日想象力丰富，如浪漫主义戏剧般充满诗意。艺术创作运势极佳，感情生活甜蜜。在苏州河的波光粼粼中，你的浪漫情怀得到升华。',
        play: '罗密欧与朱丽叶',
        theater: '上海大剧院'
      },
      {
        zodiac: '双鱼座',
        chinese: '双鱼游弋，在情感的海洋中自由翱翔。',
        english: 'Twin fish swim freely in the ocean of emotions.',
        fortune: '情感丰富的一天，你的同理心会帮助周围的人。适合从事艺术或慈善相关的活动。在滨江森林公园，与自然和谐共处。',
        play: '海鸥',
        theater: '话剧艺术中心'
      },
      {
        zodiac: '双鱼座',
        chinese: '直觉的天使，感知世界的美好。',
        english: 'Angel of intuition, perceiving the world beauty.',
        fortune: '第六感特别敏锐，能够感知到他人的情感需求。今日特别适合帮助他人或进行心灵交流。在龙华寺，为世界祈福。',
        play: '蓝鸟',
        theater: '中国福利会儿童艺术剧场'
      }
    ]
    
    // 心情数据 - 简化版，避免语法错误
    const moodData = [
      // 抢到票啦
      {
        mood: '抢到票啦',
        category: 'theater',
        chinese: '幸运女神今日眷顾，心仪已久的演出终于到手！',
        english: 'Lady Luck smiles today, the long-awaited show is finally yours!',
        scene: '如仲夏夜之梦般的美梦成真，你的坚持换来了最好的回报。在上海的剧院里，你即将见证艺术的魔力。',
        play: '仲夏夜之梦',
        theater: '上海大剧院'
      },
      {
        mood: '抢到票啦',
        category: 'theater',
        chinese: '手速如闪电，心愿终达成！',
        english: 'Lightning fast hands, wishes come true!',
        scene: '激动的心情如西区故事的热烈舞步，你的执着终于得到回报。订票成功的瞬间，整个世界都在为你喝彩。',
        play: '西区故事',
        theater: '上海文化广场'
      },
      {
        mood: '抢到票啦',
        category: 'theater',
        chinese: '众里寻票千百度，蓦然回首，票在手中处！',
        english: 'After searching through crowds, suddenly the ticket is in hand!',
        scene: '如茶花女般的浪漫邂逅，你与心爱演出的完美相遇。那一刻的喜悦，比任何台词都要动人。',
        play: '茶花女',
        theater: '兰心大戏院'
      },
      // 见到爱豆
      {
        mood: '见到爱豆',
        category: 'theater',
        chinese: '与心中的星辰近在咫尺，这一刻值得永远珍藏！',
        english: 'So close to the star in your heart, this moment is worth treasuring forever!',
        scene: '如罗密欧与朱丽叶初见的悸动，你的眼中只有那道耀眼的光芒。演员的魅力如此真实而触手可及。',
        play: '罗密欧与朱丽叶',
        theater: '美琪大戏院'
      },
      {
        mood: '见到爱豆',
        category: 'theater',
        chinese: '偶像的光芒，照亮了我的整个世界！',
        english: 'The idol radiance lights up my entire world!',
        scene: '如歌剧魅影中的痴迷与崇拜，你的眼神满含星光。那份纯真的喜爱，比任何表演都要动人。',
        play: '歌剧魅影',
        theater: '上海文化广场'
      },
      {
        mood: '见到爱豆',
        category: 'theater',
        chinese: '梦想照进现实，心中的神话成真！',
        english: 'Dreams become reality, myths in the heart come true!',
        scene: '如天鹅湖般的优雅邂逅，现实比想象更加美好。演员的亲和力让距离瞬间消失。',
        play: '天鹅湖',
        theater: '上海大剧院'
      },
      // 意犹未尽
      {
        mood: '意犹未尽',
        category: 'theater',
        chinese: '大幕落下，但故事还在心中继续上演。',
        english: 'The curtain falls, but the story continues in your heart.',
        scene: '如哈姆雷特般发人深省，优秀的戏剧总是让人久久回味。走出剧院的你，仍沉浸在那个世界里。',
        play: '哈姆雷特',
        theater: '上海话剧艺术中心'
      },
      {
        mood: '意犹未尽',
        category: 'theater',
        chinese: '余音绕梁，三日不绝。',
        english: 'The lingering sound echoes for three days without end.',
        scene: '如长生殿的绵绵情思，美好的演出让人不舍离去。每一个细节都值得反复回味。',
        play: '长生殿',
        theater: '兰心大戏院'
      },
      {
        mood: '意犹未尽',
        category: 'theater',
        chinese: '戏如人生，人生如戏，此刻分不清现实与梦境。',
        english: 'Drama is like life, life is like drama, reality and dreams blur.',
        scene: '如人生天地间的哲思深度，你被深深感动。走在回家的路上，脑海中还在重演着精彩片段。',
        play: '人生天地间',
        theater: 'ET聚场'
      },
      // 剧荒了
      {
        mood: '剧荒了',
        category: 'theater',
        chinese: '暂时的空白，是为了迎接下一场精彩。',
        english: 'A temporary void makes room for the next brilliance.',
        scene: '如剧季之间的休憩，这是积蓄能量的时刻。翻翻剧评，看看剧照，期待下一个戏剧季的到来。',
        play: '暴风雨',
        theater: '上海大剧院'
      },
      {
        mood: '剧荒了',
        category: 'theater',
        chinese: '等待是最煎熬的，但也是最甜蜜的。',
        english: 'Waiting is torturous, but also sweet.',
        scene: '如等待戈多般的期待，剧荒的时光让人更加珍惜好剧。在豆瓣上刷剧评，寻找下一个心动的演出。',
        play: '等待戈多',
        theater: '上海戏剧学院'
      },
      {
        mood: '剧荒了',
        category: 'theater',
        chinese: '心中有戏，处处皆是舞台。',
        english: 'With drama in heart, everywhere is a stage.',
        scene: '如人间喜剧般的生活哲学，即使剧荒也要保持对戏剧的热爱。在日常生活中寻找戏剧的影子。',
        play: '人间喜剧',
        theater: '话剧艺术中心'
      },
      // 没抢到票
      {
        mood: '没抢到票',
        category: 'theater',
        chinese: '错过这一次，是为了更好的相遇。',
        english: 'Missing this time is for a better encounter.',
        scene: '如等待戈多的等待，好戏值得等待。下次开票时，你一定会更快更准。上海的舞台永远为你开放。',
        play: '等待戈多',
        theater: '上海戏剧学院'
      },
      {
        mood: '没抢到票',
        category: 'theater',
        chinese: '山重水复疑无路，柳暗花明又一村。',
        english: 'When one door closes, another opens.',
        scene: '如推销员之死中的坚持不懈，失望是成功之母。也许这次的错过是为了遇见更好的演出。',
        play: '推销员之死',
        theater: '上海文化广场'
      },
      {
        mood: '没抢到票',
        category: 'theater',
        chinese: '此情可待成追忆，只是当时已惘然。',
        english: 'This feeling becomes a memory, though it seemed lost at the time.',
        scene: '如樱桃园中的怀念，错过的美好让人更加珍惜。下次记得提前准备，好戏不等人。',
        play: '樱桃园',
        theater: '兰心大戏院'
      },
      // 落泪了
      {
        mood: '落泪了',
        category: 'theater',
        chinese: '泪水是心灵被触动的证明，这是戏剧的最高礼赞。',
        english: 'Tears are proof of a touched soul, the highest tribute to drama.',
        scene: '如茶馆般道尽人生百态，你的泪水见证了艺术的力量。在剧院的黑暗中，每一滴泪都闪闪发光。',
        play: '茶馆',
        theater: '上海人民艺术剧院'
      },
      {
        mood: '落泪了',
        category: 'theater',
        chinese: '眼泪是情感的诗，无声胜有声。',
        english: 'Tears are the poetry of emotion, silence speaks louder than words.',
        scene: '如悲惨世界的震撼人心，真正的艺术总能直达人心最深处。你的眼泪是对演员最好的掌声。',
        play: '悲惨世界',
        theater: '梅赛德斯奔驰文化中心'
      },
      {
        mood: '落泪了',
        category: 'theater',
        chinese: '感动的泪水如珍珠般珍贵。',
        english: 'Tears of emotion are as precious as pearls.',
        scene: '如玻璃动物园般脆弱而美丽，你的感动是对艺术最真诚的回应。让眼泪自然流淌，这是心灵的净化。',
        play: '玻璃动物园',
        theater: '上海大剧院'
      },
      // 爆笑
      {
        mood: '爆笑',
        category: 'theater',
        chinese: '笑声穿透剧院的屋顶，快乐如此纯粹而美好！',
        english: 'Laughter pierces through the theater roof, joy so pure and wonderful!',
        scene: '如十二夜的喜剧精神，演员的幽默感染了全场。你的笑声是对表演最好的回应。',
        play: '十二夜',
        theater: '兰心大戏院'
      },
      {
        mood: '爆笑',
        category: 'theater',
        chinese: '开怀大笑是最好的良药！',
        english: 'Hearty laughter is the best medicine!',
        scene: '如威尼斯商人的机智对白，幽默是人生的调味剂。在笑声中忘却烦恼，享受纯粹的快乐。',
        play: '威尼斯商人',
        theater: '上海话剧艺术中心'
      },
      {
        mood: '爆笑',
        category: 'theater',
        chinese: '笑到肚子疼，这才是喜剧的最高境界！',
        english: 'Laughing till your stomach hurts, this is comedy at its finest!',
        scene: '如无事生非的巧妙情节，好的喜剧让人笑中有泪，泪中有笑。你的笑声是剧院最美的音乐。',
        play: '无事生非',
        theater: 'ET聚场'
      },
      // 二刷三刷
      {
        mood: '二刷三刷',
        category: 'theater',
        chinese: '真正的好戏，每一次观看都有新的发现。',
        english: 'A truly great play reveals something new with each viewing.',
        scene: '如李尔王般层次丰富，每一次重看都能发现新的细节。你对戏剧的热爱如此深沉。',
        play: '李尔王',
        theater: '上海文化广场'
      },
      {
        mood: '二刷三刷',
        category: 'theater',
        chinese: '好酒需要细品，好戏需要重看。',
        english: 'Good wine needs to be savored, good plays need to be rewatched.',
        scene: '如哈姆雷特的哲学深度，每一遍都有不同的理解。你是真正的戏剧鉴赏家。',
        play: '哈姆雷特',
        theater: '上海大剧院'
      },
      {
        mood: '二刷三刷',
        category: 'theater',
        chinese: '一见钟情，再见倾心，三见定终身。',
        english: 'Love at first sight, deeper love at second, eternal love at third.',
        scene: '如麦克白的复杂人性，每次观看都有新的感悟。你与这部剧的缘分如此深厚。',
        play: '麦克白',
        theater: '上海话剧艺术中心'
      },
      // 经典心情
      {
        mood: '快乐',
        category: 'classic',
        chinese: '笑声是世界上最美的音乐！',
        english: 'Laughter is the most beautiful music in the world!',
        scene: '如仲夏夜之梦中的欢乐场景，让快乐感染每一个人。在上海的阳光里，你的笑容比外滩的霓虹还要耀眼。',
        play: '仲夏夜之梦',
        theater: '美琪大戏院'
      },
      {
        mood: '快乐',
        category: 'classic',
        chinese: '阳光洒在心田，快乐如花绽放！',
        english: 'Sunshine in the heart, joy blooms like flowers!',
        scene: '如音乐之声般的纯真快乐，你的喜悦如春天的花朵般绚烂。每一个笑容都是对生活最好的礼赞。',
        play: '音乐之声',
        theater: '上海大剧院'
      },
      {
        mood: '激情',
        category: 'classic',
        chinese: '燃烧吧，我的灵魂！',
        english: 'Burn bright, my soul!',
        scene: '如奥赛罗中的炽热情感，激情是生命最绚烂的色彩。在魔都的繁华中，你的激情如烟花般绚烂绽放。',
        play: '奥赛罗',
        theater: '上海文化广场'
      },
      {
        mood: '激情',
        category: 'classic',
        chinese: '热血沸腾，青春无悔！',
        english: 'Blood boiling, youth without regrets!',
        scene: '如悲惨世界中革命者的热血，为了理想而燃烧的激情最为珍贵。在人民广场，感受青春的力量。',
        play: '悲惨世界',
        theater: '梅赛德斯奔驰文化中心'
      },
      {
        mood: '平静',
        category: 'classic',
        chinese: '内心的宁静胜过所有的风暴。',
        english: 'Inner peace surpasses all storms.',
        scene: '如暴风雨结尾的宁静，在平静中找到内心的力量。豫园的古韵与你的宁静相得益彰，岁月静好。',
        play: '暴风雨',
        theater: '兰心大戏院'
      },
      {
        mood: '平静',
        category: 'classic',
        chinese: '心如止水，万事皆空。',
        english: 'Heart like still water, all things are void.',
        scene: '如海鸥般的文艺宁静，在喧嚣中保持内心的平静是一种智慧。静安寺的禅意与你的心境完美契合。',
        play: '海鸥',
        theater: '上海戏剧学院'
      },
      {
        mood: '浪漫',
        category: 'classic',
        chinese: '爱情是永恒的诗篇。',
        english: 'Love is an eternal poem.',
        scene: '如罗密欧与朱丽叶的经典爱情，浪漫让生命绽放光彩。在上海的法租界里，你的爱情故事正在上演。',
        play: '罗密欧与朱丽叶',
        theater: '上海大剧院'
      },
      {
        mood: '浪漫',
        category: 'classic',
        chinese: '月光如水，爱情如诗。',
        english: 'Moonlight like water, love like poetry.',
        scene: '如茶花女般的浪漫邂逅，真爱总是不期而遇。在外白渡桥的月光下，邂逅属于你的浪漫。',
        play: '茶花女',
        theater: '兰心大戏院'
      }
    ]
    
    // 批量插入星座数据
    console.log('插入星座数据...')
    for (let i = 0; i < zodiacData.length; i += 20) {
      const batch = zodiacData.slice(i, i + 20)
      await db.collection('zodiac_quotes').add({
        data: batch
      })
    }
    
    // 批量插入心情数据
    console.log('插入心情数据...')
    for (let i = 0; i < moodData.length; i += 20) {
      const batch = moodData.slice(i, i + 20)
      await db.collection('mood_quotes').add({
        data: batch
      })
    }
    
    console.log('数据填充完成！')
    
    return {
      code: 0,
      message: '测试数据填充成功',
      data: {
        zodiacCount: zodiacData.length,
        moodCount: moodData.length
      }
    }
    
  } catch (error) {
    console.error('填充数据失败:', error)
    return {
      code: 1,
      message: '填充数据失败: ' + error.message,
      data: null
    }
  }
}