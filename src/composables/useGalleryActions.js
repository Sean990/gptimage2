import {
  canReuseGenerationRecord,
  getGenerationRecordTypeLabel,
  mapRecordImages,
  normalizeGenerationRecord,
} from './useGenerationPayload'

export function useGalleryActions({
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
}) {
  function useGalleryRecord(record, formState) {
    if (!canReuseGenerationRecord(record)) {
      showNotice(`${getGenerationRecordTypeLabel(record)}记录仅支持预览和下载`)
      return
    }
    formState.prompt.value = record.prompt || formState.prompt.value
    model.value = record.model || model.value
    if (!selectedModelAvailable.value && modelOptions.value.length) {
      model.value = modelOptions.value[0].value
    }
    formState.mode.value = record.mode || formState.mode.value
    formState.aspectRatio.value = record.ratio || formState.aspectRatio.value
    formState.resolution.value = record.resolution || formState.resolution.value
    formState.quality.value = record.quality || formState.quality.value
    formState.outputFormat.value = record.outputFormat || record.output_format || formState.outputFormat.value
    formState.background.value = record.background || formState.background.value
    output.value = mapRecordImages(record)
    galleryOpen.value = false
    showNotice('已载入图库记录')
  }

  async function copyGalleryPrompt(record) {
    if (!canReuseGenerationRecord(record)) {
      showNotice(`${getGenerationRecordTypeLabel(record)}记录不展示提示词`)
      return
    }
    try {
      await navigator.clipboard.writeText(record.prompt || '')
      showNotice('图库提示词已复制')
    } catch {
      showNotice(record.prompt || '这条记录没有提示词')
    }
  }

  function openGalleryImage(record, openImagePreview) {
    if (!record.images?.length) return
    const showPrompt = canReuseGenerationRecord(record)
    openImagePreview(
      record.images.map((image, index) => ({
        src: image.url,
        title: image.title || `图库图片 ${index + 1}`,
        prompt: showPrompt ? record.prompt || image.prompt : '',
        model: record.model || image.model,
        resolution: record.resolution || image.resolution,
        ratio: record.ratio || image.ratio,
      })),
      0,
      '图库图片',
    )
  }

  async function removeGalleryRecord(recordId) {
    const removedRecords = gallery.value.filter((record) => record.id === recordId)
    markGalleryRecordsDeleted(removedRecords.length ? removedRecords : [recordId])
    gallery.value = gallery.value.filter((record) => record.id !== recordId)
    persistLocalGallery()

    if (isAuthenticated.value && recordId) {
      api.deleteGalleryRecord(recordId).catch((error) => {
        if (error?.status !== 404) console.warn('云端图库删除失败', error)
      })
    }

    showNotice('已从图库移除，刷新后不会再显示')
  }

  function clearGallery() {
    gallery.value = []
    persistLocalGallery([])
    gallerySyncMessage.value = ''
    showNotice('已清空本地图库，点击同步云端可重新拉取云端记录')
  }

  function saveCurrentOutputToGallery(formState) {
    if (!output.value.length) return
    const record = normalizeGenerationRecord({
      id: `manual-${Date.now()}`,
      prompt: formState.prompt.value,
      model: model.value,
      mode: formState.mode.value,
      apiMode: 'image',
      ratio: formState.aspectRatio.value,
      resolution: formState.resolution.value,
      size: formState.size.value,
      quality: formState.quality.value,
      output_format: formState.outputFormat.value,
      background: formState.background.value,
      createdAt: new Date().toISOString(),
      images: output.value.map((item) => ({
        ...item,
        url: item.src,
      })),
    })
    gallery.value = mergeGalleryRecords([record], gallery.value)
    persistLocalGallery()
    showNotice('当前结果已保存到图库')
  }

  return {
    useGalleryRecord,
    copyGalleryPrompt,
    openGalleryImage,
    removeGalleryRecord,
    clearGallery,
    saveCurrentOutputToGallery,
  }
}
