import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * 使用 ref 引用代替 querySelector
 * 提升 DOM 查询性能
 */
export function useOutputPanelRefs() {
  const outputItemRef = ref(null)
  const stageRef = ref(null)
  const actionsRef = ref(null)
  const panelRef = ref(null)

  function updateFloatingPanelPosition(floatingPanelPosition) {
    if (typeof window === 'undefined') return

    const stageElement = stageRef.value
    const actionsElement = actionsRef.value
    const panelElement = panelRef.value

    if (!stageElement) return

    const rect = stageElement.getBoundingClientRect()
    const actionsRect = actionsElement?.getBoundingClientRect()
    const panelRect = panelElement?.getBoundingClientRect()
    const gap = 12
    const margin = 16
    const panelWidth = panelRect?.width || Math.min(250, window.innerWidth - margin * 2)
    const panelHeight = panelRect?.height || 340
    const maxLeft = Math.max(margin, window.innerWidth - panelWidth - margin)
    const maxTop = Math.max(margin, window.innerHeight - panelHeight - margin)
    const clampPosition = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max))
    const alignWithStageTop = () => clampPosition(rect.top, margin, maxTop)

    let left = rect.right + gap
    let top = alignWithStageTop()
    const fitsRight = left + panelWidth <= window.innerWidth - margin

    if (!fitsRight) {
      left = clampPosition(rect.right - panelWidth, margin, maxLeft)
      top = Math.max(rect.bottom, actionsRect?.bottom || 0) + gap
    }

    floatingPanelPosition.value = { left, top }
  }

  return {
    outputItemRef,
    stageRef,
    actionsRef,
    panelRef,
    updateFloatingPanelPosition,
  }
}

/**
 * 防抖和节流工具
 */
export function useThrottle() {
  let frameId = 0

  function scheduleFrame(callback) {
    if (frameId) window.cancelAnimationFrame(frameId)
    frameId = window.requestAnimationFrame(() => {
      frameId = 0
      callback()
    })
  }

  function cancelScheduled() {
    if (frameId) {
      window.cancelAnimationFrame(frameId)
      frameId = 0
    }
  }

  onBeforeUnmount(() => {
    cancelScheduled()
  })

  return {
    scheduleFrame,
    cancelScheduled,
  }
}

/**
 * 图片懒加载
 */
export function useLazyImage() {
  const observer = ref(null)
  const loadedImages = ref(new Set())

  function setupObserver() {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return

    observer.value = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target
            const src = img.dataset.src
            if (src && !loadedImages.value.has(src)) {
              img.src = src
              loadedImages.value.add(src)
              observer.value?.unobserve(img)
            }
          }
        })
      },
      {
        rootMargin: '50px',
        threshold: 0.01,
      },
    )
  }

  function observeImage(img) {
    if (observer.value && img) {
      observer.value.observe(img)
    }
  }

  function cleanup() {
    observer.value?.disconnect()
    observer.value = null
    loadedImages.value.clear()
  }

  onMounted(() => {
    setupObserver()
  })

  onBeforeUnmount(() => {
    cleanup()
  })

  return {
    observeImage,
    loadedImages,
  }
}
