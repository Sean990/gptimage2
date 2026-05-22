/**
 * 移动端触觉反馈工具
 * 支持不同强度的震动反馈
 */

const isSupported = typeof window !== 'undefined' && 'vibrate' in navigator

/**
 * 触觉反馈类型
 */
export const HapticFeedbackType = {
  LIGHT: 'light', // 轻触反馈 - 用于按钮点击、选项切换
  MEDIUM: 'medium', // 中等反馈 - 用于重要操作、成功提示
  HEAVY: 'heavy', // 重度反馈 - 用于错误、警告
  SUCCESS: 'success', // 成功反馈 - 用于操作成功
  WARNING: 'warning', // 警告反馈 - 用于需要注意的操作
  ERROR: 'error', // 错误反馈 - 用于操作失败
  SELECTION: 'selection', // 选择反馈 - 用于滑动选择
}

/**
 * 震动模式配置
 */
const vibrationPatterns = {
  [HapticFeedbackType.LIGHT]: [10],
  [HapticFeedbackType.MEDIUM]: [20],
  [HapticFeedbackType.HEAVY]: [30],
  [HapticFeedbackType.SUCCESS]: [10, 50, 10],
  [HapticFeedbackType.WARNING]: [20, 100, 20],
  [HapticFeedbackType.ERROR]: [30, 100, 30, 100, 30],
  [HapticFeedbackType.SELECTION]: [5],
}

/**
 * 触发触觉反馈
 * @param {string} type - 反馈类型
 * @returns {boolean} 是否成功触发
 */
export function triggerHaptic(type = HapticFeedbackType.LIGHT) {
  if (!isSupported) return false

  const pattern = vibrationPatterns[type] || vibrationPatterns[HapticFeedbackType.LIGHT]

  try {
    navigator.vibrate(pattern)
    return true
  } catch {
    if (import.meta.env.DEV) {
      console.warn('[Haptic] 触觉反馈触发失败')
    }
    return false
  }
}

/**
 * 取消所有震动
 */
export function cancelHaptic() {
  if (!isSupported) return false

  try {
    navigator.vibrate(0)
    return true
  } catch {
    return false
  }
}

/**
 * 检查是否支持触觉反馈
 */
export function isHapticSupported() {
  return isSupported
}

/**
 * Vue composable for haptic feedback
 */
export function useHaptic() {
  const supported = isHapticSupported()

  function haptic(type = HapticFeedbackType.LIGHT) {
    if (!supported) return false
    return triggerHaptic(type)
  }

  function hapticLight() {
    return haptic(HapticFeedbackType.LIGHT)
  }

  function hapticMedium() {
    return haptic(HapticFeedbackType.MEDIUM)
  }

  function hapticHeavy() {
    return haptic(HapticFeedbackType.HEAVY)
  }

  function hapticSuccess() {
    return haptic(HapticFeedbackType.SUCCESS)
  }

  function hapticWarning() {
    return haptic(HapticFeedbackType.WARNING)
  }

  function hapticError() {
    return haptic(HapticFeedbackType.ERROR)
  }

  function hapticSelection() {
    return haptic(HapticFeedbackType.SELECTION)
  }

  return {
    supported,
    haptic,
    hapticLight,
    hapticMedium,
    hapticHeavy,
    hapticSuccess,
    hapticWarning,
    hapticError,
    hapticSelection,
    cancel: cancelHaptic,
  }
}
