<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  Copy,
  Download,
  Eye,
  EyeOff,
  ImagePlus,
  Layers,
  Layers3,
  Loader2,
  RefreshCw,
  ScissorsLineDashed,
  Save,
  WandSparkles,
  X,
} from 'lucide-vue-next'
import OutputActionBar from './OutputActionBar.vue'
import { getThumbnailUrl, getLargeImageUrl } from '../../utils/imageOptimizer'
import '../../assets/generate-output.css'

const props = defineProps({
  task: {
    type: Object,
    required: true,
  },
  compact: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['use-as-tool'])

const {
  activeMode,
  batchMode,
  canPreviewGalleryRecord,
  canRetryGalleryRecord,
  canReuseGalleryRecord,
  copyGalleryPrompt,
  downloadImage,
  downloadGalleryRecord,
  gallery,
  galleryRecordCover,
  galleryRecordMode,
  galleryRecordStatusLabel,
  generationSubmittedTip,
  gptLoadingDots,
  isGalleryRecordPending,
  loadingTileCount,
  loadingVariant,
  normalizedImageCount,
  openGallery,
  openGalleryImage,
  openImagePreview,
  output,
  outputActionLoading,
  outputActionTargetId,
  outputActionType,
  outputLoading,
  outputAspectStyle,
  outputGridClass,
  outputPlaceholders,
  retryGalleryRecord,
  resolutionLabel,
  selectedModel,
  submitOutputLayerSplit,
  submitOutputRegionEdit,
  useGalleryRecord,
} = props.task

const prefersLightweightLoading = ref(false)
const compareItemKey = ref('')
const layerItemKey = ref('')
const editingItemKey = ref('')
const outputViewMode = ref('focus')
const selectedOutputIndex = ref(0)
const comparePositions = ref({})
const editPrompts = ref({})
const editSelections = ref({})
const editDragItemKey = ref('')
const floatingPanelPosition = ref({ left: 16, top: 16 })
const recentTaskLimit = 5
const minEditSelectionSize = 0.015
let lightweightLoadingMedia = null
let compareDragState = null
let editDragState = null
let floatingPanelFrame = 0

const recentTasks = computed(() => gallery.value.slice(0, 20))
const outputEntries = computed(() =>
  output.value.map((item, index) => ({
    item,
    index,
    key: getOutputKey(item, index),
  })),
)
const hasMultipleOutputs = computed(() => output.value.length > 1)
const activeOutputIndex = computed(() => {
  const maxIndex = Math.max(0, output.value.length - 1)
  return Math.min(maxIndex, Math.max(0, selectedOutputIndex.value))
})
const activeOutputEntry = computed(() => outputEntries.value[activeOutputIndex.value] || null)
const isOverviewMode = computed(() => hasMultipleOutputs.value && outputViewMode.value === 'overview')
const displayedOutputEntries = computed(() =>
  isOverviewMode.value ? outputEntries.value : activeOutputEntry.value ? [activeOutputEntry.value] : [],
)
const selectedOutputUsesAutoRatio = computed(() => usesAutoOutputRatio(activeOutputEntry.value?.item))
const selectedOutputRatio = computed(() => getOutputRatioNumber(activeOutputEntry.value?.item))
const selectedOutputIsLandscape = computed(() => selectedOutputRatio.value > 1.04)
const outputRatioClass = computed(() => {
  if (selectedOutputUsesAutoRatio.value) return 'output-ratio--auto'
  const ratio = selectedOutputRatio.value
  if (ratio >= 1.55) return 'output-ratio--wide'
  if (ratio > 1.04) return 'output-ratio--landscape'
  if (ratio <= 0.64) return 'output-ratio--tall'
  if (ratio < 0.96) return 'output-ratio--portrait'
  return 'output-ratio--square'
})
const outputPresentationClass = computed(() => {
  if (isOverviewMode.value) return [outputGridClass.value, 'output-grid--overview', outputRatioClass.value].join(' ')
  if (!hasMultipleOutputs.value) return [outputGridClass.value, outputRatioClass.value].filter(Boolean).join(' ')
  return [
    'output-grid--presentation',
    selectedOutputIsLandscape.value
      ? 'output-grid--thumbs-bottom output-grid--main-landscape'
      : 'output-grid--thumbs-left',
    outputRatioClass.value,
  ].join(' ')
})
const selectedOutputAspectStyle = computed(() => ({
  ...(selectedOutputUsesAutoRatio.value ? {} : outputAspectStyle.value),
  ...(selectedOutputUsesAutoRatio.value ? {} : { '--output-ratio': getOutputRatioCss(activeOutputEntry.value?.item) }),
}))
const floatingPanelStyle = computed(() => ({
  '--output-floating-panel-left': `${floatingPanelPosition.value.left}px`,
  '--output-floating-panel-top': `${floatingPanelPosition.value.top}px`,
}))
const outputSignature = computed(() => outputEntries.value.map((entry) => entry.key).join('|'))
const visibleRecentTasks = computed(() => recentTasks.value.slice(0, recentTaskLimit))
const hasMoreRecentTasks = computed(() => recentTasks.value.length > recentTaskLimit)
function syncLightweightLoadingPreference(event) {
  prefersLightweightLoading.value = Boolean(event.matches)
}

function getImageMatchKeys(image = {}) {
  return [image.src, image.url]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .map((value) => value.replace(/#.*$/, ''))
}

function findGalleryRecordForImage(image = {}) {
  const imageKeys = getImageMatchKeys(image)
  if (!imageKeys.length) return null

  return (
    gallery.value.find((record) =>
      record.images?.some((recordImage) => getImageMatchKeys(recordImage).some((key) => imageKeys.includes(key))),
    ) || null
  )
}

function findGalleryImageForOutput(record = {}, image = {}) {
  const imageKeys = getImageMatchKeys(image)
  if (!imageKeys.length) return null

  return (
    record.images?.find((recordImage) => getImageMatchKeys(recordImage).some((key) => imageKeys.includes(key))) || null
  )
}

function normalizeOutputPreviewImage(item = {}) {
  const record = item.record || findGalleryRecordForImage(item)
  if (!record) return item

  const recordImage = findGalleryImageForOutput(record, item) || {}
  const showPrompt = canReuseGalleryRecord(record)
  const sourceImages = item.sourceImages?.length
    ? item.sourceImages
    : recordImage.sourceImages?.length
      ? recordImage.sourceImages
      : record.sourceImages || record.references || []

  return {
    ...item,
    title: item.title || recordImage.title,
    prompt: showPrompt ? record.prompt || item.prompt || recordImage.prompt || '' : '',
    model: record.model || item.model || recordImage.model,
    mode: item.mode || recordImage.mode || record.mode,
    apiMode: item.apiMode || recordImage.apiMode || record.apiMode,
    resolution: record.resolution || item.resolution || recordImage.resolution,
    ratio: record.ratio || item.ratio || recordImage.ratio,
    tool: item.tool || recordImage.tool || record.tool || record.toolKey || record.tool_key,
    action: item.action || recordImage.action || record.action,
    outputFormat: item.outputFormat || recordImage.outputFormat || record.outputFormat || record.output_format,
    originalSrc: item.originalSrc || recordImage.originalSrc || record.originalSrc,
    sourceImages,
    layers: item.layers?.length ? item.layers : recordImage.layers || [],
    layerType: item.layerType || recordImage.layerType,
    layerLabel: item.layerLabel || recordImage.layerLabel,
    layerSplitRecord: item.layerSplitRecord || recordImage.layerSplitRecord,
    layerSplitFailedSlots: item.layerSplitFailedSlots || recordImage.layerSplitFailedSlots || [],
    layerSplitRequestedTypes: item.layerSplitRequestedTypes || recordImage.layerSplitRequestedTypes || [],
    layerSplitError: item.layerSplitError || recordImage.layerSplitError,
    editHistory: item.editHistory?.length ? item.editHistory : recordImage.editHistory || [],
    record,
  }
}

function getOutputPreviewImages() {
  return output.value.map((item) => normalizeOutputPreviewImage(item))
}

function getOutputKey(item, index) {
  return item.id || item.src || `output-${index}`
}

function parseOutputRatio(value) {
  const text = String(value || '').trim()
  if (!text || text === 'auto') return null
  const match = /(\d+(?:\.\d+)?)\s*(?::|\/|x|×)\s*(\d+(?:\.\d+)?)/i.exec(text)
  if (!match) return null

  const width = Number(match[1])
  const height = Number(match[2])
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null
  return { width, height }
}

function usesAutoOutputRatio(item = {}) {
  const ratioValues = [item.ratio, item.aspectRatio, item.size, item.resolution]
  if (ratioValues.some((value) => String(value || '').trim() === 'auto')) return true
  return !ratioValues.some((value) => parseOutputRatio(value))
}

function getOutputRatioParts(item = {}) {
  const width = Number(item.width || item.w || item.naturalWidth)
  const height = Number(item.height || item.h || item.naturalHeight)
  if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) return { width, height }

  return (
    parseOutputRatio(item.ratio) ||
    parseOutputRatio(item.aspectRatio) ||
    parseOutputRatio(item.size) ||
    parseOutputRatio(item.resolution) ||
    parseOutputRatio(outputAspectStyle.value?.['--output-ratio']) || { width: 1, height: 1 }
  )
}

function getOutputRatioNumber(item = {}) {
  const ratio = getOutputRatioParts(item)
  return ratio.width / ratio.height
}

function getOutputRatioCss(item = {}) {
  const ratio = getOutputRatioParts(item)
  return `${ratio.width} / ${ratio.height}`
}

function resetOutputInteractionState({ clearSelection = true } = {}) {
  stopCompareDrag()
  stopEditSelectionDrag()
  if (clearSelection && editingItemKey.value) clearEditSelectionByKey(editingItemKey.value)
  compareItemKey.value = ''
  editingItemKey.value = ''
  layerItemKey.value = ''
}

function setOutputViewMode(mode) {
  const nextMode = mode === 'overview' ? 'overview' : 'focus'
  if (outputViewMode.value === nextMode) return
  outputViewMode.value = nextMode
  resetOutputInteractionState()
}

function selectOutputEntry(index) {
  if (index === activeOutputIndex.value) return
  outputViewMode.value = 'focus'
  selectedOutputIndex.value = index
  resetOutputInteractionState()
}

function hasOriginalImage(item = {}) {
  return Boolean(item.originalSrc && item.originalSrc !== item.src)
}

function isCompareActive(item, index) {
  return compareItemKey.value === getOutputKey(item, index)
}

function getComparePosition(item, index) {
  return Number(comparePositions.value[getOutputKey(item, index)] || 50)
}

function setComparePosition(item, index, value) {
  const numericValue = Number(value)
  const nextValue = Math.min(100, Math.max(0, Number.isFinite(numericValue) ? numericValue : 50))
  comparePositions.value = {
    ...comparePositions.value,
    [getOutputKey(item, index)]: nextValue,
  }
}

function setComparePositionByKey(key, value) {
  const numericValue = Number(value)
  const nextValue = Math.min(100, Math.max(0, Number.isFinite(numericValue) ? numericValue : 50))
  comparePositions.value = {
    ...comparePositions.value,
    [key]: nextValue,
  }
}

function updateComparePositionFromPointer(event) {
  if (!compareDragState?.stage) return
  const rect = compareDragState.stage.getBoundingClientRect()
  if (!rect.width) return
  setComparePositionByKey(compareDragState.key, ((event.clientX - rect.left) / rect.width) * 100)
}

function stopCompareDrag() {
  if (!compareDragState) return
  window.removeEventListener('pointermove', updateComparePositionFromPointer)
  window.removeEventListener('pointerup', stopCompareDrag)
  window.removeEventListener('pointercancel', stopCompareDrag)
  compareDragState = null
}

function startCompareDrag(event, item, index) {
  const stage = event.currentTarget.closest('.output-image-stage')
  if (!stage) return
  event.preventDefault()
  event.stopPropagation()
  stopCompareDrag()
  compareDragState = {
    key: getOutputKey(item, index),
    stage,
  }
  updateComparePositionFromPointer(event)
  window.addEventListener('pointermove', updateComparePositionFromPointer)
  window.addEventListener('pointerup', stopCompareDrag)
  window.addEventListener('pointercancel', stopCompareDrag)
}

function handleCompareDividerKeydown(event, item, index) {
  const keyMap = {
    ArrowLeft: -2,
    ArrowDown: -2,
    ArrowRight: 2,
    ArrowUp: 2,
    Home: -100,
    End: 100,
  }
  const delta = keyMap[event.key]
  if (delta === undefined) return
  event.preventDefault()
  event.stopPropagation()
  const current = getComparePosition(item, index)
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? 100 : current + delta
  setComparePosition(item, index, next)
}

function toggleCompare(item, index) {
  if (!hasOriginalImage(item)) return
  const key = getOutputKey(item, index)
  compareItemKey.value = compareItemKey.value === key ? '' : key
  editingItemKey.value = ''
  layerItemKey.value = ''
  if (!comparePositions.value[key]) setComparePosition(item, index, 50)
}

function isEditing(item, index) {
  return editingItemKey.value === getOutputKey(item, index)
}

function getActiveFloatingPanelKey() {
  return editingItemKey.value || layerItemKey.value
}

function getFloatingPanelOutputItem() {
  const activeKey = getActiveFloatingPanelKey()
  const items = Array.from(document.querySelectorAll('.generated-output .output-item'))
  if (!activeKey) return items[0] || null
  return items.find((element) => element.dataset.outputKey === activeKey) || items[0] || null
}

function updateFloatingPanelPosition() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  const itemElement = getFloatingPanelOutputItem()
  const stageElement = itemElement?.querySelector('.output-image-stage')
  const actionsElement = itemElement?.querySelector('.output-actions')
  if (!stageElement) return

  const rect = stageElement.getBoundingClientRect()
  const actionsRect = actionsElement?.getBoundingClientRect()
  const panelElement = document.querySelector('.output-edit-popover, .output-layer-panel')
  const panelRect = panelElement?.getBoundingClientRect()
  const floatingActionsRect = Array.from(document.querySelectorAll('.generation-actions-floating'))
    .map((element) => {
      const style = window.getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      if (style.display === 'none' || style.visibility === 'hidden' || rect.width <= 0 || rect.height <= 0) return null
      return rect
    })
    .filter(Boolean)
    .sort((a, b) => a.top - b.top)[0]
  const gap = 12
  const margin = 16
  const panelWidth = panelRect?.width || Math.min(250, window.innerWidth - margin * 2)
  const panelHeight = panelRect?.height || 340
  const bottomReserved = floatingActionsRect ? Math.max(0, window.innerHeight - floatingActionsRect.top + gap) : margin
  const availableBottom = window.innerHeight - Math.max(margin, bottomReserved)
  const maxLeft = Math.max(margin, window.innerWidth - panelWidth - margin)
  const maxTop = Math.max(margin, availableBottom - panelHeight)
  const clampPosition = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max))
  const alignWithStageTop = () => clampPosition(rect.top, margin, maxTop)

  let left = rect.right + gap
  let top = alignWithStageTop()
  const fitsRight = left + panelWidth <= window.innerWidth - margin

  if (!fitsRight) {
    left = clampPosition(rect.right - panelWidth, margin, maxLeft)
    top = clampPosition(Math.max(rect.bottom, actionsRect?.bottom || 0) + gap, margin, maxTop)
  }

  floatingPanelPosition.value = { left, top }
}

