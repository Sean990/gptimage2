import { resolveApiUrl } from '../services/api'

export const imageToolLabels = {
  upscale: '高清放大',
  outpaint: '自由扩图',
  cutout: '智能抠图',
  erase: '一键消除',
  'region-edit': '局部改图',
  'layer-split': '智能分层',
}

function normalizeRecordToolKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
}

export function getGenerationRecordToolKey(record = {}) {
  return (
    [record.tool, record.toolKey, record.tool_key, record.action, record.type]
      .map(normalizeRecordToolKey)
      .find((value) => imageToolLabels[value]) || ''
  )
}

export function canReuseGenerationRecord(record = {}) {
  return !getGenerationRecordToolKey(record)
}

export function getGenerationRecordTypeLabel(record = {}, modes = []) {
  const toolKey = getGenerationRecordToolKey(record)
  if (toolKey) return imageToolLabels[toolKey]
  return modes?.find((item) => item.value === record.mode)?.label || record.mode || '文生图'
}

export function resolveOutputSize(sizeMatrix, resolution, aspectRatio) {
  if (resolution === 'auto' || aspectRatio === 'auto') return 'auto'
  return sizeMatrix[resolution]?.[aspectRatio] || 'auto'
}

function normalizeImageList(value) {
  return (Array.isArray(value) ? value : [value])
    .map((item) => (typeof item === 'string' ? item : item?.src || item?.url || ''))
    .map(resolveApiUrl)
    .filter(Boolean)
}

function normalizeImageLayers(layers = []) {
  return (Array.isArray(layers) ? layers : [])
    .map((layer, index) => {
      const layerUrl = layer.url || layer.src || layer.image_url || ''
      const src = resolveApiUrl(layerUrl)
      if (!src) return null

      return {
        id: layer.id || `layer-${index}`,
        type: layer.type || layer.layerType || layer.layer_type || `layer-${index + 1}`,
        label: layer.label || layer.layerLabel || layer.layer_label || layer.title || `图层 ${index + 1}`,
        title: layer.title || layer.label || layer.layerLabel || `图层 ${index + 1}`,
        src,
        visible: layer.visible !== false,
        outputFormat: layer.outputFormat || layer.output_format || 'png',
        createdAt: layer.createdAt,
      }
    })
    .filter(Boolean)
}

function normalizeEditHistory(history = []) {
  return (Array.isArray(history) ? history : [])
    .map((item, index) => {
      const beforeSrc = resolveApiUrl(item.beforeSrc || item.before_src || item.source || '')
      const afterSrc = resolveApiUrl(item.afterSrc || item.after_src || item.result || '')
      if (!beforeSrc || !afterSrc) return null

      return {
        id: item.id || `edit-${index}`,
        beforeSrc,
        afterSrc,
        prompt: item.prompt || item.instruction || '',
        region: item.region || null,
        createdAt: item.createdAt,
      }
    })
    .filter(Boolean)
}

export function normalizeGeneratedImage(item = {}, index = 0, defaults = {}) {
  const imageUrl = item.url || item.src || item.image_url || item.image || ''
  const sourceImages = normalizeImageList(
    item.sourceImages ||
      item.source_images ||
      defaults.sourceImages ||
      defaults.source_images ||
      defaults.references ||
      [],
  )
  const originalSrc = resolveApiUrl(
    item.originalSrc || item.original_src || defaults.originalSrc || defaults.original_src || sourceImages[0] || '',
  )
  return {
    id: item.id || `generated-${index}`,
    recordId: item.recordId || item.record_id || defaults.recordId || defaults.record_id || defaults.id,
    title: item.title || item.filename || `ImgsGen 生成图 ${index + 1}`,
    url: resolveApiUrl(imageUrl),
    prompt: item.prompt || defaults.prompt,
    model: item.model || defaults.model,
    mode: item.mode || defaults.mode,
    apiMode: item.apiMode || defaults.apiMode,
    tool: item.tool || defaults.tool,
    toolParams: item.toolParams || item.tool_params || defaults.toolParams || defaults.tool_params,
    ratio: item.ratio || defaults.ratio,
    resolution: item.resolution || defaults.resolution,
    size: item.size || defaults.size,
    quality: item.quality || defaults.quality,
    outputFormat: item.outputFormat || item.output_format || defaults.outputFormat || defaults.output_format,
    background: item.background || defaults.background,
    originalSrc,
    sourceImages,
    layers: normalizeImageLayers(item.layers || defaults.layers),
    layerType: item.layerType || item.layer_type || defaults.layerType || defaults.layer_type || '',
    layerLabel: item.layerLabel || item.layer_label || defaults.layerLabel || defaults.layer_label || '',
    layerSplitRecord:
      item.layerSplitRecord ||
      item.layer_split_record ||
      defaults.layerSplitRecord ||
      defaults.layer_split_record ||
      null,
    layerSplitFailedSlots:
      item.layerSplitFailedSlots ||
      item.layer_split_failed_slots ||
      defaults.layerSplitFailedSlots ||
      defaults.layer_split_failed_slots ||
      [],
    layerSplitRequestedTypes:
      item.layerSplitRequestedTypes ||
      item.layer_split_requested_types ||
      defaults.layerSplitRequestedTypes ||
      defaults.layer_split_requested_types ||
      [],
    layerSplitError: item.layerSplitError || item.layer_split_error || defaults.layerSplitError || '',
    visible: item.visible !== false,
    editHistory: normalizeEditHistory(
      item.editHistory || item.edit_history || defaults.editHistory || defaults.edit_history,
    ),
    createdAt: item.createdAt || defaults.createdAt,
  }
}

