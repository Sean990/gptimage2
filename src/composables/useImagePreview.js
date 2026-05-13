import { computed, ref } from 'vue'

export function useImagePreview() {
  const imagePreview = ref(null)

  const previewImages = computed(() => imagePreview.value?.images || [])
  const currentPreviewImage = computed(() => previewImages.value[imagePreview.value?.index || 0] || null)
  const previewCount = computed(() => previewImages.value.length)
  const previewPosition = computed(() => {
    if (!previewCount.value) return ''
    return `${(imagePreview.value?.index || 0) + 1} / ${previewCount.value}`
  })

  function normalizePreviewImage(image, index = 0, fallbackTitle = '图片预览') {
    const src = image?.src || image?.url || image
    if (!src) return null
    return {
      src,
      title: image?.title || image?.name || `${fallbackTitle} ${index + 1}`,
      meta: image?.meta || [image?.model, image?.resolution, image?.ratio].filter(Boolean).join(' · '),
      prompt: image?.prompt || '',
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
