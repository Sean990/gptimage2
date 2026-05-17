import { computed, ref } from 'vue'
import { resolveOutputSize } from './useGenerationPayload'
import * as constants from './generationConstants'

export function useGenerationForm({ route }) {
  const mode = ref('generate')
  const aspectRatio = ref('3:4')
  const resolution = ref('4K')
  const batchMode = ref(false)
  const batchCount = ref(4)
  const quality = ref('auto')
  const outputFormat = ref('png')
  const background = ref('auto')
  const moderation = ref('auto')
  const outputCompression = ref(0)
  const advancedOpen = ref(true)
  const prompt = ref(Array.isArray(route.query.prompt) ? route.query.prompt[0] || '' : route.query.prompt || '')
  const selectMenuOpen = ref('')

  const batchCountOptions = [
    { label: '2 张图片', value: 2 },
    { label: '4 张图片', value: 4, recommended: true },
    { label: '8 张图片', value: 8 },
    { label: '6 张图片', value: 6 },
    { label: '10 张图片', value: 10 },
  ]

  const normalizedImageCount = computed(() => {
    if (!batchMode.value) return 1
    const currentCount = Number(batchCount.value) || 4
    return batchCountOptions.some((item) => item.value === currentCount) ? currentCount : 4
  })

  const size = computed(() => resolveOutputSize(constants.sizeMatrix, resolution.value, aspectRatio.value))

  const resolutionLabel = computed(() => {
    const parts = [resolution.value]
    if (size.value !== 'auto') parts.push(size.value)
    return parts.join(' · ')
  })

  const activeMode = computed(() => constants.modes.find((item) => item.value === mode.value) || constants.modes[0])
  const requiresReference = computed(() => activeMode.value.requiresReference)

  function getOptionLabel(options, value) {
    return options.find((item) => item.value === value)?.label || value
  }

  const selectedAspectRatioLabel = computed(() => getOptionLabel(constants.aspectRatios, aspectRatio.value))
  const selectedResolutionLabel = computed(() => getOptionLabel(constants.resolutionOptions, resolution.value))
  const selectedQualityLabel = computed(() => getOptionLabel(constants.qualities, quality.value))
  const selectedOutputFormatLabel = computed(() => getOptionLabel(constants.outputFormats, outputFormat.value))
  const selectedBackgroundLabel = computed(() => getOptionLabel(constants.backgroundOptions, background.value))
  const selectedModerationLabel = computed(() => getOptionLabel(constants.moderationOptions, moderation.value))
  const selectedBatchCountLabel = computed(() => getOptionLabel(batchCountOptions, normalizedImageCount.value))

  const advancedSummary = computed(() => {
    const items = [`${normalizedImageCount.value} 张`, outputFormat.value.toUpperCase(), selectedQualityLabel.value]
    return items.join(' · ')
  })

  function toggleSelectMenu(key) {
    selectMenuOpen.value = selectMenuOpen.value === key ? '' : key
  }

  function closeSelectMenu() {
    selectMenuOpen.value = ''
  }

  function selectSimpleOption(key, value) {
    if (key === 'aspectRatio') aspectRatio.value = value
    if (key === 'resolution') resolution.value = value
    if (key === 'quality') quality.value = value
    if (key === 'outputFormat') outputFormat.value = value
    if (key === 'background') background.value = value
    if (key === 'moderation') moderation.value = value
    if (key === 'batchCount') batchCount.value = value
    selectMenuOpen.value = ''
  }

  function supportsOutputCompression(format = outputFormat.value) {
    return format === 'jpeg' || format === 'webp'
  }

  function enableBatchMode() {
    batchMode.value = true
  }

  function disableBatchMode() {
    batchMode.value = false
  }

  return {
    // State
    mode,
    aspectRatio,
    resolution,
    batchMode,
    batchCount,
    quality,
    outputFormat,
    background,
    moderation,
    outputCompression,
    advancedOpen,
    prompt,
    selectMenuOpen,

    // Options
    batchCountOptions,

    // Computed
    activeMode,
    requiresReference,
    normalizedImageCount,
    size,
    resolutionLabel,
    selectedAspectRatioLabel,
    selectedResolutionLabel,
    selectedQualityLabel,
    selectedOutputFormatLabel,
    selectedBackgroundLabel,
    selectedModerationLabel,
    selectedBatchCountLabel,
    advancedSummary,

    // Methods
    getOptionLabel,
    toggleSelectMenu,
    closeSelectMenu,
    selectSimpleOption,
    supportsOutputCompression,
    enableBatchMode,
    disableBatchMode,
  }
}
