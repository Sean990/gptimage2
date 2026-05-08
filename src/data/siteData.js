export const assets = {
  cnpay: 'https://gptimage2.asia/imgs/cnpay.png',
}

export const homeImages = [
  {
    title: '优雅御姐风写真',
    src: 'https://gptimage2.asia/_next/image?url=%2Fimgs%2Fhome-showcase%2Fsoft-white-studio.png&w=1920&q=75',
  },
  {
    title: '蕾丝系氛围写真',
    src: 'https://gptimage2.asia/_next/image?url=%2Fimgs%2Fhome-showcase%2Fautumn-dark-fashion.png&w=1920&q=75',
  },
  {
    title: '温柔纯白写真',
    src: 'https://gptimage2.asia/_next/image?url=%2Fimgs%2Fhome-showcase%2Fwinter-snow-portrait.png&w=1920&q=75',
  },
  {
    title: '气质瑟伽写真',
    src: 'https://gptimage2.asia/_next/image?url=%2Fimgs%2Fhome-showcase%2Fblack-editorial-look.png&w=1920&q=75',
  },
]

export const features = [
  ['近乎完美的文字渲染', '适合海报、封面、KV、包装图和社媒宣传图中的标题与排版文本。'],
  ['卓越的世界知识', '更容易理解复杂物体关系、品牌场景、人物动作和视觉语义，Prompt 更容易落地。'],
  ['真实感画质', '产品、人物、空间和营销画面更接近真实拍摄效果，更适合直接用于投放和展示。'],
  ['16:9 和多比例支持', '适配横版广告、视频缩略图、竖版海报、方图社媒封面等多种主流场景。'],
  ['高级指令编辑', '通过自然语言继续修改局部元素、背景、服饰和主体关系，而不必每次整张重做。'],
  ['商业级输出', '更适合内容、营销、品牌和电商团队从创意探索直接走向实际交付。'],
]

export const faqItems = [
  ['GPT Image 2 是什么？', '它可以作为一个面向用户的产品名称，代表基于 OpenAI 最新 GPT Image 能力打造的图像生成与编辑平台。'],
  ['GPT Image 2 是 OpenAI 官方模型名吗？', '不是严格意义上的官方 API 模型编号。更准确的说法是：它基于 OpenAI 最新 GPT Image 能力。'],
  ['它比旧一代图像系统强在哪？', '最明显的是文字渲染、局部编辑保真、真实感输出和商业素材可用性。'],
  ['适合哪些落地场景？', '海报、电商主图、品牌视觉、活动 KV、封面图、社媒素材和广告创意都是强应用场景。'],
  ['支持哪些画幅与风格？', '可以覆盖横版、竖版、方图及多种视觉风格，底层由 GPT Image 的生成与编辑能力支撑。'],
  ['可以先免费试用吗？', '可以。建议先体验文字渲染和编辑能力，再根据使用频率升级定价方案。'],
]