function scheduleFloatingPanelPosition() {
  if (floatingPanelFrame) window.cancelAnimationFrame(floatingPanelFrame)
  floatingPanelFrame = window.requestAnimationFrame(() => {
    floatingPanelFrame = 0
    updateFloatingPanelPosition()
  })
}

function refreshFloatingPanelPosition() {
  if (!editingItemKey.value && !layerItemKey.value) return
  scheduleFloatingPanelPosition()
}

function toggleEdit(item, index) {
  const key = getOutputKey(item, index)
  if (editingItemKey.value === key) {
    editingItemKey.value = ''
    clearEditSelectionByKey(key)
  } else {
    editingItemKey.value = key
    nextTick(() => {
      updateFloatingPanelPosition()
      scheduleFloatingPanelPosition()
    })
  }
  compareItemKey.value = ''
  layerItemKey.value = ''
}

function getEditPrompt(item, index) {
  return editPrompts.value[getOutputKey(item, index)] || ''
}

function setEditPrompt(item, index, value) {
  editPrompts.value = {
    ...editPrompts.value,
    [getOutputKey(item, index)]: value,
  }
}

function getEditSelection(item, index) {
  return editSelections.value[getOutputKey(item, index)] || null
}

function shouldShowEditGuide(item, index) {
  const key = getOutputKey(item, index)
  return isEditing(item, index) && !getEditSelection(item, index) && editDragItemKey.value !== key
}

