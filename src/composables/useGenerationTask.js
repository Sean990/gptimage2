import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, resolveApiUrl } from '../services/api'
import { useAuthStore } from '../services/authStore'
import { useSiteStore } from '../services/siteStore'
import * as constants from './generationConstants'
import { useGalleryActions } from './useGalleryActions'
import { useGallery } from './useGallery'
import { useGenerateAction } from './useGenerateAction'
import { useGenerationBilling } from './useGenerationBilling'
import { useGenerationForm } from './useGenerationForm'
import { useGenerationLoading } from './useGenerationLoading'
import { useGenerationPolling } from './useGenerationPolling'
import { useGenerationUI } from './useGenerationUI'
import { normalizeGenerationRecord } from './useGenerationPayload'
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
  const loadingStage = ref('准备提交生成任务')
  const queuePosition = ref(null)
  const lastGenerationNotice = ref('')
  const generationAbortController = ref(null)
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

  function handleUseGalleryRecord(event) {
    const record = event.detail?.record || event.detail
    if (!record) return
    useGalleryRecord(record)
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
  })

  onBeforeUnmount(() => {
    disposeGenerationPolling()
    syncGalleryScrollLock(false)
    window.removeEventListener('click', closeMenusOnOutside)
    window.removeEventListener('keydown', handleWindowKeydown)
    window.removeEventListener('imgsgen:use-gallery-record', handleUseGalleryRecord)
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
    outputLoading,
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
    enableBatchMode,
    disableBatchMode,
    openLoginFromGenerate,
    openPricingFromGenerate,
    showNotice,
  }
}
