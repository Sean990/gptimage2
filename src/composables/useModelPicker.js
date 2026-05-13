import { computed, ref } from 'vue'
import { api } from '../services/api'

const fallbackModelCatalog = [
  {
    value: 'gpt-image-2',
    name: 'ImgsGen',
    badge: '推荐',
    description: '适合文字渲染、海报草稿、摄影质感图像与参考图编辑。',
    meta: 'ImgsGen 等待态',
  },
  {
    value: 'nano-banana-2',
    name: 'Nano Banana 2',
    badge: '高速',
    description: '适合参考图一致性、快速出图和网络增强创作。',
    meta: 'Nano Banana 2 等待态',
  },
  {
    value: 'nano-banana-pro',
    name: 'Nano Banana Pro',
    badge: '专业',
    description: '适合多图合成、高密度排版和批量设计迭代。',
    meta: 'Nano Banana 等待态',
  },
  {
    value: 'nano-banana',
    name: 'Nano Banana v1',
    badge: '轻量',
    description: '适合轻量级快速生成、草图探索和风格试验。',
    meta: 'Nano Banana 等待态',
  },
]

const fallbackModelMap = new Map(fallbackModelCatalog.map((item) => [item.value, item]))
const fallbackModelGroups = [
  {
    label: '图像模型',
    models: [fallbackModelCatalog[0]],
  },
]

export function normalizeModelKey(value = '') {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')

  if (!normalized) return 'generic'
  if (normalized.includes('gpt-image-2') || normalized.includes('gptimage2')) return 'gpt-image-2'
  if (normalized.includes('nano-banana-2') || normalized.includes('nanobanana2')) return 'nano-banana-2'
  if (normalized.includes('nano-banana-pro') || normalized.includes('nanobananapro')) return 'nano-banana-pro'
  if (normalized.includes('nano-banana') || normalized.includes('nanobanana')) return 'nano-banana'
  return normalized
}

export function formatModelLabel(modelKey, rawValue = '') {
  if (modelKey === 'gpt-image-2') return 'ImgsGen'
  if (modelKey === 'nano-banana-2') return 'Nano Banana 2'
  if (modelKey === 'nano-banana-pro') return 'Nano Banana Pro'
  if (modelKey === 'nano-banana') return 'Nano Banana'
  return rawValue.trim() || '当前模型'
}

export function useModelPicker({ initialModel = 'gpt-image-2', onToggle } = {}) {
  const model = ref(initialModel)
  const modelGroups = ref(fallbackModelGroups)
  const modelLoading = ref(false)
  const modelLoadError = ref('')
  const modelPicker = ref(null)
  const modelMenuOpen = ref(false)

  const activeModelKey = computed(() => normalizeModelKey(model.value))
  const activeModelLabel = computed(() => formatModelLabel(activeModelKey.value, model.value))
  const modelOptions = computed(() => modelGroups.value.flatMap((group) => group.models))
  const selectedModel = computed(
    () =>
      modelOptions.value.find((item) => item.value === model.value) || {
        value: model.value,
        name: activeModelLabel.value,
        badge: '自定义',
        description: '将按当前模型 ID 发起生成请求。',
        meta: '通用等待态',
      },
  )
  const selectedModelAvailable = computed(() => modelOptions.value.some((item) => item.value === model.value))

  function normalizeModelOption(item) {
    const value = String(item?.value || item?.id || item?.model || '').trim()
    if (!value) return null

    const modelKey = normalizeModelKey(value)
    const known = fallbackModelMap.get(modelKey)
    const name = item.label || item.name || known?.name || formatModelLabel(modelKey, value)

    return {
      value,
      name,
      badge: item.default ? '当前' : known?.badge || '可用',
      description: item.description || known?.description || `${name} 当前可用于图片生成。`,
      meta: known?.meta || '通用等待态',
    }
  }

  async function loadImageModels() {
    modelLoading.value = true
    modelLoadError.value = ''

    try {
      const models = await api.getModels()
      const availableModels = Array.isArray(models) ? models.map(normalizeModelOption).filter(Boolean) : []

      if (!availableModels.length) return

      modelGroups.value = [
        {
          label: '后端可用模型',
          models: availableModels,
        },
      ]

      if (!availableModels.some((item) => item.value === model.value)) {
        model.value = availableModels[0].value
      }
    } catch (error) {
      modelLoadError.value = error.message || '模型配置读取失败'
      modelGroups.value = fallbackModelGroups
      model.value = fallbackModelGroups[0].models[0].value
    } finally {
      modelLoading.value = false
    }
  }

  function toggleModelMenu() {
    modelMenuOpen.value = !modelMenuOpen.value
    onToggle?.()
  }

  function selectModel(value) {
    model.value = value
    modelMenuOpen.value = false
  }

  function closeModelMenu() {
    modelMenuOpen.value = false
  }

  return {
    activeModelKey,
    activeModelLabel,
    fallbackModelCatalog,
    fallbackModelGroups,
    fallbackModelMap,
    formatModelLabel,
    loadImageModels,
    model,
    modelGroups,
    modelLoadError,
    modelLoading,
    modelMenuOpen,
    modelOptions,
    modelPicker,
    normalizeModelKey,
    normalizeModelOption,
    selectedModel,
    selectedModelAvailable,
    selectModel,
    closeModelMenu,
    toggleModelMenu,
  }
}
