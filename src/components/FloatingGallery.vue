<script setup>
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { CheckCircle2, GalleryHorizontal, Loader2 } from 'lucide-vue-next'
import AsyncBlockFallback from './AsyncBlockFallback.vue'
import Toast from './Toast.vue'
import { api } from '../services/api'
import { useAuthStore } from '../services/authStore'
import { logger } from '../utils/logger'
import { generationWaitText, modes } from '../composables/generationConstants'
import { emitGalleryChanged, galleryChangedEventName, useGallery } from '../composables/useGallery'
import { useImageDownload } from '../composables/useImageDownload'
import { useImagePreview } from '../composables/useImagePreview'
import { mapRecordImages, normalizeGenerationRecord } from '../composables/useGenerationPayload'
import '../assets/floating-gallery.css'

function asyncGalleryComponent(loader) {
  return defineAsyncComponent({
    loader,
    loadingComponent: AsyncBlockFallback,
    errorComponent: AsyncBlockFallback,
    delay: 160,
    timeout: 12000,
  })
}

const GalleryDrawer = asyncGalleryComponent(() => import('./generate/GalleryDrawer.vue'))
const ImagePreviewModal = asyncGalleryComponent(() => import('./generate/ImagePreviewModal.vue'))

const galleryEventName = 'imgsgen:gallery-updated'
const generationStartedEventName = 'imgsgen:generation-started'
const generationFinishedEventName = 'imgsgen:generation-finished'
const generationCompletedEventName = 'imgsgen:generation-completed'
const useGalleryRecordEventName = 'imgsgen:use-gallery-record'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const notice = ref('')
const submitting = ref(false)
const completionMessage = ref('')
const completionPulse = ref(false)
let noticeTimer = null
let completionTimer = null
let pendingRefreshTimer = null

const isAuthenticated = computed(() => auth.isAuthenticated.value)
const isGenerateRoute = computed(() => route.path === '/generate')

function showNotice(text) {
  notice.value = text
  if (noticeTimer) window.clearTimeout(noticeTimer)
  noticeTimer = window.setTimeout(() => {
    if (notice.value === text) notice.value = ''
  }, 2400)
}

const galleryApi = useGallery({
  generationWaitText,
  isAuthenticated,
  modes,
  normalizeGenerationRecord,
  showNotice,
})

const {
  canPreviewGalleryRecord,
  canReuseGalleryRecord,
  clearGalleryClearedBefore,
  formatGalleryDate,
  gallery,
  galleryHasMore,
  galleryCloudStatusText,
  galleryLastSyncedAt,
  galleryOpen,
  galleryPage,
  galleryPageSize,
  galleryRecordCover,
  galleryRecordMeta,
  galleryRecordModelLabel,
  galleryRecordMode,
  galleryRecordNotice,
  galleryRecordProgressText,
  galleryRecordStatusLabel,
  gallerySummary,
  gallerySyncError,
  gallerySyncing,
  gallerySyncMessage,
  galleryTotal,
  applyGalleryPagePayload,
  getGalleryPageParams,
  hasPendingGalleryRecords,
  isGalleryRecordPending,
  loadLocalGallery,
  markGalleryRecordsDeleted,
  maxLocalGalleryRecords,
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
  openPreviewSource,
  previewCount,
  previewImages,
  previewPosition,
  setPreviewIndex,
  showNextPreviewImage,
  showPreviousPreviewImage,
} = imagePreviewApi

const { downloadGalleryRecord, downloadPreviewImage } = useImageDownload({ showNotice })

const pendingCount = computed(() => gallery.value.filter((record) => isGalleryRecordPending(record)).length)
const galleryCount = computed(() => gallery.value.length)
const fabLabel = computed(() => {
  if (submitting.value) return '正在提交'
  if (pendingCount.value) return `${pendingCount.value} 个生成中`
  if (completionMessage.value) return completionMessage.value
  return galleryCount.value ? `${galleryCount.value} 个任务` : '我的图库'
})

function triggerCompletion(message = '任务已完成') {
  completionMessage.value = message
  completionPulse.value = true
  if (completionTimer) window.clearTimeout(completionTimer)
  completionTimer = window.setTimeout(() => {
    completionPulse.value = false
    completionMessage.value = ''
  }, 3000)
}