export const pricingModes = {
  credits: {
    label: '按次付费',
    plans: [
      {
        name: '体验包',
        oldPrice: '￥19.9',
        price: '￥6.9',
        cycle: '一次性',
        note: '小试牛刀，感受 AI 魅力',
        badge: '',
        cta: '立即购买',
        unit: '约 ￥0.23 / 次',
        features: ['包含功能', '30 次 AI 图像生成', '有效期 1 个月', '支持所有模型', '支持参考图上传', '高清图片下载', '微信客服支持'],
      },
      {
        name: '超值包',
        oldPrice: '￥59.9',
        price: '￥19.9',
        cycle: '一次性',
        note: '最受欢迎，性价比之王',
        badge: '热销',
        cta: '立即抢购',
        unit: '约 ￥0.13 / 次，省 67%',
        features: ['包含体验包所有功能，另加', '150 次 AI 图像生成', '有效期 3 个月', '优先处理队列', '批量生成支持', '高级模型访问', '专属客服支持', '免费更新和新功能'],
      },
      {
        name: '畅享包',
        oldPrice: '￥149.9',
        price: '￥49.9',
        cycle: '一次性',
        note: '创作自由，无限可能',
        badge: '',
        cta: '立即购买',
        unit: '约 ￥0.1 / 次，省 67%',
        features: ['包含超值包所有功能，另加', '500 次 AI 图像生成', '有效期 6 个月', '最高优先级处理', 'API 访问权限', '商业使用授权', '1对1 专属技术支持', '定制化服务'],
      },
    ],
  },
  monthly: {
    label: '月付订阅',
    plans: [
      {
        name: '基础月卡',
        oldPrice: '￥39.9',
        price: '￥19.9',
        cycle: '/月',
        note: '每月稳定创作',
        badge: '',
        cta: '订阅',
        unit: '约 ￥0.2 / 次',
        features: ['每月 100 次 AI 图像生成', '自动续费，随时取消', '支持所有模型', '支持参考图上传', '高清图片下载', '优先客服支持'],
      },
      {
        name: '专业月卡',
        oldPrice: '￥99.9',
        price: '￥49.9',
        cycle: '/月',
        note: '专业创作者首选',
        badge: '推荐',
        cta: '订阅',
        unit: '约 ￥0.17 / 次，省 50%',
        features: ['包含基础月卡所有功能，另加', '每月 300 次 AI 图像生成', '自动续费，随时取消', '优先处理队列', '批量生成支持', '高级模型访问', '专属客服支持'],
      },
      {
        name: '无限月卡',
        oldPrice: '￥199.9',
        price: '￥99.9',
        cycle: '/月',
        note: '无限创意，尽情发挥',
        badge: '',
        cta: '订阅',
        unit: '约 ￥0.1 / 次，省 50%',
        features: ['包含专业月卡所有功能，另加', '每月 1000 次 AI 图像生成', '自动续费，随时取消', '最高优先级处理', 'API 访问权限', '商业使用授权', '1对1 专属技术支持'],
      },
    ],
  },
  yearly: {
    label: '年付订阅',
    plans: [
      {
        name: '基础年卡',
        oldPrice: '￥399',
        price: '￥199',
        cycle: '/年',
        note: '全年轻量内容生产',
        badge: '',
        cta: '订阅',
        unit: '约 ￥0.17 / 次',
        features: ['每月 100 次 AI 图像生成', '年付优惠锁价', '支持所有模型', '支持参考图上传', '高清图片下载', '优先客服支持'],
      },
      {
        name: '专业年卡',
        oldPrice: '￥999',
        price: '￥499',
        cycle: '/年',
        note: '团队长期内容创作',
        badge: '推荐',
        cta: '订阅',
        unit: '约 ￥0.14 / 次，省 50%',
        features: ['每月 300 次 AI 图像生成', '年付优惠锁价', '优先处理队列', '批量生成支持', '高级模型访问', '专属客服支持'],
      },
      {
        name: '无限年卡',
        oldPrice: '￥1999',
        price: '￥999',
        cycle: '/年',
        note: '批量项目与商业交付',
        badge: '',
        cta: '订阅',
        unit: '约 ￥0.08 / 次，省 50%',
        features: ['每月 1000 次 AI 图像生成', '最高优先级处理', 'API 访问权限', '商业使用授权', '1对1 专属技术支持', '定制化服务'],
      },
    ],
  },
}

