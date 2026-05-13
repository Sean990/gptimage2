import { computed, ref } from 'vue'

const galleryStorageKey = 'gptImage2Gallery'
const deletedGalleryStorageKey = 'gptImage2DeletedGalleryIds'
const galleryClearedBeforeStorageKey = 'gptImage2GalleryClearedBefore'
const maxLocalGalleryRecords = 20
const maxDeletedGalleryIds = 500
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

function canUseLocalStorage() {
  return typeof localStorage !== 'undefined'
}

function normalizeGalleryId(id) {
  return String(id || '').trim()
}

function getGalleryRecordDeleteKeys(record = {}) {
  const keys = []
  const recordId = normalizeGalleryId(record.id)
  const firstImageUrl = record.images?.[0]?.url || record.images?.[0]?.src || ''
  const fallbackKey = [record.prompt, firstImageUrl || record.status].map((part) => String(part || '').trim()).join('|')

  if (recordId) keys.push(`id:${recordId}`)
  if (fallbackKey !== '|') keys.push(`record:${fallbackKey}`)

  return keys
}

function parseGalleryTime(value) {
  const time = new Date(value || 0).getTime()
  return Number.isFinite(time) ? time : 0
}

export function loadDeletedGalleryIds() {
  if (!canUseLocalStorage()) return new Set()

  try {
    const ids = JSON.parse(localStorage.getItem(deletedGalleryStorageKey) || '[]')
    return new Set(
      Array.isArray(ids)
        ? ids
            .map(normalizeGalleryId)
            .filter(Boolean)
            .map((id) => (id.includes(':') ? id : `id:${id}`))
        : [],
    )
  } catch {
    return new Set()
  }
}

export function persistDeletedGalleryIds(ids) {
  if (!canUseLocalStorage()) return

  try {
    const normalizedIds = Array.from(ids || [])
      .map(normalizeGalleryId)
      .filter(Boolean)
    localStorage.setItem(deletedGalleryStorageKey, JSON.stringify(normalizedIds.slice(-maxDeletedGalleryIds)))
  } catch {
    return
  }
}

export function markGalleryRecordsDeleted(recordIds = []) {
  const deletedIds = loadDeletedGalleryIds()
  recordIds
    .flatMap((record) => (typeof record === 'object' && record ? getGalleryRecordDeleteKeys(record) : [`id:${record}`]))
    .map(normalizeGalleryId)
    .filter(Boolean)
    .forEach((id) => deletedIds.add(id))
  persistDeletedGalleryIds(deletedIds)
  return deletedIds
}

export function loadGalleryClearedBefore() {
  if (!canUseLocalStorage()) return 0
  return parseGalleryTime(localStorage.getItem(galleryClearedBeforeStorageKey))
}

export function markGalleryClearedBefore(value = new Date()) {
  if (!canUseLocalStorage()) return 0

  const nextTime = parseGalleryTime(value)
  if (!nextTime) return loadGalleryClearedBefore()

  const clearedBefore = Math.max(loadGalleryClearedBefore(), nextTime)
  try {
    localStorage.setItem(galleryClearedBeforeStorageKey, new Date(clearedBefore).toISOString())
  } catch {
    return clearedBefore
  }
  return clearedBefore
}

export function isGalleryRecordDeleted(record, options = {}) {
  const deletedIds = options.deletedIds || loadDeletedGalleryIds()
  const deletedBefore = Number.isFinite(options.deletedBefore) ? options.deletedBefore : loadGalleryClearedBefore()

  if (getGalleryRecordDeleteKeys(record).some((key) => deletedIds.has(key))) return true

  const recordTime = parseGalleryTime(record?.createdAt || record?.updatedAt)
  return deletedBefore > 0 && recordTime > 0 && recordTime <= deletedBefore
}

export function filterVisibleGalleryRecords(records = [], options = {}) {
  const deletedIds = options.deletedIds || loadDeletedGalleryIds()
  const deletedBefore = Number.isFinite(options.deletedBefore) ? options.deletedBefore : loadGalleryClearedBefore()
  return (Array.isArray(records) ? records : []).filter(
    (record) => !isGalleryRecordDeleted(record, { deletedIds, deletedBefore }),
  )
}

export function useGallery({ generationWaitText, isAuthenticated, modes, normalizeGenerationRecord, showNotice } = {}) {
  const galleryOpen = ref(false)
  const gallery = ref([])
  const gallerySyncing = ref(false)
  const gallerySyncMessage = ref('')
  const gallerySyncError = ref('')
  const galleryLastSyncedAt = ref('')

  const galleryImageCount = computed(() => gallery.value.reduce((total, record) => total + record.images.length, 0))
  const gallerySummary = computed(() => {
    if (!gallery.value.length) return '暂无生成记录'
    return `${gallery.value.length} 组作品 · ${galleryImageCount.value} 张图片`
  })
  const hasPendingGalleryRecords = computed(() => gallery.value.some((record) => isGalleryRecordPending(record)))
  const galleryCloudStatusText = computed(() => {
    if (!isAuthenticated?.value) return '未登录时仅显示本地临时图库，登录后会同步云端记录。'
    if (gallerySyncing.value) return '正在同步云端图库和生成进度。'
    if (gallerySyncError.value) return gallerySyncError.value
    if (galleryLastSyncedAt.value) return `云端已同步：${formatGallerySyncTime(galleryLastSyncedAt.value)}`
    return '登录状态下会自动同步云端图库、图片结果和任务进度。'
  })

  function loadLocalGallery() {
    try {
      const records = JSON.parse(localStorage.getItem(galleryStorageKey) || '[]')
      return Array.isArray(records)
        ? filterVisibleGalleryRecords(
            records
              .map(normalizeGenerationRecord)
              .filter((record) => record.images.length || galleryRetainedEmptyStatuses.has(record.status)),
          )
        : []
    } catch {
      return []
    }
  }

  function persistLocalGallery(records = gallery.value) {
    try {
      localStorage.setItem(
        galleryStorageKey,
        JSON.stringify(filterVisibleGalleryRecords(records).slice(0, maxLocalGalleryRecords)),
      )
    } catch {
      showNotice?.('图库本地存储空间不足，已保留当前页面记录')
    }
  }

  function mergeGalleryRecords(...recordGroups) {
    const recordsByKey = new Map()
    const deletedIds = loadDeletedGalleryIds()
    const deletedBefore = loadGalleryClearedBefore()
    recordGroups
      .flat()
      .map((record) => normalizeGenerationRecord(record))
      .forEach((record) => {
        if (isGalleryRecordDeleted(record, { deletedIds, deletedBefore })) return
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

  function setGallerySyncMessage(text) {
    gallerySyncMessage.value = text
    if (!text) return
    window.setTimeout(() => {
      if (gallerySyncMessage.value === text) gallerySyncMessage.value = ''
    }, 2400)
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
    return modes?.find((item) => item.value === record.mode)?.label || record.mode || '文生图'
  }

  function galleryRecordMeta(record) {
    const imageCountText = record.images.length ? `${record.images.length} 张` : galleryRecordStatusLabel(record)
    return [galleryRecordMode(record), record.resolution, record.ratio, imageCountText].filter(Boolean).join(' · ')
  }

  return {
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
    markGalleryClearedBefore,
    markGalleryRecordsDeleted,
    maxLocalGalleryRecords,
    mergeGalleryRecords,
    persistLocalGallery,
    setGallerySyncMessage,
    shouldReplaceGalleryRecord,
  }
}
