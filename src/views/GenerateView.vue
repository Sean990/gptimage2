<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Eye,
  Gem,
  GalleryHorizontal,
  Coins,
  CreditCard,
  ImagePlus,
  Layers3,
  Link as LinkIcon,
  Lightbulb,
  LogIn,
  Loader2,
  RefreshCw,
  Save,
  Shuffle,
  Square,
  Images,
  Wand,
  Sparkles,
  Trash2,
  Wand2,
  X,
  Zap,
} from 'lucide-vue-next'
import { api, resolveApiUrl } from '../services/api'
import { useAuthStore } from '../services/authStore'
import { loadPromptLibrary } from '../services/promptLibrary'
import { useSiteStore } from '../services/siteStore'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const { siteData, loadSiteData } = useSiteStore()
const modes = [
  { value: 'generate', label: '文生图', badge: '纯文本', requiresReference: false },
  { value: 'image', label: '图生图', badge: '参考图', requiresReference: true },
  { value: 'edit', label: '精修图', badge: '蒙版', requiresReference: true },
]
const aspectRatios = [
  { label: '方图 1:1', value: '1:1' },
  { label: '横向 3:2', value: '3:2' },
  { label: '竖向 2:3', value: '2:3' },
  { label: '宽屏 16:9', value: '16:9' },
  { label: '长图 9:16', value: '9:16' },
  { label: '横向 4:3', value: '4:3' },
  { label: '竖向 3:4', value: '3:4' },
  { label: '自动', value: 'auto' },
]
const resolutionOptions = [
  { label: '自动', value: 'auto' },
  { label: '标准', value: '1K' },
  { label: '2K', value: '2K' },
  { label: '4K', value: '4K' },
]
const sizeMatrix = {
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
const qualities = [
  { label: '自动 auto', value: 'auto' },
  { label: '高 high', value: 'high' },
  { label: '中 medium', value: 'medium' },
  { label: '低 low', value: 'low' },
]
const outputFormats = [
  { label: 'PNG', value: 'png' },
  { label: 'JPEG', value: 'jpeg' },
  { label: 'WEBP', value: 'webp' },
]
const backgroundOptions = [
  { label: '自动 auto', value: 'auto' },
  { label: '不透明 opaque', value: 'opaque' },
]
const moderationOptions = [
  { label: '标准审核 auto', value: 'auto' },
  { label: '宽松审核 low', value: 'low' },
]
const fallbackModelCatalog = [
  {
    value: 'gpt-image-2',
    name: 'ImgsGen',
    badge: '推荐',
    description: '适合文字渲染、海报草稿、摄影质感图像与参考图编辑。',
    meta: 'ImgsGen 等待态',
  },
  {
    value: 'nano-banana-2',
    name: 'Nano Banana 2',
    badge: '高速',
    description: '适合参考图一致性、快速出图和网络增强创作。',
    meta: 'Nano Banana 2 等待态',
  },
  {
    value: 'nano-banana-pro',
    name: 'Nano Banana Pro',
    badge: '专业',
    description: '适合多图合成、高密度排版和批量设计迭代。',
    meta: 'Nano Banana 等待态',
  },
  {
    value: 'nano-banana',
    name: 'Nano Banana v1',
    badge: '轻量',
    description: '适合轻量级快速生成、草图探索和风格试验。',
    meta: 'Nano Banana 等待态',
  },
]
const fallbackModelMap = new Map(fallbackModelCatalog.map((item) => [item.value, item]))
const fallbackModelGroups = [
  {
    label: '图像模型',
    models: [fallbackModelCatalog[0]],
  },
]
const galleryStorageKey = 'gptImage2Gallery'
const maxLocalGalleryRecords = 20
const galleryProgressStatuses = new Set(['queued', 'running', 'saving', 'cancel_requested'])
const galleryRetainedEmptyStatuses = new Set([...galleryProgressStatuses, 'failed', 'canceled'])
const galleryStatusRank = {
  queued: 1,
  cancel_requested: 1,
  running: 2,
  saving: 3,
  failed: 4,
  canceled: 4,
  completed: 5,
}
const generationWaitText = '1~3 分钟'
const generationIdleTip = `生图等待时间约 ${generationWaitText}。点击生成后不用停留当前页面，可随时在我的图库查看生图任务进度。`
const generationSubmittedTip = `任务已提交，预计 ${generationWaitText} 完成。可以不用在当前页面等待，可随时在我的图库查看生图任务进度。`
const gptLoadingDots = Array.from({ length: 169 }, (_, index) => {
  const gridSize = 13
  const row = Math.floor(index / gridSize)
  const col = index % gridSize
  const center = (gridSize - 1) / 2
  const distance = Math.hypot(row - center, col - center)
  const normalizedDistance = Math.min(1, distance / center)
  const size = 2.2 + (1 - normalizedDistance) * 4.8
  const litSize = size * 1.18
  const opacity = 0.2 + (1 - normalizedDistance) * 0.6
  const restOpacity = 0.018 + (1 - normalizedDistance) * 0.045

  return {
    id: index,
    style: {
      '--dot-size': `${size.toFixed(2)}px`,
      '--dot-lit-size': `${litSize.toFixed(2)}px`,
      '--dot-opacity': opacity.toFixed(2),
      '--dot-rest-opacity': restOpacity.toFixed(2),
    },
  }
})
async function getRandomPromptFromGallery() {
  const library = await loadPromptLibrary()
  const prompts = (library.cases || []).map((item) => item.prompt).filter(Boolean)

  if (!prompts.length) {
    throw new Error('画廊案例暂无可用提示词')
  }

  return prompts[Math.floor(Math.random() * prompts.length)]
}

const model = ref('gpt-image-2')
const modelGroups = ref(fallbackModelGroups)
const modelLoading = ref(false)
const modelLoadError = ref('')
const mode = ref('generate')
const aspectRatio = ref('3:4')
const resolution = ref('4K')
const batchMode = ref(false)
const batchCount = ref(4)
const quality = ref('auto')
const outputFormat = ref('png')
const background = ref('auto')
const moderation = ref('auto')
const outputCompression = ref(0)
const advancedOpen = ref(true)
const prompt = ref(Array.isArray(route.query.prompt) ? (route.query.prompt[0] || '') : (route.query.prompt || ''))
const urlInput = ref('')
const imageUrl = ref('')
const maskUrlInput = ref('')
const maskImageUrl = ref('')
const uploads = ref([])
const maskUploads = ref([])
const output = ref([])
const loading = ref(false)
const loadingStage = ref('准备提交生成任务')
const generationAbortController = ref(null)
const activeTaskId = ref('')
const reversing = ref(false)
const randomPromptLoading = ref(false)
const notice = ref('')
const galleryOpen = ref(false)
const gallery = ref([])
const gallerySyncing = ref(false)
const gallerySyncMessage = ref('')
const gallerySyncError = ref('')
const galleryLastSyncedAt = ref('')
const imagePreview = ref(null)
const modelPicker = ref(null)
const modelMenuOpen = ref(false)
const selectMenuOpen = ref('')
let taskPollTimer = null
let galleryRefreshTimer = null

const referenceCount = computed(() => uploads.value.length + (imageUrl.value ? 1 : 0))
const maskCount = computed(() => maskUploads.value.length + (maskImageUrl.value ? 1 : 0))
const canReverse = computed(() => referenceCount.value > 0)
const canAddMask = computed(() => maskCount.value < 1)
const activeMode = computed(() => modes.find((item) => item.value === mode.value) || modes[0])
const requiresReference = computed(() => activeMode.value.requiresReference)
const maxReferenceCount = computed(() => (mode.value === 'edit' ? 1 : 4))
const canAddReference = computed(() => referenceCount.value < maxReferenceCount.value)
const batchCountOptions = [
  { label: '2 张图片', value: 2 },
  { label: '4 张图片', value: 4, recommended: true },
  { label: '8 张图片', value: 8 },
  { label: '6 张图片', value: 6 },
  { label: '10 张图片', value: 10 },
]
const showReferenceSection = computed(() => requiresReference.value)
const normalizedImageCount = computed(() => {
  if (!batchMode.value) return 1
  const currentCount = Number(batchCount.value) || 4
  return batchCountOptions.some((item) => item.value === currentCount) ? currentCount : 4
})
const loadingTileCount = computed(() => normalizedImageCount.value)
const activeModelKey = computed(() => normalizeModelKey(model.value))
const activeModelLabel = computed(() => formatModelLabel(activeModelKey.value, model.value))
const size = computed(() => {
  if (resolution.value === 'auto' || aspectRatio.value === 'auto') return 'auto'
  return sizeMatrix[resolution.value]?.[aspectRatio.value] || 'auto'
})
const resolutionLabel = computed(() => {
  const parts = [resolution.value]
  if (size.value !== 'auto') parts.push(size.value)
  return parts.join(' · ')
})
const activeOutputCount = computed(() => {
  if (loading.value) return normalizedImageCount.value
  return output.value.length || normalizedImageCount.value
})
const previewImages = computed(() => imagePreview.value?.images || [])
const currentPreviewImage = computed(() => previewImages.value[imagePreview.value?.index || 0] || null)
const previewCount = computed(() => previewImages.value.length)
const previewPosition = computed(() => {
  if (!previewCount.value) return ''
  return `${(imagePreview.value?.index || 0) + 1} / ${previewCount.value}`
})
const outputGridClass = computed(() => {
  const count = activeOutputCount.value
  if (count <= 1) return 'output-grid--single'
  if (count === 2) return 'output-grid--two'
  if (count === 3) return 'output-grid--three'
  if (count === 4) return 'output-grid--four'
  return 'output-grid--many'
})
const outputAspectStyle = computed(() => ({
  '--output-ratio': aspectRatio.value === 'auto' ? '1 / 1' : aspectRatio.value.replace(':', ' / '),
}))
const outputPlaceholders = computed(() => [1])
const modelOptions = computed(() => modelGroups.value.flatMap((group) => group.models))
const selectedModel = computed(
  () =>
    modelOptions.value.find((item) => item.value === model.value) || {
      value: model.value,
      name: activeModelLabel.value,
      badge: '自定义',
      description: '将按当前模型 ID 发起生成请求。',
      meta: '通用等待态',
    },
)
const selectedModelAvailable = computed(() => modelOptions.value.some((item) => item.value === model.value))
const selectedAspectRatioLabel = computed(() => getOptionLabel(aspectRatios, aspectRatio.value))
const selectedResolutionLabel = computed(() => getOptionLabel(resolutionOptions, resolution.value))
const selectedQualityLabel = computed(() => getOptionLabel(qualities, quality.value))
const selectedOutputFormatLabel = computed(() => getOptionLabel(outputFormats, outputFormat.value))
const selectedBackgroundLabel = computed(() => getOptionLabel(backgroundOptions, background.value))
const selectedModerationLabel = computed(() => getOptionLabel(moderationOptions, moderation.value))
const selectedBatchCountLabel = computed(() => getOptionLabel(batchCountOptions, normalizedImageCount.value))
const heroTitle = computed(() => (batchMode.value ? '批量 AI 生图' : 'ImgsGen 照片生成'))
const heroDescription = computed(() =>
  batchMode.value ? '一次生成多张图片，提高创作效率；发布前请统一复核内容和授权。' : '结合参考图和提示词，生成可下载、可复核并带有 AI 属性提示的视觉内容。',
)
const galleryImageCount = computed(() => gallery.value.reduce((total, record) => total + record.images.length, 0))
const gallerySummary = computed(() => {
  if (!gallery.value.length) return '暂无生成记录'
  return `${gallery.value.length} 组作品 · ${galleryImageCount.value} 张图片`
})
const hasPendingGalleryRecords = computed(() => gallery.value.some((record) => isGalleryRecordPending(record)))
const galleryCloudStatusText = computed(() => {
  if (!isAuthenticated.value) return '未登录时仅显示本地临时图库，登录后会同步云端记录。'
  if (gallerySyncing.value) return '正在同步云端图库和生成进度。'
  if (gallerySyncError.value) return gallerySyncError.value
  if (galleryLastSyncedAt.value) return `云端已同步：${formatGallerySyncTime(galleryLastSyncedAt.value)}`
  return '登录状态下会自动同步云端图库、图片结果和任务进度。'
})
const loadingVariant = computed(() => {
  if (activeModelKey.value === 'gpt-image-2') return 'gpt-image-2'
  if (activeModelKey.value === 'nano-banana-2') return 'nano-banana-2'
  if (activeModelKey.value === 'nano-banana' || activeModelKey.value === 'nano-banana-pro') return 'nano-banana'
  return 'generic'
})
const loadingTitle = computed(() => {
  if (loadingVariant.value === 'gpt-image-2') return 'ImgsGen 正在生成'
  if (loadingVariant.value === 'nano-banana-2') return 'Nano Banana 2 正在推理'
  if (loadingVariant.value === 'nano-banana') return 'Nano Banana 正在组织画面'
  return `${activeModelLabel.value} 正在生成`
})
const loadingHint = computed(() => {
  if (loadingVariant.value === 'gpt-image-2') return '正在生成图像，请稍候片刻，结果请在发布前人工复核'
  if (loadingVariant.value === 'nano-banana-2') return '优先整理参考图一致性、材质细节和构图'
  if (loadingVariant.value === 'nano-banana') return '正在快速铺开构图、色彩和主体风格'
  return '正在准备当前模型的输出结果'
})
const loadingStatusText = computed(() => loadingStage.value)
const promptQualityScore = computed(() => {
  const lengthScore = Math.min(prompt.value.trim().length, 90) / 90
  const referenceScore = requiresReference.value ? Math.min(referenceCount.value, 2) * 0.16 : 0
  const qualityScore = quality.value === 'high' ? 0.1 : 0
  return Math.min(100, Math.round((0.12 + lengthScore * 0.62 + referenceScore + qualityScore) * 100))
})
const promptQualityLabel = computed(() => {
  if (promptQualityScore.value >= 76) return '高质量提示词'
  if (promptQualityScore.value >= 45) return '可生成，建议继续补充细节'
  return '描述偏短，建议补充主体、光线和构图'
})
const promptLabel = computed(() => {
  return '提示词 *'
})
const promptPlaceholder = computed(() => {
  if (mode.value === 'image') return '描述如何基于已授权参考图生成新图，例如：保持本人形象，替换为高级摄影棚背景，增强服装质感。'
  if (mode.value === 'edit') return '描述要精修的局部或整体，例如：只替换背景为高级摄影棚，主体保持不变。请勿编辑未获授权的人脸或隐私内容。'
  return '详细描述你想要生成的图像，包括主体、风格、光线、色调等。请勿输入违法、侵权、虚假或侵犯他人权益的内容。'
})
const referenceLabel = computed(() => {
  return mode.value === 'edit' ? '原图' : '参考图像'
})
const referenceInputLabel = computed(() => {
  return mode.value === 'edit' ? '上传 1 张原图或输入图片 URL' : '上传参考图片或输入图片 URL'
})
const referenceUploadHint = computed(() => {
  return mode.value === 'edit' ? '仅支持 1 张原图（PNG, JPEG, WEBP，最大 10MB）' : '支持 PNG, JPEG, WEBP（最大 10MB）'
})
const advancedSummary = computed(() => {
  const items = [
    `${normalizedImageCount.value} 张`,
    outputFormat.value.toUpperCase(),
    selectedQualityLabel.value,
  ]
  if (mode.value === 'edit' && maskCount.value) items.push('含蒙版')
  return items.join(' · ')
})
const usageCosts = computed(() => siteData.value.usageCosts || {})
const imageGenerationCosts = computed(() => usageCosts.value.imageGeneration || {})
const hasUsageCostConfig = computed(() => Boolean(usageCosts.value.imageGeneration && usageCosts.value.reversePrompt))
const reversePromptCost = computed(() => Number(usageCosts.value.reversePrompt?.credits ?? 0))
const generationBillingTip = computed(() => imageGenerationCosts.value.billingTip || '图片生成成功后扣除积分。')
const generationBillingTipInline = computed(() => generationBillingTip.value.replace(/[。.!！]+$/, ''))
const creditCost = computed(() => {
  const base = mode.value === 'edit'
    ? Number(imageGenerationCosts.value.editBase ?? 0)
    : requiresReference.value
      ? Number(imageGenerationCosts.value.imageToImageBase ?? 0)
      : Number(imageGenerationCosts.value.textToImageBase ?? 0)
  const qualityExtra = quality.value === 'high'
    ? Number(imageGenerationCosts.value.highQualityExtra ?? 0)
    : 0
  return normalizedImageCount.value * (base + qualityExtra)
})
const footerTipText = computed(() =>
  batchMode.value
    ? `批量生成 ${normalizedImageCount.value} 张图片预计消耗 ${creditCost.value} 积分，${generationBillingTipInline.value}，请在下载或发布前统一审核 AI 标识、授权和内容合规。`
    : '提示：提供越详细的描述，生成效果越好。请使用合法素材，并避免输入违法、侵权、虚假或侵犯他人权益的内容。',
)
const generationCostText = computed(() => `预计消耗 ${creditCost.value} 积分，${generationBillingTipInline.value}`)
const isAuthenticated = computed(() => auth.isAuthenticated.value)
const userCredits = computed(() => auth.credits.value)

function normalizeModelKey(value = '') {
  const normalized = value.trim().toLowerCase().replace(/[_\s]+/g, '-')

  if (!normalized) return 'generic'
  if (normalized.includes('gpt-image-2') || normalized.includes('gptimage2')) return 'gpt-image-2'
  if (normalized.includes('nano-banana-2') || normalized.includes('nanobanana2')) return 'nano-banana-2'
  if (normalized.includes('nano-banana-pro') || normalized.includes('nanobananapro')) return 'nano-banana-pro'
  if (normalized.includes('nano-banana') || normalized.includes('nanobanana')) return 'nano-banana'
  return normalized
}

function formatModelLabel(modelKey, rawValue) {
  if (modelKey === 'gpt-image-2') return 'ImgsGen'
  if (modelKey === 'nano-banana-2') return 'Nano Banana 2'
  if (modelKey === 'nano-banana-pro') return 'Nano Banana Pro'
  if (modelKey === 'nano-banana') return 'Nano Banana'
  return rawValue.trim() || '当前模型'
}

function normalizeModelOption(item) {
  const value = String(item?.value || item?.id || item?.model || '').trim()
  if (!value) return null

  const modelKey = normalizeModelKey(value)
  const known = fallbackModelMap.get(modelKey)
  const name = item.label || item.name || known?.name || formatModelLabel(modelKey, value)

  return {
    value,
    name,
    badge: item.default ? '当前' : (known?.badge || '可用'),
    description: item.description || known?.description || `${name} 当前可用于图片生成。`,
    meta: known?.meta || '通用等待态',
  }
}

async function loadImageModels() {
  modelLoading.value = true
  modelLoadError.value = ''

  try {
    const models = await api.getModels()
    const availableModels = Array.isArray(models)
      ? models.map(normalizeModelOption).filter(Boolean)
      : []

    if (!availableModels.length) return

    modelGroups.value = [
      {
        label: '后端可用模型',
        models: availableModels,
      },
    ]

    if (!availableModels.some((item) => item.value === model.value)) {
      model.value = availableModels[0].value
    }
  } catch (error) {
    modelLoadError.value = error.message || '模型配置读取失败'
    modelGroups.value = fallbackModelGroups
    model.value = fallbackModelGroups[0].models[0].value
  } finally {
    modelLoading.value = false
  }
}

function getOptionLabel(options, value) {
  return options.find((item) => item.value === value)?.label || value
}

function toggleModelMenu() {
  modelMenuOpen.value = !modelMenuOpen.value
  selectMenuOpen.value = ''
}

function selectModel(value) {
  model.value = value
  modelMenuOpen.value = false
}

function toggleSelectMenu(key) {
  selectMenuOpen.value = selectMenuOpen.value === key ? '' : key
  modelMenuOpen.value = false
}

function selectSimpleOption(key, value) {
  if (key === 'aspectRatio') aspectRatio.value = value
  if (key === 'resolution') resolution.value = value
  if (key === 'quality') quality.value = value
  if (key === 'outputFormat') outputFormat.value = value
  if (key === 'background') background.value = value
  if (key === 'moderation') moderation.value = value
  if (key === 'batchCount') batchCount.value = value
  selectMenuOpen.value = ''
}

function supportsOutputCompression(format = outputFormat.value) {
  return format === 'jpeg' || format === 'webp'
}

function closeMenusOnOutside(event) {
  const target = event.target
  if (modelMenuOpen.value && !modelPicker.value?.contains(target)) {
    modelMenuOpen.value = false
  }
  if (selectMenuOpen.value && (!(target instanceof Element) || !target.closest('.select-picker'))) {
    selectMenuOpen.value = ''
  }
}

function closeModelMenu() {
  modelMenuOpen.value = false
}

function closeSelectMenu() {
  selectMenuOpen.value = ''
}

function trimReferencesForMode() {
  const maxCount = maxReferenceCount.value
  if (referenceCount.value <= maxCount) return

  if (mode.value === 'edit') {
    uploads.value.slice(1).forEach((item) => {
      if (item.src) URL.revokeObjectURL(item.src)
    })
    if (imageUrl.value) {
      uploads.value.forEach((item) => {
        if (item.src) URL.revokeObjectURL(item.src)
      })
      uploads.value = []
    } else {
      uploads.value = uploads.value.slice(0, 1)
    }
    showNotice('精修图模式仅保留 1 张原图')
    return
  }

  uploads.value.slice(maxCount).forEach((item) => {
    if (item.src) URL.revokeObjectURL(item.src)
  })
  uploads.value = uploads.value.slice(0, Math.max(0, maxCount - (imageUrl.value ? 1 : 0)))
}

function handleWindowKeydown(event) {
  if (imagePreview.value) {
    if (event.key === 'Escape') {
      closeImagePreview()
      return
    }
    if (event.key === 'ArrowLeft') {
      showPreviousPreviewImage()
      return
    }
    if (event.key === 'ArrowRight') {
      showNextPreviewImage()
    }
    return
  }
  if (event.key !== 'Escape') return
  if (galleryOpen.value) closeGallery()
}

async function randomizePrompt() {
  if (randomPromptLoading.value) return

  randomPromptLoading.value = true
  try {
    prompt.value = await getRandomPromptFromGallery()
    showNotice('已从画廊案例随机填充提示词')
  } catch (error) {
    showNotice(error.message || '画廊案例加载失败，请稍后重试')
  } finally {
    randomPromptLoading.value = false
  }
}

function enableBatchMode() {
  batchMode.value = true
  showNotice('已切换到高级批量生图')
}

function disableBatchMode() {
  batchMode.value = false
  showNotice('已返回普通生图')
}

function openLoginFromGenerate() {
  window.dispatchEvent(new CustomEvent('open-login'))
}

function openPricingFromGenerate() {
  router.push('/pricing')
}

function normalizeGeneratedImage(item, index = 0, defaults = {}) {
  const imageUrl = item.url || item.src || item.image_url || item.image || ''
  return {
    id: item.id || `generated-${index}`,
    title: item.title || item.filename || `ImgsGen 生成图 ${index + 1}`,
    url: resolveApiUrl(imageUrl),
    prompt: item.prompt || defaults.prompt,
    model: item.model || defaults.model,
    mode: item.mode || defaults.mode,
    apiMode: item.apiMode || defaults.apiMode,
    ratio: item.ratio,
    resolution: item.resolution,
    size: item.size || defaults.size,
    quality: item.quality || defaults.quality,
    outputFormat: item.output_format || defaults.output_format,
    background: item.background || defaults.background,
    createdAt: item.createdAt || defaults.createdAt,
  }
}

function compactPayload(payload) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== '' && value !== null && value !== undefined),
  )
}

