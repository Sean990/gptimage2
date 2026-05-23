import { computed, ref } from 'vue'
import { formatGenerationModelLabel } from './useModelPicker'

export function useImagePreview() {
  const imagePreview = ref(null)

  const previewImages = computed(() => imagePreview.value?.images || [])
  const currentPreviewImage = computed(() => previewImages.value[imagePreview.value?.index || 0] || null)
  const previewCount = computed(() => previewImages.value.length)
  const previewPosition = computed(() => {
    if (!previewCount.value) return ''
    return `${(imagePreview.value?.index || 0) + 1} / ${previewCount.value}`
  })

  function normalizePreviewSourceImages(image = {}) {
    const record = image?.record || {}
    const rawSourceImages =
      image?.sourceImages ||
      image?.source_images ||
      image?.references ||
      record.sourceImages ||
      record.source_images ||
      record.references ||
      []

    return (Array.isArray(rawSourceImages) ? rawSourceImages : [rawSourceImages])
      .map((item) => (typeof item === 'string' ? item : item?.src || item?.url || item?.image_url || ''))
      .filter(Boolean)
  }

  function normalizePreviewImage(image, index = 0, fallbackTitle = '图片预览') {
    const src = image?.src || image?.url || image
    if (!src) return null
    const sourceImages = normalizePreviewSourceImages(image)
    const record = image?.record || null
    const model = image?.model || record?.model || ''
    const metaParts = [image?.resolution || record?.resolution, image?.ratio || record?.ratio].filter(Boolean)
    return {
      src,
      title: image?.title || image?.name || `${fallbackTitle} ${index + 1}`,
      meta: image?.meta || metaParts.join(' · '),
      model,
      modelLabel: formatGenerationModelLabel(model),
      prompt: image?.prompt || '',
      outputFormat: image?.outputFormat || image?.output_format || record?.outputFormat || record?.output_format || '',
      mode: image?.mode || record?.mode || '',
      apiMode: image?.apiMode || image?.api_mode || record?.apiMode || record?.api_mode || '',
      originalSrc:
        image?.originalSrc ||
        image?.original_src ||
        record?.originalSrc ||
        record?.original_src ||
        sourceImages[0] ||
        '',
      sourceImages,
      tool:
        image?.tool || image?.toolKey || image?.tool_key || record?.tool || record?.toolKey || record?.tool_key || '',
      action: image?.action || record?.action || '',
      record,
    }
  }

  function openImagePreview(imageOrImages, startIndex = 0, fallbackTitle = '图片预览') {
    const rawImages = Array.isArray(imageOrImages) ? imageOrImages : [imageOrImages]
    const images = rawImages.map((item, index) => normalizePreviewImage(item, index, fallbackTitle)).filter(Boolean)
    if (!images.length) return
    const safeIndex = Math.min(Math.max(Number(startIndex) || 0, 0), images.length - 1)
    imagePreview.value = {
      images,
      index: safeIndex,
    }
  }

  function closeImagePreview() {
    imagePreview.value = null
  }

  function setPreviewIndex(index) {
    if (!imagePreview.value || !previewCount.value) return
    imagePreview.value = {
      ...imagePreview.value,
      index: (index + previewCount.value) % previewCount.value,
    }
  }

  function showPreviousPreviewImage() {
    setPreviewIndex((imagePreview.value?.index || 0) - 1)
  }

  function showNextPreviewImage() {
    setPreviewIndex((imagePreview.value?.index || 0) + 1)
  }

  function openPreviewSource() {
    if (!currentPreviewImage.value?.src) return
    window.open(currentPreviewImage.value.src, '_blank', 'noreferrer')
  }

  return {
    closeImagePreview,
    currentPreviewImage,
    imagePreview,
    normalizePreviewImage,
    openImagePreview,
    openPreviewSource,
    previewCount,
    previewImages,
    previewPosition,
    setPreviewIndex,
    showNextPreviewImage,
    showPreviousPreviewImage,
  }
}