function setEditSelectionByKey(key, selection) {
  editSelections.value = {
    ...editSelections.value,
    [key]: selection,
  }
}

function clearEditSelectionByKey(key) {
  setEditSelectionByKey(key, null)
}

function clearEditSelection(item, index) {
  clearEditSelectionByKey(getOutputKey(item, index))
}

function closeOutputFloatingPanel() {
  stopEditSelectionDrag()
  if (editingItemKey.value) clearEditSelectionByKey(editingItemKey.value)
  editingItemKey.value = ''
  layerItemKey.value = ''
}

function clampUnit(value) {
  return Math.min(1, Math.max(0, Number(value) || 0))
}

function getStagePointerPosition(event, stage) {
  const rect = stage.getBoundingClientRect()
  return {
    x: clampUnit((event.clientX - rect.left) / rect.width),
    y: clampUnit((event.clientY - rect.top) / rect.height),
  }
}

function buildEditSelection(start, end) {
  if (!start || !end) return null

  const x1 = clampUnit(start.x)
  const y1 = clampUnit(start.y)
  const x2 = clampUnit(end.x)
  const y2 = clampUnit(end.y)
  const rawWidth = Math.abs(x2 - x1)
  const rawHeight = Math.abs(y2 - y1)
  if (Math.max(rawWidth, rawHeight) < minEditSelectionSize) return null

  const width = Math.min(1, Math.max(rawWidth, minEditSelectionSize))
  const height = Math.min(1, Math.max(rawHeight, minEditSelectionSize))
  const leftEdge = Math.min(x1, x2)
  const topEdge = Math.min(y1, y2)

  return {
    type: 'rect',
    x: Math.min(1 - width, leftEdge),
    y: Math.min(1 - height, topEdge),
    width,
    height,
  }
}

