<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  Check,
  ChevronDown,
  Copy,
  Download,
  GalleryHorizontal,
  ImagePlus,
  Images,
  Link as LinkIcon,
  Loader2,
  Square,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from 'lucide-vue-next'
import SectionTitle from '../components/SectionTitle.vue'
import { api, resolveApiUrl } from '../services/api'
import { useSiteStore } from '../services/siteStore'

const route = useRoute()
const { loadSiteData } = useSiteStore()
const modes = [
  { value: 'generate', label: '文生图', requiresReference: false },
  { value: 'image', label: '图生图', requiresReference: true },
  { value: 'edit', label: '精修图', requiresReference: true },
]
const aspectRatios = [
  { label: '1:1', value: '1:1' },
  { label: '16:9', value: '16:9' },
  { label: '9:16', value: '9:16' },
  { label: '4:3', value: '4:3' },
  { label: '3:4', value: '3:4' },
  { label: '自动', value: 'auto' },
]
const resolutionOptions = [
  { label: '自动', value: 'auto' },
  { label: '1K', value: '1K' },
  { label: '2K', value: '2K' },
  { label: '4K', value: '4K' },
]
const sizeMatrix = {
  '1K': {
    '1:1': '1024x1024',
    '16:9': '1792x1008',
    '9:16': '1008x1792',
    '4:3': '1344x1008',
    '3:4': '1008x1344',
  },
  '2K': {
    '1:1': '2048x2048',
    '16:9': '2560x1440',
    '9:16': '1440x2560',
    '4:3': '1920x1440',
    '3:4': '1440x1920',
  },
  '4K': {
    '1:1': '2880x2880',
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
const moderationOptions = [
  { label: '自动 auto', value: 'auto' },
  { label: '低限制 low', value: 'low' },
]
const modelGroups = [
  {
    label: '图像模型',
    models: [
      {
        value: 'gpt-image-2',
        name: 'GPT Image 2',
        badge: '推荐',
        description: '适合文字渲染、商业海报、真实感图像与精准编辑。',
        meta: '官方 dots 等待态',
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
    ],
  },
]
const modelOptions = modelGroups.flatMap((group) => group.models)
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

const model = ref('gpt-image-2')
const mode = ref('generate')
const aspectRatio = ref('3:4')
const resolution = ref('4K')
const imageCount = ref(1)
const quality = ref('auto')
const outputFormat = ref('png')
const moderation = ref('auto')
const outputCompression = ref(0)
const advancedOpen = ref(false)
const prompt = ref(
  route.query.prompt ||
    '室内柔光人像摄影，保留上传照片的人物身份与五官特征，白色蕾丝连衣裙，窗边自然光，暖色调，中景构图，真实肤质，杂志级质感。',
)
const urlInput = ref('')
const imageUrl = ref('')
const maskUrlInput = ref('')
const maskImageUrl = ref('')
const uploads = ref([])
const maskUploads = ref([])
const output = ref([])
const loading = ref(false)
const loadingProgress = ref(27)
const generationAbortController = ref(null)
const reversing = ref(false)
const notice = ref('')
const galleryOpen = ref(false)
const gallery = ref([])
const modelPicker = ref(null)
const modelMenuOpen = ref(false)
const selectMenuOpen = ref('')

const referenceCount = computed(() => uploads.value.length + (imageUrl.value ? 1 : 0))
const maskCount = computed(() => maskUploads.value.length + (maskImageUrl.value ? 1 : 0))
const canReverse = computed(() => referenceCount.value > 0)
const canAddReference = computed(() => referenceCount.value < 4)
const canAddMask = computed(() => maskCount.value < 1)
const activeMode = computed(() => modes.find((item) => item.value === mode.value) || modes[0])
const requiresReference = computed(() => activeMode.value.requiresReference)
const normalizedImageCount = computed(() => Math.min(10, Math.max(1, Number(imageCount.value) || 1)))
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
const selectedModel = computed(
  () =>
    modelOptions.find((item) => item.value === model.value) || {
      value: model.value,
      name: activeModelLabel.value,
      badge: '自定义',
      description: '将按当前模型 ID 发起生成请求。',
      meta: '通用等待态',
    },
)
const selectedAspectRatioLabel = computed(() => getOptionLabel(aspectRatios, aspectRatio.value))
const selectedResolutionLabel = computed(() => getOptionLabel(resolutionOptions, resolution.value))
const selectedQualityLabel = computed(() => getOptionLabel(qualities, quality.value))
const selectedOutputFormatLabel = computed(() => getOptionLabel(outputFormats, outputFormat.value))
const selectedModerationLabel = computed(() => getOptionLabel(moderationOptions, moderation.value))
const loadingVariant = computed(() => {
  if (activeModelKey.value === 'gpt-image-2') return 'gpt-image-2'
  if (activeModelKey.value === 'nano-banana-2') return 'nano-banana-2'
  if (activeModelKey.value === 'nano-banana' || activeModelKey.value === 'nano-banana-pro') return 'nano-banana'
  return 'generic'
})
const loadingTitle = computed(() => {
  if (loadingVariant.value === 'gpt-image-2') return 'GPT Image 2 正在生成'
  if (loadingVariant.value === 'nano-banana-2') return 'Nano Banana 2 正在推理'
  if (loadingVariant.value === 'nano-banana') return 'Nano Banana 正在组织画面'
  return `${activeModelLabel.value} 正在生成`
})
const loadingHint = computed(() => {
  if (loadingVariant.value === 'gpt-image-2') return '使用 image-gen-loading-state-dots 风格等待态'
  if (loadingVariant.value === 'nano-banana-2') return '优先整理参考图一致性、材质细节和构图'
  if (loadingVariant.value === 'nano-banana') return '正在快速铺开构图、色彩和主体风格'
  return '正在准备当前模型的输出结果'
})
const loadingStatusText = computed(() => `正在创建图像 · ${loadingProgress.value}%`)
const promptQualityScore = computed(() => {
  const lengthScore = Math.min(prompt.value.trim().length, 90) / 90
  const referenceScore = Math.min(referenceCount.value, 2) * 0.16
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
  if (mode.value === 'image') return '描述如何基于参考图生成新图，例如：保持人物身份，替换为高级摄影棚背景，增强服装质感。'
  if (mode.value === 'edit') return '描述要精修的局部或整体，例如：只替换背景为高级摄影棚，主体保持不变。'
  return '详细描述你想要生成的图像，包括主体、风格、光线、色调等...'
})
const referenceLabel = computed(() => {
  return '参考图像'
})
const advancedSummary = computed(() => {
  const items = [
    activeMode.value.label,
    `${normalizedImageCount.value} 张`,
    outputFormat.value.toUpperCase(),
  ]
  if (mode.value === 'edit' && maskCount.value) items.push('含蒙版')
  return items.join(' · ')
})

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
  if (modelKey === 'gpt-image-2') return 'GPT Image 2'
  if (modelKey === 'nano-banana-2') return 'Nano Banana 2'
  if (modelKey === 'nano-banana-pro') return 'Nano Banana Pro'
  if (modelKey === 'nano-banana') return 'Nano Banana'
  return rawValue.trim() || '当前模型'
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
  if (key === 'moderation') moderation.value = value
  selectMenuOpen.value = ''
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

function normalizeGeneratedImage(item, index = 0, defaults = {}) {
  const imageUrl = item.url || item.src || item.image_url || item.image || ''
  return {
    id: item.id || `generated-${index}`,
    title: item.title || item.filename || `GPT Image 2 生成图 ${index + 1}`,
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
    prompt: record?.prompt || defaults.prompt,
    model: record?.model || defaults.model,
    mode: record?.mode || defaults.mode,
    apiMode: record?.apiMode || defaults.apiMode,
    size: record?.size || defaults.size,
    quality: record?.quality || defaults.quality,
    output_format: record?.output_format || defaults.output_format,
    createdAt: record?.createdAt || defaults.createdAt,
  }

  return {
    ...record,
    ...recordDefaults,
    images: Array.isArray(record?.images)
      ? record.images.map((item, index) => normalizeGeneratedImage(item, index, recordDefaults))
      : [],
  }
}

function showNotice(text) {
  notice.value = text
  window.setTimeout(() => {
    if (notice.value === text) notice.value = ''
  }, 2600)
}

let loadingProgressTimer = null

function clearLoadingProgressTimer() {
  if (!loadingProgressTimer) return
  window.clearInterval(loadingProgressTimer)
  loadingProgressTimer = null
}

function startLoadingProgressTimer() {
  clearLoadingProgressTimer()
  loadingProgress.value = 27
  loadingProgressTimer = window.setInterval(() => {
    const remaining = 99 - loadingProgress.value
    const step = Math.max(1, Math.ceil(remaining * 0.08))
    loadingProgress.value = Math.min(99, loadingProgress.value + step)
  }, 1200)
}

async function onFileChange(event) {
  if (!canAddReference.value) {
    showNotice('最多添加 4 张参考图')
    event.target.value = ''
    return
  }
  const files = Array.from(event.target.files || []).slice(0, 4 - referenceCount.value)
  const mapped = files.map((file) => ({
    name: file.name,
    src: URL.createObjectURL(file),
  }))
  const startIndex = uploads.value.length
  uploads.value = [...uploads.value, ...mapped].slice(0, 4)
  if (mapped.length) showNotice(`已添加 ${mapped.length} 张参考图`)

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

  reversing.value = true
  try {
    const result = await api.reversePrompt({
      prompt: prompt.value,
      references: getReferences(),
    })
    prompt.value = result.prompt
    showNotice('已生成 AI 反推提示词')
  } catch (error) {
    showNotice(error.message || '提示词反推失败')
  } finally {
    reversing.value = false
  }
}

async function generate() {
  if (loading.value) return
  if (!prompt.value.trim()) {
    showNotice('请先输入提示词')
    return
  }
  if (requiresReference.value && !referenceCount.value) {
    showNotice(mode.value === 'edit' ? '请先添加原图或参考图' : '请先添加参考图')
    return
  }
  generationAbortController.value?.abort()
  const controller = new AbortController()
  generationAbortController.value = controller
  loading.value = true
  output.value = []

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
      moderation: moderation.value,
      output_compression: outputCompression.value,
      response_format: 'b64_json',
      references: getReferences(),
      mask: getMaskReference(),
    })
    const result = await api.generateImages(requestPayload, {
      signal: controller.signal,
    })
    const normalizedResult = normalizeGenerationRecord(result, {
      ...requestPayload,
      createdAt: new Date().toISOString(),
    })
    output.value = normalizedResult.images.map((item) => ({
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
      createdAt: item.createdAt,
    }))
    gallery.value = [normalizedResult, ...gallery.value]
    showNotice(normalizedImageCount.value > 1 ? '批量生成已完成' : '图像生成已完成')
  } catch (error) {
    output.value = []
    showNotice(error.name === 'AbortError' ? '已停止生成' : (error.message || '图像生成失败，请稍后重试'))
  } finally {
    if (generationAbortController.value === controller) {
      generationAbortController.value = null
      loading.value = false
    }
  }
}

