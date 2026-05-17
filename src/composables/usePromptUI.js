import { computed } from 'vue'

export function usePromptUI({ mode, prompt, quality, referenceCount, requiresReference }) {
  const promptQualityScore = computed(() => {
    const lengthScore = Math.min(prompt.value.trim().length, 90) / 90
    const referenceScore = requiresReference.value ? Math.min(referenceCount.value, 2) * 0.16 : 0
    const qualityScore = quality.value === 'high' ? 0.1 : 0
    return Math.min(100, Math.round((0.12 + lengthScore * 0.62 + referenceScore + qualityScore) * 100))
  })

  const promptQualityLabel = computed(() => {
    if (promptQualityScore.value >= 76) return '提示词信息较完整'
    if (promptQualityScore.value >= 45) return '可以生成，补充细节会更稳'
    return '描述偏短，建议补充主体、光线和构图'
  })

  const promptLabel = computed(() => {
    return '提示词 *'
  })

  const promptPlaceholder = computed(() => {
    if (mode.value === 'image')
      return '描述如何基于已授权参考图生成新图，例如：保持主体形象，替换为摄影棚背景，增强服装质感。'
    if (mode.value === 'edit')
      return '描述要精修的局部或整体，例如：只替换背景为摄影棚，主体保持不变。请勿编辑未获授权的人脸或隐私内容。'
    return '详细描述你想要生成的图像，包括主体、风格、光线、色调、画面比例和用途。'
  })

  const referenceLabel = computed(() => {
    return mode.value === 'edit' ? '原图' : '参考图'
  })

  const referenceInputLabel = computed(() => {
    return mode.value === 'edit' ? '上传 1 张原图或输入图片 URL' : '上传参考图或输入图片 URL'
  })

  const referenceUploadHint = computed(() => {
    return mode.value === 'edit' ? '仅支持 1 张原图（PNG、JPEG、WEBP，最大 10MB）' : '支持 PNG、JPEG、WEBP（最大 10MB）'
  })

  async function copyCurrentPrompt(showNotice) {
    try {
      await navigator.clipboard.writeText(prompt.value)
      showNotice('当前提示词已复制')
    } catch {
      showNotice(prompt.value)
    }
  }

  return {
    promptQualityScore,
    promptQualityLabel,
    promptLabel,
    promptPlaceholder,
    referenceLabel,
    referenceInputLabel,
    referenceUploadHint,
    copyCurrentPrompt,
  }
}