function stopEditSelectionDrag() {
  if (!editDragState) return
  window.removeEventListener('pointermove', updateEditSelectionFromPointer)
  window.removeEventListener('pointerup', finishEditSelectionDrag)
  window.removeEventListener('pointercancel', stopEditSelectionDrag)
  try {
    editDragState.stage?.releasePointerCapture?.(editDragState.pointerId)
  } catch {
    // 浏览器可能已自动释放 pointer capture。
  }
  editDragState = null
  editDragItemKey.value = ''
}

function updateEditSelectionFromPointer(event) {
  if (!editDragState?.stage) return
  event.preventDefault()
  const end = getStagePointerPosition(event, editDragState.stage)
  setEditSelectionByKey(editDragState.key, buildEditSelection(editDragState.start, end))
}

function finishEditSelectionDrag(event) {
  updateEditSelectionFromPointer(event)
  stopEditSelectionDrag()
}

function startEditSelectionDrag(event, item, index) {
  if (!isEditing(item, index)) return
  if (event.button === 2) {
    cancelEditSelection(event, item, index)
    return
  }
  if (event.button !== 0) return

  const stage = event.currentTarget
  event.preventDefault()
  event.stopPropagation()
  stopEditSelectionDrag()

  const key = getOutputKey(item, index)
  editDragState = {
    key,
    stage,
    start: getStagePointerPosition(event, stage),
    pointerId: event.pointerId,
  }
  editDragItemKey.value = key
  clearEditSelectionByKey(key)
  stage.setPointerCapture?.(event.pointerId)
  window.addEventListener('pointermove', updateEditSelectionFromPointer)
  window.addEventListener('pointerup', finishEditSelectionDrag)
  window.addEventListener('pointercancel', stopEditSelectionDrag)
}

function cancelEditSelection(event, item, index) {
  if (!isEditing(item, index)) return
  event.preventDefault()
  event.stopPropagation()
  stopEditSelectionDrag()
  clearEditSelection(item, index)
}

function openOutputPreview(index) {
  openImagePreview(getOutputPreviewImages(), index, '生成图片')
}

function handleOutputStageClick(event, item, index) {
  if (isEditing(item, index) || event.defaultPrevented) return
  if (isOverviewMode.value) {
    selectOutputEntry(index)
    return
  }
  openOutputPreview(index)
}

function handleImageStageKeyboard(event, item, index) {
  if (!isEditing(item, index)) {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    if (isOverviewMode.value) {
      selectOutputEntry(index)
      return
    }
    openOutputPreview(index)
    return
  }

  if (event.key === 'Escape') {
    cancelEditSelection(event, item, index)
    return
  }

  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  setEditSelectionByKey(getOutputKey(item, index), {
    type: 'rect',
    x: 0.3,
    y: 0.3,
    width: 0.4,
    height: 0.4,
  })
}

function handleEditShortcutKeydown(event) {
  if (event.key !== 'Escape') return
  if (!editingItemKey.value && !layerItemKey.value) return
  event.preventDefault()
  event.stopPropagation()
  if (editingItemKey.value && (editSelections.value[editingItemKey.value] || editDragState)) {
    stopEditSelectionDrag()
    clearEditSelectionByKey(editingItemKey.value)
    return
  }
  closeOutputFloatingPanel()
}

function createRegionMask(selection) {
  if (!selection || typeof document === 'undefined') return ''

  const size = 768
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) return ''

  context.fillStyle = '#000000'
  context.fillRect(0, 0, size, size)
  context.globalCompositeOperation = 'destination-out'
  context.fillRect(selection.x * size, selection.y * size, selection.width * size, selection.height * size)
  return canvas.toDataURL('image/png')
}

async function submitRegionEdit(item, index) {
  const key = getOutputKey(item, index)
  const selection = getEditSelection(item, index)
  const mask = createRegionMask(selection)
  const record = await submitOutputRegionEdit(item, index, {
    prompt: getEditPrompt(item, index),
    mask,
    region: selection ? { ...selection } : null,
  })

  if (record) {
    editingItemKey.value = ''
    clearEditSelectionByKey(key)
  }
}

function isLayerPanelActive(item, index) {
  return layerItemKey.value === getOutputKey(item, index)
}

function toggleLayerPanel(item, index) {
  const key = getOutputKey(item, index)
  editingItemKey.value = ''
  compareItemKey.value = ''
  if (layerItemKey.value === key) {
    layerItemKey.value = ''
  } else {
    layerItemKey.value = key
    nextTick(() => {
      updateFloatingPanelPosition()
      scheduleFloatingPanelPosition()
    })
  }
}

