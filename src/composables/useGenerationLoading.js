import { computed } from 'vue'

export function createGptLoadingDots({ gridSize = 13, viewBoxSize = 280, gap = 12 } = {}) {
  const center = (gridSize - 1) / 2
  const cellSize = (viewBoxSize - (gridSize - 1) * gap) / gridSize

  return Array.from({ length: gridSize * gridSize }, (_, index) => {
    const row = Math.floor(index / gridSize)
    const col = index % gridSize
    const distance = Math.hypot(row - center, col - center)
    const normalizedDistance = Math.min(1, distance / center)
    const size = 2.2 + (1 - normalizedDistance) * 4.8
    const litSize = size * 1.18
    const opacity = 0.2 + (1 - normalizedDistance) * 0.6
    const restOpacity = 0.018 + (1 - normalizedDistance) * 0.045
    const cx = col * (cellSize + gap) + cellSize / 2
    const cy = row * (cellSize + gap) + cellSize / 2

    return {
      id: index,
      cx: Number(cx.toFixed(1)),
      cy: Number(cy.toFixed(1)),
      restRadius: Number((size / 2).toFixed(1)),
      litRadius: Number((litSize / 2).toFixed(1)),
      opacity: Number(opacity.toFixed(2)),
      restOpacity: Number(restOpacity.toFixed(3)),
      style: {
        '--dot-size': `${size.toFixed(2)}px`,
        '--dot-lit-size': `${litSize.toFixed(2)}px`,
        '--dot-opacity': opacity.toFixed(2),
        '--dot-rest-opacity': restOpacity.toFixed(2),
      },
    }
  })
}

export function useGenerationLoading({ activeModelKey, activeModelLabel, loadingStage }) {
  const gptLoadingDots = createGptLoadingDots()

  const loadingVariant = computed(() => {
    if (activeModelKey.value === 'gpt-image-2') return 'gpt-image-2'
    if (activeModelKey.value === 'nano-banana-2') return 'nano-banana-2'
    if (activeModelKey.value === 'nano-banana' || activeModelKey.value === 'nano-banana-pro') return 'nano-banana'
    return 'generic'
  })

  const loadingTitle = computed(() => {
    if (loadingVariant.value === 'gpt-image-2') return 'ImgsGen 正在生成'
    if (loadingVariant.value === 'nano-banana-2') return 'Nano Banana 2 正在推理'
    if (loadingVariant.value === 'nano-banana') return 'Nano Banana 正在组织画面'
    return `${activeModelLabel.value} 正在生成`
  })

  const loadingHint = computed(() => {
    if (loadingVariant.value === 'gpt-image-2') return '正在生成图像，请稍候片刻，结果请在发布前人工复核'
    if (loadingVariant.value === 'nano-banana-2') return '优先整理参考图一致性、材质细节和构图'
    if (loadingVariant.value === 'nano-banana') return '正在快速铺开构图、色彩和主体风格'
    return '正在准备当前模型的输出结果'
  })

  const loadingStatusText = computed(() => loadingStage.value)

  return {
    gptLoadingDots,
    loadingHint,
    loadingStatusText,
    loadingTitle,
    loadingVariant,
  }
}
