import { logger } from '../utils/logger'

const technicalErrorPattern = /upstream|上游|连接中断|connection|ECONNRE|socket|timeout|5\d{2}\s|内部错误|internal/i
const successfulTaskStatuses = new Set([
  'completed',
  'succeeded',
  'success',
  'partial_completed',
  'completed_with_errors',
])

function sanitizeErrorMessage(raw, fallback) {
  if (!raw) return fallback
  if (technicalErrorPattern.test(raw)) return fallback
  return raw
}

export function isGenerationTaskSuccessful(task = {}) {
  const status = String(task.status || '').toLowerCase()
  if (successfulTaskStatuses.has(status)) return true
  return status === 'failed' && Array.isArray(task.images) && task.images.length > 0
}

export function useGenerationPolling({
  activeTaskId,
  api,
  clearGalleryClearedBefore,
  gallery,
  galleryLastSyncedAt,
  galleryOpen,
  gallerySyncError,
  gallerySyncing,
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
}) {
  const taskPollTimers = new Map()
  let galleryRefreshTimer = null

  function clearTaskPollTimer(taskId = '') {
    if (taskId) {
      const timer = taskPollTimers.get(taskId)
      if (!timer) return
      window.clearTimeout(timer)
      taskPollTimers.delete(taskId)
      return
    }

    taskPollTimers.forEach((timer) => window.clearTimeout(timer))
    taskPollTimers.clear()
  }

  async function fetchQueuePosition(taskId) {
    if (!queuePosition) return
    try {
      const position = await api.getQueuePosition(taskId)
      queuePosition.value = position
    } catch (error) {
      logger.warn('队列位置查询失败', error)
    }
  }

  async function waitForGenerationTask(taskId) {
    clearTaskPollTimer(taskId)
    let pollInterval = 1500
    let consecutiveFailures = 0
    const MAX_FAILURES = 5
    const MAX_INTERVAL = 8000

    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const task = await api.getGenerationTask(taskId)
          gallery.value = mergeGalleryRecords([normalizeGenerationRecord(task, task)], gallery.value)
          persistLocalGallery()

          consecutiveFailures = 0
          pollInterval = 1500

          // 如果任务在排队，更新队列位置信息
          if (task.status === 'queued' && queuePosition && activeTaskId.value === taskId) {
            await fetchQueuePosition(taskId)
          } else if (queuePosition && activeTaskId.value === taskId) {
            queuePosition.value = null
          }

          const statusText = {
            queued: queuePosition?.value?.position
              ? `队列中（前面还有 ${Math.max(0, queuePosition.value.position - 1)} 个任务）`
              : '任务排队中',
            running: '后台生成中',
            saving: '正在保存图片',
            cancel_requested: '正在取消任务',
          }[task.status]
          if (activeTaskId.value === taskId) {
            loadingStage.value = statusText || '后台生成中'
          }

          if (isGenerationTaskSuccessful(task)) {
            clearTaskPollTimer(taskId)
            if (queuePosition && activeTaskId.value === taskId) queuePosition.value = null
            if (galleryOpen.value) syncCloudGallery({ silent: true })
            resolve(task)
            return
          }
          if (['failed', 'canceled'].includes(task.status)) {
            clearTaskPollTimer(taskId)
            if (queuePosition && activeTaskId.value === taskId) queuePosition.value = null
            persistLocalGallery()
            reject(
              new Error(
                sanitizeErrorMessage(
                  task.errorMessage,
                  task.status === 'canceled' ? '生成已取消' : '生成失败，请稍后重试',
                ),
              ),
            )
            return
          }
          taskPollTimers.set(taskId, window.setTimeout(poll, pollInterval))
        } catch (error) {
          consecutiveFailures++
          logger.warn('生成任务轮询失败', `${consecutiveFailures}/${MAX_FAILURES}`, error)
          if (consecutiveFailures >= MAX_FAILURES) {
            clearTaskPollTimer(taskId)
            reject(new Error('生成任务轮询失败次数过多，请检查网络后重试'))
            return
          }
          pollInterval = Math.min(pollInterval * 1.6, MAX_INTERVAL)
          taskPollTimers.set(taskId, window.setTimeout(poll, pollInterval))
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

    const settledRecords = await Promise.allSettled(pendingRecords.map((record) => api.getGenerationTask(record.id)))
    const updatedRecords = settledRecords
      .filter((result) => result.status === 'fulfilled')
      .map((result) => normalizeGenerationRecord(result.value, result.value))

    if (updatedRecords.length) {
      gallery.value = mergeGalleryRecords(updatedRecords, gallery.value)
      persistLocalGallery()
    }
  }

  async function syncCloudGallery({ silent = false } = {}) {
    if (!silent) clearGalleryClearedBefore?.()
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
      logger.warn('云端图库同步失败', error)
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

  function resetCloudGalleryState() {
    clearGalleryRefreshTimer()
    galleryLastSyncedAt.value = ''
    gallerySyncError.value = ''
    gallery.value = loadLocalGallery()
  }

  function disposeGenerationPolling() {
    clearTaskPollTimer()
    clearGalleryRefreshTimer()
  }

  return {
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
    taskPollTimers,
    waitForGenerationTask,
  }
}
