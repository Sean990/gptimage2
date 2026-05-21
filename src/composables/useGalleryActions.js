import {
  canReuseGenerationRecord,
  getGenerationRecordTypeLabel,
  mapRecordImages,
  normalizeGenerationRecord,
} from './useGenerationPayload'
import { emitGalleryChanged } from './useGallery'

function getAllowedImageCounts(formState = {}) {
  const counts = new Set([1])
  ;(formState.batchCountOptions || []).forEach((item) => {
    const count = Number(item?.value)
    if (Number.isFinite(count) && count > 1) counts.add(count)
  })
  return Array.from(counts).sort((a, b) => a - b)
}

function resolveReusableImageCount(record = {}, formState = {}) {
  const allowedCounts = getAllowedImageCounts(formState)
  const candidates = [record.requestedCount, record.images?.length]
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0)

  const exactCount = candidates.find((count) => allowedCounts.includes(count))
  if (exactCount) return exactCount

  const targetCount = candidates[0] || 1
  return allowedCounts.reduce((closest, count) => {
    const currentDistance = Math.abs(count - targetCount)
    const closestDistance = Math.abs(closest - targetCount)
    if (currentDistance < closestDistance) return count
    if (currentDistance === closestDistance && count > closest) return count
    return closest
  }, allowedCounts[0] || 1)
}

function syncReusableImageCount(record = {}, formState = {}) {
  if (!formState.batchMode || !formState.batchCount) return

  const nextCount = resolveReusableImageCount(record, formState)
  if (nextCount <= 1) {
    formState.batchMode.value = false
    return
  }

  formState.batchMode.value = true
  formState.batchCount.value = nextCount
}

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
      return false
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
    syncReusableImageCount(record, formState)
    output.value = mapRecordImages(record)
    galleryOpen.value = false
    showNotice('已载入图库记录')
    return true
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
        tool: image.tool || record.tool || record.toolKey || record.tool_key,
        action: image.action || record.action,
        outputFormat: image.outputFormat || record.outputFormat || record.output_format,
        originalSrc: image.originalSrc || record.originalSrc,
        sourceImages: image.sourceImages || record.sourceImages || record.references || [],
        layers: image.layers || [],
        layerType: image.layerType,
        layerLabel: image.layerLabel,
        editHistory: image.editHistory || [],
        record,
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
    emitGalleryChanged({ type: 'remove', recordId })

    if (isAuthenticated.value && recordId) {
      api.deleteGalleryRecord(recordId).catch((error) => {
        if (error?.status !== 404) console.warn('云端图库删除失败', error)
      })
    }

    showNotice('已从图库移除')
  }

  function clearGallery() {
    markGalleryRecordsDeleted(gallery.value)
    gallery.value = []
    persistLocalGallery([])
    gallerySyncMessage.value = ''
    emitGalleryChanged({ type: 'clear' })
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
    emitGalleryChanged({ type: 'save', record })
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