export const showcaseItems = [
  ['Nano Banana生成优雅御姐风写真(附提示词)', '人像写真', '今天调了一组酒店氛围感的 AI 写真提示词，AI 拍出了静谧又高级的御姐风。', 'https://gptimage2.asia/_next/image?url=https%3A%2F%2Fi-blog.csdnimg.cn%2Fimg_convert%2Fd1c3868e57045c08c69fe82c3fa90472.webp%3Fx-oss-process%3Dimage%2Fformat%2Cpng&w=3840&q=75'],
  ['Nano Banana生成蕾丝系美女写真（附提示词）', '人像写真', '柔光穿过纱帘，白色蕾丝纹理与深色柜体反射微光构成室内浪漫时刻。', 'https://gptimage2.asia/_next/image?url=https%3A%2F%2Fi-blog.csdnimg.cn%2Fimg_convert%2Fe8113d1ed0b5c62c40207cbb6d7d81ed.webp%3Fx-oss-process%3Dimage%2Fformat%2Cpng&w=3840&q=75'],
  ['Nano Banana生成温柔纯白写真(附提示词)', '人像写真', '高调纯白棚拍加大窗漫射光，肤质真实、轻颗粒、有呼吸感。', 'https://gptimage2.asia/_next/image?url=https%3A%2F%2Fi-blog.csdnimg.cn%2Fimg_convert%2F0b45bca723402d2cad677f5e57c7ed5c.webp%3Fx-oss-process%3Dimage%2Fformat%2Cpng&w=3840&q=75'],
  ['Nano Banana生成气质瑟伽写真(附提示词)', '人像写真', '清爽、气质、带运动感的窗边写真，酒红色运动连体服搭配白色罩身上衣。', 'https://gptimage2.asia/_next/image?url=https%3A%2F%2Fi-blog.csdnimg.cn%2Fimg_convert%2F8c2b4add441e5030e876b92a8f6594e8.webp%3Fx-oss-process%3Dimage%2Fformat%2Cpng&w=3840&q=75'],
  ['Nano Banana生成网球少女写真（附提示词）', '运动风格', '纯复刻商业人像效果，白色网球穿搭、冷青色调和真实相机质感。', 'https://gptimage2.asia/_next/image?url=https%3A%2F%2Fi-blog.csdnimg.cn%2Fimg_convert%2Fc4ccf2bc242fc0835995d8470405c5ca.webp%3Fx-oss-process%3Dimage%2Fformat%2Cpng&w=3840&q=75'],
  ['Nano Banana生成秋冬黑灰写真(附提示词)', '人像写真', '都市极简风时尚大片，纱帘柔光加黑灰造型，秋冬氛围更强。', 'https://gptimage2.asia/_next/image?url=https%3A%2F%2Fi-blog.csdnimg.cn%2Fimg_convert%2Fd1dc061b5bab89ff6c16348748cc56a0.webp%3Fx-oss-process%3Dimage%2Fformat%2Cpng&w=3840&q=75'],
  ['魔法爆炸箱，打造爆火的动漫主题房间', '场景氛围', '用结构化提示词生成动漫主题空间，把角色周边、墙面和灯光整合成可传播海报。', 'https://gptimage2.asia/_next/image?url=https%3A%2F%2Fi-blog.csdnimg.cn%2Fimg_convert%2F65de496d7a0d240335c081dc38721412.webp%3Fx-oss-process%3Dimage%2Fformat%2Cpng&w=3840&q=75'],
  ['用AI一步创建有质感的国家立方体风格图像', '风格探索', '把国家符号、材质、建筑和色彩压缩进统一立方体视觉系统。', 'https://gptimage2.asia/_next/image?url=https%3A%2F%2Fi-blog.csdnimg.cn%2Fimg_convert%2F0c9459a13bbb7843a558da73891f0517.webp%3Fx-oss-process%3Dimage%2Fformat%2Cpng&w=3840&q=75'],
  ['有质感的护照风格提示词大揭秘！', '技巧教程', '从纸张纹理、印章、证件字体和留白比例拆解护照风格的生成方法。', 'https://gptimage2.asia/_next/image?url=https%3A%2F%2Fi-blog.csdnimg.cn%2Fimg_convert%2F7393a127fc702259168e76253adef862.webp%3Fx-oss-process%3Dimage%2Fformat%2Cpng&w=3840&q=75'],
  ['艺术照 + AI = 桌搭手办', '创意玩法', '把人物艺术照延展为桌搭手办场景，适合社媒内容和个性化周边概念。', 'https://gptimage2.asia/_next/image?url=https%3A%2F%2Fi-blog.csdnimg.cn%2Fimg_convert%2F811b786eec2ef46b9f982dd44a0f2195.webp%3Fx-oss-process%3Dimage%2Fformat%2Cpng&w=3840&q=75'],
  ['Nano Banana生成窗边自然光写真(附提示词)', '人像写真', '自然光、轻窗纱、真实肤质和中景构图构成稳定的人像写真模板。', 'https://gptimage2.asia/_next/image?url=https%3A%2F%2Fi-blog.csdnimg.cn%2Fimg_convert%2F889b43a50c5d8037cecdef82c25eca9c.webp%3Fx-oss-process%3Dimage%2Fformat%2Cpng&w=3840&q=75'],
  ['Nano Banana生成街头氛围感写真（附提示词）', '街拍风格', '街头光影、松弛站姿和真实镜头压缩感，适合做头像和内容封面。', 'https://gptimage2.asia/_next/image?url=https%3A%2F%2Fi-blog.csdnimg.cn%2Fimg_convert%2F35e6cac926de13ea455a4774dfb45fd2.webp%3Fx-oss-process%3Dimage%2Fformat%2Cpng&w=3840&q=75'],
].map(([title, category, description, image], index) => ({
  id: index + 1,
  title,
  category,
  description,
  image,
  prompt: `${title}，保留人物身份与主要五官特征，真实摄影质感，细腻肤质，专业布光，杂志级构图，高清输出。`,
}))

