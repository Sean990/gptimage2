import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, resolveApiUrl } from '../services/api'
import { useAuthStore } from '../services/authStore'
import { useSiteStore } from '../services/siteStore'
import { useGenerationBilling } from './useGenerationBilling'
import { useGenerationLoading } from './useGenerationLoading'
import {
  compactPayload,
  inferImageExtension,
  mapRecordImages,
  normalizeGeneratedImage,
  normalizeGenerationRecord,
  resolveOutputSize,
  sanitizeFileName,
} from './useGenerationPayload'
import { useGenerationPolling } from './useGenerationPolling'
import { usePromptTools } from './usePromptTools'
import { hasUnuploadedLocalFiles, useReferenceImages } from './useReferenceImages'
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
    { label: '横版 3:2', value: '3:2' },
    { label: '竖版 2:3', value: '2:3' },
    { label: '宽屏 16:9', value: '16:9' },
    { label: '长图 9:16', value: '9:16' },
    { label: '横版 4:3', value: '4:3' },
    { label: '竖版 3:4', value: '3:4' },
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
  const generationIdleTip = `生成通常需要 ${generationWaitText}。提交后可以离开当前页面，稍后在我的图库查看进度。`
  const generationSubmittedTip = `任务已提交，预计 ${generationWaitText} 完成。你可以继续浏览，稍后在我的图库查看结果。`

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
  const prompt = ref(Array.isArray(route.query.prompt) ? route.query.prompt[0] || '' : route.query.prompt || '')
  const output = ref([])
  const loading = ref(false)
  const loadingStage = ref('准备提交生成任务')
  const generationAbortController = ref(null)
  const activeTaskId = ref('')
  const notice = ref('')
  const isAuthenticated = computed(() => auth.isAuthenticated.value)
  const activeMode = computed(() => modes.find((item) => item.value === mode.value) || modes[0])
  const requiresReference = computed(() => activeMode.value.requiresReference)
  const {
    addMaskUrlReference,
    addUrlReference,
    canAddMask,
    canAddReference,
    canReverse,
    cleanupReferenceObjectUrls,
    getMaskPreviewImages,
    getMaskReference,
    getReferencePreviewImages,
    getReferences,
    hasUnreadyUpload,
    imageUrl,
    maskCount,
    maskImageUrl,
    maskUploads,
    maskUrlInput,
    maxReferenceCount,
    onFileChange,
    onMaskFileChange,
    referenceCount,
    removeMaskUpload,
    removeMaskUrlReference,
    removeUpload,
    removeUrlReference,
    showReferenceSection,
    trimReferencesForMode,
    uploads,
    urlInput,
  } = useReferenceImages({
    api,
    isAuthenticated,
    mode,
    openLogin: openLoginFromGenerate,
    requiresReference,
    resolveApiUrl,
    showNotice,
  })
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
    clearGalleryClearedBefore,
    loadLocalGallery,
    markGalleryRecordsDeleted,
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
  const {
    clearGalleryRefreshTimer,
    clearTaskPollTimer,
    closeGallery,
    disposeGenerationPolling,
    galleryRefreshTimer,
    openGallery,
    refreshPendingGalleryRecords,
    resetCloudGalleryState,
    scheduleGalleryRefresh,
    stopGeneration,
    syncCloudGallery,
    taskPollTimer,
    waitForGenerationTask,
  } = useGenerationPolling({
    activeTaskId,
    api,
    clearGalleryClearedBefore,
    gallery,
    galleryLastSyncedAt,
    galleryOpen,
    gallerySyncError,
    gallerySyncing,
    gallerySyncMessage,
    generationAbortController,
    hasPendingGalleryRecords,
    isAuthenticated,
    isGalleryRecordPending,
    loadLocalGallery,
    loading,
    loadingStage,
    mergeGalleryRecords,
    normalizeGenerationRecord,
    persistLocalGallery,
    setGallerySyncMessage,
    showNotice,
  })
  const batchCountOptions = [
    { label: '2 张图片', value: 2 },
    { label: '4 张图片', value: 4, recommended: true },
    { label: '8 张图片', value: 8 },
    { label: '6 张图片', value: 6 },
    { label: '10 张图片', value: 10 },
  ]
  const normalizedImageCount = computed(() => {
    if (!batchMode.value) return 1
    const currentCount = Number(batchCount.value) || 4
    return batchCountOptions.some((item) => item.value === currentCount) ? currentCount : 4
  })
  const loadingTileCount = computed(() => normalizedImageCount.value)
  const size = computed(() => resolveOutputSize(sizeMatrix, resolution.value, aspectRatio.value))
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
  const heroTitle = computed(() => (batchMode.value ? '批量图片生成' : 'ImgsGen 图片生成'))
  const heroDescription = computed(() =>
    batchMode.value
      ? '一次生成多张图片，快速比较风格方向；发布前请统一复核内容和授权。'
      : '输入提示词或上传参考图，生成可下载、可复用，并带有 AI 属性提示的视觉内容。',
  )
  const { gptLoadingDots, loadingHint, loadingStatusText, loadingTitle, loadingVariant } = useGenerationLoading({
    activeModelKey,
    activeModelLabel,
    loadingStage,
  })
  const promptQualityScore = computed(() => {
    const lengthScore = Math.min(prompt.value.trim().length, 90) / 90
    const referenceScore = requiresReference.value ? Math.min(referenceCount.value, 2) * 0.16 : 0
    const qualityScore = quality.value === 'high' ? 0.1 : 0
    return Math.min(100, Math.round((0.12 + lengthScore * 0.62 + referenceScore + qualityScore) * 100))
  })
  const promptQualityLabel = computed(() => {
    if (promptQualityScore.value >= 76) return '提示词信息较完整'
    if (promptQualityScore.value >= 45) return '可以生成，补充细节会更稳'
    return '描述偏短，建议补充主体、光线和构图'
  })
  const promptLabel = computed(() => {
    return '提示词 *'
  })
  const promptPlaceholder = computed(() => {
    if (mode.value === 'image')
      return '描述如何基于已授权参考图生成新图，例如：保持主体形象，替换为摄影棚背景，增强服装质感。'
    if (mode.value === 'edit')
      return '描述要精修的局部或整体，例如：只替换背景为摄影棚，主体保持不变。请勿编辑未获授权的人脸或隐私内容。'
    return '详细描述你想要生成的图像，包括主体、风格、光线、色调、画面比例和用途。'
  })
  const referenceLabel = computed(() => {
    return mode.value === 'edit' ? '原图' : '参考图'
  })
  const referenceInputLabel = computed(() => {
    return mode.value === 'edit' ? '上传 1 张原图或输入图片 URL' : '上传参考图或输入图片 URL'
  })
  const referenceUploadHint = computed(() => {
    return mode.value === 'edit' ? '仅支持 1 张原图（PNG、JPEG、WEBP，最大 10MB）' : '支持 PNG、JPEG、WEBP（最大 10MB）'
  })
  const advancedSummary = computed(() => {
    const items = [`${normalizedImageCount.value} 张`, outputFormat.value.toUpperCase(), selectedQualityLabel.value]
    if (mode.value === 'edit' && maskCount.value) items.push('含蒙版')
    return items.join(' · ')
  })
  const {
    billingEnabled,
    creditCost,
    footerTipText,
    generationBillingTip,
    generationBillingTipInline,
    generationCostText,
    hasUsageCostConfig,
    imageGenerationCosts,
    promptOptimizeConfig,
    promptOptimizeCost,
    promptOptimizeCostTip,
    promptOptimizeDailyQuota,
    promptOptimizeFreeRemaining,
    promptOptimizeUsesFreeQuota,
    reversePromptCost,
    usageCosts,
    userCredits,
  } = useGenerationBilling({
    auth,
    batchMode,
    mode,
    normalizedImageCount,
    quality,
    requiresReference,
    siteData,
  })
  const {
    getRandomPromptFromGallery,
    optimizeCurrentPrompt,
    optimizing,
    randomizePrompt,
    randomPromptLoading,
    reversePrompt,
    reversing,
  } = usePromptTools({
    activeMode,
    api,
    auth,
    canReverse,
    getReferences,
    hasUnreadyUpload,
    hasUsageCostConfig,
    isAuthenticated,
    loadSiteData,
    mode,
    openLogin: openLoginFromGenerate,
    prompt,
    promptOptimizeCost,
    promptOptimizeDailyQuota,
    promptOptimizeUsesFreeQuota,
    reversePromptCost,
    showNotice,
    userCredits,
  })
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

  function enableBatchMode() {
    batchMode.value = true
    showNotice('已切换到批量生成')
  }

  function disableBatchMode() {
    batchMode.value = false
    showNotice('已返回单张生成')
  }

  function openLoginFromGenerate() {
    window.dispatchEvent(new CustomEvent('open-login'))
  }

  function openPricingFromGenerate() {
    router.push(billingEnabled.value ? '/pricing' : '/docs#credits')
  }

  function showNotice(text) {
    notice.value = text
    window.setTimeout(() => {
      if (notice.value === text) notice.value = ''
    }, 2600)
  }

  async function ensureAuthenticated() {
    if (isAuthenticated.value) return true
    if (auth.token.value && !auth.initialized.value) {
      await auth.refreshMe().catch(() => {})
    }
    return isAuthenticated.value
  }

  async function generate() {
    if (loading.value) return
    const generationStartTime = performance.now()
    const logGenerationDuration = () => {
      const durationSeconds = ((performance.now() - generationStartTime) / 1000).toFixed(2)
      console.info(`[图像生成耗时] ${durationSeconds}s`)
    }
    if (!(await ensureAuthenticated())) {
      logGenerationDuration()
      showNotice('请先登录后提交生成任务')
      openLoginFromGenerate()
      return
    }
    if (!prompt.value.trim()) {
      logGenerationDuration()
      showNotice('请先输入提示词')
      return
    }
    if (requiresReference.value && !referenceCount.value) {
      logGenerationDuration()
      showNotice(mode.value === 'edit' ? '请先添加原图' : '请先添加参考图')
      return
    }
    if (hasUnreadyUpload({ includeMask: mode.value === 'edit' })) {
      logGenerationDuration()
      showNotice('图片还在上传，请完成上传后再生成')
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
      showNotice(`积分不足，本次预计需要 ${creditCost.value} 积分`)
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
      showNotice('任务已提交，可在我的图库查看进度')
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
      showNotice(batchMode.value ? '批量生成完成' : '图像生成完成')
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

  async function copyCurrentPrompt() {
    try {
      await navigator.clipboard.writeText(prompt.value)
      showNotice('当前提示词已复制')
    } catch {
      showNotice(prompt.value)
    }
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
      showNotice('这条记录暂无可下载图片')
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
      showNotice(record.prompt || '这条记录没有提示词')
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

  async function removeGalleryRecord(recordId) {
    const removedRecords = gallery.value.filter((record) => record.id === recordId)
    markGalleryRecordsDeleted(removedRecords.length ? removedRecords : [recordId])
    gallery.value = gallery.value.filter((record) => record.id !== recordId)
    persistLocalGallery()

    if (isAuthenticated.value && recordId) {
      api.deleteGalleryRecord(recordId).catch((error) => {
        if (error?.status !== 404) console.warn('云端图库删除失败', error)
      })
    }

    showNotice('已从图库移除，刷新后不会再显示')
  }

  function clearGallery() {
    gallery.value = []
    persistLocalGallery([])
    gallerySyncMessage.value = ''
    showNotice('已清空本地图库，点击同步云端可重新拉取云端记录')
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
      resetCloudGalleryState()
    }
  })

  onMounted(() => {
    loadSiteData()
    loadImageModels()
    gallery.value = loadLocalGallery()
    auth
      .refreshMe()
      .then(() => syncCloudGallery({ silent: true }))
      .catch(() => {})
    window.addEventListener('click', closeMenusOnOutside)
    window.addEventListener('keydown', handleWindowKeydown)
  })

  onBeforeUnmount(() => {
    disposeGenerationPolling()
    syncGalleryScrollLock(false)
    window.removeEventListener('click', closeMenusOnOutside)
    window.removeEventListener('keydown', handleWindowKeydown)
    cleanupReferenceObjectUrls()
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
    canPreviewGalleryRecord,
    canReverse,
    clearGallery,
    clearGalleryRefreshTimer,
    clearTaskPollTimer,
    closeGallery,
    closeImagePreview,
    closeMenusOnOutside,
    closeModelMenu,
    closeSelectMenu,
    compactPayload,
    copyCurrentPrompt,
    copyGalleryPrompt,
    creditCost,
    currentPreviewImage,
    disableBatchMode,
    downloadGalleryRecord,
    downloadImage,
    downloadPreviewImage,
    enableBatchMode,
    fallbackModelCatalog,
    fallbackModelGroups,
    fallbackModelMap,
    footerTipText,
    formatGalleryDate,
    formatGallerySyncTime,
    formatModelLabel,
    gallery,
    galleryCloudStatusText,
    galleryImageCount,
    galleryLastSyncedAt,
    galleryOpen,
    galleryProgressStatuses,
    galleryRefreshTimer,
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
    generate,
    generationAbortController,
    generationBillingTip,
    generationBillingTipInline,
    generationCostText,
    generationIdleTip,
    generationSubmittedTip,
    generationWaitText,
    getMaskPreviewImages,
    getOptionLabel,
    getRandomPromptFromGallery,
    getReferencePreviewImages,
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
    isGalleryRecordPending,
    loadImageModels,
    loading,
    loadingHint,
    loadingStage,
    loadingStatusText,
    loadingTileCount,
    loadingTitle,
    loadingVariant,
    loadLocalGallery,
    markGalleryRecordsDeleted,
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
    refreshPendingGalleryRecords,
    referenceInputLabel,
    referenceLabel,
    referenceUploadHint,
    removeMaskUpload,
    removeMaskUrlReference,
    removeGalleryRecord,
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
    saveCurrentOutputToGallery,
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
    syncCloudGallery,
    scheduleGalleryRefresh,
    taskPollTimer,
    toggleModelMenu,
    toggleSelectMenu,
    trimReferencesForMode,
    uploads,
    urlInput,
    useGalleryRecord,
    usageCosts,
    userCredits,
    waitForGenerationTask,
  }
}
