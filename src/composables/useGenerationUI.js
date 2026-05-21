import { computed } from 'vue'

export function useGenerationUI({
  batchMode,
  galleryOpen,
  imagePreview,
  loading,
  maskCount,
  mode,
  normalizedImageCount,
  output,
  aspectRatio,
  closeGallery,
  closeImagePreview,
  showNextPreviewImage,
  showPreviousPreviewImage,
}) {
  const heroTitle = computed(() => (batchMode.value ? '批量图片生成' : 'ImgsGen 图片生成'))

  const heroDescription = computed(() =>
    batchMode.value
      ? '一次生成多张图片，快速比较风格方向；发布前请统一复核内容和授权。'
      : '输入提示词或上传参考图，生成可下载、可复用，并带有 AI 属性提示的视觉内容。',
  )

  const loadingTileCount = computed(() => normalizedImageCount.value)

  const activeOutputCount = computed(() => {
    if (loading.value) return normalizedImageCount.value
    return output.value.length || normalizedImageCount.value
  })

  const outputGridClass = computed(() => {
    const count = activeOutputCount.value
    const classes = []
    if (count <= 1) classes.push('output-grid--single')
    else if (count === 3) classes.push('output-grid--three')
    else classes.push('output-grid--many')

    if (isLandscapeRatio(aspectRatio.value)) classes.push('output-grid--landscape')
    return classes.join(' ')
  })

  const outputAspectStyle = computed(() => ({
    '--output-ratio': aspectRatio.value === 'auto' ? '1 / 1' : aspectRatio.value.replace(':', ' / '),
  }))

  const outputPlaceholders = computed(() => [1])

  const advancedSummaryWithMask = computed(() => {
    const items = []
    if (mode.value === 'edit' && maskCount.value) items.push('含蒙版')
    return items.join(' · ')
  })

  function closeMenusOnOutside(event, modelMenuOpen, modelPicker, selectMenuOpen) {
    const target = event.target
    if (modelMenuOpen.value && !modelPicker.value?.contains(target)) {
      modelMenuOpen.value = false
    }
    if (selectMenuOpen.value && (!(target instanceof Element) || !target.closest('.select-picker'))) {
      selectMenuOpen.value = ''
    }
  }

  function handleWindowKeydown(event) {
    if (imagePreview.value) {
      if (event.key === 'Escape') {
        closeImagePreview()
        return
      }
      if (event.key === 'ArrowLeft') {
        showPreviousPreviewImage()
        return
      }
      if (event.key === 'ArrowRight') {
        showNextPreviewImage()
      }
      return
    }
    if (event.key !== 'Escape') return
    if (galleryOpen.value) closeGallery()
  }

  function isLandscapeRatio(value) {
    const [width, height] = String(value || '')
      .split(':')
      .map((part) => Number(part))
    return Number.isFinite(width) && Number.isFinite(height) && width > height
  }

  return {
    heroTitle,
    heroDescription,
    loadingTileCount,
    activeOutputCount,
    outputGridClass,
    outputAspectStyle,
    outputPlaceholders,
    advancedSummaryWithMask,
    closeMenusOnOutside,
    handleWindowKeydown,
  }
}
