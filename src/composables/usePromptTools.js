import { ref } from 'vue'
import { loadRandomCasePrompt } from '../services/promptLibrary'

export function usePromptTools({
  activeMode,
  api,
  auth,
  canReverse,
  getReferences,
  hasUnreadyUpload,
  hasUsageCostConfig,
  isAuthenticated,
  loadSiteData,
  mode,
  openLogin,
  prompt,
  promptOptimizeCost,
  promptOptimizeDailyQuota,
  promptOptimizeUsesFreeQuota,
  reversePromptCost,
  showNotice,
  userCredits,
}) {
  const reversing = ref(false)
  const optimizing = ref(false)
  const randomPromptLoading = ref(false)

  async function getRandomPromptFromGallery() {
    return loadRandomCasePrompt()
  }

  async function randomizePrompt() {
    if (randomPromptLoading.value) return

    randomPromptLoading.value = true
    try {
      prompt.value = await getRandomPromptFromGallery()
      showNotice('已从案例库随机填充提示词')
    } catch (error) {
      showNotice(error.message || '案例库加载失败，请稍后重试')
    } finally {
      randomPromptLoading.value = false
    }
  }

  async function reversePrompt() {
    if (!canReverse.value) return
    if (!hasUsageCostConfig.value) {
      await loadSiteData().catch(() => {})
    }
    if (!hasUsageCostConfig.value) {
      showNotice('积分规则尚未加载，请稍后重试')
      return
    }

    if (!isAuthenticated.value) {
      openLogin()
      showNotice('请先登录后使用 AI 反推提示词')
      return
    }
    if (userCredits.value < reversePromptCost.value) {
      showNotice(`积分不足，本次预计需要 ${reversePromptCost.value} 积分`)
      return
    }
    if (hasUnreadyUpload()) {
      showNotice('参考图还在上传，请完成上传后再反推')
      return
    }

    reversing.value = true
    try {
      const result = await api.reversePrompt({
        references: getReferences(),
      })
      prompt.value = result.prompt
      await auth.refreshMe().catch(() => {})
      showNotice('AI 反推提示词已生成')
    } catch (error) {
      showNotice(error.message || '提示词反推失败')
    } finally {
      reversing.value = false
    }
  }

  async function optimizeCurrentPrompt() {
    if (optimizing.value) return
    const trimmed = prompt.value.trim()
    if (!trimmed) {
      showNotice('请先输入要优化的提示词')
      return
    }
    if (!isAuthenticated.value) {
      openLogin()
      showNotice('请先登录后使用一键优化')
      return
    }

    const usesFree = promptOptimizeUsesFreeQuota.value
    const cost = promptOptimizeCost.value
    if (!usesFree && cost > 0 && userCredits.value < cost) {
      showNotice(`积分不足，本次预计需要 ${cost} 积分`)
      return
    }

    if (!usesFree && cost > 0) {
      const confirmMessage = `本次一键优化将消耗 ${cost} 积分${promptOptimizeDailyQuota.value > 0 ? `（已用完今日 ${promptOptimizeDailyQuota.value} 次免费额度）` : ''}，是否继续？`
      if (typeof window !== 'undefined' && !window.confirm(confirmMessage)) return
    }

    optimizing.value = true
    try {
      const result = await api.optimizePrompt({
        prompt: trimmed,
        mode: mode.value,
        modeLabel: activeMode.value.label,
        language: 'zh-CN',
        requirements: {
          preserveFacts: true,
          directUse: true,
          includeConstraints: true,
        },
      })
      const nextPrompt = result?.optimizedPrompt || result?.prompt || result?.result || ''
      if (!nextPrompt) throw new Error('后端未返回优化后的提示词')
      prompt.value = nextPrompt
      await auth.refreshMe().catch(() => {})
      showNotice(usesFree ? '已使用免费次数优化提示词' : '提示词已优化')
    } catch (error) {
      showNotice(error.message || '一键优化失败，请稍后重试')
    } finally {
      optimizing.value = false
    }
  }

  return {
    getRandomPromptFromGallery,
    optimizeCurrentPrompt,
    optimizing,
    randomizePrompt,
    randomPromptLoading,
    reversePrompt,
    reversing,
  }
}