export const legalSections = {
  privacy: {
    title: 'GPT Image 2 隐私政策',
    date: '生效日期：2024 年 12 月 23 日',
    sections: [
      ['引言', '欢迎使用 GPT Image 2。我们重视你的隐私，并在本政策中说明我们如何收集、使用和保护你在使用 AI 图像生成服务时提供的信息。'],
      ['信息收集与使用', '我们可能收集账户信息、上传图片、生成记录、设备信息、偏好设置和支付相关信息，用于提供服务、同步图库、处理订单和改进体验。'],
      ['上传与生成内容', '你保留对上传图片和生成图片的权利。平台可能在匿名、不可识别的前提下使用部分生成结果用于服务改进或能力展示，除非你选择退出。'],
      ['数据安全', '我们使用加密传输、访问控制和安全存储来保护数据，但互联网传输和电子存储无法保证绝对安全。'],
      ['第三方服务', '服务可能接入登录、支付、数据库、AI 处理和托管服务。相关服务拥有各自的隐私政策。'],
      ['你的权利', '你可以请求访问、更正、删除账户数据，或选择退出营销通讯和部分服务改进用途。'],
      ['联系我们', '如有隐私相关问题，请通过 bgnwd15@gmail.com 联系我们。'],
    ],
  },
  terms: {
    title: 'GPT Image 2 服务条款',
    date: '最后更新：2024 年 12 月 23 日',
    sections: [
      ['接受条款', '访问或使用 GPT Image 2 即表示你同意遵守本服务条款。如不同意，请停止使用服务。'],
      ['服务使用', 'GPT Image 2 提供 AI 图片生成、参考图编辑、提示词反推、图库管理和商业视觉工作流相关功能。'],
      ['账户责任', '你需要提供准确的账户信息，并负责保管登录凭证以及账户下发生的所有活动。'],
      ['内容与知识产权', '你保留自己上传内容和生成结果的权利，同时应尊重平台、第三方模型和素材来源的相关权利。'],
      ['禁止行为', '不得上传违法、侵权、恶意、欺诈或绕过安全限制的内容，不得干扰服务稳定性或滥用接口。'],
      ['价格与支付', '购买前请确认套餐、积分、有效期和订阅规则。除法律另有规定外，已完成购买通常不支持退款。'],
      ['免责声明与责任限制', '服务按现状提供。AI 生成结果可能存在错误、不稳定或不符合预期的情况，请在商业发布前自行审核。'],
      ['联系我们', '如对条款有疑问，请联系 bgnwd15@gmail.com。'],
    ],
  },
}
