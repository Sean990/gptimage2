export const modes = [
  { value: 'generate', label: '文生图', badge: '纯文本', requiresReference: false },
  { value: 'image', label: '图生图', badge: '参考图', requiresReference: true },
  { value: 'edit', label: '精修图', badge: '蒙版', requiresReference: true },
]

export const aspectRatios = [
  { label: '方图 1:1', value: '1:1' },
  { label: '横版 3:2', value: '3:2' },
  { label: '竖版 2:3', value: '2:3' },
  { label: '宽屏 16:9', value: '16:9' },
  { label: '长图 9:16', value: '9:16' },
  { label: '横版 4:3', value: '4:3' },
  { label: '竖版 3:4', value: '3:4' },
  { label: '自动', value: 'auto' },
]

export const resolutionOptions = [
  { label: '自动', value: 'auto' },
  { label: '标准', value: '1K' },
  { label: '2K', value: '2K' },
  { label: '4K', value: '4K' },
]

export const sizeMatrix = {
  '1K': {
    '1:1': '1024x1024',
    '3:2': '1536x1024',
    '2:3': '1024x1536',
    '16:9': '2048x1152',
    '9:16': '1152x2048',
    '4:3': '1280x960',
    '3:4': '960x1280',
  },
  '2K': {
    '1:1': '2048x2048',
    '3:2': '2016x1344',
    '2:3': '1344x2016',
    '16:9': '2560x1440',
    '9:16': '1440x2560',
    '4:3': '1920x1440',
    '3:4': '1440x1920',
  },
  '4K': {
    '1:1': '2880x2880',
    '3:2': '3072x2048',
    '2:3': '2048x3072',
    '16:9': '3840x2160',
    '9:16': '2160x3840',
    '4:3': '3264x2448',
    '3:4': '2448x3264',
  },
}

export const qualities = [
  { label: '自动 auto', value: 'auto' },
  { label: '高 high', value: 'high' },
  { label: '中 medium', value: 'medium' },
  { label: '低 low', value: 'low' },
]

export const outputFormats = [
  { label: 'PNG', value: 'png' },
  { label: 'JPEG', value: 'jpeg' },
  { label: 'WEBP', value: 'webp' },
]

export const backgroundOptions = [
  { label: '自动 auto', value: 'auto' },
  { label: '不透明 opaque', value: 'opaque' },
]

export const moderationOptions = [
  { label: '标准审核 auto', value: 'auto' },
  { label: '宽松审核 low', value: 'low' },
]

export const generationWaitText = '1~3分钟'
export const generationIdleTip = `生成通常需要 ${generationWaitText}。提交后结果区会显示进度，你也可以继续生成或处理下一张图片。`
export const generationSubmittedTip = `任务已提交，预计${generationWaitText}完成。结果区会显示生成动画，你也可以继续生成或处理下一张图片，进度可在我的图库查看。`
