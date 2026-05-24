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
import {
  canReuseGenerationRecord,
  compactPayload,
  mapRecordImages,
  normalizeGenerationRecord,
} from './useGenerationPayload'
import { useImageDownload } from './useImageDownload'
import { useImagePreview } from './useImagePreview'
import { useModelPicker } from './useModelPicker'
import { usePromptTools } from './usePromptTools'
import { usePromptUI } from './usePromptUI'
import { useReferenceImages } from './useReferenceImages'
import { useScrollLock } from './useScrollLock'

export function useGenerationTask({ onGalleryRecordUsed, activeTool = ref('generate') } = {}) {
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
  const sourceToolHandoffKey = ref('')
  const loadingStage = ref('准备提交生成任务')
  const initialLoadingStage = loadingStage.value
  const queuePosition = ref(null)
  const lastGenerationNotice = ref('')
  const lastGenerationCanRetry = ref(false)
  const lastGenerationRetryRecord = ref(null)
  const generationAbortController = ref(null)
  const generationRunId = ref(0)
  const activeTaskId = ref('')
  const isAuthenticated = computed(() => auth.isAuthenticated.value)
  const defaultLayerSplitTypes = [
    { type: 'subject', label: '主体' },
    { type: 'text', label: '文字' },
    { type: 'background', label: '背景' },
  ]

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
    setReferenceUrls,
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
    applyGalleryPagePayload,
    clearGalleryClearedBefore,
    gallery,
    galleryPage,
    galleryLastSyncedAt,
    galleryOpen,
    gallerySyncError,
    gallerySyncing,
    gallerySyncMessage,
    hasPendingGalleryRecords,
    getGalleryPageParams,
    isGalleryRecordPending,
    loadLocalGallery,
    markGalleryRecordsDeleted,
    mergeGalleryRecords,
    persistLocalGallery,
    setGalleryPage,
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
    applyGalleryPagePayload,
    clearGalleryClearedBefore,
    gallery,
    galleryPage,
    galleryLastSyncedAt,
    galleryOpen,
    gallerySyncError,
    gallerySyncing,
    gallerySyncMessage,
    generationAbortController,
    hasPendingGalleryRecords,
    getGalleryPageParams,
    isAuthenticated,
    isGalleryRecordPending,
    loadLocalGallery,
    loading,
    loadingStage,
    mergeGalleryRecords,
    normalizeGenerationRecord,
    persistLocalGallery,
    queuePosition,
    setGalleryPage,
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
    activeTool,
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
    setLastGenerationRetryRecord: (record) => {
      lastGenerationRetryRecord.value = record ? normalizeGenerationRecord(record) : null
    },
    setLastGenerationRetryAvailable: (available) => {
      lastGenerationCanRetry.value = Boolean(available)
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

  function getReusableReferenceUrls(record = {}) {
    const imageReferences = (record.images || []).flatMap((image) => [
      ...(image.sourceImages || image.source_images || image.references || []),
      image.originalSrc || image.original_src || '',
    ])
    return Array.from(
      new Set(
        [
          ...(record.sourceImages || record.source_images || record.references || []),
          record.originalSrc || record.original_src || '',
          ...imageReferences,
        ].filter(Boolean),
      ),
    )
  }

  function canRetryGalleryRecord(record = {}) {
    if (!record.id) return false
    if (!canReuseGenerationRecord(record)) return false
    const status = String(record.status || '').toLowerCase()
    return (
      ['failed', 'canceled', 'partial_completed', 'completed_with_errors'].includes(status) ||
      Number(record.failedCount || 0) > 0
    )
  }

  function canCancelGalleryRecord(record = {}) {
    if (!record.id) return false
    const status = String(record.status || '').toLowerCase()
    return ['queued', 'running', 'saving'].includes(status)
  }

  function useGalleryRecord(record) {
    const normalizedRecord = normalizeGenerationRecord(record)
    const used = galleryActions.useGalleryRecord(normalizedRecord, formState)
    if (used) {
      setReferenceUrls(getReusableReferenceUrls(normalizedRecord), {
        maskUrl: normalizedRecord.mask || normalizedRecord.maskUrl || normalizedRecord.mask_url || '',
        silent: true,
      })
      onGalleryRecordUsed?.(normalizedRecord)
    }
    return used
  }

  function getRetryImageCount(record = {}) {
    const successCount = record.images?.length || 0
    const failedCount = Number(record.failedCount || 0)
    const requestedCount = Number(record.requestedCount || 0)
    if (failedCount > 0 && successCount > 0) return failedCount
    return requestedCount || failedCount || 1
  }

  function shouldRetryFailedImagesOnly(record = {}) {
    return Number(record.failedCount || 0) > 0 && (record.images?.length || 0) > 0
  }

  function buildTaskRetryPayload(record = {}) {
    const retryFailedOnly = shouldRetryFailedImagesOnly(record)
    return compactPayload({
      n: getRetryImageCount(record),
      failed_only: retryFailedOnly || undefined,
    })
  }

  function normalizeTaskRetryResult(record, defaults = {}) {
    const normalizedRecord = normalizeGenerationRecord(record, defaults)
    const requestedCount = Number(normalizedRecord.requestedCount || defaults.requestedCount || 0)
    if (requestedCount > 0 && normalizedRecord.images.length >= requestedCount && normalizedRecord.failedCount > 0) {
      return {
        ...normalizedRecord,
        failedCount: 0,
        partialFailureMessage: '',
      }
    }
    return normalizedRecord
  }

  function replaceGalleryRecord(record) {
    gallery.value = mergeGalleryRecords(
      [record],
      gallery.value.filter((item) => item.id !== record.id),
    )
    persistLocalGallery()
    window.dispatchEvent(new CustomEvent('imgsgen:gallery-updated', { detail: { record } }))
  }

  async function cancelGalleryRecord(record) {
    const normalizedRecord = normalizeGenerationRecord(record)
    if (!canCancelGalleryRecord(normalizedRecord)) return false

    const cancelingRecord = normalizeGenerationRecord(
      {
        ...normalizedRecord,
        status: 'cancel_requested',
        updatedAt: new Date().toISOString(),
        errorMessage: normalizedRecord.errorMessage || '用户请求取消生成',
      },
      normalizedRecord,
    )

    replaceGalleryRecord(cancelingRecord)
    if (activeTaskId.value === normalizedRecord.id) loadingStage.value = '正在取消任务'

    try {
      const canceledPayload = await api.cancelGenerationTask(normalizedRecord.id)
      const canceledRecord = normalizeGenerationRecord(
        {
          ...canceledPayload,
          id: normalizedRecord.id,
        },
        cancelingRecord,
      )
      replaceGalleryRecord(canceledRecord)
      showNotice('已请求取消生成')
      void auth.refreshMe().catch(() => {})
      return true
    } catch (error) {
      replaceGalleryRecord(normalizedRecord)
      showNotice(error.message || '取消失败，请稍后重试')
      return false
    }
  }

  async function retryGalleryRecord(record) {
    const normalizedRecord = normalizeGenerationRecord(record)
    if (!canRetryGalleryRecord(normalizedRecord)) return false
    if (loading.value || outputLoading.value) {
      showNotice('当前已有生成任务在进行，请完成后再重试')
      return false
    }

    if (!isAuthenticated.value) {
      if (auth.token.value && !auth.initialized.value) {
        await auth.refreshMe().catch(() => {})
      }
      if (!isAuthenticated.value) {
        showNotice('请先登录后重试生成任务')
        openLoginFromGenerate()
        return false
      }
    }

    const runId = generationRunId.value + 1
    generationRunId.value = runId
    const isCurrentRun = () => generationRunId.value === runId
    const retryPayload = buildTaskRetryPayload(normalizedRecord)
    const retryFailedOnly = shouldRetryFailedImagesOnly(normalizedRecord)
    const retryingRecord = normalizeGenerationRecord(
      {
        ...normalizedRecord,
        status: 'queued',
        updatedAt: new Date().toISOString(),
      },
      normalizedRecord,
    )

    closeGallery()
    loading.value = true
    outputLoading.value = true
    activeTaskId.value = normalizedRecord.id
    output.value = normalizedRecord.images?.length ? mapRecordImages(normalizedRecord) : []
    loadingStage.value = retryFailedOnly ? '正在重新生成失败图片' : '正在重试生成任务'
    lastGenerationCanRetry.value = false
    lastGenerationRetryRecord.value = null
    lastGenerationNotice.value = constants.generationSubmittedTip
    replaceGalleryRecord(retryingRecord)
    showNotice(retryFailedOnly ? '正在补生成失败图片' : '正在重试原任务')

    try {
      const retryTaskPayload = await api.retryGenerationTask(normalizedRecord.id, retryPayload)
      if (!isCurrentRun()) return false

      const retryTask = normalizeTaskRetryResult(
        {
          ...retryTaskPayload,
          id: normalizedRecord.id,
        },
        {
          ...normalizedRecord,
          ...retryPayload,
          createdAt: normalizedRecord.createdAt || new Date().toISOString(),
        },
      )
      replaceGalleryRecord(retryTask)
      void auth.refreshMe().catch(() => {})

      if (isGenerationTaskSuccessful(retryTask)) {
        output.value = mapRecordImages(retryTask)
        outputLoading.value = false
        activeTaskId.value = ''
        loadingStage.value = initialLoadingStage
        const completionMessage =
          retryTask.partialFailureMessage || (retryFailedOnly ? '失败图片已重新生成' : '生成任务重试完成')
        showNotice(completionMessage)
        window.dispatchEvent(
          new CustomEvent('imgsgen:generation-completed', {
            detail: { message: completionMessage, record: retryTask },
          }),
        )
        return true
      }

      const result = await waitForGenerationTask(normalizedRecord.id)
      if (!isCurrentRun()) return false
      const normalizedResult = normalizeTaskRetryResult(result, {
        ...normalizedRecord,
        ...retryPayload,
        createdAt: normalizedRecord.createdAt || new Date().toISOString(),
      })
      replaceGalleryRecord(normalizedResult)
      output.value = mapRecordImages(normalizedResult)
      outputLoading.value = false
      activeTaskId.value = ''
      loadingStage.value = initialLoadingStage
      const completionMessage =
        normalizedResult.partialFailureMessage || (retryFailedOnly ? '失败图片已重新生成' : '生成任务重试完成')
      showNotice(completionMessage)
      window.dispatchEvent(
        new CustomEvent('imgsgen:generation-completed', {
          detail: { message: completionMessage, record: normalizedResult },
        }),
      )
    } catch (error) {
      if (!isCurrentRun()) return false
      outputLoading.value = false
      activeTaskId.value = ''
      loadingStage.value = initialLoadingStage
      lastGenerationNotice.value = error.message || '任务重试失败，请稍后再试'
      lastGenerationRetryRecord.value = normalizedRecord
      lastGenerationCanRetry.value = true
      showNotice(lastGenerationNotice.value)
      replaceGalleryRecord({
        ...normalizedRecord,
        status: 'failed',
        errorMessage: lastGenerationNotice.value,
      })
      return false
    } finally {
      if (isCurrentRun()) loading.value = false
      void auth.refreshMe().catch(() => {})
    }

    return true
  }

  async function retryLastGeneration() {
    if (!lastGenerationCanRetry.value || loading.value || outputLoading.value) return false
    lastGenerationCanRetry.value = false
    if (lastGenerationRetryRecord.value?.id) {
      return retryGalleryRecord(lastGenerationRetryRecord.value)
    }
    showNotice('正在重试上一次生成')
    await generate()
    return true
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
    lastGenerationCanRetry.value = false
    loadingStage.value = initialLoadingStage
    cancelOutputAction()
    closeImagePreview()
  }

  function handoffOutputToTool(toolKey, image = {}) {
    const source = image.src || image.url || ''
    if (!source) {
      showNotice('当前结果图无法继续处理')
      return false
    }

    const toolLabels = {
      upscale: '高清放大',
      outpaint: '自由扩图',
      cutout: '智能抠图',
      erase: '一键消除',
    }
    formState.mode.value = toolKey === 'outpaint' || toolKey === 'erase' ? 'edit' : 'image'
    setReferenceUrls([source], { silent: true })
    sourceToolHandoffKey.value = toolKey
    showNotice(`已将当前结果带入${toolLabels[toolKey] || '图片处理'}工具`)
    return true
  }

  async function resolveOutputActionRecord(taskPayload, requestPayload, { runId, persistToGallery = true } = {}) {
    const submittedRecord = normalizeGenerationRecord(taskPayload, requestPayload)
    outputActionRecordId.value = submittedRecord.id || taskPayload?.id || ''
    if (runId && !isCurrentOutputActionRun(runId)) return null

    if (persistToGallery) {
      gallery.value = mergeGalleryRecords([submittedRecord], gallery.value)
      persistLocalGallery()
    }

    if (isGenerationTaskSuccessful(taskPayload)) return submittedRecord

    const result = await waitForGenerationTask(taskPayload.id, { syncGallery: persistToGallery })
    if (runId && !isCurrentOutputActionRun(runId)) return null

    const normalizedResult = normalizeGenerationRecord(result, {
      ...requestPayload,
      createdAt: submittedRecord.createdAt || new Date().toISOString(),
    })
    if (persistToGallery) {
      gallery.value = mergeGalleryRecords([normalizedResult], gallery.value)
      persistLocalGallery()
    }
    return normalizedResult
  }

  function replaceOutputItem(index, nextItem) {
    output.value = output.value.map((item, itemIndex) => (itemIndex === index ? nextItem : item))
  }

  function getLayerSplitTypeLabel(type, index = 0) {
    return defaultLayerSplitTypes.find((item) => item.type === type)?.label || `图层 ${index + 1}`
  }

  function normalizeLayerSplitTypes(types = []) {
    const normalizedTypes = (Array.isArray(types) ? types : [types])
      .map((type) => String(type || '').trim())
      .filter(Boolean)
    return normalizedTypes.length ? Array.from(new Set(normalizedTypes)) : []
  }

  function sortLayerSplitEntries(entries = []) {
    const order = new Map(defaultLayerSplitTypes.map((item, index) => [item.type, index]))
    return [...entries].sort((a, b) => {
      const aOrder = order.has(a.type) ? order.get(a.type) : Number.MAX_SAFE_INTEGER
      const bOrder = order.has(b.type) ? order.get(b.type) : Number.MAX_SAFE_INTEGER
      if (aOrder !== bOrder) return aOrder - bOrder
      return String(a.label || '').localeCompare(String(b.label || ''), 'zh-CN')
    })
  }

  function mapLayerSplitRecordLayers(record = {}, requestedTypes = []) {
    const layerTypes = normalizeLayerSplitTypes(requestedTypes)
    return mapRecordImages(record)
      .filter((image) => image.src)
      .map((image, layerIndex) => {
        const type = image.layerType || layerTypes[layerIndex] || `layer-${layerIndex + 1}`
        const label = image.layerLabel || image.title || getLayerSplitTypeLabel(type, layerIndex)
        return {
          id: image.id || `${type}-${layerIndex}`,
          type,
          label,
          title: image.title || label,
          src: image.src,
          visible: image.visible !== false,
          outputFormat: image.outputFormat || 'png',
          createdAt: image.createdAt,
        }
      })
  }

  function getLayerSplitFailedSlots(record = {}, requestedTypes = [], layers = []) {
    const layerTypes = normalizeLayerSplitTypes(requestedTypes)
    if (!layerTypes.length) {
      const status = String(record.status || '').toLowerCase()
      const failedCount = Number(record.failedCount || 0)
      if (status !== 'failed' && failedCount <= 0) return []
      return [
        {
          id: 'layer-split-failed',
          type: '',
          label: '分层',
          errorMessage: record.errorMessage || record.partialFailureMessage || '智能分层失败',
        },
      ]
    }
    const successfulTypes = new Set(layers.map((layer) => layer.type).filter(Boolean))
    const missingTypes = layerTypes.filter((type) => !successfulTypes.has(type))
    const failedCount = Number(record.failedCount || 0)
    const requestedCount = Number(record.requestedCount || layerTypes.length || 0)
    const impliedMissingCount = Math.max(0, Math.min(layerTypes.length, requestedCount) - layers.length)
    const status = String(record.status || '').toLowerCase()
    const missingCount = failedCount || impliedMissingCount || (status === 'failed' ? missingTypes.length : 0)

    return missingTypes.slice(0, missingCount).map((type, index) => ({
      id: `${type}-failed`,
      type,
      label: getLayerSplitTypeLabel(type, index),
      errorMessage: record.errorMessage || record.partialFailureMessage || '该图层生成失败',
    }))
  }

  function buildLayerSplitState(item = {}, record = {}, requestedTypes = []) {
    const normalizedRecord = normalizeGenerationRecord(record)
    const layerTypes = normalizeLayerSplitTypes(requestedTypes)
    const incomingLayers = mapLayerSplitRecordLayers(normalizedRecord, layerTypes)
    const replaceTypes = new Set(layerTypes)
    const layersByType = new Map()

    ;(item.layers || [])
      .filter((layer) => !replaceTypes.has(layer.type))
      .forEach((layer) => layersByType.set(layer.type || layer.id || layer.src, layer))
    incomingLayers.forEach((layer) => layersByType.set(layer.type || layer.id || layer.src, layer))

    const previousFailedSlots = Array.isArray(item.layerSplitFailedSlots) ? item.layerSplitFailedSlots : []
    const nextFailedSlots = [
      ...previousFailedSlots.filter((slot) => !replaceTypes.has(slot.type)),
      ...getLayerSplitFailedSlots(normalizedRecord, layerTypes, incomingLayers),
    ]

    return {
      layers: sortLayerSplitEntries(Array.from(layersByType.values())),
      layerSplitRecord: normalizedRecord,
      layerSplitFailedSlots: sortLayerSplitEntries(nextFailedSlots),
      layerSplitRequestedTypes: normalizeLayerSplitTypes([
        ...(item.layerSplitRequestedTypes || []),
        ...layerTypes,
      ]),
      layerSplitError: nextFailedSlots.length
        ? normalizedRecord.errorMessage || normalizedRecord.partialFailureMessage
        : '',
    }
  }

  function buildLayerSplitErrorState(item = {}, requestedTypes = [], message = '') {
    const layerTypes = normalizeLayerSplitTypes(requestedTypes)
    const failedTypes = layerTypes.length ? layerTypes : ['']
    const replaceTypes = new Set(layerTypes)
    const previousFailedSlots = Array.isArray(item.layerSplitFailedSlots) ? item.layerSplitFailedSlots : []
    const nextFailedSlots = [
      ...previousFailedSlots.filter((slot) => !replaceTypes.has(slot.type)),
      ...failedTypes.map((type, index) => ({
        id: `${type || 'layer-split'}-failed`,
        type,
        label: type ? getLayerSplitTypeLabel(type, index) : '分层',
        errorMessage: message || '该图层生成失败',
      })),
    ]

    return {
      layerSplitFailedSlots: sortLayerSplitEntries(nextFailedSlots),
      layerSplitRequestedTypes: normalizeLayerSplitTypes([
        ...(item.layerSplitRequestedTypes || []),
        ...layerTypes,
      ]),
      layerSplitError: message || '智能分层失败，请稍后重试',
    }
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
      n: payload.n || (action === 'layer-split' ? undefined : 1),
      quality: 'high',
      output_format: 'png',
      background: action === 'layer-split' ? undefined : 'auto',
      references: [item.src],
      parent_task_id: item.recordId || item.record?.id,
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

      const record = await resolveOutputActionRecord(taskPayload, requestPayload, { runId, persistToGallery: false })
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
        recordId: item.recordId || item.record?.id || resultImage.recordId,
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

  async function submitOutputLayerSplit(item, index, options = {}) {
    if (!(await ensureOutputActionReady())) return null

    const runId = startOutputAction(item, index, 'layer-split')
    const requestedTypes = normalizeLayerSplitTypes(options.layerType ? [options.layerType] : options.layerTypes)

    try {
      const requestPayload = buildOutputActionPayload(item, 'layer-split', {
        prompt: '请自动把当前图片拆分为可独立使用的透明 PNG 图层，按画面内容合理决定图层数量和命名。',
        n: requestedTypes.length || undefined,
        toolParams: {
          source_image: item.src,
          layer_types: requestedTypes.length ? requestedTypes : undefined,
          strategy: 'auto',
        },
      })
      const taskPayload = await api.generateImages(requestPayload)
      if (!isCurrentOutputActionRun(runId)) return null

      const record = await resolveOutputActionRecord(taskPayload, requestPayload, { runId, persistToGallery: false })
      if (!record || !isCurrentOutputActionRun(runId)) return null

      const layerSplitState = buildLayerSplitState(item, record, requestedTypes)
      if (!layerSplitState.layers.length && !layerSplitState.layerSplitFailedSlots.length) {
        throw new Error('智能分层未返回图层图片')
      }

      replaceOutputItem(index, {
        ...item,
        recordId: item.recordId || item.record?.id,
        originalSrc: item.originalSrc || item.src,
        sourceImages: Array.from(new Set([...(item.sourceImages || []), item.src])),
        ...layerSplitState,
      })
      if (layerSplitState.layerSplitFailedSlots.length) {
        showNotice(record.partialFailureMessage || '部分图层生成失败，可单独重新生成')
      } else {
        showNotice(options.layerType ? `${getLayerSplitTypeLabel(options.layerType)}图层已重新生成` : '智能分层完成')
      }
      void auth.refreshMe().catch(() => {})
      return record
    } catch (error) {
      if (!isCurrentOutputActionRun(runId)) return null
      const message = error.message || '智能分层失败，请稍后重试'
      replaceOutputItem(index, {
        ...item,
        originalSrc: item.originalSrc || item.src,
        sourceImages: Array.from(new Set([...(item.sourceImages || []), item.src])),
        ...buildLayerSplitErrorState(item, requestedTypes, message),
      })
      showNotice(message)
      return null
    } finally {
      finishOutputAction(runId)
    }
  }

  function handleUseGalleryRecord(event) {
    const record = event.detail?.record || event.detail
    if (!record) return
    if (event.detail?.retry) {
      void retryGalleryRecord(record)
      return
    }
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
    sourceToolHandoffKey,
    loadingStage,
    lastGenerationNotice,
    lastGenerationCanRetry,
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
    canRetryGalleryRecord,
    canCancelGalleryRecord,
    cancelGalleryRecord,
    retryGalleryRecord,
    retryLastGeneration,
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
    handoffOutputToTool,
    submitOutputRegionEdit,
    submitOutputLayerSplit,
    enableBatchMode,
    disableBatchMode,
    openLoginFromGenerate,
    openPricingFromGenerate,
    showNotice,
  }
}
