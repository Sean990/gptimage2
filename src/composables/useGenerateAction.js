import { compactPayload, mapRecordImages, normalizeGenerationRecord } from './useGenerationPayload'

export function useGenerateAction({
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
  persistLocalGallery,
  referenceCount,
  selectedModelAvailable,
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
        normalizedResult.partialFailureMessage ||
          (formState.batchMode.value ? '批量生成完成' : '图像生成完成'),
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

  return {
    ensureAuthenticated,
    generate,
  }
}