export function compactPayload(payload) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== '' && value !== null && value !== undefined),
  )
}

export function normalizeGenerationRecord(record = {}, defaults = {}) {
  const recordDefaults = {
    ...defaults,
    id: record?.id || defaults.id || `gallery-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    prompt: record?.prompt || defaults.prompt,
    model: record?.model || defaults.model,
    mode: record?.mode || defaults.mode,
    apiMode: record?.apiMode || defaults.apiMode,
    tool: record?.tool || defaults.tool,
    toolParams: record?.toolParams || record?.tool_params || defaults.toolParams || defaults.tool_params,
    ratio: record?.ratio || defaults.ratio,
    resolution: record?.resolution || defaults.resolution,
    size: record?.size || defaults.size,
    quality: record?.quality || defaults.quality,
    output_format: record?.output_format || defaults.output_format,
    background: record?.background || defaults.background,
    originalSrc: record?.originalSrc || record?.original_src || defaults.originalSrc || defaults.original_src,
    sourceImages:
      record?.sourceImages ||
      record?.source_images ||
      record?.references ||
      defaults.sourceImages ||
      defaults.references,
    createdAt: record?.createdAt || defaults.createdAt,
  }
  const rawStatus =
    record?.status ||
    defaults.status ||
    (Array.isArray(record?.images) && record.images.length ? 'completed' : 'queued')
  const images = Array.isArray(record?.images)
    ? record.images.map((item, index) => normalizeGeneratedImage(item, index, recordDefaults))
    : []
  const failedCount = Number(record?.failedCount ?? defaults.failedCount ?? 0)
  const requestedCount = Number(record?.requestedCount ?? defaults.requestedCount ?? 0)
  const status = String(rawStatus).toLowerCase() === 'failed' && images.length ? 'partial_completed' : rawStatus
  const partialFailureMessage =
    record?.partialFailureMessage ||
    defaults.partialFailureMessage ||
    (failedCount > 0 && images.length
      ? `已生成 ${images.length}/${requestedCount || images.length + failedCount} 张，失败 ${failedCount} 张未扣积分，可单独重新生成。`
      : '')

  return {
    ...record,
    ...recordDefaults,
    id: recordDefaults.id,
    status,
    errorMessage: record?.errorMessage || defaults.errorMessage || '',
    requestedCount,
    failedCount,
    partialFailureMessage,
    creditsReserved: Number(record?.creditsReserved ?? defaults.creditsReserved ?? 0),
    creditsCharged: Number(record?.creditsCharged ?? defaults.creditsCharged ?? 0),
    images,
  }
}

export function mapRecordImages(record = {}) {
  return (record.images || []).map((item) => ({
    id: item.id,
    recordId: item.recordId || record.id,
    title: item.title,
    src: item.url,
    prompt: item.prompt,
    model: item.model,
    mode: item.mode,
    apiMode: item.apiMode,
    tool: item.tool,
    toolParams: item.toolParams,
    ratio: item.ratio,
    resolution: item.resolution,
    size: item.size,
    quality: item.quality,
    outputFormat: item.outputFormat,
    background: item.background,
    originalSrc: item.originalSrc,
    sourceImages: item.sourceImages,
    layers: item.layers,
    layerType: item.layerType,
    layerLabel: item.layerLabel,
    layerSplitRecord: item.layerSplitRecord,
    layerSplitFailedSlots: item.layerSplitFailedSlots,
    layerSplitRequestedTypes: item.layerSplitRequestedTypes,
    layerSplitError: item.layerSplitError,
    visible: item.visible,
    editHistory: item.editHistory,
    createdAt: item.createdAt,
  }))
}

export function sanitizeFileName(name) {
  return (
    (name || 'imgsgen-image')
      .replace(/[\\/:*?"<>|\n\r\t]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120) || 'imgsgen-image'
  )
}

export function inferImageExtension(src, fallback = 'png') {
  const match = /\.(png|jpe?g|webp|gif|bmp|svg)(?:\?|#|$)/i.exec(src || '')
  if (match) return match[1].toLowerCase().replace('jpeg', 'jpg')
  return (fallback || 'png').toLowerCase().replace('jpeg', 'jpg')
}
