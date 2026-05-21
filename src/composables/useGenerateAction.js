import { compactPayload, mapRecordImages, normalizeGenerationRecord } from './useGenerationPayload'
import { isGenerationTaskSuccessful } from './useGenerationPolling'

function emitGenerationEvent(name, detail = {}) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(name, { detail }))
}

export function useGenerateAction({
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
  setLastGenerationNotice,
  showNotice,
  showReferenceSection,
  userCredits,
  waitForGenerationTask,
}) {
  async function ensureAuthenticated() {
    if (isAuthenticated.value) return true
    if (auth.token.value && !auth.initialized.value) {
      await auth.refreshMe().catch(() => {})
    }
    return isAuthenticated.value
  }

  async function generate(payloadOverrides = {}) {
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
    const runId = generationRunId ? generationRunId.value + 1 : 0
    const isCurrentRun = () => !generationRunId || generationRunId.value === runId
    if (generationRunId) generationRunId.value = runId
    const abortController = new AbortController()
    loading.value = true
    outputLoading.value = true
    activeTaskId.value = ''
    emitGenerationEvent('imgsgen:generation-started', { cost: creditCost.value })
    setLastGenerationNotice?.('')
    output.value = []
    loadingStage.value = '准备提交生成任务'
    generationAbortController.value = abortController

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
        ...payloadOverrides,
      })
      const task = await api.generateImages(requestPayload, {
        signal: abortController.signal,
      })
      if (!isCurrentRun()) return
      activeTaskId.value = task.id
      loadingStage.value = '任务已提交，后台生成中'
      const normalizedTask = normalizeGenerationRecord(task, requestPayload)
      gallery.value = mergeGalleryRecords([normalizedTask], gallery.value)
      persistLocalGallery()
      emitGenerationEvent('imgsgen:gallery-updated', { record: normalizedTask })
      void auth.refreshMe().catch(() => {})
      if (isGenerationTaskSuccessful(task)) {
        output.value = mapRecordImages(normalizedTask)
        outputLoading.value = false
        activeTaskId.value = ''
        loadingStage.value = '准备提交生成任务'
        const completionMessage =
          normalizedTask.partialFailureMessage || (formState.batchMode.value ? '批量生成完成' : '图像生成完成')
        showNotice(completionMessage)
        emitGenerationEvent('imgsgen:generation-completed', { message: completionMessage, record: normalizedTask })
      } else {
        setLastGenerationNotice?.('任务已提交，结果区会持续显示进度；你也可以继续生成或处理下一张图片。')
        showNotice('任务已提交，正在生成中')
        void trackGenerationTask(task.id, requestPayload, normalizedTask, runId)
      }
    } catch (error) {
      if (!isCurrentRun()) return
      output.value = []
      outputLoading.value = false
      activeTaskId.value = ''
      if (error.isTimeout) showNotice(error.message || '请求超时，请稍后重试')
      else if (error.name === 'AbortError') showNotice('已停止提交生成任务')
      else showNotice(error.message || '图像生成失败，请稍后重试')
    } finally {
      logGenerationDuration()
      if (generationAbortController.value === abortController) generationAbortController.value = null
      if (isCurrentRun()) loading.value = false
      emitGenerationEvent('imgsgen:generation-finished')
      void auth.refreshMe().catch(() => {})
    }
  }

  async function trackGenerationTask(taskId, requestPayload, submittedTask, runId = generationRunId?.value) {
    const isCurrentRun = () => !generationRunId || generationRunId.value === runId
    try {
      const result = await waitForGenerationTask(taskId)
      const normalizedResult = normalizeGenerationRecord(result, {
        ...requestPayload,
        createdAt: submittedTask.createdAt || new Date().toISOString(),
      })
      gallery.value = mergeGalleryRecords([normalizedResult], gallery.value)
      persistLocalGallery()
      emitGenerationEvent('imgsgen:gallery-updated', { record: normalizedResult })

      if (isCurrentRun() && activeTaskId.value === taskId) {
        output.value = mapRecordImages(normalizedResult)
        outputLoading.value = false
        activeTaskId.value = ''
        loadingStage.value = '准备提交生成任务'
      }

      const completionMessage =
        normalizedResult.partialFailureMessage || (formState.batchMode.value ? '批量生成完成' : '图像生成完成')
      if (isCurrentRun()) {
        showNotice(completionMessage)
        emitGenerationEvent('imgsgen:generation-completed', { message: completionMessage, record: normalizedResult })
        void auth.refreshMe().catch(() => {})
      }
    } catch (error) {
      if (isCurrentRun() && activeTaskId.value === taskId) {
        output.value = []
        outputLoading.value = false
        activeTaskId.value = ''
        loadingStage.value = '准备提交生成任务'
        if (error.isTimeout) showNotice(error.message || '请求超时，请稍后重试')
        else if (error.name === 'AbortError') showNotice('已停止提交生成任务')
        else showNotice(error.message || '图像生成失败，请稍后重试')
      }
    }
  }

  return {
    ensureAuthenticated,
    generate,
  }
}
