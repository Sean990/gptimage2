import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, resolveApiUrl } from '../services/api'
import { useAuthStore } from '../services/authStore'
import { useSiteStore } from '../services/siteStore'
import * as constants from './generationConstants'
import { useGalleryActions } from './useGalleryActions'
import { galleryChangedEventName, useGallery } from './useGallery'
import { useGenerateAction } from './useGenerateAction'
import { useGenerationBilling } from './useGenerationBilling'
import { useGenerationForm } from './useGenerationForm'
import { useGenerationLoading } from './useGenerationLoading'
import { isGenerationTaskSuccessful, useGenerationPolling } from './useGenerationPolling'
import { useGenerationUI } from './useGenerationUI'
import { compactPayload, mapRecordImages, normalizeGenerationRecord } from './useGenerationPayload'
import { useImageDownload } from './useImageDownload'
import { useImagePreview } from './useImagePreview'
import { useModelPicker } from './useModelPicker'
import { usePromptTools } from './usePromptTools'
import { usePromptUI } from './usePromptUI'
import { useReferenceImages } from './useReferenceImages'
import { useScrollLock } from './useScrollLock'

export function useGenerationTask({ onGalleryRecordUsed } = {}) {
  const route = useRoute()
  const router = useRouter()
  const auth = useAuthStore()
  const { siteData, loadSiteData } = useSiteStore()

  const notice = ref('')
  function showNotice(text) {
    notice.value = text
    window.setTimeout(() => {
      if (notice.value === text) notice.value = ''
    }, 2600)
  }

  function openLoginFromGenerate() {
    window.dispatchEvent(new CustomEvent('open-login'))
  }

  const formState = useGenerationForm({ route })
  const modelPickerApi = useModelPicker({
    onToggle: () => {
      formState.selectMenuOpen.value = ''
    },
  })
  const {
    activeModelKey,
    activeModelLabel,
    loadImageModels,
    model,
    modelMenuOpen,
    modelOptions,
    modelPicker,
    selectedModelAvailable,
  } = modelPickerApi

  const output = ref([])
  const loading = ref(false)
  const outputLoading = ref(false)
  const outputActionLoading = ref(false)
  const outputActionTargetId = ref('')
  const outputActionRecordId = ref('')
  const outputActionType = ref('')
  const outputActionRunId = ref(0)
  const loadingStage = ref('准备提交生成任务')
  const initialLoadingStage = loadingStage.value
  const queuePosition = ref(null)
  const lastGenerationNotice = ref('')
  const generationAbortController = ref(null)
  const generationRunId = ref(0)
  const activeTaskId = ref('')
  const isAuthenticated = computed(() => auth.isAuthenticated.value)

  const referenceApi = useReferenceImages({
    api,
    isAuthenticated,
    mode: formState.mode,
    openLogin: openLoginFromGenerate,
    requiresReference: formState.requiresReference,
    resolveApiUrl,
    showNotice,
  })
  const {
    canReverse,
    cleanupReferenceObjectUrls,
    getMaskReference,
    getReferences,
    hasUnreadyUpload,
    maskCount,
    referenceCount,
    showReferenceSection,
    trimReferencesForMode,
  } = referenceApi

  const galleryApi = useGallery({
    generationWaitText: constants.generationWaitText,
    isAuthenticated,
    modes: constants.modes,
    normalizeGenerationRecord,
    showNotice,
  })
  const {
    clearGalleryClearedBefore,
    gallery,
    galleryLastSyncedAt,
    galleryOpen,
    gallerySyncError,
    gallerySyncing,
    gallerySyncMessage,
    hasPendingGalleryRecords,
    isGalleryRecordPending,
    loadLocalGallery,
    markGalleryRecordsDeleted,
    mergeGalleryRecords,
    persistLocalGallery,
    setGallerySyncMessage,
  } = galleryApi

  const imagePreviewApi = useImagePreview()
  const {
    closeImagePreview,
    currentPreviewImage,
    imagePreview,
    openImagePreview,
    showNextPreviewImage,
    showPreviousPreviewImage,
  } = imagePreviewApi

  const pollingApi = useGenerationPolling({
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
  const {
    closeGallery,
    disposeGenerationPolling,
    resetCloudGalleryState,
    scheduleGalleryRefresh,
    syncCloudGallery,
    waitForGenerationTask,
  } = pollingApi

  const loadingUi = useGenerationLoading({
    activeModelKey,
    activeModelLabel,
    loadingStage,
  })

  const billingApi = useGenerationBilling({
    auth,
    batchMode: formState.batchMode,
    mode: formState.mode,
    normalizedImageCount: formState.normalizedImageCount,
    quality: formState.quality,
    requiresReference: formState.requiresReference,
    siteData,
  })
  const { billingEnabled, creditCost, hasUsageCostConfig, userCredits } = billingApi

  const promptToolsApi = usePromptTools({
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
    promptOptimizeCost: billingApi.promptOptimizeCost,
    promptOptimizeDailyQuota: billingApi.promptOptimizeDailyQuota,
    promptOptimizeUsesFreeQuota: billingApi.promptOptimizeUsesFreeQuota,
    reversePromptCost: billingApi.reversePromptCost,
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
    loading: computed(() => loading.value || outputLoading.value),
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

  const { generate } = useGenerateAction({
    api,
    auth,
    activeTaskId,
    creditCost,
    formState,
    gallery,
    generationAbortController,
    generationRunId,
    getMaskReference,
    getReferences,
    hasUnreadyUpload,
    hasUsageCostConfig,
    isAuthenticated,
    loadSiteData,
    loading,
    loadingStage,
    mergeGalleryRecords,
    model,
    modelOptions,
    openLoginFromGenerate,
    output,
    outputLoading,
    persistLocalGallery,
    referenceCount,
    selectedModelAvailable,
    setLastGenerationNotice: (message) => {
      lastGenerationNotice.value = message
    },
    showNotice,
    showReferenceSection,
    userCredits,
    waitForGenerationTask,
  })

  function openPricingFromGenerate() {
    router.push(billingEnabled.value ? '/pricing' : '/docs#credits')
  }

  function enableBatchMode() {
    formState.batchMode.value = true
    showNotice('已切换到批量生成')
  }

  function disableBatchMode() {
    formState.batchMode.value = false
    showNotice('已返回单张生成')
  }

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

  function useGalleryRecord(record) {
    const normalizedRecord = normalizeGenerationRecord(record)
    const used = galleryActions.useGalleryRecord(normalizedRecord, formState)
    if (used) onGalleryRecordUsed?.(normalizedRecord)
    return used
  }

  async function ensureOutputActionReady() {
    if (outputActionLoading.value || loading.value || outputLoading.value) return false
    if (!isAuthenticated.value) {
      if (auth.token.value && !auth.initialized.value) {
        await auth.refreshMe().catch(() => {})
      }
      if (!isAuthenticated.value) {
        showNotice('请先登录后继续处理结果图')
        openLoginFromGenerate()
        return false
      }
    }
    if (!selectedModelAvailable.value && modelOptions.value.length) {
      model.value = modelOptions.value[0].value
      showNotice(`已切换到可用模型 ${modelOptions.value[0].name}，请重新提交`)
      return false
    }
    return true
  }

  function getOutputActionTargetKey(item, index) {
    return item.id || item.src || `output-${index}`
  }

  function startOutputAction(item, index, type) {
    outputActionRunId.value += 1
    outputActionLoading.value = true
    outputActionTargetId.value = getOutputActionTargetKey(item, index)
    outputActionRecordId.value = ''
    outputActionType.value = type
    return outputActionRunId.value
  }

  function isCurrentOutputActionRun(runId) {
    return outputActionRunId.value === runId
  }

  function finishOutputAction(runId) {
    if (!isCurrentOutputActionRun(runId)) return
    outputActionLoading.value = false
    outputActionTargetId.value = ''
    outputActionRecordId.value = ''
    outputActionType.value = ''
  }

  function cancelOutputAction() {
    outputActionRunId.value += 1
    outputActionLoading.value = false
    outputActionTargetId.value = ''
    outputActionRecordId.value = ''
    outputActionType.value = ''
  }

  function resetGenerationOutput() {
    generationRunId.value += 1
    generationAbortController.value?.abort()
    generationAbortController.value = null
    loading.value = false
    outputLoading.value = false
    activeTaskId.value = ''
    queuePosition.value = null
    output.value = []
    lastGenerationNotice.value = ''
    loadingStage.value = initialLoadingStage
    cancelOutputAction()
    closeImagePreview()
  }

  async function resolveOutputActionRecord(taskPayload, requestPayload, { runId } = {}) {
    const submittedRecord = normalizeGenerationRecord(taskPayload, requestPayload)
    outputActionRecordId.value = submittedRecord.id || taskPayload?.id || ''
    if (runId && !isCurrentOutputActionRun(runId)) return null

    gallery.value = mergeGalleryRecords([submittedRecord], gallery.value)
    persistLocalGallery()

    if (isGenerationTaskSuccessful(taskPayload)) return submittedRecord

    const result = await waitForGenerationTask(taskPayload.id)
    if (runId && !isCurrentOutputActionRun(runId)) return null

    const normalizedResult = normalizeGenerationRecord(result, {
      ...requestPayload,
      createdAt: submittedRecord.createdAt || new Date().toISOString(),
    })
    gallery.value = mergeGalleryRecords([normalizedResult], gallery.value)
    persistLocalGallery()
    return normalizedResult
  }

  function replaceOutputItem(index, nextItem) {
    output.value = output.value.map((item, itemIndex) => (itemIndex === index ? nextItem : item))
  }

  function buildOutputActionPayload(item, action, payload = {}) {
    return compactPayload({
      prompt: payload.prompt,
      model: model.value,
      mode: action === 'region-edit' ? 'edit' : 'image',
      api_mode: 'image',
      action,
      tool: action,
      ratio: item.ratio || formState.aspectRatio.value,
      resolution: item.resolution || formState.resolution.value || '4K',
      n: action === 'layer-split' ? 3 : 1,
      quality: 'high',
      output_format: 'png',
      background: action === 'layer-split' ? 'transparent' : 'auto',
      references: [item.src],
      mask: payload.mask,
      tool_params: payload.toolParams,
    })
  }

  async function submitOutputRegionEdit(item, index, { prompt: editPrompt, mask, region, radius } = {}) {
    const instruction = String(editPrompt || '').trim()
    if (!instruction) {
      showNotice('请输入局部修改要求')
      return null
    }
    if (!mask) {
      showNotice('请先在结果图上拖动框选要修改的区域')
      return null
    }
    if (!(await ensureOutputActionReady())) return null

    const runId = startOutputAction(item, index, 'region-edit')

    try {
      const requestPayload = buildOutputActionPayload(item, 'region-edit', {
        prompt: instruction,
        mask,
        toolParams: {
          instruction,
          source_image: item.src,
          region,
          radius,
        },
      })
      const taskPayload = await api.generateImages(requestPayload)
      if (!isCurrentOutputActionRun(runId)) return null

      const record = await resolveOutputActionRecord(taskPayload, requestPayload, { runId })
      if (!record || !isCurrentOutputActionRun(runId)) return null

      const [resultImage] = mapRecordImages(record)
      if (!resultImage?.src) throw new Error('局部改图未返回图片结果')

      const beforeSrc = item.src
      const editHistory = [
        ...(item.editHistory || []),
        ...(resultImage.editHistory?.length
          ? resultImage.editHistory
          : [
              {
                beforeSrc,
                afterSrc: resultImage.src,
                prompt: instruction,
                region,
                createdAt: new Date().toISOString(),
              },
            ]),
      ]

      replaceOutputItem(index, {
        ...item,
        ...resultImage,
        originalSrc: item.originalSrc || beforeSrc,
        sourceImages: Array.from(new Set([...(item.sourceImages || []), beforeSrc])),
        layers: resultImage.layers?.length ? resultImage.layers : [],
        editHistory,
      })
      showNotice('局部改图完成')
      void auth.refreshMe().catch(() => {})
      return record
    } catch (error) {
      if (!isCurrentOutputActionRun(runId)) return null
      showNotice(error.message || '局部改图失败，请稍后重试')
      return null
    } finally {
      finishOutputAction(runId)
    }
  }

  async function submitOutputLayerSplit(item, index) {
    if (!(await ensureOutputActionReady())) return null

    const runId = startOutputAction(item, index, 'layer-split')

    try {
      const requestPayload = buildOutputActionPayload(item, 'layer-split', {
        prompt: '将当前图片分离为主体、文字和背景三个独立图层。',
        toolParams: {
          source_image: item.src,
          layer_types: ['subject', 'text', 'background'],
        },
      })
      const taskPayload = await api.generateImages(requestPayload)
      if (!isCurrentOutputActionRun(runId)) return null

      const record = await resolveOutputActionRecord(taskPayload, requestPayload, { runId })
      if (!record || !isCurrentOutputActionRun(runId)) return null

      const layers = mapRecordImages(record)
        .filter((image) => image.src)
        .map((image, layerIndex) => ({
          id: image.id || `layer-${layerIndex}`,
          type: image.layerType || ['subject', 'text', 'background'][layerIndex] || `layer-${layerIndex + 1}`,
          label: image.layerLabel || image.title || `图层 ${layerIndex + 1}`,
          title: image.title || image.layerLabel || `图层 ${layerIndex + 1}`,
          src: image.src,
          visible: image.visible !== false,
          outputFormat: image.outputFormat || 'png',
          createdAt: image.createdAt,
        }))

      if (!layers.length) throw new Error('智能分层未返回图层图片')

      replaceOutputItem(index, {
        ...item,
        originalSrc: item.originalSrc || item.src,
        sourceImages: Array.from(new Set([...(item.sourceImages || []), item.src])),
        layers,
      })
      showNotice('智能分层完成')
      void auth.refreshMe().catch(() => {})
      return record
    } catch (error) {
      if (!isCurrentOutputActionRun(runId)) return null
      showNotice(error.message || '智能分层失败，请稍后重试')
      return null
    } finally {
      finishOutputAction(runId)
    }
  }

  function handleUseGalleryRecord(event) {
    const record = event.detail?.record || event.detail
    if (!record) return
    useGalleryRecord(record)
  }

  function handleGalleryChanged(event) {
    const detail = event?.detail || {}
    if (detail.type === 'clear') {
      gallery.value = []
      cancelOutputAction()
      return
    }

    if (
      detail.type === 'remove' &&
      detail.recordId &&
      (detail.recordId === outputActionRecordId.value ||
        output.value.some(
          (item, index) =>
            getOutputActionTargetKey(item, index) === outputActionTargetId.value && item.record?.id === detail.recordId,
        ))
    ) {
      cancelOutputAction()
    }

    const currentGallery =
      detail.type === 'remove' && detail.recordId
        ? gallery.value.filter((record) => record.id !== detail.recordId)
        : gallery.value
    gallery.value = mergeGalleryRecords(loadLocalGallery(), currentGallery)
  }

  watch(formState.mode, trimReferencesForMode)
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
    window.addEventListener('imgsgen:use-gallery-record', handleUseGalleryRecord)
    window.addEventListener(galleryChangedEventName, handleGalleryChanged)
  })

  onBeforeUnmount(() => {
    disposeGenerationPolling()
    syncGalleryScrollLock(false)
    window.removeEventListener('click', closeMenusOnOutside)
    window.removeEventListener('keydown', handleWindowKeydown)
    window.removeEventListener('imgsgen:use-gallery-record', handleUseGalleryRecord)
    window.removeEventListener(galleryChangedEventName, handleGalleryChanged)
    cleanupReferenceObjectUrls()
  })

  return {
    // Form state and controls
    ...formState,
    toggleSelectMenu,
    // Model picker
    ...modelPickerApi,
    // Generation state
    activeTaskId,
    generationAbortController,
    loading,
    resetGenerationOutput,
    outputLoading,
    outputActionLoading,
    outputActionTargetId,
    outputActionRecordId,
    outputActionType,
    loadingStage,
    lastGenerationNotice,
    queuePosition,
    notice,
    output,
    isAuthenticated,
    // Reference images
    ...referenceApi,
    // Gallery state + helpers from useGallery
    ...galleryApi,
    // Gallery user actions
    clearGallery: galleryActions.clearGallery,
    copyGalleryPrompt: galleryActions.copyGalleryPrompt,
    openGalleryImage: (record) => galleryActions.openGalleryImage(record, openImagePreview),
    removeGalleryRecord: galleryActions.removeGalleryRecord,
    saveCurrentOutputToGallery: () => galleryActions.saveCurrentOutputToGallery(formState),
    useGalleryRecord,
    // Polling / queue
    ...pollingApi,
    // Image preview
    ...imagePreviewApi,
    // Loading
    ...loadingUi,
    // Billing
    ...billingApi,
    // Prompt tools
    ...promptToolsApi,
    // Prompt UI
    ...promptUI,
    copyCurrentPrompt: () => promptUI.copyCurrentPrompt(showNotice),
    // Download
    downloadImage,
    downloadPreviewImage: () => downloadPreviewImage(currentPreviewImage.value),
    downloadGalleryRecord,
    // UI (output layout + key/click handlers)
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
    // Actions
    generate,
    submitOutputRegionEdit,
    submitOutputLayerSplit,
    enableBatchMode,
    disableBatchMode,
    openLoginFromGenerate,
    openPricingFromGenerate,
    showNotice,
  }
}
