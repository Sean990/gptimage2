import { resolveApiUrl } from '../services/api'

export function resolveOutputSize(sizeMatrix, resolution, aspectRatio) {
  if (resolution === 'auto' || aspectRatio === 'auto') return 'auto'
  return sizeMatrix[resolution]?.[aspectRatio] || 'auto'
}

export function normalizeGeneratedImage(item = {}, index = 0, defaults = {}) {
  const imageUrl = item.url || item.src || item.image_url || item.image || ''
  return {
    id: item.id || `generated-${index}`,
    title: item.title || item.filename || `ImgsGen 生成图 ${index + 1}`,
    url: resolveApiUrl(imageUrl),
    prompt: item.prompt || defaults.prompt,
    model: item.model || defaults.model,
    mode: item.mode || defaults.mode,
    apiMode: item.apiMode || defaults.apiMode,
    ratio: item.ratio,
    resolution: item.resolution,
    size: item.size || defaults.size,
    quality: item.quality || defaults.quality,
    outputFormat: item.output_format || defaults.output_format,
    background: item.background || defaults.background,
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
    ratio: record?.ratio || defaults.ratio,
    resolution: record?.resolution || defaults.resolution,
    size: record?.size || defaults.size,
    quality: record?.quality || defaults.quality,
    output_format: record?.output_format || defaults.output_format,
    background: record?.background || defaults.background,
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
    title: item.title,
    src: item.url,
    prompt: item.prompt,
    model: item.model,
    mode: item.mode,
    apiMode: item.apiMode,
    ratio: item.ratio,
    resolution: item.resolution,
    size: item.size,
    quality: item.quality,
    outputFormat: item.outputFormat,
    background: item.background,
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