async function syncCloudGallery({ page = galleryPage.value, silent = false } = {}) {
  const nextPage = Math.max(1, Number(page) || 1)
  if (!silent) clearGalleryClearedBefore()
  const retainedPendingRecords = gallery.value.filter((record) => isGalleryRecordPending(record))
  const shouldResetLoadedPages = nextPage === 1 && !silent
  gallery.value = shouldResetLoadedPages
    ? mergeGalleryRecords(
        retainedPendingRecords,
        loadLocalGallery().filter((record) => isGalleryRecordPending(record)),
      )
    : mergeGalleryRecords(gallery.value, loadLocalGallery())
  gallerySyncError.value = ''

  if (!isAuthenticated.value) {
    setGalleryPage(nextPage)
    if (!silent) showNotice('登录后可查看云端图库和生成进度')
    return
  }
  if (gallerySyncing.value) return

  gallerySyncing.value = true
  try {
    await refreshPendingRecords()
    const payload = await api.getGallery(getGalleryPageParams(nextPage))
    const records = applyGalleryPagePayload(payload, nextPage)
    gallery.value = shouldResetLoadedPages
      ? mergeGalleryRecords(records, retainedPendingRecords)
      : mergeGalleryRecords(gallery.value, records)
    galleryLastSyncedAt.value = new Date().toISOString()
    persistLocalGallery()
    if (!silent) setGallerySyncMessage(`云端图库第 ${galleryPage.value} 页已同步`)
  } catch (error) {
    logger.warn('全站图库同步失败', error)
    gallerySyncError.value = error.message || '云端图库同步失败'
    if (!silent && !gallery.value.length) showNotice(gallerySyncError.value)
  } finally {
    gallerySyncing.value = false
    schedulePendingRefresh()
  }
}

async function refreshPendingRecords() {
  if (!isAuthenticated.value) return
  const pendingRecords = gallery.value.filter((record) => isGalleryRecordPending(record))
  if (!pendingRecords.length) return

  const pendingIds = new Set(pendingRecords.map((record) => record.id))
  const settledRecords = await Promise.allSettled(pendingRecords.map((record) => api.getGenerationTask(record.id)))
  const updatedRecords = settledRecords
    .filter((result) => result.status === 'fulfilled')
    .map((result) => normalizeGenerationRecord(result.value, result.value))

  if (!updatedRecords.length) return

  gallery.value = mergeGalleryRecords(updatedRecords, gallery.value)
  persistLocalGallery()

  const completedRecord = updatedRecords.find(
    (record) => pendingIds.has(record.id) && !isGalleryRecordPending(record) && record.images?.length,
  )
  if (completedRecord) {
    triggerCompletion(completedRecord.partialFailureMessage || '生图任务已完成')
  }
}

function clearPendingRefreshTimer() {
  if (!pendingRefreshTimer) return
  window.clearTimeout(pendingRefreshTimer)
  pendingRefreshTimer = null
}

function schedulePendingRefresh() {
  clearPendingRefreshTimer()
  if (!isAuthenticated.value || !hasPendingGalleryRecords.value) return
  pendingRefreshTimer = window.setTimeout(
    async () => {
      await refreshPendingRecords()
      schedulePendingRefresh()
    },
    galleryOpen.value ? 3000 : 6000,
  )
}

async function openGallery() {
  galleryOpen.value = true
  await syncCloudGallery({ page: 1, silent: false })
}

function closeGallery() {
  galleryOpen.value = false
  schedulePendingRefresh()
}

function openGalleryImage(record) {
  if (!canPreviewGalleryRecord(record)) return
  const images = mapRecordImages(record).map((image, index) => ({
    ...image,
    title: image.title || `图库图片 ${index + 1}`,
    prompt: canReuseGalleryRecord(record) ? record.prompt || image.prompt || '' : '',
    model: record.model || image.model,
    mode: image.mode || record.mode,
    apiMode: image.apiMode || record.apiMode,
    resolution: record.resolution || image.resolution,
    ratio: record.ratio || image.ratio,
    tool: image.tool || record.tool || record.toolKey || record.tool_key,
    action: image.action || record.action,
    outputFormat: image.outputFormat || record.outputFormat || record.output_format,
    originalSrc: image.originalSrc || record.originalSrc,
    sourceImages: image.sourceImages?.length ? image.sourceImages : record.sourceImages || record.references || [],
    record,
  }))
  openImagePreview(images, 0, '图库图片')
}