async function startLayerSplit(item, index) {
  const key = getOutputKey(item, index)
  const record = await submitOutputLayerSplit(item, index)
  if (record) layerItemKey.value = key
}

async function retryLayerSplit(item, index, layer) {
  const key = getOutputKey(item, index)
  const record = await submitOutputLayerSplit(item, index, { layerType: layer.type })
  if (record) layerItemKey.value = key
}

function getLayerSplitFailedSlots(item = {}) {
  return Array.isArray(item.layerSplitFailedSlots) ? item.layerSplitFailedSlots : []
}

function getLayerSplitRequestedCount(item = {}) {
  const requestedTypes = Array.isArray(item.layerSplitRequestedTypes) ? item.layerSplitRequestedTypes : []
  const recordRequestedCount = Number(item.layerSplitRecord?.requestedCount || 0)
  return Math.max(
    requestedTypes.length,
    recordRequestedCount,
    (item.layers || []).length + getLayerSplitFailedSlots(item).length,
  )
}

function getLayerPanelStatus(item = {}) {
  const layerCount = item.layers?.length || 0
  const failedCount = getLayerSplitFailedSlots(item).length
  if (layerCount || failedCount) {
    const requestedCount = getLayerSplitRequestedCount(item) || layerCount + failedCount
    return failedCount ? `${layerCount}/${requestedCount} 个图层，${failedCount} 个失败` : `${layerCount} 个图层`
  }
  return '等待分层结果'
}

function getLayerSplitNotice(item = {}) {
  if (item.layerSplitRecord?.partialFailureMessage) return item.layerSplitRecord.partialFailureMessage
  if (item.layerSplitError) return item.layerSplitError
  return ''
}

function toggleLayerVisibility(layer) {
  layer.visible = layer.visible === false
}

function downloadLayer(layer) {
  downloadImage(
    { src: layer.src, title: layer.label || layer.title, outputFormat: layer.outputFormat || 'png' },
    layer.label,
  )
}

function downloadAllLayers(item) {
  const layers = item.layers || []
  layers.forEach((layer, index) => {
    window.setTimeout(() => downloadLayer(layer), index * 120)
  })
}

function useOutputAsTool(toolKey, item, index) {
  resetOutputInteractionState({ clearSelection: false })
  emit('use-as-tool', { toolKey, image: normalizeOutputPreviewImage(item), index })
}

function isOutputActionBusy(item, index, type = '') {
  if (!outputActionLoading.value) return false
  if (outputActionTargetId.value !== getOutputKey(item, index)) return false
  return !type || outputActionType.value === type
}

function recentTaskTagLabel(record) {
  const statusLabel = galleryRecordStatusLabel(record)
  if (canPreviewGalleryRecord(record) && (!statusLabel || statusLabel === '已完成')) {
    return galleryRecordMode(record)
  }
  return statusLabel || galleryRecordMode(record) || '已记录'
}

watch(outputSignature, (nextSignature, previousSignature) => {
  if (!nextSignature) {
    selectedOutputIndex.value = 0
    outputViewMode.value = 'focus'
    resetOutputInteractionState()
    return
  }

  if (selectedOutputIndex.value >= output.value.length) {
    selectedOutputIndex.value = Math.max(0, output.value.length - 1)
  }

  if (output.value.length > 1 && !previousSignature) {
    outputViewMode.value = 'overview'
  }

  if (output.value.length <= 1) {
    outputViewMode.value = 'focus'
  }

  if (!previousSignature || previousSignature === nextSignature) return

  const previousKeys = previousSignature.split('|').filter(Boolean)
  const nextKeys = nextSignature.split('|').filter(Boolean)
  const keepsAnyPreviousOutput = previousKeys.some((key) => nextKeys.includes(key))
  if (!keepsAnyPreviousOutput) {
    selectedOutputIndex.value = 0
    outputViewMode.value = output.value.length > 1 ? 'overview' : 'focus'
    resetOutputInteractionState()
  }
})

onMounted(() => {
  lightweightLoadingMedia = window.matchMedia('(max-width: 820px), (prefers-reduced-motion: reduce)')
  syncLightweightLoadingPreference(lightweightLoadingMedia)
  lightweightLoadingMedia.addEventListener('change', syncLightweightLoadingPreference)
  window.addEventListener('keydown', handleEditShortcutKeydown, true)
  window.addEventListener('resize', refreshFloatingPanelPosition)
  window.addEventListener('scroll', refreshFloatingPanelPosition, true)
})

onBeforeUnmount(() => {
  stopCompareDrag()
  stopEditSelectionDrag()
  window.removeEventListener('keydown', handleEditShortcutKeydown, true)
  window.removeEventListener('resize', refreshFloatingPanelPosition)
  window.removeEventListener('scroll', refreshFloatingPanelPosition, true)
  lightweightLoadingMedia?.removeEventListener('change', syncLightweightLoadingPreference)
  if (floatingPanelFrame) window.cancelAnimationFrame(floatingPanelFrame)
})
</script>