function stopGeneration() {
  if (!loading.value) return
  generationAbortController.value?.abort()
}

function addUrlReference() {
  const nextUrl = urlInput.value.trim()
  if (!nextUrl) {
    showNotice('请先输入图片 URL')
    return
  }
  if (!canAddReference.value && !imageUrl.value) {
    showNotice('最多添加 4 张参考图')
    return
  }
  imageUrl.value = nextUrl
  urlInput.value = ''
  showNotice('图片 URL 已作为参考图加入')
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

function openImage(item) {
  window.open(item.src, '_blank', 'noreferrer')
  showNotice('已打开高清图片')
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

async function openGallery() {
  galleryOpen.value = true
  try {
    const records = await api.getGallery()
    gallery.value = Array.isArray(records) ? records.map(normalizeGenerationRecord) : []
  } catch {
    gallery.value = []
  }
}

watch(loading, (isLoading) => {
  if (isLoading) {
    startLoadingProgressTimer()
    return
  }

  clearLoadingProgressTimer()
  loadingProgress.value = 27
})

onMounted(() => {
  loadSiteData()
  window.addEventListener('click', closeMenusOnOutside)
})

onBeforeUnmount(() => {
  clearLoadingProgressTimer()
  window.removeEventListener('click', closeMenusOnOutside)
  uploads.value.forEach((item) => {
    if (item.src) URL.revokeObjectURL(item.src)
  })
  maskUploads.value.forEach((item) => {
    if (item.src) URL.revokeObjectURL(item.src)
  })
})
</script>

<template>
  <main class="page generate-page">
    <section class="section-tight">
      <div class="container">
        <SectionTitle
          align="left"
          level="h1"
          title="GPT Image 2 照片生成"
          description="结合参考图和提示词，快速生成高质量 AI 写真与视觉内容。"
        />

        <div class="tool-toolbar">
          <button class="btn btn-soft" type="button" :aria-pressed="normalizedImageCount > 1" @click="imageCount = normalizedImageCount > 1 ? 1 : 4">
            <Images aria-hidden="true" />
            {{ normalizedImageCount > 1 ? `已开启批量生成（${normalizedImageCount} 张）` : '需要批量生成？试试一次生成 4 张' }}
          </button>
          <button class="btn btn-ghost" type="button" @click="openGallery">
            <GalleryHorizontal aria-hidden="true" />
            我的图库
          </button>
          <span class="btn btn-ghost">游客可免费生成 1 次</span>
        </div>

        <div class="generator-layout">
          <section class="card tool-panel">
            <h2>参数设置</h2>
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
                      <div class="model-menu-label">{{ group.label }}</div>
                      <button
                        v-for="item in group.models"
                        :key="item.value"
                        class="model-option"
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

            <div class="field">
              <label for="prompt">{{ promptLabel }}</label>
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

            <div class="field">
              <label>{{ referenceLabel }} ({{ referenceCount }}/4)</label>
              <div class="field">
                <label for="image-url">上传参考图片或输入图片 URL</label>
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
                <span>支持 PNG, JPG, WEBP（最大 10MB）</span>
                <input type="file" accept="image/png,image/jpeg,image/webp" multiple hidden @change="onFileChange" />
              </label>
              <div v-if="referenceCount" class="reference-grid">
                <div v-if="imageUrl" class="reference-thumb">
                  <img :src="imageUrl" alt="URL 参考图" />
                  <button class="icon-button thumb-remove" type="button" aria-label="移除 URL 参考图" @click="removeUrlReference">
                    <X aria-hidden="true" />
                  </button>
                </div>
                <div v-for="(item, index) in uploads" :key="item.src" class="reference-thumb">
                  <img :src="item.src" :alt="item.name" />
                  <button class="icon-button thumb-remove" type="button" :aria-label="`移除 ${item.name}`" @click="removeUpload(index)">
                    <Trash2 aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>

            <details class="advanced-panel" :open="advancedOpen" @toggle="advancedOpen = $event.target.open">
              <summary>
                <span>高级设置</span>
                <small>{{ advancedSummary }}</small>
                <ChevronDown aria-hidden="true" />
              </summary>
              <div class="advanced-grid">
                <div class="field mode-field">
                  <label>生成模式</label>
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
                      {{ item.label }}
                    </button>
                  </div>
                </div>
                <div class="field">
                  <label for="image-count">数量</label>
                  <input id="image-count" v-model.number="imageCount" type="number" inputmode="numeric" min="1" max="10" />
                </div>
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
                <div v-if="outputFormat === 'jpeg' || outputFormat === 'webp'" class="field">
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
                  <span>仅支持 PNG，白色区域会被编辑</span>
                  <input type="file" accept="image/png" hidden @change="onMaskFileChange" />
                </label>
                <div v-if="maskCount" class="reference-grid mask-grid">
                  <div v-if="maskImageUrl" class="reference-thumb">
                    <img :src="maskImageUrl" alt="URL 蒙版" />
                    <button class="icon-button thumb-remove" type="button" aria-label="移除 URL 蒙版" @click="removeMaskUrlReference">
                      <X aria-hidden="true" />
                    </button>
                  </div>
                  <div v-for="(item, index) in maskUploads" :key="item.src" class="reference-thumb">
                    <img :src="item.src" :alt="item.name" />
                    <button class="icon-button thumb-remove" type="button" :aria-label="`移除 ${item.name}`" @click="removeMaskUpload(index)">
                      <Trash2 aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            </details>

            <div class="reverse-box">
              <h3>
                <Wand2 aria-hidden="true" />
                AI 反推提示词 <span class="tag">核心功能</span>
              </h3>
              <p>上传照片，自动生成专业摄影提示词。AI 自动分析照片并生成包含人物特征、服装细节、光线描述、镜头参数等完整信息的专业级提示词。</p>
              <button class="btn btn-soft" type="button" :disabled="!canReverse || reversing" @click="reversePrompt">
                {{ reversing ? '反推中...' : canReverse ? '生成反推提示词' : '请先上传图片' }}
              </button>
              <div class="reverse-meta">
                <span>消耗 2 积分</span>
                <span>10 秒生成</span>
              </div>
            </div>

            <div class="generation-actions">
              <button class="btn btn-primary" type="button" :aria-busy="loading" :disabled="loading" @click="generate">
                <Sparkles v-if="!loading" aria-hidden="true" />
                <Loader2 v-else class="spinner" aria-hidden="true" />
                {{ loading ? '正在创建图像...' : '开始生成' }}
              </button>
              <button v-if="loading" class="btn btn-soft" type="button" @click="stopGeneration">
                <Square aria-hidden="true" />
                停止生成
              </button>
            </div>
          </section>

          <aside class="card output-panel">
            <h2>输出</h2>
            <div class="output-meta-row">
              <span>{{ activeMode.label }}</span>
              <span>Image API</span>
              <span>{{ normalizedImageCount }} 张</span>
            </div>
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
                <div class="loading-output-grid">
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
                </div>
              </div>
            </div>
            <div v-else-if="output.length" class="generated-output">
              <figure v-for="item in output" :key="item.src" class="output-item">
                <img :src="item.src" :alt="item.title" />
                <figcaption class="output-actions">
                  <button class="icon-button" type="button" :aria-label="`打开 ${item.title}`" @click="openImage(item)">
                    <Download aria-hidden="true" />
                  </button>
                  <button class="icon-button" type="button" aria-label="复制当前提示词" @click="copyCurrentPrompt">
                    <Copy aria-hidden="true" />
                  </button>
                </figcaption>
              </figure>
            </div>
            <div v-else class="empty-output">
              <ImagePlus aria-hidden="true" />
              <p>生成的图像将显示在这里<br />{{ requiresReference ? '添加参考图、输入提示词并点击“开始生成”' : '输入提示词并点击“开始生成”' }}</p>
            </div>
            <p class="tip">
              <Sparkles aria-hidden="true" />
              <span>提示：先填写提示词和参考图即可开始生成，接口与格式等细项可在高级设置里调整。</span>
            </p>
          </aside>
        </div>
      </div>
    </section>

    <div
      v-if="galleryOpen"
      class="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gallery-title"
      @click.self="galleryOpen = false"
    >
      <div class="modal-card">
        <div class="modal-head">
          <h2 id="gallery-title">我的图库</h2>
          <button class="icon-button" type="button" aria-label="关闭图库" @click="galleryOpen = false">
            <X aria-hidden="true" />
          </button>
        </div>
        <p>登录后可同步云端图库。当前展示后端记录的最近生成结果。</p>
        <div v-if="output.length" class="reference-grid">
          <div v-for="item in output" :key="item.src" class="reference-thumb">
            <img :src="item.src" :alt="item.title" />
          </div>
        </div>
        <div v-else-if="gallery.length" class="reference-grid">
          <div v-for="record in gallery" :key="record.id" class="reference-thumb">
            <img :src="record.images[0]?.url" :alt="record.prompt" />
            <span class="thumb-chip">{{ record.mode || 'generate' }}</span>
          </div>
        </div>
        <div v-else class="empty-state">
          <ImagePlus aria-hidden="true" />
          <strong>还没有本地生成记录</strong>
          <p>完成一次生成后，结果会显示在这里。</p>
        </div>
      </div>
    </div>

    <div v-if="notice" class="toast">{{ notice }}</div>
  </main>
</template>
