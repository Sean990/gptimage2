<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  CheckCircle2,
  ClipboardList,
  Copy,
  FileText,
  History,
  Loader2,
  RotateCcw,
  Sparkles,
  Trash2,
  WandSparkles,
} from 'lucide-vue-next'
import { api } from '../services/api'

const maxLength = 5000
const optimizerStorageKey = 'promptOptimizerHistory'
const modes = [
  {
    id: 'image',
    label: '图像生成',
    description: '补齐主体、构图、光线、材质和画幅约束。',
  },
  {
    id: 'writing',
    label: '文案写作',
    description: '明确受众、目标、语气、结构和输出长度。',
  },
  {
    id: 'work',
    label: '办公任务',
    description: '拆解背景、任务、限制、交付格式和检查标准。',
  },
]
const examples = [
  '帮我写一封商务邮件，向客户解释项目延期，并给出新的交付时间。',
  '生成一张高端护肤品海报，画面中心是半透明精华瓶，背景干净，有科技护肤感。',
  '把下面这段会议纪要整理成行动清单，按负责人、截止时间和优先级输出。',
]

const inputPrompt = ref('')
const optimizedPrompt = ref('')
const activeMode = ref('image')
const notice = ref('')
const loading = ref(false)
const optimizeError = ref('')
const copied = ref(false)
const historyItems = ref([])
const abortController = ref(null)

const activeModeItem = computed(() => modes.find((item) => item.id === activeMode.value) || modes[0])
const charCount = computed(() => inputPrompt.value.length)
const canOptimize = computed(() => inputPrompt.value.trim().length > 0 && charCount.value <= maxLength && !loading.value)
const remainingCount = computed(() => Math.max(0, 10 - historyItems.value.length))
const optimizerStatusText = computed(() => {
  if (loading.value) return 'AI 正在分析场景、补齐约束并重写提示词'
  if (optimizeError.value) return optimizeError.value
  if (optimizedPrompt.value) return '已由后端 AI 优化完成'
  return '后端 AI 会根据场景生成可复制、可继续修改的提示词草稿'
})
const qualityScore = computed(() => {
  const text = inputPrompt.value.trim()
  if (!text) return 0

  const lengthScore = Math.min(text.length / 240, 1) * 42
  const detailKeywords = ['受众', '场景', '格式', '风格', '长度', '限制', '光线', '构图', '步骤', '目标']
  const detailScore = detailKeywords.filter((item) => text.includes(item)).length * 5
  const structureScore = /[，。；：,.;:\n]/.test(text) ? 14 : 0
  return Math.min(100, Math.round(18 + lengthScore + detailScore + structureScore))
})
const qualityLabel = computed(() => {
  if (!inputPrompt.value.trim()) return '等待输入'
  if (qualityScore.value >= 78) return '结构较完整'
  if (qualityScore.value >= 52) return '可以继续补充'
  return '信息偏少'
})

function showNotice(text) {
  notice.value = text
  window.setTimeout(() => {
    if (notice.value === text) notice.value = ''
  }, 2400)
}

function pickExample(index) {
  inputPrompt.value = examples[index]
  optimizedPrompt.value = ''
  optimizeError.value = ''
}

function normalizeOptimizedPrompt(result) {
  if (typeof result === 'string') return result.trim()
  return [
    result?.optimizedPrompt,
    result?.prompt,
    result?.text,
    result?.content,
    result?.result,
  ].find((value) => typeof value === 'string' && value.trim())?.trim() || ''
}

function saveHistory(nextPrompt, meta = {}) {
  const nextItem = {
    id: meta.id || Date.now(),
    mode: activeModeItem.value.label,
    source: inputPrompt.value.trim(),
    result: nextPrompt,
    engine: meta.engine || '后端 AI',
    createdAt: new Date().toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }),
  }

  historyItems.value = [nextItem, ...historyItems.value].slice(0, 10)
  localStorage.setItem(optimizerStorageKey, JSON.stringify(historyItems.value))
}