function normalizeGenerationRecord(record, defaults = {}) {
  const recordDefaults = {
    ...defaults,
    id: record?.id || defaults.id || `gallery-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    prompt: record?.prompt || defaults.prompt,
    model: record?.model || defaults.model,
    mode: record?.mode || defaults.mode,
    apiMode: record?.apiMode || defaults.apiMode,
    ratio: record?.ratio || defaults.ratio,
    resolution: record?.resolution || defaults.resolution,
    size: record?.size || defaults.size,
    quality: record?.quality || defaults.quality,
    output_format: record?.output_format || defaults.output_format,
    background: record?.background || defaults.background,
    createdAt: record?.createdAt || defaults.createdAt,
  }
  const status = record?.status || defaults.status || (Array.isArray(record?.images) && record.images.length ? 'completed' : 'queued')

  return {
    ...record,
    ...recordDefaults,
    id: recordDefaults.id,
    status,
    errorMessage: record?.errorMessage || defaults.errorMessage || '',
    images: Array.isArray(record?.images)
      ? record.images.map((item, index) => normalizeGeneratedImage(item, index, recordDefaults))
      : [],
  }
}

function mapRecordImages(record) {
  return record.images.map((item) => ({
    id: item.id,
    title: item.title,
    src: item.url,
    prompt: item.prompt,
    model: item.model,
    mode: item.mode,
    apiMode: item.apiMode,
    ratio: item.ratio,
    resolution: item.resolution,
    size: item.size,
    quality: item.quality,
    outputFormat: item.outputFormat,
    background: item.background,
    createdAt: item.createdAt,
  }))
}

function loadLocalGallery() {
  try {
    const records = JSON.parse(localStorage.getItem(galleryStorageKey) || '[]')
    return Array.isArray(records)
      ? records
        .map(normalizeGenerationRecord)
        .filter((record) => record.images.length || galleryRetainedEmptyStatuses.has(record.status))
      : []
  } catch {
    return []
  }
}

function persistLocalGallery(records = gallery.value) {
  try {
    localStorage.setItem(galleryStorageKey, JSON.stringify(records.slice(0, maxLocalGalleryRecords)))
  } catch {
    showNotice('图库本地存储空间不足，已保留当前页面记录')
  }
}

function mergeGalleryRecords(...recordGroups) {
  const recordsByKey = new Map()
  recordGroups
    .flat()
    .map((record) => normalizeGenerationRecord(record))
    .forEach((record) => {
      const shouldKeepEmptyRecord = galleryRetainedEmptyStatuses.has(record.status)
      if (!record.images.length && !shouldKeepEmptyRecord) return
      const firstImageUrl = record.images[0]?.url || ''
      const key = record.id || `${record.prompt}-${firstImageUrl || record.status}`
      const current = recordsByKey.get(key)
      if (!current || shouldReplaceGalleryRecord(current, record)) {
        recordsByKey.set(key, record)
      }
    })

  return Array.from(recordsByKey.values())
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, maxLocalGalleryRecords)
}

function shouldReplaceGalleryRecord(current, candidate) {
  const currentImageCount = current.images?.length || 0
  const candidateImageCount = candidate.images?.length || 0
  if (candidateImageCount !== currentImageCount) return candidateImageCount > currentImageCount

  const currentRank = galleryStatusRank[current.status] || 0
  const candidateRank = galleryStatusRank[candidate.status] || 0
  if (candidateRank !== currentRank) return candidateRank > currentRank

  const currentTime = new Date(current.updatedAt || current.createdAt || 0).getTime() || 0
  const candidateTime = new Date(candidate.updatedAt || candidate.createdAt || 0).getTime() || 0
  return candidateTime >= currentTime
}

function formatGalleryDate(value) {
  if (!value) return '刚刚生成'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '生成记录'
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function showNotice(text) {
  notice.value = text
  window.setTimeout(() => {
    if (notice.value === text) notice.value = ''
  }, 2600)
}

function setGallerySyncMessage(text) {
  gallerySyncMessage.value = text
  if (!text) return
  window.setTimeout(() => {
    if (gallerySyncMessage.value === text) gallerySyncMessage.value = ''
  }, 2400)
}

function hasUnuploadedLocalFiles(items) {
  return items.some((item) => String(item?.src || '').startsWith('blob:') && !item.remoteUrl)
}

function hasUnreadyUpload({ includeMask = false } = {}) {
  return hasUnuploadedLocalFiles(uploads.value) || (includeMask && hasUnuploadedLocalFiles(maskUploads.value))
}

async function onFileChange(event) {
  if (!isAuthenticated.value) {
    showNotice('请先登录后上传参考图')
    openLoginFromGenerate()
    event.target.value = ''
    return
  }

  if (!canAddReference.value) {
    showNotice(mode.value === 'edit' ? '精修图仅支持 1 张原图' : `最多添加 ${maxReferenceCount.value} 张参考图`)
    event.target.value = ''
    return
  }

  const availableSlots = Math.max(0, maxReferenceCount.value - referenceCount.value)
  const files = Array.from(event.target.files || []).slice(0, availableSlots)
  const mapped = files.map((file) => ({
    name: file.name,
    src: URL.createObjectURL(file),
  }))
  const startIndex = uploads.value.length
  uploads.value = [...uploads.value, ...mapped].slice(0, maxReferenceCount.value)
  if (mapped.length) showNotice(mode.value === 'edit' ? '原图已添加' : `已添加 ${mapped.length} 张参考图`)

  try {
    const uploaded = await api.uploadFiles(files)
    uploads.value = uploads.value.map((item, index) => ({
      ...item,
      remoteUrl: uploaded[index - startIndex]?.url ? resolveApiUrl(uploaded[index - startIndex].url) : item.remoteUrl,
    }))
  } catch (error) {
    showNotice(error.message || '参考图上传失败，已保留本地预览')
  }

  event.target.value = ''
}

async function onMaskFileChange(event) {
  if (!isAuthenticated.value) {
    showNotice('请先登录后上传蒙版')
    openLoginFromGenerate()
    event.target.value = ''
    return
  }

  if (!canAddMask.value) {
    showNotice('最多添加 1 张蒙版')
    event.target.value = ''
    return
  }

  const file = Array.from(event.target.files || [])[0]
  if (!file) return

  const mapped = {
    name: file.name,
    src: URL.createObjectURL(file),
  }
  maskUploads.value = [mapped]

  try {
    const uploaded = await api.uploadFiles([file])
    maskUploads.value = maskUploads.value.map((item) => ({
      ...item,
      remoteUrl: uploaded[0]?.url ? resolveApiUrl(uploaded[0].url) : item.remoteUrl,
    }))
    showNotice('蒙版已添加')
  } catch (error) {
    showNotice(error.message || '蒙版上传失败，已保留本地预览')
  }

  event.target.value = ''
}

function removeUpload(index) {
  const [removed] = uploads.value.splice(index, 1)
  if (removed?.src) URL.revokeObjectURL(removed.src)
  showNotice('已移除参考图')
}

function removeMaskUpload(index) {
  const [removed] = maskUploads.value.splice(index, 1)
  if (removed?.src) URL.revokeObjectURL(removed.src)
  showNotice('已移除蒙版')
}

function removeUrlReference() {
  imageUrl.value = ''
  showNotice('已移除 URL 参考图')
}

function removeMaskUrlReference() {
  maskImageUrl.value = ''
  showNotice('已移除 URL 蒙版')
}

async function reversePrompt() {
  if (!canReverse.value) return
  if (!hasUsageCostConfig.value) {
    await loadSiteData().catch(() => {})
  }
  if (!hasUsageCostConfig.value) {
    showNotice('积分规则尚未加载，请稍后重试')
    return
  }

  if (!isAuthenticated.value) {
    openLoginFromGenerate()
    showNotice('请先登录后使用 AI 反推提示词')
    return
  }
  if (userCredits.value < reversePromptCost.value) {
    showNotice(`积分不足，本次需要 ${reversePromptCost.value} 积分`)
    return
  }
  if (hasUnreadyUpload()) {
    showNotice('参考图尚未上传成功，请等待上传完成或重新上传后再反推')
    return
  }

  reversing.value = true
  try {
    const result = await api.reversePrompt({
      references: getReferences(),
    })
    prompt.value = result.prompt
    await auth.refreshMe().catch(() => {})
    showNotice('已生成 AI 反推提示词')
  } catch (error) {
    showNotice(error.message || '提示词反推失败')
  } finally {
    reversing.value = false
  }
}

async function generate() {
  if (loading.value) return
  const generationStartTime = performance.now()
  const logGenerationDuration = () => {
    const durationSeconds = ((performance.now() - generationStartTime) / 1000).toFixed(2)
    console.info(`[图像生成耗时] ${durationSeconds}s`)
  }
  if (!prompt.value.trim()) {
    logGenerationDuration()
    showNotice('请先输入提示词')
    return
  }
  if (requiresReference.value && !referenceCount.value) {
    logGenerationDuration()
    showNotice(mode.value === 'edit' ? '请先添加原图或参考图' : '请先添加参考图')
    return
  }
  if (hasUnreadyUpload({ includeMask: mode.value === 'edit' })) {
    logGenerationDuration()
    showNotice('本地图片尚未上传成功，请等待上传完成或重新上传后再生成')
    return
  }
  if (!isAuthenticated.value) {
    logGenerationDuration()
    showNotice('请先登录后再提交生成任务')
    openLoginFromGenerate()
    return
  }
  if (!hasUsageCostConfig.value) {
    await loadSiteData().catch(() => {})
  }
  if (!hasUsageCostConfig.value) {
    logGenerationDuration()
    showNotice('积分规则尚未加载，请稍后重试')
    return
  }
  if (userCredits.value < creditCost.value) {
    logGenerationDuration()
    showNotice(`积分不足，本次需要 ${creditCost.value} 积分`)
    return
  }
  if (!selectedModelAvailable.value && modelOptions.value.length) {
    model.value = modelOptions.value[0].value
    logGenerationDuration()
    showNotice(`已切换到可用模型 ${modelOptions.value[0].name}，请重新提交`)
    return
  }
  loading.value = true
  output.value = []
  loadingStage.value = '准备提交生成任务'
  generationAbortController.value = new AbortController()

  try {
    const requestPayload = compactPayload({
      prompt: prompt.value,
      model: model.value,
      mode: mode.value,
      api_mode: 'image',
      action: mode.value === 'generate' ? 'generate' : 'edit',
      size: size.value,
      ratio: aspectRatio.value,
      resolution: resolution.value,
      n: normalizedImageCount.value,
      quality: quality.value,
      output_format: outputFormat.value,
      background: background.value,
      moderation: moderation.value,
      output_compression: supportsOutputCompression() ? outputCompression.value : undefined,
      references: showReferenceSection.value ? getReferences() : [],
      mask: mode.value === 'edit' ? getMaskReference() : '',
    })
    loadingStage.value = '任务已提交，后台生成中'
    showNotice('任务已提交，可到我的图库查看进度')
    const task = await api.generateImages(requestPayload, {
      signal: generationAbortController.value.signal,
    })
    activeTaskId.value = task.id
    gallery.value = mergeGalleryRecords([normalizeGenerationRecord(task, requestPayload)], gallery.value)
    await auth.refreshMe().catch(() => {})
    const result = await waitForGenerationTask(task.id)
    const normalizedResult = normalizeGenerationRecord(result, {
      ...requestPayload,
      createdAt: new Date().toISOString(),
    })
    output.value = mapRecordImages(normalizedResult)
    gallery.value = mergeGalleryRecords([normalizedResult], gallery.value)
    persistLocalGallery()
    showNotice(batchMode.value ? '批量生成已完成' : '图像生成已完成')
  } catch (error) {
    output.value = []
    if (error.name === 'AbortError') showNotice('已停止提交生成任务')
    else showNotice(error.message || '图像生成失败，请稍后重试')
  } finally {
    logGenerationDuration()
    activeTaskId.value = ''
    generationAbortController.value = null
    loading.value = false
    loadingStage.value = '准备提交生成任务'
    await auth.refreshMe().catch(() => {})
  }
}

watch(mode, trimReferencesForMode)

function clearTaskPollTimer() {
  if (!taskPollTimer) return
  window.clearTimeout(taskPollTimer)
  taskPollTimer = null
}

async function waitForGenerationTask(taskId) {
  clearTaskPollTimer()
  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const task = await api.getGenerationTask(taskId)
        gallery.value = mergeGalleryRecords([normalizeGenerationRecord(task, task)], gallery.value)
        persistLocalGallery()
        const statusText = {
          queued: '任务排队中',
          running: '后台生成中',
          saving: '正在保存图片',
          cancel_requested: '正在取消任务',
        }[task.status]
        loadingStage.value = statusText || '后台生成中'

        if (task.status === 'completed') {
          clearTaskPollTimer()
          if (galleryOpen.value) syncCloudGallery({ silent: true })
          resolve(task)
          return
        }
        if (['failed', 'canceled'].includes(task.status)) {
          clearTaskPollTimer()
          persistLocalGallery()
          reject(new Error(task.errorMessage || (task.status === 'canceled' ? '生成已取消' : '生成失败')))
          return
        }
        taskPollTimer = window.setTimeout(poll, 1800)
      } catch (error) {
        clearTaskPollTimer()
        reject(error)
      }
    }
    poll()
  })
}

async function stopGeneration() {
  if (!loading.value) return
  if (!activeTaskId.value) {
    generationAbortController.value?.abort()
    showNotice('正在停止提交生成任务')
    return
  }
  try {
    await api.cancelGenerationTask(activeTaskId.value)
    showNotice('已请求取消生成')
  } catch (error) {
    showNotice(error.message || '取消失败')
  }
}

function addUrlReference() {
  const nextUrl = urlInput.value.trim()
  if (!nextUrl) {
    showNotice('请先输入图片 URL')
    return
  }
  if (!canAddReference.value && !imageUrl.value) {
    showNotice(mode.value === 'edit' ? '精修图仅支持 1 张原图' : `最多添加 ${maxReferenceCount.value} 张参考图`)
    return
  }
  if (mode.value === 'edit') {
    uploads.value.forEach((item) => {
      if (item.src) URL.revokeObjectURL(item.src)
    })
    uploads.value = []
  }
  imageUrl.value = nextUrl
  urlInput.value = ''
  showNotice(mode.value === 'edit' ? '图片 URL 已作为原图加入' : '图片 URL 已作为参考图加入')
}

function addMaskUrlReference() {
  const nextUrl = maskUrlInput.value.trim()
  if (!nextUrl) {
    showNotice('请先输入蒙版 URL')
    return
  }
  if (!canAddMask.value && !maskImageUrl.value) {
    showNotice('最多添加 1 张蒙版')
    return
  }
  maskImageUrl.value = nextUrl
  maskUrlInput.value = ''
  showNotice('蒙版 URL 已加入')
}

async function copyCurrentPrompt() {
  try {
    await navigator.clipboard.writeText(prompt.value)
    showNotice('当前提示词已复制')
  } catch {
    showNotice(prompt.value)
  }
}

function normalizePreviewImage(image, index = 0, fallbackTitle = '图片预览') {
  const src = image?.src || image?.url || image
  if (!src) return null
  return {
    src,
    title: image?.title || image?.name || `${fallbackTitle} ${index + 1}`,
    meta: image?.meta || [image?.model, image?.resolution, image?.ratio].filter(Boolean).join(' · '),
    prompt: image?.prompt || '',
  }
}

function openImagePreview(imageOrImages, startIndex = 0, fallbackTitle = '图片预览') {
  const rawImages = Array.isArray(imageOrImages) ? imageOrImages : [imageOrImages]
  const images = rawImages
    .map((item, index) => normalizePreviewImage(item, index, fallbackTitle))
    .filter(Boolean)
  if (!images.length) return
  const safeIndex = Math.min(Math.max(Number(startIndex) || 0, 0), images.length - 1)
  imagePreview.value = {
    images,
    index: safeIndex,
  }
}

function closeImagePreview() {
  imagePreview.value = null
}

function setPreviewIndex(index) {
  if (!imagePreview.value || !previewCount.value) return
  imagePreview.value = {
    ...imagePreview.value,
    index: (index + previewCount.value) % previewCount.value,
  }
}

function showPreviousPreviewImage() {
  setPreviewIndex((imagePreview.value?.index || 0) - 1)
}

function showNextPreviewImage() {
  setPreviewIndex((imagePreview.value?.index || 0) + 1)
}

function openPreviewSource() {
  if (!currentPreviewImage.value?.src) return
  window.open(currentPreviewImage.value.src, '_blank', 'noreferrer')
}

function getReferences() {
  return [
    imageUrl.value,
    ...uploads.value.map((item) => item.remoteUrl || item.src),
  ].filter(Boolean)
}

function getMaskReference() {
  return maskImageUrl.value || maskUploads.value[0]?.remoteUrl || maskUploads.value[0]?.src || ''
}

function getReferencePreviewImages() {
  return [
    imageUrl.value ? { src: imageUrl.value, title: 'URL 参考图', meta: '参考图像' } : null,
    ...uploads.value.map((item) => ({ src: item.src, title: item.name, meta: '参考图像' })),
  ].filter(Boolean)
}

function getMaskPreviewImages() {
  return [
    maskImageUrl.value ? { src: maskImageUrl.value, title: 'URL 蒙版', meta: '蒙版' } : null,
    ...maskUploads.value.map((item) => ({ src: item.src, title: item.name, meta: '蒙版' })),
  ].filter(Boolean)
}

function clearGalleryRefreshTimer() {
  if (!galleryRefreshTimer) return
  window.clearTimeout(galleryRefreshTimer)
  galleryRefreshTimer = null
}

function scheduleGalleryRefresh() {
  clearGalleryRefreshTimer()
  if (!galleryOpen.value || !isAuthenticated.value || !hasPendingGalleryRecords.value) return

  galleryRefreshTimer = window.setTimeout(() => {
    syncCloudGallery({ silent: true })
  }, 3000)
}

async function refreshPendingGalleryRecords() {
  if (!isAuthenticated.value) return
  const pendingRecords = gallery.value.filter((record) => isGalleryRecordPending(record))
  if (!pendingRecords.length) return

  const settledRecords = await Promise.allSettled(
    pendingRecords.map((record) => api.getGenerationTask(record.id)),
  )
  const updatedRecords = settledRecords
    .filter((result) => result.status === 'fulfilled')
    .map((result) => normalizeGenerationRecord(result.value, result.value))

  if (updatedRecords.length) {
    gallery.value = mergeGalleryRecords(updatedRecords, gallery.value)
    persistLocalGallery()
  }
}

async function syncCloudGallery({ silent = false } = {}) {
  gallery.value = mergeGalleryRecords(gallery.value, loadLocalGallery())
  gallerySyncError.value = ''

  if (!isAuthenticated.value) {
    if (!silent) showNotice('登录后可查看云端图库和生成进度')
    return
  }

  if (gallerySyncing.value) return
  gallerySyncing.value = true

  try {
    await refreshPendingGalleryRecords()
    const records = await api.getGallery()
    gallery.value = mergeGalleryRecords(gallery.value, Array.isArray(records) ? records : [])
    galleryLastSyncedAt.value = new Date().toISOString()
    persistLocalGallery()
    if (!silent) setGallerySyncMessage('云端图库已同步')
  } catch (error) {
    gallerySyncError.value = error.message || '云端图库同步失败'
    if (!silent && !gallery.value.length) showNotice(gallerySyncError.value)
  } finally {
    gallerySyncing.value = false
    scheduleGalleryRefresh()
  }
}

async function openGallery() {
  galleryOpen.value = true
  await syncCloudGallery({ silent: false })
}

function closeGallery() {
  galleryOpen.value = false
  clearGalleryRefreshTimer()
}

function syncGalleryScrollLock(isOpen) {
  document.documentElement.classList.toggle('gallery-scroll-locked', isOpen)
  document.body.classList.toggle('gallery-scroll-locked', isOpen)
}

function syncModalScrollLock() {
  const locked = galleryOpen.value || Boolean(imagePreview.value)
  document.documentElement.classList.toggle('gallery-scroll-locked', locked)
  document.body.classList.toggle('gallery-scroll-locked', locked)
}

function useGalleryRecord(record) {
  prompt.value = record.prompt || prompt.value
  model.value = record.model || model.value
  if (!selectedModelAvailable.value && modelOptions.value.length) {
    model.value = modelOptions.value[0].value
  }
  mode.value = record.mode || mode.value
  aspectRatio.value = record.ratio || aspectRatio.value
  resolution.value = record.resolution || resolution.value
  quality.value = record.quality || quality.value
  outputFormat.value = record.outputFormat || record.output_format || outputFormat.value
  background.value = record.background || background.value
  output.value = mapRecordImages(record)
  galleryOpen.value = false
  showNotice('已载入图库记录')
}

async function copyGalleryPrompt(record) {
  try {
    await navigator.clipboard.writeText(record.prompt || '')
    showNotice('图库提示词已复制')
  } catch {
    showNotice(record.prompt || '该记录没有提示词')
  }
}

function openGalleryImage(record) {
  if (!record.images?.length) return
  openImagePreview(
    record.images.map((image, index) => ({
      src: image.url,
      title: image.title || `图库图片 ${index + 1}`,
      prompt: record.prompt || image.prompt,
      model: record.model || image.model,
      resolution: record.resolution || image.resolution,
      ratio: record.ratio || image.ratio,
    })),
    0,
    '图库图片',
  )
}

function removeGalleryRecord(recordId) {
  gallery.value = gallery.value.filter((record) => record.id !== recordId)
  persistLocalGallery()
  showNotice('已从本地视图移除')
}

function clearGallery() {
  gallery.value = []
  persistLocalGallery([])
  gallerySyncMessage.value = ''
  showNotice('已清空本地图库')
}

function saveCurrentOutputToGallery() {
  if (!output.value.length) return
  const record = normalizeGenerationRecord({
    id: `manual-${Date.now()}`,
    prompt: prompt.value,
    model: model.value,
    mode: mode.value,
    apiMode: 'image',
    ratio: aspectRatio.value,
    resolution: resolution.value,
    size: size.value,
    quality: quality.value,
    output_format: outputFormat.value,
    background: background.value,
    createdAt: new Date().toISOString(),
    images: output.value.map((item) => ({
      ...item,
      url: item.src,
    })),
  })
  gallery.value = mergeGalleryRecords([record], gallery.value)
  persistLocalGallery()
  showNotice('当前结果已保存到图库')
}

function galleryRecordCover(record) {
  return record.images[0]?.url || ''
}

function galleryRecordStatusLabel(record) {
  const statusLabels = {
    queued: '排队中',
    running: '生成中',
    saving: '保存中',
    cancel_requested: '取消中',
    completed: '已完成',
    failed: '生成失败',
    canceled: '已取消',
  }
  return statusLabels[record.status] || ''
}

function isGalleryRecordPending(record) {
  return galleryProgressStatuses.has(record.status)
}

function galleryRecordProgressText(record) {
  if (record.status === 'queued') return '任务已进入队列'
  if (record.status === 'saving') return '正在保存生成图片'
  if (record.status === 'cancel_requested') return '正在取消任务'
  if (record.status === 'failed') return record.errorMessage || '后台生成失败'
  if (record.status === 'canceled') return record.errorMessage || '用户已取消生成'
  return `预计 ${generationWaitText} 完成`
}

function formatGallerySyncTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '刚刚'
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function canPreviewGalleryRecord(record) {
  return Array.isArray(record.images) && record.images.length > 0
}

function galleryRecordMode(record) {
  return modes.find((item) => item.value === record.mode)?.label || record.mode || '文生图'
}

function galleryRecordMeta(record) {
  const imageCountText = record.images.length ? `${record.images.length} 张` : galleryRecordStatusLabel(record)
  return [galleryRecordMode(record), record.resolution, record.ratio, imageCountText]
    .filter(Boolean)
    .join(' · ')
}

watch([galleryOpen, imagePreview], syncModalScrollLock)
watch([galleryOpen, hasPendingGalleryRecords, isAuthenticated], scheduleGalleryRefresh)
watch(isAuthenticated, (authenticated) => {
  if (authenticated) {
    syncCloudGallery({ silent: true })
  } else {
    clearGalleryRefreshTimer()
    galleryLastSyncedAt.value = ''
    gallerySyncError.value = ''
    gallery.value = loadLocalGallery()
  }
})

onMounted(() => {
  loadSiteData()
  loadImageModels()
  gallery.value = loadLocalGallery()
  auth.refreshMe()
    .then(() => syncCloudGallery({ silent: true }))
    .catch(() => {})
  window.addEventListener('click', closeMenusOnOutside)
  window.addEventListener('keydown', handleWindowKeydown)
})

onBeforeUnmount(() => {
  clearTaskPollTimer()
  clearGalleryRefreshTimer()
  syncGalleryScrollLock(false)
  window.removeEventListener('click', closeMenusOnOutside)
  window.removeEventListener('keydown', handleWindowKeydown)
  uploads.value.forEach((item) => {
    if (item.src) URL.revokeObjectURL(item.src)
  })
  maskUploads.value.forEach((item) => {
    if (item.src) URL.revokeObjectURL(item.src)
  })
})
</script>

<template>
  <main class="page generate-page" :class="{ 'batch-mode-page': batchMode }">
    <section class="section-tight">
      <div class="container">
        <div class="generate-hero">
          <div class="generate-hero-copy">
            <span v-if="batchMode" class="batch-hero-badge">
              <Images aria-hidden="true" />
              高级功能
            </span>
            <h1>{{ heroTitle }}</h1>
            <p>{{ heroDescription }}</p>
            <div class="tool-toolbar" aria-label="生成工具栏">
              <div class="tool-toolbar-row tool-toolbar-row-primary">
                <button v-if="!batchMode" class="btn hero-utility-button" type="button" @click="enableBatchMode">
                  <Images aria-hidden="true" />
                  <span>需要批量生成？试试高级批量生图功能</span>
                </button>
                <button v-else class="btn hero-utility-button" type="button" @click="disableBatchMode">
                  <Wand aria-hidden="true" />
                  <span>只需要单张？返回普通生图</span>
                </button>
                <button class="btn hero-utility-button" type="button" @click="openGallery">
                  <GalleryHorizontal aria-hidden="true" />
                  <span>我的图库</span><span v-if="gallery.length">{{ gallery.length }}</span>
                </button>
              </div>
              <div class="tool-toolbar-row tool-toolbar-row-secondary">
                <div v-if="isAuthenticated" class="hero-credit-group" aria-label="账户积分">
                  <span class="toolbar-credit hero-balance-pill">
                    <Coins aria-hidden="true" />
                    {{ userCredits }} 积分
                  </span>
                  <button class="btn hero-recharge-button" type="button" @click="openPricingFromGenerate">
                    <CreditCard aria-hidden="true" />
                    <span>充值积分</span>
                  </button>
                </div>
                <template v-else>
                  <span class="toolbar-credit">
                    <Wand aria-hidden="true" />
                    登录后同步任务和图库
                  </span>
                  <button class="btn hero-login-button" type="button" @click="openLoginFromGenerate">
                    <LogIn aria-hidden="true" />
                    <span>登录 / 注册</span>
                  </button>
                </template>
                <button v-if="output.length" class="btn hero-save-button" type="button" @click="saveCurrentOutputToGallery">
                  <Save aria-hidden="true" />
                  <span>保存当前结果</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="generator-layout">
          <section class="card tool-panel">
            <div class="mode-switch-card">
              <div class="settings-section-head">
                <h2>生成模式</h2>
                <span>{{ batchMode ? `${normalizedImageCount} 张图片` : activeMode.badge }}</span>
              </div>
              <div class="mode-tabs" role="tablist" aria-label="图片生成模式">
                <button
                  v-for="item in modes"
                  :key="item.value"
                  type="button"
                  role="tab"
                  :aria-selected="mode === item.value"
                  :class="{ active: mode === item.value }"
                  @click="mode = item.value"
                >
                  <strong>{{ item.label }}</strong>
                  <span>{{ item.badge }}</span>
                </button>
              </div>
            </div>
            <div v-if="batchMode" class="batch-count-card" :class="{ 'menu-open': selectMenuOpen === 'batchCount' }" aria-label="批量生成数量">
              <div>
                <span>生成数量</span>
                <strong>{{ normalizedImageCount }} 张图片</strong>
              </div>
              <div class="model-picker select-picker batch-count-picker">
                <button
                  id="batch-count"
                  class="model-picker-button select-picker-button"
                  type="button"
                  :aria-label="`生成数量，当前为 ${selectedBatchCountLabel}`"
                  :aria-expanded="selectMenuOpen === 'batchCount'"
                  aria-haspopup="listbox"
                  aria-controls="batch-count-menu"
                  @click.stop="toggleSelectMenu('batchCount')"
                  @keydown.escape="closeSelectMenu"
                >
                  <span class="model-picker-copy">
                    <span class="model-preview-head">
                      <strong>{{ selectedBatchCountLabel }}</strong>
                    </span>
                  </span>
                  <ChevronDown class="model-picker-arrow" :class="{ open: selectMenuOpen === 'batchCount' }" aria-hidden="true" />
                </button>
                <div
                  v-if="selectMenuOpen === 'batchCount'"
                  id="batch-count-menu"
                  class="model-menu select-menu"
                  role="listbox"
                  aria-labelledby="batch-count"
                >
                  <button
                    v-for="item in batchCountOptions"
                    :key="item.value"
                    class="model-option select-option batch-count-option"
                    :class="{ active: item.value === normalizedImageCount }"
                    type="button"
                    role="option"
                    :aria-selected="item.value === normalizedImageCount"
                    @click.stop="selectSimpleOption('batchCount', item.value)"
                    @keydown.escape="closeSelectMenu"
                  >
                    <span>
                      <span class="model-option-head">
                        <strong>{{ item.label }}</strong>
                        <em v-if="item.recommended">推荐</em>
                      </span>
                    </span>
                    <Check v-if="item.value === normalizedImageCount" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <small>需要 {{ creditCost }} 积分</small>
            </div>
            <div class="settings-grid">
              <div class="field model-field">
                <label for="model">模型选择</label>
                <div ref="modelPicker" class="model-picker">
                  <button
                    id="model"
                    class="model-picker-button"
                    type="button"
                    :aria-label="`模型选择，当前为 ${selectedModel.name}`"
                    :aria-expanded="modelMenuOpen"
                    aria-haspopup="listbox"
                    aria-controls="model-menu"
                    @click.stop="toggleModelMenu"
                    @keydown.escape="closeModelMenu"
                  >
                    <span class="model-picker-copy">
                      <span class="model-preview-head">
                        <strong>{{ selectedModel.name }}</strong>
                      </span>
                    </span>
                    <ChevronDown class="model-picker-arrow" :class="{ open: modelMenuOpen }" aria-hidden="true" />
                  </button>
                  <div v-if="modelMenuOpen" id="model-menu" class="model-menu" role="listbox" aria-labelledby="model">
                    <div v-for="group in modelGroups" :key="group.label" class="model-menu-group">
                      <button
                        v-for="item in group.models"
                        :key="item.value"
                        class="model-option model-name-option"
                        :class="{ active: item.value === model }"
                        type="button"
                        role="option"
                        :aria-selected="item.value === model"
                        @click.stop="selectModel(item.value)"
                        @keydown.escape="closeModelMenu"
                      >
                        <span>
                          <span class="model-option-head">
                            <strong>{{ item.name }}</strong>
                          </span>
                        </span>
                        <Check v-if="item.value === model" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div class="field">
                <label for="aspect-ratio">纵横比</label>
                <div class="model-picker select-picker">
                  <button
                    id="aspect-ratio"
                    class="model-picker-button select-picker-button"
                    type="button"
                    :aria-label="`纵横比，当前为 ${selectedAspectRatioLabel}`"
                    :aria-expanded="selectMenuOpen === 'aspectRatio'"
                    aria-haspopup="listbox"
                    aria-controls="aspect-ratio-menu"
                    @click.stop="toggleSelectMenu('aspectRatio')"
                    @keydown.escape="closeSelectMenu"
                  >
                    <span class="model-picker-copy">
                      <span class="model-preview-head">
                        <strong>{{ selectedAspectRatioLabel }}</strong>
                      </span>
                    </span>
                    <ChevronDown class="model-picker-arrow" :class="{ open: selectMenuOpen === 'aspectRatio' }" aria-hidden="true" />
                  </button>
                  <div
                    v-if="selectMenuOpen === 'aspectRatio'"
                    id="aspect-ratio-menu"
                    class="model-menu select-menu"
                    role="listbox"
                    aria-labelledby="aspect-ratio"
                  >
                    <button
                      v-for="item in aspectRatios"
                      :key="item.value"
                      class="model-option select-option"
                      :class="{ active: item.value === aspectRatio }"
                      type="button"
                      role="option"
                      :aria-selected="item.value === aspectRatio"
                      @click.stop="selectSimpleOption('aspectRatio', item.value)"
                      @keydown.escape="closeSelectMenu"
                    >
                      <span>
                        <span class="model-option-head">
                          <strong>{{ item.label }}</strong>
                        </span>
                      </span>
                      <Check v-if="item.value === aspectRatio" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
              <div class="field">
                <label for="resolution">分辨率</label>
                <div class="model-picker select-picker">
                  <button
                    id="resolution"
                    class="model-picker-button select-picker-button"
                    type="button"
                    :aria-label="`分辨率，当前为 ${selectedResolutionLabel}`"
                    :aria-expanded="selectMenuOpen === 'resolution'"
                    aria-haspopup="listbox"
                    aria-controls="resolution-menu"
                    @click.stop="toggleSelectMenu('resolution')"
                    @keydown.escape="closeSelectMenu"
                  >
                    <span class="model-picker-copy">
                      <span class="model-preview-head">
                        <strong>{{ selectedResolutionLabel }}</strong>
                      </span>
                    </span>
                    <ChevronDown class="model-picker-arrow" :class="{ open: selectMenuOpen === 'resolution' }" aria-hidden="true" />
                  </button>
                  <div
                    v-if="selectMenuOpen === 'resolution'"
                    id="resolution-menu"
                    class="model-menu select-menu"
                    role="listbox"
                    aria-labelledby="resolution"
                  >
                    <button
                      v-for="item in resolutionOptions"
                      :key="item.value"
                      class="model-option select-option"
                      :class="{ active: item.value === resolution }"
                      type="button"
                      role="option"
                      :aria-selected="item.value === resolution"
                      @click.stop="selectSimpleOption('resolution', item.value)"
                      @keydown.escape="closeSelectMenu"
                    >
                      <span>
                        <span class="model-option-head">
                          <strong>{{ item.label }}</strong>
                        </span>
                      </span>
                      <Check v-if="item.value === resolution" aria-hidden="true" />
                    </button>
                  </div>
                </div>
                <small v-if="size !== 'auto'">{{ resolutionLabel }}</small>
              </div>
            </div>

            <div v-if="showReferenceSection" class="field reference-section">
              <label>{{ referenceLabel }} <span v-if="requiresReference">({{ referenceCount }}/{{ maxReferenceCount }})</span></label>
              <div class="field">
                <label for="image-url">{{ referenceInputLabel }}</label>
                <div class="control-row">
                  <input
                    id="image-url"
                    v-model.trim="urlInput"
                    type="url"
                    inputmode="url"
                    autocomplete="off"
                    placeholder="输入图片 URL"
                    spellcheck="false"
                  />
                  <button
                    class="icon-button"
                    type="button"
                    aria-label="加入图片 URL"
                    :disabled="!urlInput.trim() || (!canAddReference && !imageUrl)"
                    @click="addUrlReference"
                  >
                    <LinkIcon aria-hidden="true" />
                  </button>
                </div>
              </div>
              <label class="upload-zone">
                <ImagePlus aria-hidden="true" />
                <strong>点击上传</strong>
                <span>或拖拽图片</span>
                <span>{{ referenceUploadHint }}</span>
                <input type="file" accept="image/png,image/jpeg,image/webp" :multiple="mode !== 'edit'" hidden @change="onFileChange" />
              </label>
              <p class="compliance-hint">请仅上传本人或已获授权的图片。包含人脸、证件、未成年人、商标、作品或隐私信息的素材，需先取得合法授权。</p>
              <div v-if="referenceCount" class="reference-grid">
                <div v-if="imageUrl" class="reference-thumb">
                  <button class="thumb-preview" type="button" aria-label="预览 URL 参考图" @click="openImagePreview(getReferencePreviewImages(), 0, '参考图像')">
                    <img :src="imageUrl" alt="URL 参考图" />
                  </button>
                  <button class="icon-button thumb-remove" type="button" aria-label="移除 URL 参考图" @click="removeUrlReference">
                    <X aria-hidden="true" />
                  </button>
                </div>
                <div v-for="(item, index) in uploads" :key="item.src" class="reference-thumb">
                  <button class="thumb-preview" type="button" :aria-label="`预览 ${item.name}`" @click="openImagePreview(getReferencePreviewImages(), imageUrl ? index + 1 : index, '参考图像')">
                    <img :src="item.src" :alt="item.name" />
                  </button>
                  <button class="icon-button thumb-remove" type="button" :aria-label="`移除 ${item.name}`" @click="removeUpload(index)">
                    <Trash2 aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>

            <div class="field">
              <div class="prompt-field-head">
                <label for="prompt">{{ promptLabel }}</label>
                <button class="btn btn-soft" type="button" :disabled="randomPromptLoading" @click="randomizePrompt">
                  <Loader2 v-if="randomPromptLoading" class="spinner" aria-hidden="true" />
                  <Shuffle v-else aria-hidden="true" />
                  {{ randomPromptLoading ? '加载案例...' : '随机提示词' }}
                </button>
              </div>
              <textarea
                id="prompt"
                v-model.trim="prompt"
                :placeholder="promptPlaceholder"
                spellcheck="false"
              />
              <div class="quality-meter" aria-live="polite">
                <div class="quality-meter-head">
                  <span>{{ promptQualityLabel }}</span>
                  <span>{{ promptQualityScore }}%</span>
                </div>
                <div class="quality-track" aria-hidden="true">
                  <span class="quality-fill" :style="{ width: `${promptQualityScore}%` }"></span>
                </div>
              </div>
              <small>不知道怎么写？试试下方的「AI 反推提示词」功能</small>
            </div>

            <details class="advanced-panel" :open="advancedOpen" @toggle="advancedOpen = $event.target.open">
              <summary>
                <span>输出参数</span>
                <small>{{ advancedSummary }}</small>
                <ChevronDown aria-hidden="true" />
              </summary>
              <div class="advanced-grid">
                <div class="field">
                  <label for="quality">质量</label>
                  <div class="model-picker select-picker">
                    <button
                      id="quality"
                      class="model-picker-button select-picker-button"
                      type="button"
                      :aria-label="`质量，当前为 ${selectedQualityLabel}`"
                      :aria-expanded="selectMenuOpen === 'quality'"
                      aria-haspopup="listbox"
                      aria-controls="quality-menu"
                      @click.stop="toggleSelectMenu('quality')"
                      @keydown.escape="closeSelectMenu"
                    >
                      <span class="model-picker-copy">
                        <span class="model-preview-head">
                          <strong>{{ selectedQualityLabel }}</strong>
                        </span>
                      </span>
                      <ChevronDown class="model-picker-arrow" :class="{ open: selectMenuOpen === 'quality' }" aria-hidden="true" />
                    </button>
                    <div
                      v-if="selectMenuOpen === 'quality'"
                      id="quality-menu"
                      class="model-menu select-menu"
                      role="listbox"
                      aria-labelledby="quality"
                    >
                      <button
                        v-for="item in qualities"
                        :key="item.value"
                        class="model-option select-option"
                        :class="{ active: item.value === quality }"
                        type="button"
                        role="option"
                        :aria-selected="item.value === quality"
                        @click.stop="selectSimpleOption('quality', item.value)"
                        @keydown.escape="closeSelectMenu"
                      >
                        <span>
                          <span class="model-option-head">
                            <strong>{{ item.label }}</strong>
                          </span>
                        </span>
                        <Check v-if="item.value === quality" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
                <div class="field">
                  <label for="output-format">输出格式</label>
                  <div class="model-picker select-picker">
                    <button
                      id="output-format"
                      class="model-picker-button select-picker-button"
                      type="button"
                      :aria-label="`输出格式，当前为 ${selectedOutputFormatLabel}`"
                      :aria-expanded="selectMenuOpen === 'outputFormat'"
                      aria-haspopup="listbox"
                      aria-controls="output-format-menu"
                      @click.stop="toggleSelectMenu('outputFormat')"
                      @keydown.escape="closeSelectMenu"
                    >
                      <span class="model-picker-copy">
                        <span class="model-preview-head">
                          <strong>{{ selectedOutputFormatLabel }}</strong>
                        </span>
                      </span>
                      <ChevronDown class="model-picker-arrow" :class="{ open: selectMenuOpen === 'outputFormat' }" aria-hidden="true" />
                    </button>
                    <div
                      v-if="selectMenuOpen === 'outputFormat'"
                      id="output-format-menu"
                      class="model-menu select-menu"
                      role="listbox"
                      aria-labelledby="output-format"
                    >
                      <button
                        v-for="item in outputFormats"
                        :key="item.value"
                        class="model-option select-option"
                        :class="{ active: item.value === outputFormat }"
                        type="button"
                        role="option"
                        :aria-selected="item.value === outputFormat"
                        @click.stop="selectSimpleOption('outputFormat', item.value)"
                        @keydown.escape="closeSelectMenu"
                      >
                        <span>
                          <span class="model-option-head">
                            <strong>{{ item.label }}</strong>
                          </span>
                        </span>
                        <Check v-if="item.value === outputFormat" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
                <div class="field">
                  <label for="background">背景</label>
                  <div class="model-picker select-picker">
                    <button
                      id="background"
                      class="model-picker-button select-picker-button"
                      type="button"
                      :aria-label="`背景，当前为 ${selectedBackgroundLabel}`"
                      :aria-expanded="selectMenuOpen === 'background'"
                      aria-haspopup="listbox"
                      aria-controls="background-menu"
                      @click.stop="toggleSelectMenu('background')"
                      @keydown.escape="closeSelectMenu"
                    >
                      <span class="model-picker-copy">
                        <span class="model-preview-head">
                          <strong>{{ selectedBackgroundLabel }}</strong>
                        </span>
                      </span>
                      <ChevronDown class="model-picker-arrow" :class="{ open: selectMenuOpen === 'background' }" aria-hidden="true" />
                    </button>
                    <div
                      v-if="selectMenuOpen === 'background'"
                      id="background-menu"
                      class="model-menu select-menu"
                      role="listbox"
                      aria-labelledby="background"
                    >
                      <button
                        v-for="item in backgroundOptions"
                        :key="item.value"
                        class="model-option select-option"
                        :class="{ active: item.value === background }"
                        type="button"
                        role="option"
                        :aria-selected="item.value === background"
                        @click.stop="selectSimpleOption('background', item.value)"
                        @keydown.escape="closeSelectMenu"
                      >
                        <span>
                          <span class="model-option-head">
                            <strong>{{ item.label }}</strong>
                          </span>
                        </span>
                        <Check v-if="item.value === background" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
                <div class="field">
                  <label for="moderation">审核</label>
                  <div class="model-picker select-picker">
                    <button
                      id="moderation"
                      class="model-picker-button select-picker-button"
                      type="button"
                      :aria-label="`审核，当前为 ${selectedModerationLabel}`"
                      :aria-expanded="selectMenuOpen === 'moderation'"
                      aria-haspopup="listbox"
                      aria-controls="moderation-menu"
                      @click.stop="toggleSelectMenu('moderation')"
                      @keydown.escape="closeSelectMenu"
                    >
                      <span class="model-picker-copy">
                        <span class="model-preview-head">
                          <strong>{{ selectedModerationLabel }}</strong>
                        </span>
                      </span>
                      <ChevronDown class="model-picker-arrow" :class="{ open: selectMenuOpen === 'moderation' }" aria-hidden="true" />
                    </button>
                    <div
                      v-if="selectMenuOpen === 'moderation'"
                      id="moderation-menu"
                      class="model-menu select-menu"
                      role="listbox"
                      aria-labelledby="moderation"
                    >
                      <button
                        v-for="item in moderationOptions"
                        :key="item.value"
                        class="model-option select-option"
                        :class="{ active: item.value === moderation }"
                        type="button"
                        role="option"
                        :aria-selected="item.value === moderation"
                        @click.stop="selectSimpleOption('moderation', item.value)"
                        @keydown.escape="closeSelectMenu"
                      >
                        <span>
                          <span class="model-option-head">
                            <strong>{{ item.label }}</strong>
                          </span>
                        </span>
                        <Check v-if="item.value === moderation" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
                <div v-if="supportsOutputCompression()" class="field">
                  <label for="compression">压缩 {{ outputCompression }}%</label>
                  <input id="compression" v-model.number="outputCompression" type="range" min="0" max="100" />
                </div>
              </div>
              <div v-if="mode === 'edit'" class="mask-panel">
                <label>蒙版 ({{ maskCount }}/1)</label>
                <div class="control-row">
                  <input
                    id="mask-url"
                    v-model.trim="maskUrlInput"
                    type="url"
                    inputmode="url"
                    autocomplete="off"
                    placeholder="输入 PNG 蒙版 URL"
                    spellcheck="false"
                  />
                  <button
                    class="icon-button"
                    type="button"
                    aria-label="加入蒙版 URL"
                    :disabled="!maskUrlInput.trim() || (!canAddMask && !maskImageUrl)"
                    @click="addMaskUrlReference"
                  >
                    <LinkIcon aria-hidden="true" />
                  </button>
                </div>
                <label class="upload-zone upload-zone-compact">
                  <ImagePlus aria-hidden="true" />
                  <strong>点击上传蒙版</strong>
                  <span>仅支持 PNG，透明区域会被编辑</span>
                  <input type="file" accept="image/png" hidden @change="onMaskFileChange" />
                </label>
                <p class="compliance-hint">请勿通过蒙版编辑未获授权的人脸、身体、证件、隐私区域或可能造成误导的敏感内容。</p>
                <div v-if="maskCount" class="reference-grid mask-grid">
                  <div v-if="maskImageUrl" class="reference-thumb">
                    <button class="thumb-preview" type="button" aria-label="预览 URL 蒙版" @click="openImagePreview(getMaskPreviewImages(), 0, '蒙版')">
                      <img :src="maskImageUrl" alt="URL 蒙版" />
                    </button>
                    <button class="icon-button thumb-remove" type="button" aria-label="移除 URL 蒙版" @click="removeMaskUrlReference">
                      <X aria-hidden="true" />
                    </button>
                  </div>
                  <div v-for="(item, index) in maskUploads" :key="item.src" class="reference-thumb">
                    <button class="thumb-preview" type="button" :aria-label="`预览 ${item.name}`" @click="openImagePreview(getMaskPreviewImages(), maskImageUrl ? index + 1 : index, '蒙版')">
                      <img :src="item.src" :alt="item.name" />
                    </button>
                    <button class="icon-button thumb-remove" type="button" :aria-label="`移除 ${item.name}`" @click="removeMaskUpload(index)">
                      <Trash2 aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            </details>

            <div v-if="requiresReference" class="reverse-box">
              <div class="reverse-head">
                <span class="reverse-icon" aria-hidden="true">
                  <Wand2 />
                </span>
                <div class="reverse-copy">
                  <h3>
                    <Sparkles aria-hidden="true" />
                    AI 反推提示词 <span class="tag">核心功能</span>
                  </h3>
                  <span>上传已授权照片，生成可修改的摄影提示词草稿</span>
                </div>
              </div>
              <p>AI 辅助分析照片并生成包含人物特征、服装细节、光线描述、镜头参数等信息的提示词草稿。上传真人照片前请确认已取得合法授权。</p>
              <button class="btn btn-soft reverse-action" type="button" :disabled="!canReverse || reversing" @click="reversePrompt">
                <Loader2 v-if="reversing" class="spinner" aria-hidden="true" />
                <Wand2 v-else aria-hidden="true" />
                {{ reversing ? '反推中...' : canReverse ? '生成反推提示词' : '请先上传图片' }}
              </button>
              <div class="reverse-meta">
                <span><Gem aria-hidden="true" />消耗 {{ reversePromptCost }} 积分</span>
                <span><Zap aria-hidden="true" />10 秒生成</span>
              </div>
            </div>

            <div class="generation-actions">
              <button class="btn btn-primary" type="button" :aria-busy="loading" :disabled="loading" @click="generate">
                <Sparkles v-if="!loading" aria-hidden="true" />
                <Loader2 v-else class="spinner" aria-hidden="true" />
                {{ loading ? (batchMode ? '批量生成中...' : '正在创建图像...') : (batchMode ? `批量生成 ${normalizedImageCount} 张图片` : '开始生成') }}
              </button>
              <button v-if="loading" class="btn btn-soft" type="button" @click="stopGeneration">
                <Square aria-hidden="true" />
                停止生成
              </button>
            </div>
            <div class="compliance-notice" role="note">
              <strong>提交即表示你确认素材来源合法，并同意平台进行内容安全审核和 AI 生成标识处理。</strong>
              <span>不得生成违法违规、侵权、虚假新闻、冒用身份、侵犯肖像隐私、损害未成年人权益或危害公共利益的内容。</span>
            </div>
            <div class="generation-inline-notice" :class="{ active: loading }" role="note">
              <div>
                <strong>{{ loading ? generationSubmittedTip : generationIdleTip }}</strong>
                <span>{{ generationCostText }}</span>
              </div>
              <button v-if="loading" class="btn btn-ghost" type="button" @click="openGallery">
                <GalleryHorizontal aria-hidden="true" />
                查看图库进度
              </button>
            </div>
          </section>

          <aside class="card output-panel">
            <div class="output-panel-head">
              <div class="output-title">
                <Layers3 aria-hidden="true" />
                <div>
                  <h2>{{ batchMode ? '生成结果' : 'AI生成结果' }}</h2>
                  <p>{{ batchMode ? '批量生成的图像将显示在这里' : `${activeMode.label} · ${resolutionLabel}` }}</p>
                </div>
              </div>
              <div class="output-meta-row">
                <span>{{ selectedModel.name }}</span>
                <span>{{ activeMode.label }}</span>
                <span>{{ normalizedImageCount }} 张</span>
              </div>
            </div>

            <div class="output-workbench">
              <div
                v-if="loading"
                class="model-loading-state"
                :class="`model-loading-state--${loadingVariant}`"
                role="status"
                aria-live="polite"
              >
                <template v-if="loadingVariant === 'gpt-image-2'">
                  <div class="gpt-loading-card" aria-hidden="true">
                    <div class="gpt-loading-dot-field">
                      <span
                        v-for="dot in gptLoadingDots"
                        :key="dot.id"
                        class="gpt-loading-dot"
                        :style="dot.style"
                      ></span>
                      <span class="gpt-loading-dot-reveal">
                        <span
                          v-for="dot in gptLoadingDots"
                          :key="`lit-${dot.id}`"
                          class="gpt-loading-lit-dot"
                          :style="dot.style"
                        ></span>
                      </span>
                    </div>
                  </div>
                </template>
                <template v-else-if="loadingVariant === 'nano-banana-2'">
                  <div class="banana-thinking-loading" aria-hidden="true">
                    <div class="banana-thinking-canvas"></div>
                  </div>
                </template>
                <template v-else-if="loadingVariant === 'nano-banana'">
                  <div class="banana-thinking-loading" aria-hidden="true">
                    <div class="banana-thinking-canvas"></div>
                  </div>
                </template>
                <template v-else>
                  <div class="loading-output-grid output-canvas" :class="outputGridClass" :style="outputAspectStyle">
                    <div
                      v-for="index in loadingTileCount"
                      :key="index"
                      class="loading-image-tile"
                      :style="{ '--tile-delay': `${(index - 1) * 160}ms` }"
                      aria-hidden="true"
                    >
                      <div class="loading-image-surface">
                        <span class="loading-image-glow"></span>
                        <span class="loading-image-scan"></span>
                      </div>
                    </div>
                  </div>
                </template>

                <div class="loading-status">
                  <span class="loading-status-dot" aria-hidden="true"></span>
                  <div>
                    <strong>{{ loadingTitle }}</strong>
                    <small>{{ activeModelLabel }} · {{ loadingStatusText }}</small>
                    <p>{{ loadingHint }}</p>
                    <p class="loading-progress-tip">{{ generationSubmittedTip }}</p>
                  </div>
                  <small>审核设置不代表内容一定可发布，商用和公开传播前仍需人工复核。</small>
                </div>
              </div>
              <div
                v-else-if="output.length"
                class="generated-output output-canvas"
                :class="outputGridClass"
                :style="outputAspectStyle"
              >
                <figure v-for="(item, index) in output" :key="item.src" class="output-item">
                  <button class="image-preview-trigger" type="button" :aria-label="`预览 ${item.title}`" @click="openImagePreview(output, index, '生成图片')">
                    <img :src="item.src" :alt="item.title" />
                  </button>
                  <figcaption class="output-actions">
                    <button class="icon-button" type="button" :aria-label="`预览 ${item.title}`" @click="openImagePreview(output, index, '生成图片')">
                      <Eye aria-hidden="true" />
                    </button>
                    <button class="icon-button" type="button" aria-label="复制当前提示词" @click="copyCurrentPrompt">
                      <Copy aria-hidden="true" />
                    </button>
                  </figcaption>
                </figure>
              </div>
              <div
                v-else
                class="empty-output output-canvas output-grid--single"
                :style="outputAspectStyle"
              >
                <div
                  v-for="slot in outputPlaceholders"
                  :key="slot"
                  class="empty-output-slot"
                >
                  <ImagePlus v-if="slot === 1" aria-hidden="true" />
                  <strong>{{ batchMode ? '批量生成的图像将显示在这里' : '生成的图像将显示在这里' }}</strong>
                  <span>{{ batchMode ? '选择数量并点击“批量生成”' : '输入提示词并点击“开始生成”' }}</span>
                </div>
              </div>
            </div>

          </aside>
        </div>

        <p class="tip generate-footer-tip">
          <Lightbulb aria-hidden="true" />
          <span>{{ footerTipText }}</span>
        </p>
      </div>
    </section>

    <div
      v-if="galleryOpen"
      class="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gallery-title"
      @click.self="closeGallery"
    >
      <div class="modal-card gallery-modal">
        <div class="modal-head">
          <div>
            <h2 id="gallery-title">我的图库</h2>
            <p>{{ gallerySummary }}</p>
          </div>
          <button class="icon-button" type="button" aria-label="关闭图库" @click="closeGallery">
            <X aria-hidden="true" />
          </button>
        </div>

        <div class="gallery-toolbar">
          <div class="gallery-cloud-status" :class="{ error: gallerySyncError }" role="status" aria-live="polite">
            <span>
              <Loader2 v-if="gallerySyncing" class="spinner" aria-hidden="true" />
              <RefreshCw v-else aria-hidden="true" />
            </span>
            <div>
              <strong>{{ gallerySyncMessage || galleryCloudStatusText }}</strong>
              <small>本地保留最近 {{ maxLocalGalleryRecords }} 组记录，云端结果以账户图库为准。</small>
            </div>
          </div>
          <div class="gallery-toolbar-actions">
            <button class="btn btn-soft" type="button" :disabled="gallerySyncing || !isAuthenticated" @click="syncCloudGallery({ silent: false })">
              <RefreshCw :class="{ spinner: gallerySyncing }" aria-hidden="true" />
              同步云端
            </button>
            <button class="btn btn-ghost" type="button" :disabled="!gallery.length" @click="clearGallery">
              <Trash2 aria-hidden="true" />
              清空本地
            </button>
          </div>
        </div>

        <div v-if="gallery.length" class="gallery-grid">
          <article v-for="record in gallery" :key="record.id" class="gallery-card">
            <button
              class="gallery-cover"
              type="button"
              :aria-label="canPreviewGalleryRecord(record) ? `预览 ${record.prompt || '图库图片'}` : `${galleryRecordStatusLabel(record)} ${record.prompt || '生成任务'}`"
              :disabled="!canPreviewGalleryRecord(record)"
              @click="openGalleryImage(record)"
            >
              <img v-if="canPreviewGalleryRecord(record)" :src="galleryRecordCover(record)" :alt="record.prompt || '图库图片'" />
              <span v-else class="gallery-task-placeholder" :class="{ active: isGalleryRecordPending(record) }">
                <span class="gallery-task-icon" aria-hidden="true">
                  <Loader2 v-if="isGalleryRecordPending(record)" class="spinner" />
                  <ImagePlus v-else />
                </span>
                <span class="gallery-task-copy">
                  <strong>{{ galleryRecordStatusLabel(record) || '生成任务' }}</strong>
                  <small>{{ galleryRecordProgressText(record) }}</small>
                </span>
              </span>
              <span class="thumb-chip">{{ galleryRecordMode(record) }}</span>
            </button>
            <div class="gallery-card-body">
              <div class="gallery-card-meta">
                <span>{{ formatGalleryDate(record.createdAt) }}</span>
                <span>{{ galleryRecordMeta(record) }}</span>
              </div>
              <p>{{ record.prompt || '无提示词记录' }}</p>
              <div class="gallery-actions">
                <button class="btn btn-soft" type="button" @click="useGalleryRecord(record)">
                  <Save aria-hidden="true" />
                  复用
                </button>
                <button class="icon-button" type="button" aria-label="预览图片" :disabled="!canPreviewGalleryRecord(record)" @click="openGalleryImage(record)">
                  <Eye aria-hidden="true" />
                </button>
                <button class="icon-button" type="button" aria-label="复制提示词" @click="copyGalleryPrompt(record)">
                  <Copy aria-hidden="true" />
                </button>
                <button class="icon-button" type="button" aria-label="删除记录" @click="removeGalleryRecord(record.id)">
                  <Trash2 aria-hidden="true" />
                </button>
              </div>
            </div>
          </article>
        </div>
        <div v-else class="empty-state">
          <ImagePlus aria-hidden="true" />
          <strong>{{ isAuthenticated ? '云端图库暂无记录' : '还没有本地生成记录' }}</strong>
          <p>{{ isAuthenticated ? '完成一次生成后，任务进度和图片结果会同步到这里。' : '登录后可查看云端图库和生成进度。' }}</p>
        </div>
      </div>
    </div>

    <div
      v-if="imagePreview"
      class="modal-backdrop preview-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-preview-title"
      @click.self="closeImagePreview"
    >
      <div class="modal-card image-preview-modal">
        <div class="modal-head image-preview-head">
          <div>
            <h2 id="image-preview-title">{{ currentPreviewImage?.title }}</h2>
            <p>{{ [previewPosition, currentPreviewImage?.meta].filter(Boolean).join(' · ') }}</p>
          </div>
          <div class="image-preview-actions">
            <button class="icon-button" type="button" aria-label="打开原图" @click="openPreviewSource">
              <ExternalLink aria-hidden="true" />
            </button>
            <button class="icon-button" type="button" aria-label="关闭预览" @click="closeImagePreview">
              <X aria-hidden="true" />
            </button>
          </div>
        </div>
        <div class="image-preview-stage">
          <button
            v-if="previewCount > 1"
            class="icon-button image-preview-nav image-preview-nav-prev"
            type="button"
            aria-label="上一张"
            @click="showPreviousPreviewImage"
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <img :src="currentPreviewImage?.src" :alt="currentPreviewImage?.title" />
          <button
            v-if="previewCount > 1"
            class="icon-button image-preview-nav image-preview-nav-next"
            type="button"
            aria-label="下一张"
            @click="showNextPreviewImage"
          >
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
        <div v-if="previewCount > 1" class="image-preview-strip" aria-label="预览缩略图">
          <button
            v-for="(item, index) in previewImages"
            :key="`${item.src}-${index}`"
            class="image-preview-thumb"
            :class="{ active: index === imagePreview.index }"
            type="button"
            :aria-label="`查看第 ${index + 1} 张`"
            :aria-current="index === imagePreview.index"
            @click="setPreviewIndex(index)"
          >
            <img :src="item.src" :alt="item.title" />
          </button>
        </div>
        <p v-if="currentPreviewImage?.prompt" class="image-preview-prompt">{{ currentPreviewImage.prompt }}</p>
      </div>
    </div>

    <div v-if="notice" class="toast">{{ notice }}</div>
  </main>
</template>