async function copyGalleryPrompt(record) {
  if (!canReuseGalleryRecord(record)) {
    showNotice(`${galleryRecordMode(record)}记录不展示提示词`)
    return
  }
  try {
    await navigator.clipboard.writeText(record.prompt || '')
    showNotice('图库提示词已复制')
  } catch {
    showNotice(record.prompt || '这条记录没有提示词')
  }
}

function canRetryGalleryRecord(record = {}) {
  if (!record.id) return false
  if (!canReuseGalleryRecord(record)) return false
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

async function removeGalleryRecord(recordId) {
  const removedRecords = gallery.value.filter((record) => record.id === recordId)
  markGalleryRecordsDeleted(removedRecords.length ? removedRecords : [recordId])
  gallery.value = gallery.value.filter((record) => record.id !== recordId)
  persistLocalGallery()
  emitGalleryChanged({ type: 'remove', recordId })
  if (isAuthenticated.value && recordId) {
    api.deleteGalleryRecord(recordId).catch((error) => {
      if (error?.status !== 404) logger.warn('云端图库删除失败', error)
    })
  }
  showNotice('已从图库移除')
}

function clearGallery() {
  markGalleryRecordsDeleted(gallery.value)
  gallery.value = []
  persistLocalGallery()
  emitGalleryChanged({ type: 'clear' })
  showNotice('已清空本地图库')
}

function emitUseGalleryRecord(record, options = {}) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(useGalleryRecordEventName, { detail: { record, ...options } }))
}

function useGalleryRecord(record) {
  if (!canReuseGalleryRecord(record)) {
    showNotice(`${galleryRecordMode(record)}记录仅支持预览和下载`)
    return
  }
  closeGallery()
  if (route.path === '/generate') {
    emitUseGalleryRecord(record)
    return
  }
  router.push({ path: '/generate', query: record.prompt ? { prompt: record.prompt } : {} }).then(() => {
    emitUseGalleryRecord(record)
  })
}

async function retryGalleryRecord(record) {
  const normalizedRecord = normalizeGenerationRecord(record)
  if (!canRetryGalleryRecord(normalizedRecord)) return false

  closeGallery()
  showNotice('正在打开原任务重试')

  if (route.path === '/generate') {
    emitUseGalleryRecord(normalizedRecord, { retry: true })
    return true
  }

  await router.push({ path: '/generate', query: normalizedRecord.prompt ? { prompt: normalizedRecord.prompt } : {} })
  emitUseGalleryRecord(normalizedRecord, { retry: true })
  return true
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
  gallery.value = mergeGalleryRecords([cancelingRecord], gallery.value)
  persistLocalGallery()
  emitGalleryChanged({ type: 'cancel', record: cancelingRecord })

  try {
    const canceledPayload = await api.cancelGenerationTask(normalizedRecord.id)
    const canceledRecord = normalizeGenerationRecord(
      {
        ...canceledPayload,
        id: normalizedRecord.id,
      },
      cancelingRecord,
    )
    gallery.value = mergeGalleryRecords([canceledRecord], gallery.value)
    persistLocalGallery()
    emitGalleryChanged({ type: 'cancel', record: canceledRecord })
    showNotice('已请求取消生成')
    schedulePendingRefresh()
    return true
  } catch (error) {
    gallery.value = mergeGalleryRecords([normalizedRecord], gallery.value)
    persistLocalGallery()
    emitGalleryChanged({ type: 'cancel', record: normalizedRecord })
    showNotice(error.message || '取消失败，请稍后重试')
    return false
  }
}

function onGalleryUpdated(event) {
  submitting.value = false
  const record = normalizeGenerationRecord(event.detail?.record || event.detail || {})
  gallery.value = mergeGalleryRecords([record], gallery.value, loadLocalGallery())
  persistLocalGallery()
  if (!isGalleryRecordPending(record) && record.images?.length) triggerCompletion('任务已完成')
  schedulePendingRefresh()
}

function onGenerationStarted() {
  submitting.value = true
}

function onGenerationFinished() {
  submitting.value = false
}

function onGenerationCompleted(event) {
  submitting.value = false
  triggerCompletion(event.detail?.message || '任务已完成')
}

function onStorage(event) {
  if (event.key !== galleryApi.galleryStorageKey) return
  gallery.value = mergeGalleryRecords(loadLocalGallery(), gallery.value)
  schedulePendingRefresh()
}

