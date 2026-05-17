import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, resolveApiUrl } from '../services/api'
import { useAuthStore } from '../services/authStore'
import { useSiteStore } from '../services/siteStore'
import { useGenerationBilling } from './useGenerationBilling'
import { useGenerationLoading } from './useGenerationLoading'
import {
  compactPayload,
  mapRecordImages,
  normalizeGeneratedImage,
  normalizeGenerationRecord,
  resolveOutputSize,
} from './useGenerationPayload'
import { useGenerationPolling } from './useGenerationPolling'
import { usePromptTools } from './usePromptTools'
import { hasUnuploadedLocalFiles, useReferenceImages } from './useReferenceImages'
import { useGallery } from './useGallery'
import { useImagePreview } from './useImagePreview'
import { useModelPicker } from './useModelPicker'
import { useImageDownload } from './useImageDownload'
import { useScrollLock } from './useScrollLock'
import { useGenerationForm } from './useGenerationForm'
import { useGalleryActions } from './useGalleryActions'
import { usePromptUI } from './usePromptUI'
import { useGenerationUI } from './useGenerationUI'
import * as constants from './generationConstants'

export function useGenerationTask() {
  const route = useRoute()
  const router = useRouter()
  const auth = useAuthStore()
  const { siteData, loadSiteData } = useSiteStore()

  const formState = useGenerationForm({ route })
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
      formState.selectMenuOpen.value = ''
    },
  })
  const output = ref([])
  const loading = ref(false)
  const loadingStage = ref('准备提交生成任务')
  const queuePosition = ref(null)
  const generationAbortController = ref(null)
  const activeTaskId = ref('')
  const notice = ref('')
  const isAuthenticated = computed(() => auth.isAuthenticated.value)
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
    processMaskFiles,
    processReferenceFiles,
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
    mode: formState.mode,
    openLogin: openLoginFromGenerate,
    requiresReference: formState.requiresReference,
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
    galleryRecordNotice,
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
    generationWaitText: constants.generationWaitText,
    isAuthenticated,
    modes: constants.modes,
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
    queuePosition,
    setGallerySyncMessage,
    showNotice,
  })
  const { gptLoadingDots, loadingHint, loadingStatusText, loadingTitle, loadingVariant } = useGenerationLoading({
    activeModelKey,
    activeModelLabel,
    loadingStage,
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
    batchMode: formState.batchMode,
    mode: formState.mode,
    normalizedImageCount: formState.normalizedImageCount,
    quality: formState.quality,
    requiresReference: formState.requiresReference,
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
    activeMode: formState.activeMode,
    api,
    auth,
    canReverse,
    getReferences,
    hasUnreadyUpload,
    hasUsageCostConfig,
    isAuthenticated,
    loadSiteData,
    mode: formState.mode,
    openLogin: openLoginFromGenerate,
    prompt: formState.prompt,
    promptOptimizeCost,
    promptOptimizeDailyQuota,
    promptOptimizeUsesFreeQuota,
    reversePromptCost,
    showNotice,
    userCredits,
  })
  const promptUI = usePromptUI({
    mode: formState.mode,
    prompt: formState.prompt,
    quality: formState.quality,
    referenceCount,
    requiresReference: formState.requiresReference,
  })
  const { downloadImage, downloadPreviewImage, downloadGalleryRecord } = useImageDownload({ showNotice })
  const { syncGalleryScrollLock, syncModalScrollLock } = useScrollLock()
  const generationUI = useGenerationUI({
    batchMode: formState.batchMode,
    galleryOpen,
    imagePreview,
    loading,
    maskCount,
    mode: formState.mode,
    normalizedImageCount: formState.normalizedImageCount,
    output,
    aspectRatio: formState.aspectRatio,
    closeGallery,
    closeImagePreview,
    showNextPreviewImage,
    showPreviousPreviewImage,
  })
  const galleryActions = useGalleryActions({
    api,
    gallery,
    galleryOpen,
    gallerySyncMessage,
    isAuthenticated,
    markGalleryRecordsDeleted,
    mergeGalleryRecords,
    model,
    modelOptions,
    output,
    persistLocalGallery,
    selectedModelAvailable,
    showNotice,
  })

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

  function enableBatchMode() {
    formState.batchMode.value = true
    showNotice('已切换到批量生成')
  }

  function disableBatchMode() {
    formState.batchMode.value = false
    showNotice('已返回单张生成')
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
    if (!formState.prompt.value.trim()) {
      logGenerationDuration()
      showNotice('请先输入提示词')
      return
    }
    if (formState.requiresReference.value && !referenceCount.value) {
      logGenerationDuration()
      showNotice(formState.mode.value === 'edit' ? '请先添加原图' : '请先添加参考图')
      return
    }
    if (hasUnreadyUpload({ includeMask: formState.mode.value === 'edit' })) {
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
        prompt: formState.prompt.value,
        model: model.value,
        mode: formState.mode.value,
        api_mode: 'image',
        action: formState.mode.value === 'generate' ? 'generate' : 'edit',
        size: formState.size.value,
        ratio: formState.aspectRatio.value,
        resolution: formState.resolution.value,
        n: formState.normalizedImageCount.value,
        quality: formState.quality.value,
        output_format: formState.outputFormat.value,
        background: formState.background.value,
        moderation: formState.moderation.value,
        output_compression: formState.supportsOutputCompression() ? formState.outputCompression.value : undefined,
        references: showReferenceSection.value ? getReferences() : [],
        mask: formState.mode.value === 'edit' ? getMaskReference() : '',
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
      showNotice(
        normalizedResult.partialFailureMessage
          || (formState.batchMode.value ? '批量生成完成' : '图像生成完成'),
      )
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

  watch(formState.mode, trimReferencesForMode)

  function toggleSelectMenu(key) {
    formState.toggleSelectMenu(key)
    modelMenuOpen.value = false
  }

  function closeMenusOnOutside(event) {
    generationUI.closeMenusOnOutside(event, modelMenuOpen, modelPicker, formState.selectMenuOpen)
  }

  function handleWindowKeydown(event) {
    generationUI.handleWindowKeydown(event)
  }

  watch([galleryOpen, imagePreview], () => syncModalScrollLock(galleryOpen.value, imagePreview.value))
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
    // Form state
    ...formState,
    // Model picker
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
    // Generation state
    activeTaskId,
    generationAbortController,
    loading,
    loadingStage,
    queuePosition,
    notice,
    output,
    isAuthenticated,
    // Reference images
    addMaskUrlReference,
    addUrlReference,
    canAddMask,
    canAddReference,
    canReverse,
    getMaskPreviewImages,
    getReferencePreviewImages,
    hasUnreadyUpload,
    hasUnuploadedLocalFiles,
    imageUrl,
    maskCount,
    maskImageUrl,
    maskUploads,
    maskUrlInput,
    maxReferenceCount,
    onFileChange,
    onMaskFileChange,
    processMaskFiles,
    processReferenceFiles,
    referenceCount,
    removeMaskUpload,
    removeMaskUrlReference,
    removeUpload,
    removeUrlReference,
    showReferenceSection,
    uploads,
    urlInput,
    // Gallery
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
    galleryRecordNotice,
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
    maxLocalGalleryRecords,
    // Gallery actions
    clearGallery: galleryActions.clearGallery,
    copyGalleryPrompt: galleryActions.copyGalleryPrompt,
    openGalleryImage: (record) => galleryActions.openGalleryImage(record, openImagePreview),
    removeGalleryRecord: galleryActions.removeGalleryRecord,
    saveCurrentOutputToGallery: () => galleryActions.saveCurrentOutputToGallery(formState),
    useGalleryRecord: (record) => galleryActions.useGalleryRecord(record, formState),
    // Polling
    clearGalleryRefreshTimer,
    clearTaskPollTimer,
    closeGallery,
    galleryRefreshTimer,
    openGallery,
    refreshPendingGalleryRecords,
    scheduleGalleryRefresh,
    stopGeneration,
    syncCloudGallery,
    taskPollTimer,
    // Image preview
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
    // Loading
    gptLoadingDots,
    loadingHint,
    loadingStatusText,
    loadingTitle,
    loadingVariant,
    // Billing
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
    // Prompt tools
    getRandomPromptFromGallery,
    optimizeCurrentPrompt,
    optimizing,
    randomizePrompt,
    randomPromptLoading,
    reversePrompt,
    reversing,
    // Prompt UI
    ...promptUI,
    copyCurrentPrompt: () => promptUI.copyCurrentPrompt(showNotice),
    // Download
    downloadImage,
    downloadPreviewImage: () => downloadPreviewImage(currentPreviewImage.value),
    downloadGalleryRecord,
    // UI
    ...generationUI,
    // Constants
    aspectRatios: constants.aspectRatios,
    backgroundOptions: constants.backgroundOptions,
    generationIdleTip: constants.generationIdleTip,
    generationSubmittedTip: constants.generationSubmittedTip,
    generationWaitText: constants.generationWaitText,
    modes: constants.modes,
    moderationOptions: constants.moderationOptions,
    outputFormats: constants.outputFormats,
    qualities: constants.qualities,
    resolutionOptions: constants.resolutionOptions,
    sizeMatrix: constants.sizeMatrix,
    // Utilities
    compactPayload,
    mapRecordImages,
    normalizeGeneratedImage,
    normalizeGenerationRecord,
    // Actions
    generate,
    enableBatchMode,
    disableBatchMode,
    toggleSelectMenu,
    openLoginFromGenerate,
    openPricingFromGenerate,
    showNotice,
  }
}
