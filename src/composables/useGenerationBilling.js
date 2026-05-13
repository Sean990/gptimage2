import { computed } from 'vue'

export function useGenerationBilling({
  auth,
  batchMode,
  generationBillingTipDefault = '图片生成成功后扣除积分。',
  mode,
  normalizedImageCount,
  quality,
  requiresReference,
  siteData,
}) {
  const userCredits = computed(() => auth.credits.value)
  const usageCosts = computed(() => siteData.value.usageCosts || {})
  const imageGenerationCosts = computed(() => usageCosts.value.imageGeneration || {})
  const hasUsageCostConfig = computed(() => Boolean(usageCosts.value.imageGeneration && usageCosts.value.reversePrompt))
  const reversePromptCost = computed(() => Number(usageCosts.value.reversePrompt?.credits ?? 0))
  const promptOptimizeConfig = computed(() => usageCosts.value.promptOptimize || {})
  const promptOptimizeCost = computed(() => Number(promptOptimizeConfig.value.credits ?? 0))
  const promptOptimizeDailyQuota = computed(() => Number(promptOptimizeConfig.value.dailyFreeQuota ?? 0))
  const promptOptimizeFreeRemaining = computed(() => {
    const raw = auth.user.value?.promptOptimizeFreeRemaining
    if (raw === null || raw === undefined || raw === '') return null
    return Math.max(0, Number(raw))
  })
  const promptOptimizeUsesFreeQuota = computed(() => {
    const remaining = promptOptimizeFreeRemaining.value
    return remaining !== null && remaining > 0
  })
  const promptOptimizeCostTip = computed(() => {
    if (promptOptimizeUsesFreeQuota.value) {
      return `今日还剩 ${promptOptimizeFreeRemaining.value} 次免费优化`
    }
    const quota = promptOptimizeDailyQuota.value
    const costText = promptOptimizeCost.value > 0 ? `每次消耗 ${promptOptimizeCost.value} 积分` : '本功能当前免费'
    return quota > 0 ? `${costText}，每日前 ${quota} 次免费` : costText
  })
  const billingEnabled = computed(() => Boolean(siteData.value.billingEnabled))
  const generationBillingTip = computed(() => imageGenerationCosts.value.billingTip || generationBillingTipDefault)
  const generationBillingTipInline = computed(() => generationBillingTip.value.replace(/[。.!！]+$/, ''))
  const creditCost = computed(() => {
    const base =
      mode.value === 'edit'
        ? Number(imageGenerationCosts.value.editBase ?? 0)
        : requiresReference.value
          ? Number(imageGenerationCosts.value.imageToImageBase ?? 0)
          : Number(imageGenerationCosts.value.textToImageBase ?? 0)
    const qualityExtra = quality.value === 'high' ? Number(imageGenerationCosts.value.highQualityExtra ?? 0) : 0
    return normalizedImageCount.value * (base + qualityExtra)
  })
  const footerTipText = computed(() =>
    batchMode.value
      ? `批量生成 ${normalizedImageCount.value} 张图片预计消耗 ${creditCost.value} 积分，${generationBillingTipInline.value}，请在下载或发布前统一审核 AI 标识、授权和内容合规。`
      : '提示：提供越详细的描述，生成效果越好。请使用合法素材，并避免输入违法、侵权、虚假或侵犯他人权益的内容。',
  )
  const generationCostText = computed(() => `预计消耗 ${creditCost.value} 积分，${generationBillingTipInline.value}`)

  return {
    billingEnabled,
    creditCost,
    footerTipText,
    generationBillingTip,
    generationBillingTipInline,
    generationCostText,
    hasUsageCostConfig,
    imageGenerationCosts,
    promptOptimizeConfig,
    promptOptimizeCost,
    promptOptimizeCostTip,
    promptOptimizeDailyQuota,
    promptOptimizeFreeRemaining,
    promptOptimizeUsesFreeQuota,
    reversePromptCost,
    usageCosts,
    userCredits,
  }
}
