import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * 下拉刷新组件
 * 支持自定义刷新逻辑和样式
 */
export function usePullToRefresh({ onRefresh, threshold = 80, maxDistance = 120 } = {}) {
  const isPulling = ref(false)
  const isRefreshing = ref(false)
  const pullDistance = ref(0)
  const canRefresh = ref(false)

  let startY = 0
  let currentY = 0
  let scrollElement = null
  let touchActive = false

  function isAtTop() {
    if (!scrollElement) return true
    return scrollElement.scrollTop <= 0
  }

  function handleTouchStart(event) {
    if (isRefreshing.value) return
    if (!isAtTop()) return

    touchActive = true
    startY = event.touches[0].clientY
    currentY = startY
    isPulling.value = false
    pullDistance.value = 0
  }

  function handleTouchMove(event) {
    if (!touchActive || isRefreshing.value) return
    if (!isAtTop()) {
      touchActive = false
      isPulling.value = false
      pullDistance.value = 0
      return
    }

    currentY = event.touches[0].clientY
    const distance = currentY - startY

    if (distance > 0) {
      isPulling.value = true
      // 使用阻尼效果，拉得越远阻力越大
      const damping = 0.5
      pullDistance.value = Math.min(distance * damping, maxDistance)
      canRefresh.value = pullDistance.value >= threshold

      // 阻止默认滚动行为
      if (pullDistance.value > 10) {
        event.preventDefault()
      }
    }
  }

  async function handleTouchEnd() {
    if (!touchActive) return
    touchActive = false

    if (canRefresh.value && !isRefreshing.value) {
      isRefreshing.value = true
      pullDistance.value = threshold

      try {
        if (onRefresh) {
          await onRefresh()
        }
      } catch (error) {
        console.error('[PullToRefresh] 刷新失败', error)
      } finally {
        isRefreshing.value = false
        isPulling.value = false
        pullDistance.value = 0
        canRefresh.value = false
      }
    } else {
      isPulling.value = false
      pullDistance.value = 0
      canRefresh.value = false
    }
  }

  function setup(element) {
    if (!element) return

    scrollElement = element
    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })
    element.addEventListener('touchcancel', handleTouchEnd, { passive: true })
  }

  function cleanup() {
    if (!scrollElement) return

    scrollElement.removeEventListener('touchstart', handleTouchStart)
    scrollElement.removeEventListener('touchmove', handleTouchMove)
    scrollElement.removeEventListener('touchend', handleTouchEnd)
    scrollElement.removeEventListener('touchcancel', handleTouchEnd)
    scrollElement = null
  }

  onBeforeUnmount(() => {
    cleanup()
  })

  return {
    isPulling,
    isRefreshing,
    pullDistance,
    canRefresh,
    setup,
    cleanup,
  }
}

/**
 * 自动绑定到元素的下拉刷新
 */
export function useAutoPullToRefresh(elementRef, options) {
  const pullToRefresh = usePullToRefresh(options)

  onMounted(() => {
    if (elementRef.value) {
      pullToRefresh.setup(elementRef.value)
    }
  })

  return pullToRefresh
}