async function optimizePrompt() {
  if (!canOptimize.value) return

  loading.value = true
  optimizedPrompt.value = ''
  optimizeError.value = ''
  abortController.value?.abort()
  abortController.value = new AbortController()

  try {
    const result = await api.optimizePrompt({
      prompt: inputPrompt.value.trim(),
      mode: activeMode.value,
      modeLabel: activeModeItem.value.label,
      language: 'zh-CN',
      maxLength,
      requirements: {
        preserveFacts: true,
        directUse: true,
        includeConstraints: true,
      },
    }, {
      signal: abortController.value.signal,
    })
    const nextPrompt = normalizeOptimizedPrompt(result)

    if (!nextPrompt) {
      throw new Error('后端未返回优化后的提示词')
    }

    optimizedPrompt.value = nextPrompt
    saveHistory(nextPrompt, {
      id: result?.id,
      engine: result?.engine || result?.model || '后端 AI',
    })
    showNotice('AI 提示词已优化')
  } catch (error) {
    if (error.name === 'AbortError') {
      optimizeError.value = '已取消本次优化'
      showNotice('已取消优化')
    } else {
      optimizeError.value = error.message || 'AI 提示词优化失败，请稍后重试'
      showNotice(optimizeError.value)
    }
  } finally {
    loading.value = false
    abortController.value = null
  }
}

async function copyOptimizedPrompt() {
  if (!optimizedPrompt.value) return

  try {
    await navigator.clipboard.writeText(optimizedPrompt.value)
    copied.value = true
    showNotice('优化结果已复制')
    window.setTimeout(() => {
      copied.value = false
    }, 1800)
  } catch {
    showNotice(optimizedPrompt.value)
  }
}

function useHistoryItem(item) {
  inputPrompt.value = item.source
  optimizedPrompt.value = item.result
  activeMode.value = modes.find((mode) => mode.label === item.mode)?.id || activeMode.value
}

function resetPrompt() {
  inputPrompt.value = ''
  optimizedPrompt.value = ''
  optimizeError.value = ''
}

function clearHistory() {
  historyItems.value = []
  localStorage.removeItem(optimizerStorageKey)
  showNotice('历史记录已清空')
}

function cancelOptimization() {
  abortController.value?.abort()
}

onMounted(() => {
  try {
    historyItems.value = JSON.parse(localStorage.getItem(optimizerStorageKey) || '[]')
  } catch {
    historyItems.value = []
  }
})

onBeforeUnmount(() => {
  abortController.value?.abort()
})
</script>

