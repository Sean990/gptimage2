/**
 * 骨架屏加载工具
 * 提供统一的加载状态管理
 */

import { ref } from 'vue'

export function useSkeletonLoader({ initialLoading = true, minLoadingTime = 300 } = {}) {
  const isLoading = ref(initialLoading)
  const loadingStartTime = ref(Date.now())

  async function startLoading() {
    isLoading.value = true
    loadingStartTime.value = Date.now()
  }

  async function finishLoading() {
    const elapsed = Date.now() - loadingStartTime.value
    const remaining = Math.max(0, minLoadingTime - elapsed)

    if (remaining > 0) {
      await new Promise((resolve) => setTimeout(resolve, remaining))
    }

    isLoading.value = false
  }

  async function withLoading(asyncFn) {
    startLoading()
    try {
      const result = await asyncFn()
      return result
    } finally {
      await finishLoading()
    }
  }

  return {
    isLoading,
    startLoading,
    finishLoading,
    withLoading,
  }
}