<template>
  <section class="card output-panel" :class="{ 'output-panel--compact': compact }">
    <div class="output-panel-head">
      <div class="output-title">
        <Layers3 aria-hidden="true" />
        <div>
          <h2>{{ batchMode ? '生成结果' : 'AI 生成结果' }}</h2>
          <p>{{ batchMode ? '批量生成的图片会显示在这里' : `${activeMode.label} · ${resolutionLabel}` }}</p>
        </div>
      </div>
      <div class="output-meta-row">
        <span>{{ selectedModel.name }}</span>
        <span>{{ activeMode.label }}</span>
        <span>{{ normalizedImageCount }} 张</span>
        <div v-if="hasMultipleOutputs" class="output-view-toggle" role="group" aria-label="结果视图">
          <button
            type="button"
            :class="{ active: isOverviewMode }"
            :aria-pressed="isOverviewMode"
            @click="setOutputViewMode('overview')"
          >
            <Layers aria-hidden="true" />
            总览
          </button>
          <button
            type="button"
            :class="{ active: !isOverviewMode }"
            :aria-pressed="!isOverviewMode"
            @click="setOutputViewMode('focus')"
          >
            <Eye aria-hidden="true" />
            精看
          </button>
        </div>
      </div>
    </div>

    <div
      class="output-workbench"
      :class="{
        'output-workbench--empty': !outputLoading && !output.length,
        'output-workbench--ready': !outputLoading && output.length,
        'output-workbench--loading': outputLoading,
      }"
    >
      <Transition name="fade-fast" mode="out-in">
        <div
          v-if="outputLoading"
          key="loading"
          class="model-loading-state"
          :class="`model-loading-state--${loadingVariant}`"
          role="status"
          aria-live="polite"
        >
          <template v-if="loadingVariant === 'gpt-image-2' && !prefersLightweightLoading">
            <div class="gpt-loading-card" aria-hidden="true">
              <div class="gpt-loading-dot-field">
                <svg viewBox="0 0 280 280" focusable="false" aria-hidden="true">
                  <circle
                    v-for="dot in gptLoadingDots"
                    :key="`rest-${dot.id}`"
                    class="gpt-loading-dot"
                    :cx="dot.cx"
                    :cy="dot.cy"
                    :r="dot.restRadius"
                    :opacity="dot.restOpacity"
                  />
                </svg>
                <svg class="gpt-loading-dot-reveal" viewBox="0 0 280 280" focusable="false" aria-hidden="true">
                  <circle
                    v-for="dot in gptLoadingDots"
                    :key="`lit-${dot.id}`"
                    class="gpt-loading-lit-dot"
                    :cx="dot.cx"
                    :cy="dot.cy"
                    :r="dot.litRadius"
                    :opacity="dot.opacity"
                  />
                </svg>
              </div>
            </div>
          </template>
          <template
            v-else-if="
              (loadingVariant === 'nano-banana-2' || loadingVariant === 'nano-banana') && !prefersLightweightLoading
            "
          >
            <div class="banana-thinking-loading" aria-hidden="true">
              <div class="banana-thinking-canvas"></div>
            </div>
          </template>
          <template v-else>
            <div class="loading-output-grid output-canvas" :class="outputGridClass" :style="outputAspectStyle">
              <div
                v-for="index in loadingTileCount"
                :key="index"
                class="loading-image-tile"
                :style="{ '--tile-delay': `${(index - 1) * 160}ms` }"
                aria-hidden="true"
              >
                <div class="loading-image-surface">
                  <span class="loading-image-glow"></span>
                  <span class="loading-image-scan"></span>
                </div>
              </div>
            </div>
          </template>

          <div class="loading-status">
            <p class="loading-progress-tip">{{ generationSubmittedTip }}</p>
          </div>
        </div>
        <div
          v-else-if="output.length"
          key="output"
          class="generated-output output-canvas"
          :class="outputPresentationClass"
          :style="selectedOutputAspectStyle"
        >
          <figure
            v-for="{ item, index, key } in displayedOutputEntries"
            :key="key"
            :data-output-key="key"
            class="output-item"
            :class="{
              'output-item--editing': isEditing(item, index),
              'output-item--layering': isLayerPanelActive(item, index),
              'output-item--compare': isCompareActive(item, index),
              'output-item--busy': isOutputActionBusy(item, index),
            }"
          >
            <div
              class="output-image-stage"
              :class="{
                'output-image-stage--selecting': isEditing(item, index),
                'output-image-stage--dragging': editDragItemKey === getOutputKey(item, index),
                'output-image-stage--auto': usesAutoOutputRatio(item),
              }"
              role="button"
              tabindex="0"
              :aria-label="isEditing(item, index) ? `拖动选择 ${item.title} 的修改区域` : `预览 ${item.title}`"
              @click="handleOutputStageClick($event, item, index)"
              @pointerdown="startEditSelectionDrag($event, item, index)"
              @contextmenu="cancelEditSelection($event, item, index)"
              @keydown="handleImageStageKeyboard($event, item, index)"
            >
              <template v-if="isCompareActive(item, index) && hasOriginalImage(item)">
                <img
                  class="output-compare-image output-compare-before"
                  :src="item.originalSrc"
                  :alt="`${item.title} 原图`"
                />
                <img
                  class="output-compare-image output-compare-after"
                  :src="item.src"
                  :alt="`${item.title} 结果`"
                  :style="{ clipPath: `inset(0 ${100 - getComparePosition(item, index)}% 0 0)` }"
                />
                <span
                  class="output-compare-divider"
                  :style="{ left: `${getComparePosition(item, index)}%` }"
                  role="slider"
                  tabindex="0"
                  :aria-label="`拖动 ${item.title} 原图对比分割线`"
                  aria-valuemin="0"
                  aria-valuemax="100"
                  :aria-valuenow="getComparePosition(item, index)"
                  :aria-valuetext="`${getComparePosition(item, index)}%`"
                  @click.stop
                  @pointerdown="startCompareDrag($event, item, index)"
                  @keydown="handleCompareDividerKeydown($event, item, index)"
                ></span>
                <span class="output-compare-badge output-compare-badge-before">原图</span>
                <span class="output-compare-badge output-compare-badge-after">结果</span>
              </template>
              <img v-else :src="getLargeImageUrl(item.src)" :alt="item.title" draggable="false" />

              <span v-if="shouldShowEditGuide(item, index)" class="output-edit-guide" aria-hidden="true">
                <span class="output-edit-guide-box"></span>
                <span class="output-edit-guide-cursor"></span>
              </span>
              <span
                v-if="isEditing(item, index) && getEditSelection(item, index)"
                class="output-edit-marker"
                :style="{
                  left: `${getEditSelection(item, index).x * 100}%`,
                  top: `${getEditSelection(item, index).y * 100}%`,
                  width: `${getEditSelection(item, index).width * 100}%`,
                  height: `${getEditSelection(item, index).height * 100}%`,
                }"
                aria-hidden="true"
              ></span>
              <span v-if="isOutputActionBusy(item, index)" class="output-action-busy" role="status">
                <Loader2 class="spinner" aria-hidden="true" />
                {{ outputActionType === 'layer-split' ? '正在分层' : '正在改图' }}
              </span>
            </div>

            <div v-if="item.editHistory?.length" class="output-edit-history" aria-label="改图前后对比">
              <img :src="item.editHistory[item.editHistory.length - 1].beforeSrc" alt="修改前" />
              <span>修改前</span>
              <img :src="item.src" alt="修改后" />
              <span>当前</span>
            </div>

            <OutputActionBar
              :item="item"
              :index="index"
              :compact="compact"
              :has-original-image="hasOriginalImage(item)"
              :is-compare-active="isCompareActive(item, index)"
              :is-editing="isEditing(item, index)"
              :is-busy="isOutputActionBusy(item, index)"
              @download="downloadImage($event, $event.title || '生成图片')"
              @toggle-layer-panel="toggleLayerPanel"
              @toggle-compare="toggleCompare"
              @toggle-edit="toggleEdit"
              @use-as-tool="useOutputAsTool"
            />

            <Teleport to="body">
              <Transition name="output-panel-slide" mode="out-in">
                <form
                  v-if="isEditing(item, index)"
                  key="edit"
                  class="output-edit-popover"
                  :style="floatingPanelStyle"
                  @submit.prevent="submitRegionEdit(item, index)"
                >
                  <div>
                    <strong>局部改图</strong>
                    <span v-if="!getEditSelection(item, index)">拖动图片框选修改区域</span>
                    <span v-else>已框选修改区域</span>
                    <span class="output-floating-panel-actions">
                      <button
                        v-if="getEditSelection(item, index)"
                        class="text-button"
                        type="button"
                        @click="clearEditSelection(item, index)"
                      >
                        取消选区
                      </button>
                      <button
                        class="icon-button output-floating-close"
                        type="button"
                        :aria-label="`关闭 ${item.title} 局部改图面板`"
                        @click="closeOutputFloatingPanel"
                      >
                        <X aria-hidden="true" />
                      </button>
                    </span>
                  </div>
                  <textarea
                    rows="2"
                    :value="getEditPrompt(item, index)"
                    placeholder="例如：把这里换成金属质感按钮，保持周围光影"
                    @input="setEditPrompt(item, index, $event.target.value)"
                  ></textarea>
                  <button
                    class="btn btn-primary"
                    type="submit"
                    :disabled="isOutputActionBusy(item, index, 'region-edit')"
                  >
                    <WandSparkles v-if="!isOutputActionBusy(item, index, 'region-edit')" aria-hidden="true" />
                    <Loader2 v-else class="spinner" aria-hidden="true" />
                    修改
                  </button>
                </form>

                <div
                  v-else-if="isLayerPanelActive(item, index)"
                  key="layer"
                  class="output-layer-panel"
                  :style="floatingPanelStyle"
                >
                  <div class="output-layer-head">
                    <div>
                      <strong>透明 PNG 图层</strong>
                      <span>{{ getLayerPanelStatus(item) }}</span>
                    </div>
                    <div class="output-layer-head-actions">
                      <button
                        v-if="item.layers?.length"
                        class="icon-button"
                        type="button"
                        aria-label="下载全部图层"
                        @click="downloadAllLayers(item)"
                      >
                        <Download aria-hidden="true" />
                      </button>
                      <button
                        class="icon-button output-floating-close"
                        type="button"
                        :aria-label="`关闭 ${item.title} 图层面板`"
                        @click="closeOutputFloatingPanel"
                      >
                        <X aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  <p v-if="getLayerSplitNotice(item)" class="output-layer-notice">
                    {{ getLayerSplitNotice(item) }}
                  </p>
                  <div v-if="!item.layers?.length && !getLayerSplitFailedSlots(item).length" class="output-layer-empty">
                    <span class="output-layer-guide" aria-hidden="true">
                      <span class="output-layer-guide-card output-layer-guide-card-back"></span>
                      <span class="output-layer-guide-card output-layer-guide-card-mid"></span>
                      <span class="output-layer-guide-card output-layer-guide-card-front"></span>
                    </span>
                    <span>自动识别画面元素并拆成透明 PNG 图层，图层数量以实际结果为准。</span>
                    <button
                      class="btn btn-primary"
                      type="button"
                      :disabled="isOutputActionBusy(item, index, 'layer-split')"
                      @click="startLayerSplit(item, index)"
                    >
                      <ScissorsLineDashed v-if="!isOutputActionBusy(item, index, 'layer-split')" aria-hidden="true" />
                      <Loader2 v-else class="spinner" aria-hidden="true" />
                      {{ isOutputActionBusy(item, index, 'layer-split') ? '分层中' : '开始分层' }}
                    </button>
                  </div>
                  <div
                    v-for="layer in item.layers || []"
                    :key="layer.id || layer.src"
                    class="output-layer-row"
                    :class="{ muted: layer.visible === false }"
                  >
                    <img :src="layer.src" :alt="layer.label" />
                    <span>{{ layer.label }}</span>
                    <button
                      class="icon-button"
                      type="button"
                      :aria-label="`重新生成${layer.label}`"
                      :disabled="isOutputActionBusy(item, index, 'layer-split')"
                      @click.stop="retryLayerSplit(item, index, layer)"
                    >
                      <RefreshCw
                        :class="{ spinner: isOutputActionBusy(item, index, 'layer-split') }"
                        aria-hidden="true"
                      />
                    </button>
                    <button
                      class="icon-button"
                      type="button"
                      :aria-label="`${layer.visible === false ? '显示' : '隐藏'}${layer.label}`"
                      @click="toggleLayerVisibility(layer)"
                    >
                      <EyeOff v-if="layer.visible === false" aria-hidden="true" />
                      <Eye v-else aria-hidden="true" />
                    </button>
                    <button
                      class="icon-button"
                      type="button"
                      :aria-label="`下载${layer.label}`"
                      @click.stop="downloadLayer(layer)"
                    >
                      <Download aria-hidden="true" />
                    </button>
                  </div>
                  <div
                    v-for="slot in getLayerSplitFailedSlots(item)"
                    :key="slot.id || slot.type"
                    class="output-layer-row output-layer-row--failed"
                  >
                    <span class="output-layer-failed-thumb" aria-hidden="true">
                      <RefreshCw />
                    </span>
                    <span>{{ slot.label }}图层生成失败</span>
                    <button
                      class="icon-button"
                      type="button"
                      :aria-label="`重新生成${slot.label}图层`"
                      :disabled="isOutputActionBusy(item, index, 'layer-split')"
                      @click.stop="retryLayerSplit(item, index, slot)"
                    >
                      <RefreshCw
                        :class="{ spinner: isOutputActionBusy(item, index, 'layer-split') }"
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                </div>
              </Transition>
            </Teleport>
          </figure>

          <div v-if="hasMultipleOutputs && !isOverviewMode" class="output-thumbnails" aria-label="生成结果缩略图">
            <button
              v-for="entry in outputEntries"
              :key="entry.key"
              class="output-thumbnail-button"
              type="button"
              :class="{ active: entry.index === activeOutputIndex }"
              :aria-current="entry.index === activeOutputIndex ? 'true' : null"
              :aria-label="`查看第 ${entry.index + 1} 张生成结果`"
              @click="selectOutputEntry(entry.index)"
            >
              <img :src="getThumbnailUrl(entry.item.src)" :alt="entry.item.title" />
              <span>{{ entry.index + 1 }} / {{ outputEntries.length }}</span>
            </button>
          </div>
        </div>
        <div v-else key="empty" class="empty-output output-canvas" :class="outputGridClass" :style="outputAspectStyle">
          <div v-for="slot in outputPlaceholders" :key="slot" class="empty-output-slot">
            <ImagePlus v-if="slot === 1" aria-hidden="true" />
            <strong>{{ batchMode ? '等待批量结果' : '等待生成结果' }}</strong>
            <span>{{
              batchMode ? '选择张数后提交，结果会在这里按批次展示。' : '完成提示词、素材和参数后，点击生成按钮。'
            }}</span>
          </div>
        </div>
      </Transition>
    </div>

    <div v-if="recentTasks.length" class="recent-task-strip" aria-label="最近任务">
      <div class="recent-task-head">
        <div>
          <strong>最近任务</strong>
        </div>
        <div v-if="hasMoreRecentTasks" class="recent-task-controls">
          <button
            class="btn btn-soft recent-task-more"
            type="button"
            aria-label="查看更多最近任务"
            @click="openGallery"
          >
            查看更多
          </button>
        </div>
      </div>
      <div class="recent-task-list">
        <article v-for="record in visibleRecentTasks" :key="record.id" class="recent-task-card">
          <component
            :is="canPreviewGalleryRecord(record) ? 'button' : 'div'"
            class="recent-task-cover"
            :class="{ 'recent-task-cover--status': !canPreviewGalleryRecord(record) }"
            v-bind="
              canPreviewGalleryRecord(record)
                ? {
                    type: 'button',
                    'aria-label': `预览最近任务 ${
                      canReuseGalleryRecord(record) ? record.prompt || '' : galleryRecordMode(record)
                    }`,
                  }
                : {
                    role: 'img',
                    'aria-label': galleryRecordStatusLabel(record) || galleryRecordMode(record) || '最近任务',
                  }
            "
            @click="canPreviewGalleryRecord(record) ? openGalleryImage(record) : null"
          >
            <img
              v-if="canPreviewGalleryRecord(record)"
              :src="getThumbnailUrl(galleryRecordCover(record))"
              :alt="canReuseGalleryRecord(record) ? record.prompt || '最近任务图片' : galleryRecordMode(record)"
            />
            <span v-else>
              <Loader2 v-if="isGalleryRecordPending(record)" class="spinner" aria-hidden="true" />
              <ImagePlus v-else aria-hidden="true" />
            </span>
            <em :class="{ pending: isGalleryRecordPending(record) }">{{ recentTaskTagLabel(record) }}</em>
          </component>
          <div class="recent-task-actions" aria-label="最近任务操作">
            <button
              v-if="canRetryGalleryRecord(record)"
              class="icon-button"
              type="button"
              title="重新生成"
              aria-label="重试最近任务"
              @click="retryGalleryRecord(record)"
            >
              <RefreshCw aria-hidden="true" />
            </button>
            <button
              v-if="canReuseGalleryRecord(record)"
              class="icon-button"
              type="button"
              title="复用任务"
              aria-label="复用最近任务"
              @click="useGalleryRecord(record)"
            >
              <Save aria-hidden="true" />
            </button>
            <button
              v-if="canPreviewGalleryRecord(record)"
              class="icon-button"
              type="button"
              title="下载图片"
              aria-label="下载最近任务图片"
              @click="downloadGalleryRecord(record)"
            >
              <Download aria-hidden="true" />
            </button>
            <button
              v-if="canReuseGalleryRecord(record)"
              class="icon-button"
              type="button"
              title="复制提示词"
              aria-label="复制最近任务提示词"
              @click="copyGalleryPrompt(record)"
            >
              <Copy aria-hidden="true" />
            </button>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>