<template>
  <main class="page prompt-optimizer-page">
    <section class="section-tight">
      <div class="container optimizer-container">
        <div class="optimizer-heading">
          <span class="eyebrow">
            <WandSparkles aria-hidden="true" />
            提示词优化器
          </span>
          <h1>AI 提示词优化器</h1>
          <p>辅助整理提示词结构，让描述更清晰。输入原始想法，选择使用场景，生成可继续修改和复核的提示词草稿。</p>
        </div>

        <div class="optimizer-layout" v-fade-up="{ delay: 100 }">
          <section class="card optimizer-workbench" aria-labelledby="optimizer-title">
            <div class="optimizer-panel-head">
              <div>
                <h2 id="optimizer-title">输入你的提示词</h2>
                <p>{{ activeModeItem.description }}</p>
              </div>
              <span class="optimizer-counter" :class="{ warning: charCount > maxLength }">
                {{ charCount }} / {{ maxLength }} 字符
              </span>
            </div>

            <div class="optimizer-modes" role="tablist" aria-label="优化场景">
              <button
                v-for="mode in modes"
                :key="mode.id"
                type="button"
                :class="{ active: activeMode === mode.id }"
                :aria-selected="activeMode === mode.id"
                role="tab"
                @click="activeMode = mode.id"
              >
                {{ mode.label }}
              </button>
            </div>

            <label class="field optimizer-input-field" for="optimizer-input">
              <span class="sr-only">原始提示词</span>
              <textarea
                id="optimizer-input"
                v-model="inputPrompt"
                :maxlength="maxLength + 1"
                placeholder="例如：帮我写一封商务邮件，向客户解释项目延期..."
              />
            </label>

            <div class="quality-meter optimizer-quality" aria-live="polite">
              <div class="quality-meter-head">
                <span>{{ qualityLabel }}</span>
                <span>{{ qualityScore }}%</span>
              </div>
              <div class="quality-track" aria-hidden="true">
                <span class="quality-fill" :style="{ width: `${qualityScore}%` }"></span>
              </div>
            </div>
            <p class="optimizer-ai-status" :class="{ error: optimizeError }" aria-live="polite">
              {{ optimizerStatusText }}
            </p>

            <div class="optimizer-examples" aria-label="示例提示词">
              <button v-for="(example, index) in examples" :key="example" type="button" @click="pickExample(index)">
                <FileText aria-hidden="true" />
                示例 {{ index + 1 }}
              </button>
            </div>

            <div class="optimizer-actions">
              <button class="btn btn-primary" type="button" :disabled="!canOptimize" @click="optimizePrompt">
                <Loader2 v-if="loading" class="spinner" aria-hidden="true" />
                <Sparkles v-else aria-hidden="true" />
                {{ loading ? '优化中...' : '开始优化' }}
              </button>
              <button v-if="loading" class="btn btn-soft" type="button" @click="cancelOptimization">
                取消
              </button>
              <button class="btn btn-ghost" type="button" :disabled="!inputPrompt && !optimizedPrompt" @click="resetPrompt">
                <RotateCcw aria-hidden="true" />
                清空
              </button>
            </div>
          </section>

          <aside class="optimizer-side">
            <section class="card optimizer-tip-card">
              <h2>
                <ClipboardList aria-hidden="true" />
                使用技巧
              </h2>
              <ul>
                <li>描述要具体，避免“高级”“好看”这类孤立词。</li>
                <li>说明受众、场景、目标和你不想要的结果。</li>
                <li>指定输出格式、语气、篇幅或画幅比例。</li>
                <li>复杂需求拆成背景、任务、限制和交付物。</li>
              </ul>
            </section>

            <section class="card optimizer-credits">
              <h2>本地历史记录</h2>
              <strong>{{ remainingCount }}</strong>
              <p>还可保存 {{ remainingCount }} 条记录。优化由后端 AI 完成，历史仅保存在当前浏览器。</p>
            </section>
          </aside>
        </div>

        <section class="card optimizer-result" aria-labelledby="optimizer-result-title" v-fade-up="{ delay: 200 }">
          <div class="optimizer-panel-head">
            <div>
              <h2 id="optimizer-result-title">优化结果</h2>
              <p>复制后可作为图像生成、写作或办公类 AI 工具的输入草稿，正式使用前请自行复核事实、权利和合规边界。</p>
            </div>
            <button class="btn btn-soft" type="button" :disabled="!optimizedPrompt" @click="copyOptimizedPrompt">
              <Copy aria-hidden="true" />
              {{ copied ? '已复制' : '复制结果' }}
            </button>
          </div>

          <pre v-if="optimizedPrompt" class="optimizer-output">{{ optimizedPrompt }}</pre>
          <div v-else-if="loading" class="empty-state optimizer-empty">
            <Loader2 class="spinner" aria-hidden="true" />
            <strong>AI 正在优化提示词</strong>
            <p>系统会结合当前场景补齐角色、任务、约束、输出格式和质量检查。</p>
          </div>
          <div v-else-if="optimizeError" class="empty-state optimizer-empty optimizer-error">
            <WandSparkles aria-hidden="true" />
            <strong>优化失败</strong>
            <p>{{ optimizeError }}</p>
          </div>
          <div v-else class="empty-state optimizer-empty">
            <WandSparkles aria-hidden="true" />
            <strong>优化后的提示词草稿会显示在这里</strong>
            <p>输入原始提示词并点击“开始优化”，后端 AI 会补齐角色、任务、约束和输出格式。</p>
          </div>
        </section>

        <section class="card optimizer-history" aria-labelledby="optimizer-history-title" v-fade-up="{ delay: 300 }">
          <div class="optimizer-panel-head">
            <div>
              <h2 id="optimizer-history-title">
                <History aria-hidden="true" />
                历史记录
              </h2>
              <p>保留最近 10 条优化记录，点击任意记录可恢复到工作台。</p>
            </div>
            <button class="icon-button" type="button" aria-label="清空历史记录" :disabled="!historyItems.length" @click="clearHistory">
              <Trash2 aria-hidden="true" />
            </button>
          </div>

          <div v-if="historyItems.length" class="optimizer-history-list">
            <button v-for="item in historyItems" :key="item.id" type="button" @click="useHistoryItem(item)">
              <span class="tag">{{ item.mode }}</span>
              <strong>{{ item.source }}</strong>
              <small>{{ item.createdAt }} · {{ item.engine || '后端 AI' }}</small>
            </button>
          </div>
          <div v-else class="empty-state optimizer-empty">
            <CheckCircle2 aria-hidden="true" />
            <strong>暂无历史记录</strong>
            <p>完成一次优化后，记录会自动保存在当前浏览器中。</p>
          </div>
        </section>
      </div>
    </section>

    <div v-if="notice" class="toast" role="status" aria-live="polite">{{ notice }}</div>
  </main>
</template>
