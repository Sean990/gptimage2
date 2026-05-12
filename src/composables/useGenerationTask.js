import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, resolveApiUrl } from '../services/api'
import { useAuthStore } from '../services/authStore'
import { loadPromptLibrary } from '../services/promptLibrary'
import { useSiteStore } from '../services/siteStore'
import { useGallery } from './useGallery'
import { useImagePreview } from './useImagePreview'
import { useModelPicker } from './useModelPicker'

export function useGenerationTask() {
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
  
  const selectMenuOpen = ref('')
  const {
    activeModelKey,
    activeModelLabel,
    fallbackModelCatalog,
    fallbackModelGroups,
    fallbackModelMap,
    formatModelLabel,
    loadImageModels,
    model,
    modelGroups,
    modelLoadError,
    modelLoading,
    modelMenuOpen,
    modelOptions,
    modelPicker,
    normalizeModelKey,
    normalizeModelOption,
    selectedModel,
    selectedModelAvailable,
    selectModel,
    closeModelMenu,
    toggleModelMenu,
  } = useModelPicker({
    onToggle: () => {
      selectMenuOpen.value = ''
    },
  })
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
  const optimizing = ref(false)
  const randomPromptLoading = ref(false)
  const notice = ref('')
  const isAuthenticated = computed(() => auth.isAuthenticated.value)
  const userCredits = computed(() => auth.credits.value)
  const {
    canPreviewGalleryRecord,
    formatGalleryDate,
    formatGallerySyncTime,
    gallery,
    galleryCloudStatusText,
    galleryImageCount,
    galleryLastSyncedAt,
    galleryOpen,
    galleryProgressStatuses,
    galleryRecordCover,
    galleryRecordMeta,
    galleryRecordMode,
    galleryRecordProgressText,
    galleryRecordStatusLabel,
    galleryRetainedEmptyStatuses,
    galleryStatusRank,
    galleryStorageKey,
    gallerySummary,
    gallerySyncError,
    gallerySyncing,
    gallerySyncMessage,
    hasPendingGalleryRecords,
    isGalleryRecordPending,
    loadLocalGallery,
    maxLocalGalleryRecords,
    mergeGalleryRecords,
    persistLocalGallery,
    setGallerySyncMessage,
    shouldReplaceGalleryRecord,
  } = useGallery({
    generationWaitText,
    isAuthenticated,
    modes,
    normalizeGenerationRecord,
    showNotice,
  })
  const {
    closeImagePreview,
    currentPreviewImage,
    imagePreview,
    normalizePreviewImage,
    openImagePreview,
    openPreviewSource,
    previewCount,
    previewImages,
    previewPosition,
    setPreviewIndex,
    showNextPreviewImage,
    showPreviousPreviewImage,
  } = useImagePreview()
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
  const promptOptimizeConfig = computed(() => usageCosts.value.promptOptimize || {})
  const promptOptimizeCost = computed(() => Number(promptOptimizeConfig.value.credits ?? 0))
  const promptOptimizeDailyQuota = computed(() => Number(promptOptimizeConfig.value.dailyFreeQuota ?? 0))
  const promptOptimizeFreeRemaining = computed(() => {
    const raw = auth.user.value?.promptOptimizeFreeRemaining
    if (raw === null || raw === undefined || raw === '') return null
    return Math.max(0, Number(raw))
  })
  const promptOptimizeUsesFreeQuota = computed(() => {
    const remaining = promptOptimizeFreeRemaining.value
    return remaining !== null && remaining > 0
  })
  const promptOptimizeCostTip = computed(() => {
    if (promptOptimizeUsesFreeQuota.value) {
      return `今日还剩 ${promptOptimizeFreeRemaining.value} 次免费优化`
    }
    const quota = promptOptimizeDailyQuota.value
    const costText = promptOptimizeCost.value > 0
      ? `每次消耗 ${promptOptimizeCost.value} 积分`
      : '本功能当前免费'
    return quota > 0
      ? `${costText}，每日前 ${quota} 次免费`
      : costText
  })
  const billingEnabled = computed(() => Boolean(siteData.value.billingEnabled))
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
  function getOptionLabel(options, value) {
    return options.find((item) => item.value === value)?.label || value
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
    router.push(billingEnabled.value ? '/pricing' : '/docs#credits')
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
  
  function showNotice(text) {
    notice.value = text
    window.setTimeout(() => {
      if (notice.value === text) notice.value = ''
    }, 2600)
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
  
  async function optimizeCurrentPrompt() {
    if (optimizing.value) return
    const trimmed = prompt.value.trim()
    if (!trimmed) {
      showNotice('请先输入要优化的提示词')
      return
    }
    if (!isAuthenticated.value) {
      openLoginFromGenerate()
      showNotice('请先登录后使用一键优化')
      return
    }
  
    const usesFree = promptOptimizeUsesFreeQuota.value
    const cost = promptOptimizeCost.value
    if (!usesFree && cost > 0 && userCredits.value < cost) {
      showNotice(`积分不足，本次需要 ${cost} 积分`)
      return
    }
  
    if (!usesFree && cost > 0) {
      const confirmMessage = `本次一键优化将消耗 ${cost} 积分${promptOptimizeDailyQuota.value > 0 ? `（已用完今日 ${promptOptimizeDailyQuota.value} 次免费额度）` : ''}，是否继续？`
      if (typeof window !== 'undefined' && !window.confirm(confirmMessage)) return
    }
  
    optimizing.value = true
    try {
      const result = await api.optimizePrompt({
        prompt: trimmed,
        mode: mode.value,
        modeLabel: activeMode.value.label,
        language: 'zh-CN',
        requirements: {
          preserveFacts: true,
          directUse: true,
          includeConstraints: true,
        },
      })
      const nextPrompt = result?.optimizedPrompt || result?.prompt || result?.result || ''
      if (!nextPrompt) throw new Error('后端未返回优化后的提示词')
      prompt.value = nextPrompt
      await auth.refreshMe().catch(() => {})
      showNotice(usesFree ? '已使用免费次数优化提示词' : '提示词已优化')
    } catch (error) {
      showNotice(error.message || '一键优化失败，请稍后重试')
    } finally {
      optimizing.value = false
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
      if (error.isTimeout) showNotice(error.message || '请求超时，请稍后重试')
      else if (error.name === 'AbortError') showNotice('已停止提交生成任务')
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
  
  function sanitizeFileName(name) {
    return (name || 'imgsgen-image')
      .replace(/[\\/:*?"<>|\n\r\t]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120) || 'imgsgen-image'
  }
  
  function inferImageExtension(src, fallback = 'png') {
    const match = /\.(png|jpe?g|webp|gif|bmp|svg)(?:\?|#|$)/i.exec(src || '')
    if (match) return match[1].toLowerCase().replace('jpeg', 'jpg')
    return (fallback || 'png').toLowerCase().replace('jpeg', 'jpg')
  }
  
  async function downloadImage(image, fallbackTitle = '生成图片') {
    const src = typeof image === 'string' ? image : image?.src || image?.url
    if (!src) {
      showNotice('图片地址不存在，无法下载')
      return
    }
    const title = typeof image === 'string' ? fallbackTitle : image?.title || fallbackTitle
    const ext = inferImageExtension(src, image?.outputFormat || 'png')
    const filename = `${sanitizeFileName(title)}.${ext}`
  
    try {
      const response = await fetch(src, { mode: 'cors', credentials: 'omit' })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)
      showNotice('图片已开始下载')
    } catch {
      window.open(src, '_blank', 'noreferrer')
      showNotice('直接下载失败，已在新标签页打开原图')
    }
  }
  
  function downloadPreviewImage() {
    if (!currentPreviewImage.value) return
    downloadImage(currentPreviewImage.value, '生成图片')
  }
  
  function downloadGalleryRecord(record) {
    const images = Array.isArray(record?.images) ? record.images : []
    if (!images.length) {
      showNotice('该记录暂无可下载图片')
      return
    }
    const title = record.prompt?.slice(0, 40) || 'imgsgen-image'
    images.forEach((item, index) => {
      downloadImage(
        {
          src: item.url || item.src,
          title: `${title}-${index + 1}`,
          outputFormat: item.outputFormat,
        },
        '图库图片',
      )
    })
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

  return {
    activeMode,
    activeModelKey,
    activeModelLabel,
    activeOutputCount,
    activeTaskId,
    addMaskUrlReference,
    addUrlReference,
    advancedOpen,
    advancedSummary,
    aspectRatio,
    aspectRatios,
    background,
    backgroundOptions,
    batchCount,
    batchCountOptions,
    batchMode,
    billingEnabled,
    canAddMask,
    canAddReference,
    canReverse,
    clearTaskPollTimer,
    closeImagePreview,
    closeMenusOnOutside,
    closeModelMenu,
    closeSelectMenu,
    compactPayload,
    copyCurrentPrompt,
    creditCost,
    currentPreviewImage,
    disableBatchMode,
    enableBatchMode,
    fallbackModelCatalog,
    fallbackModelGroups,
    fallbackModelMap,
    footerTipText,
    formatGalleryDate,
    formatModelLabel,
    gallery,
    galleryCloudStatusText,
    galleryImageCount,
    galleryLastSyncedAt,
    galleryOpen,
    galleryProgressStatuses,
    galleryRefreshTimer,
    galleryRetainedEmptyStatuses,
    galleryStatusRank,
    galleryStorageKey,
    gallerySummary,
    gallerySyncError,
    gallerySyncing,
    gallerySyncMessage,
    generate,
    generationAbortController,
    generationBillingTip,
    generationBillingTipInline,
    generationCostText,
    generationIdleTip,
    generationSubmittedTip,
    generationWaitText,
    getOptionLabel,
    getRandomPromptFromGallery,
    gptLoadingDots,
    handleWindowKeydown,
    hasPendingGalleryRecords,
    hasUnreadyUpload,
    hasUnuploadedLocalFiles,
    hasUsageCostConfig,
    heroDescription,
    heroTitle,
    imageGenerationCosts,
    imagePreview,
    imageUrl,
    isAuthenticated,
    loadImageModels,
    loading,
    loadingHint,
    loadingStage,
    loadingStatusText,
    loadingTileCount,
    loadingTitle,
    loadingVariant,
    loadLocalGallery,
    mapRecordImages,
    maskCount,
    maskImageUrl,
    maskUploads,
    maskUrlInput,
    maxLocalGalleryRecords,
    maxReferenceCount,
    mergeGalleryRecords,
    mode,
    model,
    modelGroups,
    modelLoadError,
    modelLoading,
    modelMenuOpen,
    modelOptions,
    modelPicker,
    moderation,
    moderationOptions,
    modes,
    normalizedImageCount,
    normalizeGeneratedImage,
    normalizeGenerationRecord,
    normalizeModelKey,
    normalizeModelOption,
    normalizePreviewImage,
    notice,
    onFileChange,
    onMaskFileChange,
    openGallery,
    openGalleryImage,
    openImagePreview,
    openLoginFromGenerate,
    openPreviewSource,
    openPricingFromGenerate,
    optimizeCurrentPrompt,
    optimizing,
    output,
    outputAspectStyle,
    outputCompression,
    outputFormat,
    outputFormats,
    outputGridClass,
    outputPlaceholders,
    persistLocalGallery,
    previewCount,
    previewImages,
    previewPosition,
    prompt,
    promptLabel,
    promptOptimizeConfig,
    promptOptimizeCost,
    promptOptimizeCostTip,
    promptOptimizeDailyQuota,
    promptOptimizeFreeRemaining,
    promptOptimizeUsesFreeQuota,
    promptPlaceholder,
    promptQualityLabel,
    promptQualityScore,
    qualities,
    quality,
    randomizePrompt,
    randomPromptLoading,
    referenceCount,
    referenceInputLabel,
    referenceLabel,
    referenceUploadHint,
    removeMaskUpload,
    removeMaskUrlReference,
    removeUpload,
    removeUrlReference,
    requiresReference,
    resolution,
    resolutionLabel,
    resolutionOptions,
    reversePrompt,
    reversePromptCost,
    reversing,
    sanitizeFileName,
    selectedAspectRatioLabel,
    selectedBackgroundLabel,
    selectedBatchCountLabel,
    selectedModel,
    selectedModelAvailable,
    selectedModerationLabel,
    selectedOutputFormatLabel,
    selectedQualityLabel,
    selectedResolutionLabel,
    selectMenuOpen,
    selectModel,
    selectSimpleOption,
    setGallerySyncMessage,
    setPreviewIndex,
    shouldReplaceGalleryRecord,
    showNextPreviewImage,
    showNotice,
    showPreviousPreviewImage,
    showReferenceSection,
    size,
    sizeMatrix,
    stopGeneration,
    supportsOutputCompression,
    taskPollTimer,
    toggleModelMenu,
    toggleSelectMenu,
    trimReferencesForMode,
    uploads,
    urlInput,
    usageCosts,
    userCredits,
    waitForGenerationTask,
  }
}
