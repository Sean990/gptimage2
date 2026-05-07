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
const { siteData, loadSiteData } = useSiteStore()
const sizes = [
  { label: '1K 方图 1024x1024', value: '1024x1024' },
  { label: '2K 横图 1536x1024', value: '1536x1024' },
  { label: '2K 竖图 1024x1536', value: '1024x1536' },
  { label: '自动 auto', value: 'auto' },
]
const qualities = [
  { label: '默认', value: '' },
  { label: '高 high', value: 'high' },
  { label: '中 medium', value: 'medium' },
  { label: '低 low', value: 'low' },
  { label: '自动 auto', value: 'auto' },
]
const outputFormats = [
  { label: '默认', value: '' },
  { label: 'PNG', value: 'png' },
  { label: 'JPEG', value: 'jpeg' },
  { label: 'WEBP', value: 'webp' },
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
  {
    label: '视频模型',
    models: [
      {
        value: 'seedance-2.0',
        name: 'Seedance 2.0',
        badge: '视频',
        description: '适合多模态电影级视频与音画同步方向。',
        meta: '视频镜头等待态',
      },
      {
        value: 'veo-3.1',
        name: 'Veo 3.1',
        badge: '视频',
        description: '适合文本或图像到电影感视频的镜头规划。',
        meta: '视频镜头等待态',
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
const size = ref('1024x1024')
const imageCount = ref(1)
const quality = ref('')
const outputFormat = ref('')
const prompt = ref(
  route.query.prompt ||
    '室内柔光人像摄影，保留上传照片的人物身份与五官特征，白色蕾丝连衣裙，窗边自然光，暖色调，中景构图，真实肤质，杂志级质感。',
)
const urlInput = ref('')
const imageUrl = ref('')
const uploads = ref([])
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

const referenceCount = computed(() => uploads.value.length + (imageUrl.value ? 1 : 0))
const canReverse = computed(() => referenceCount.value > 0)
const canAddReference = computed(() => referenceCount.value < 4)
const normalizedImageCount = computed(() => Math.min(10, Math.max(1, Number(imageCount.value) || 1)))
const loadingTileCount = computed(() => normalizedImageCount.value)
const activeModelKey = computed(() => normalizeModelKey(model.value))
const activeModelLabel = computed(() => formatModelLabel(activeModelKey.value, model.value))
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
const loadingVariant = computed(() => {
  if (activeModelKey.value === 'gpt-image-2') return 'gpt-image-2'
  if (activeModelKey.value === 'nano-banana-2') return 'nano-banana-2'
  if (activeModelKey.value === 'nano-banana' || activeModelKey.value === 'nano-banana-pro') return 'nano-banana'
  if (['veo', 'seedance', 'sora'].includes(activeModelKey.value)) return 'video'
  return 'generic'
})
const loadingTitle = computed(() => {
  if (loadingVariant.value === 'gpt-image-2') return 'GPT Image 2 正在生成'
  if (loadingVariant.value === 'nano-banana-2') return 'Nano Banana 2 正在推理'
  if (loadingVariant.value === 'nano-banana') return 'Nano Banana 正在组织画面'
  if (loadingVariant.value === 'video') return `${activeModelLabel.value} 正在准备镜头`
  return `${activeModelLabel.value} 正在生成`
})
const loadingHint = computed(() => {
  if (loadingVariant.value === 'gpt-image-2') return '使用 image-gen-loading-state-dots 风格等待态'
  if (loadingVariant.value === 'nano-banana-2') return '优先整理参考图一致性、材质细节和构图'
  if (loadingVariant.value === 'nano-banana') return '正在快速铺开构图、色彩和主体风格'
  if (loadingVariant.value === 'video') return '视频模型会先规划帧节奏、镜头和运动方向'
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

function normalizeModelKey(value = '') {
  const normalized = value.trim().toLowerCase().replace(/[_\s]+/g, '-')

  if (!normalized) return 'generic'
  if (normalized.includes('gpt-image-2') || normalized.includes('gptimage2')) return 'gpt-image-2'
  if (normalized.includes('nano-banana-2') || normalized.includes('nanobanana2')) return 'nano-banana-2'
  if (normalized.includes('nano-banana-pro') || normalized.includes('nanobananapro')) return 'nano-banana-pro'
  if (normalized.includes('nano-banana') || normalized.includes('nanobanana')) return 'nano-banana'
  if (normalized.includes('seedance')) return 'seedance'
  if (normalized.includes('veo')) return 'veo'
  if (normalized.includes('sora')) return 'sora'
  return normalized
}

function formatModelLabel(modelKey, rawValue) {
  if (modelKey === 'gpt-image-2') return 'GPT Image 2'
  if (modelKey === 'nano-banana-2') return 'Nano Banana 2'
  if (modelKey === 'nano-banana-pro') return 'Nano Banana Pro'
  if (modelKey === 'nano-banana') return 'Nano Banana'
  if (modelKey === 'seedance') return 'Seedance'
  if (modelKey === 'veo') return 'Veo'
  if (modelKey === 'sora') return 'Sora'
  return rawValue.trim() || '当前模型'
}

function toggleModelMenu() {
  modelMenuOpen.value = !modelMenuOpen.value
}

function selectModel(value) {
  model.value = value
  modelMenuOpen.value = false
}

function closeModelMenuOnOutside(event) {
  if (!modelMenuOpen.value || modelPicker.value?.contains(event.target)) return
  modelMenuOpen.value = false
}

function closeModelMenu() {
  modelMenuOpen.value = false
}

function normalizeGeneratedImage(item, index = 0, defaults = {}) {
  const imageUrl = item.url || item.src || item.image_url || item.image || ''
  return {
    id: item.id || `generated-${index}`,
    title: item.title || item.filename || `GPT Image 2 生成图 ${index + 1}`,
    url: resolveApiUrl(imageUrl),
    prompt: item.prompt || defaults.prompt,
    model: item.model || defaults.model,
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

function removeUpload(index) {
  const [removed] = uploads.value.splice(index, 1)
  if (removed?.src) URL.revokeObjectURL(removed.src)
  showNotice('已移除参考图')
}

function removeUrlReference() {
  imageUrl.value = ''
  showNotice('已移除 URL 参考图')
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
  generationAbortController.value?.abort()
  const controller = new AbortController()
  generationAbortController.value = controller
  loading.value = true
  output.value = []

  // try {
  //   const requestPayload = compactPayload({
  //     prompt: prompt.value,
  //     model: model.value,
  //     size: size.value,
  //     n: normalizedImageCount.value,
  //     quality: quality.value,
  //     output_format: outputFormat.value,
  //     response_format: 'b64_json',
  //     references: getReferences(),
  //   })
  //   const result = await api.generateImages(requestPayload, {
  //     signal: controller.signal,
  //   })
  //   const normalizedResult = normalizeGenerationRecord(result, {
  //     ...requestPayload,
  //     createdAt: new Date().toISOString(),
  //   })
  //   output.value = normalizedResult.images.map((item) => ({
  //     id: item.id,
  //     title: item.title,
  //     src: item.url,
  //     prompt: item.prompt,
  //     model: item.model,
  //     ratio: item.ratio,
  //     resolution: item.resolution,
  //     size: item.size,
  //     quality: item.quality,
  //     outputFormat: item.outputFormat,
  //     createdAt: item.createdAt,
  //   }))
  //   gallery.value = [normalizedResult, ...gallery.value]
  //   showNotice(normalizedImageCount.value > 1 ? '批量生成已完成' : '图像生成已完成')
  // } catch (error) {
  //   output.value = []
  //   showNotice(error.name === 'AbortError' ? '已停止生成' : (error.message || '图像生成失败，请稍后重试'))
  // } finally {
  //   if (generationAbortController.value === controller) {
  //     generationAbortController.value = null
  //     loading.value = false
  //   }
  // }
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
  window.addEventListener('click', closeModelMenuOnOutside)
})

onBeforeUnmount(() => {
  clearLoadingProgressTimer()
  window.removeEventListener('click', closeModelMenuOnOutside)
})
</script>

<template>
  <main class="page">
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
                        <span class="model-badge">{{ selectedModel.badge }}</span>
                      </span>
                      <span>{{ selectedModel.description }}</span>
                      <small>{{ selectedModel.value }} · {{ selectedModel.meta }}</small>
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
                            <span class="model-badge">{{ item.badge }}</span>
                          </span>
                          <small>{{ item.description }}</small>
                        </span>
                        <Check v-if="item.value === model" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div class="field">
                <label for="size">图片尺寸</label>
                <select id="size" v-model="size">
                  <option v-for="item in sizes" :key="item.value" :value="item.value">{{ item.label }}</option>
                </select>
              </div>
              <div class="field">
                <label for="image-count">数量</label>
                <input id="image-count" v-model.number="imageCount" type="number" min="1" max="10" />
              </div>
              <div class="field">
                <label for="quality">质量</label>
                <select id="quality" v-model="quality">
                  <option v-for="item in qualities" :key="item.label" :value="item.value">{{ item.label }}</option>
                </select>
              </div>
              <div class="field">
                <label for="output-format">输出格式</label>
                <select id="output-format" v-model="outputFormat">
                  <option v-for="item in outputFormats" :key="item.label" :value="item.value">{{ item.label }}</option>
                </select>
              </div>
            </div>

            <div class="field">
              <label for="prompt">提示词 *</label>
              <textarea
                id="prompt"
                v-model.trim="prompt"
                placeholder="详细描述你想要生成的图像，包括主体、风格、光线、色调等..."
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
              <label>参考图像 ({{ referenceCount }}/4)</label>
              <div class="field">
                <label for="image-url">上传参考图片或输入图片 URL</label>
                <div class="control-row">
                  <input id="image-url" v-model.trim="urlInput" placeholder="输入图片 URL" />
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
              <button class="btn btn-primary" type="button" :disabled="loading" @click="generate">
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
              <template v-else-if="loadingVariant === 'video'">
                <div class="video-loading-wave" aria-hidden="true">
                  <span class="video-loading-frame"></span>
                  <span class="video-loading-frame"></span>
                  <span class="video-loading-frame"></span>
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
              <p>生成的图像将显示在这里<br />输入提示词并点击“开始生成”</p>
            </div>
            <p class="tip">
              <Sparkles aria-hidden="true" />
              <span>提示：提供越详细的描述，生成效果越好。可以包含风格、光线、色调、构图等信息。</span>
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