function onGalleryChanged(event) {
  const detail = event?.detail || {}
  if (detail.type === 'clear') {
    gallery.value = []
    schedulePendingRefresh()
    return
  }

  const currentGallery =
    detail.type === 'remove' && detail.recordId
      ? gallery.value.filter((record) => record.id !== detail.recordId)
      : gallery.value
  gallery.value = mergeGalleryRecords(loadLocalGallery(), currentGallery)
  schedulePendingRefresh()
}

const drawerTask = {
  canPreviewGalleryRecord,
  canCancelGalleryRecord,
  canRetryGalleryRecord,
  canReuseGalleryRecord,
  clearGallery,
  closeGallery,
  copyGalleryPrompt,
  downloadGalleryRecord,
  formatGalleryDate,
  gallery,
  galleryCloudStatusText,
  galleryOpen,
  galleryRecordCover,
  galleryRecordMeta,
  galleryRecordModelLabel,
  galleryRecordMode,
  galleryRecordNotice,
  galleryRecordProgressText,
  galleryRecordStatusLabel,
  gallerySummary,
  galleryHasMore,
  gallerySyncError,
  gallerySyncing,
  gallerySyncMessage,
  galleryPage,
  galleryPageSize,
  galleryTotal,
  isAuthenticated,
  isGalleryRecordPending,
  maxLocalGalleryRecords,
  openGalleryImage,
  removeGalleryRecord,
  cancelGalleryRecord,
  retryGalleryRecord,
  setGalleryPage,
  syncCloudGallery,
  useGalleryRecord,
}

const previewTask = {
  canReuseGalleryRecord,
  closeImagePreview,
  copyGalleryPrompt,
  currentPreviewImage,
  downloadPreviewImage: () => downloadPreviewImage(currentPreviewImage.value),
  imagePreview,
  openPreviewSource,
  previewCount,
  previewImages,
  previewPosition,
  setPreviewIndex,
  showNextPreviewImage,
  showPreviousPreviewImage,
  removeGalleryRecord,
  useGalleryRecord,
}

watch([hasPendingGalleryRecords, isAuthenticated], schedulePendingRefresh)
watch(isAuthenticated, (authenticated) => {
  if (authenticated) syncCloudGallery({ silent: true })
})

onMounted(() => {
  gallery.value = loadLocalGallery()
  auth.refreshMe().catch(() => {})
  syncCloudGallery({ silent: true })
  window.addEventListener(galleryEventName, onGalleryUpdated)
  window.addEventListener(generationStartedEventName, onGenerationStarted)
  window.addEventListener(generationFinishedEventName, onGenerationFinished)
  window.addEventListener(generationCompletedEventName, onGenerationCompleted)
  window.addEventListener(galleryChangedEventName, onGalleryChanged)
  window.addEventListener('storage', onStorage)
})

onBeforeUnmount(() => {
  clearPendingRefreshTimer()
  if (noticeTimer) window.clearTimeout(noticeTimer)
  if (completionTimer) window.clearTimeout(completionTimer)
  window.removeEventListener(galleryEventName, onGalleryUpdated)
  window.removeEventListener(generationStartedEventName, onGenerationStarted)
  window.removeEventListener(generationFinishedEventName, onGenerationFinished)
  window.removeEventListener(generationCompletedEventName, onGenerationCompleted)
  window.removeEventListener(galleryChangedEventName, onGalleryChanged)
  window.removeEventListener('storage', onStorage)
})
</script>

<template>
  <div class="floating-gallery-wrap" :class="{ 'is-generate-route': isGenerateRoute, 'is-complete': completionPulse }">
    <button class="floating-gallery-button" type="button" @click="openGallery">
      <span class="floating-gallery-icon" aria-hidden="true">
        <Loader2 v-if="submitting || pendingCount" class="spinner" />
        <CheckCircle2 v-else-if="completionMessage" />
        <GalleryHorizontal v-else />
      </span>
      <span class="floating-gallery-copy">
        <strong>图库</strong>
        <small>{{ fabLabel }}</small>
      </span>
      <em v-if="galleryCount">{{ galleryCount }}</em>
    </button>
  </div>

  <GalleryDrawer v-if="galleryOpen" :task="drawerTask" />
  <ImagePreviewModal v-if="imagePreview" :task="previewTask" />
  <Toast :message="completionMessage || notice" :type="completionMessage ? 'success' : 'info'" />
</template>
