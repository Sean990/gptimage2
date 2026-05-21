import { ref } from 'vue'
import { api, resolveApiUrl } from '../services/api'
import { compactPayload, normalizeGenerationRecord } from './useGenerationPayload'
import { isGenerationTaskSuccessful } from './useGenerationPolling'

export function useOutputActions({
  auth,
  gallery,
  loading,
  model,
  modelOptions,
  openLoginFromGenerate,
  output,
  outputLoading,
  persistLocalGallery,
  selectedModelAvailable,
  showNotice,
  waitForGenerationTask,
  mergeGalleryRecords,
  closeImagePreview,
}) {
  const outputActionLoading = ref(false)
  const outputActionTargetId = ref('')
  const outputActionRecordId = ref('')
  const outputActionType = ref('')
  const outputActionRunId = ref(0)

  async function ensureOutputActionReady() {
    if (outputActionLoading.value || loading.value || outputLoading.value) return false
    if (!auth.isAuthenticated.value) {
      if (auth.token.value && !auth.initialized.value) {
        await auth.refreshMe().catch(() => {})
      }
      if (!auth.isAuthenticated.value) {
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
      mode: payload.mode || 'generate',
      action,
      references: item.src || item.url ? [{ url: resolveApiUrl(item.src || item.url) }] : [],
      mask: payload.mask,
      region: payload.region,
    })
  }

  async function submitOutputLayerSplit(item, index) {
    if (!(await ensureOutputActionReady())) return null

    const runId = startOutputAction(item, index, 'layer-split')
    const requestPayload = buildOutputActionPayload(item, 'layer-split')

    try {
      const taskPayload = await api.post('/api/image/generate', requestPayload)
      const record = await resolveOutputActionRecord(taskPayload, requestPayload, { runId })
      if (!record || !isCurrentOutputActionRun(runId)) return null

      const layers = record.images?.filter((img) => img.layerType || img.layer_type) || []
      if (layers.length) {
        replaceOutputItem(index, { ...item, layers })
        showNotice(`已分离 ${layers.length} 个图层`)
      } else {
        showNotice('分层完成，但未检测到图层结果')
      }

      return record
    } catch (error) {
      showNotice(error.message || '图层分离失败，请稍后重试')
      return null
    } finally {
      finishOutputAction(runId)
    }
  }

  async function submitOutputRegionEdit(item, index, { prompt, mask, region }) {
    if (!(await ensureOutputActionReady())) return null
    if (!prompt?.trim()) {
      showNotice('请输入修改要求')
      return null
    }
    if (!mask) {
      showNotice('请框选需要修改的区域')
      return null
    }

    const runId = startOutputAction(item, index, 'region-edit')
    const requestPayload = buildOutputActionPayload(item, 'region-edit', {
      prompt: prompt.trim(),
      mask,
      region,
      mode: 'edit',
    })

    try {
      const taskPayload = await api.post('/api/image/generate', requestPayload)
      const record = await resolveOutputActionRecord(taskPayload, requestPayload, { runId })
      if (!record || !isCurrentOutputActionRun(runId)) return null

      const resultImage = record.images?.[0]
      if (resultImage?.url || resultImage?.src) {
        const editHistory = [...(item.editHistory || []), { prompt, region, timestamp: Date.now() }]
        replaceOutputItem(index, {
          ...item,
          src: resultImage.url || resultImage.src,
          originalSrc: item.originalSrc || item.src || item.url,
          editHistory,
        })
        showNotice('局部修改完成')
        closeImagePreview()
      } else {
        showNotice('修改完成，但未返回结果图')
      }

      return record
    } catch (error) {
      showNotice(error.message || '局部修改失败，请稍后重试')
      return null
    } finally {
      finishOutputAction(runId)
    }
  }

  return {
    outputActionLoading,
    outputActionTargetId,
    outputActionRecordId,
    outputActionType,
    outputActionRunId,
    ensureOutputActionReady,
    getOutputActionTargetKey,
    startOutputAction,
    isCurrentOutputActionRun,
    finishOutputAction,
    cancelOutputAction,
    resolveOutputActionRecord,
    replaceOutputItem,
    buildOutputActionPayload,
    submitOutputLayerSplit,
    submitOutputRegionEdit,
  }
}
