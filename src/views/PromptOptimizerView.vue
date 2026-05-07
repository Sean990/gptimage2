<script setup>
import { computed, onMounted, ref } from 'vue'
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

const maxLength = 5000
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
const copied = ref(false)
const historyItems = ref([])

const activeModeItem = computed(() => modes.find((item) => item.id === activeMode.value) || modes[0])
const charCount = computed(() => inputPrompt.value.length)
const canOptimize = computed(() => inputPrompt.value.trim().length > 0 && charCount.value <= maxLength && !loading.value)
const remainingCount = computed(() => Math.max(0, 10 - historyItems.value.length))
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
}

function buildOptimizedPrompt(rawPrompt) {
  const normalizedPrompt = rawPrompt.trim()
  const modeMap = {
    image: {
      role: '你是一名资深视觉创意总监和 AI 图像提示词工程师。',
      task: '请根据以下需求生成高质量图像，并优先保证主体清晰、构图稳定、光线真实、材质细节可信。',
      output: '输出要求：使用中文描述；包含主体、环境、构图、镜头、光线、色彩、材质、画幅比例和负面约束；避免多余解释。',
      checks: ['主体身份与动作明确', '画面风格和商业用途清晰', '补充真实摄影或设计质感', '加入可执行的画幅与质量约束'],
    },
    writing: {
      role: '你是一名经验丰富的中文内容策略师。',
      task: '请围绕以下需求生成可直接使用的文案，并兼顾表达清晰度、说服力和可读性。',
      output: '输出要求：先给标题，再给正文；语气自然专业；重点信息前置；控制冗余表达；必要时使用分点结构。',
      checks: ['明确目标受众', '说明写作目的', '限定语气和篇幅', '给出可直接发布的格式'],
    },
    work: {
      role: '你是一名高效的业务助理，擅长把模糊任务拆成可执行方案。',
      task: '请处理以下任务，先澄清目标，再输出结构化结果，并标出关键假设。',
      output: '输出要求：按背景、目标、步骤、交付物、风险检查的顺序回答；遇到缺失信息时先列出合理假设。',
      checks: ['补齐任务背景', '拆分执行步骤', '定义交付格式', '加入质量检查标准'],
    },
  }
  const config = modeMap[activeMode.value] || modeMap.image
  const checklist = config.checks.map((item, index) => `${index + 1}. ${item}`).join('\n')

  return `${config.role}

原始需求：
${normalizedPrompt}

任务说明：
${config.task}

约束条件：
- 如果需求存在歧义，先采用最常见的专业场景进行补全。
- 不编造无法确认的具体事实、品牌授权或数据。
- 输出应当可以直接复制给 AI 使用。

质量检查：
${checklist}

${config.output}`
}

function saveHistory(nextPrompt) {
  const nextItem = {
    id: Date.now(),
    mode: activeModeItem.value.label,
    source: inputPrompt.value.trim(),
    result: nextPrompt,
    createdAt: new Date().toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }),
  }

  historyItems.value = [nextItem, ...historyItems.value].slice(0, 10)
  localStorage.setItem('promptOptimizerHistory', JSON.stringify(historyItems.value))
}

async function optimizePrompt() {
  if (!canOptimize.value) return

  loading.value = true
  optimizedPrompt.value = ''
  await new Promise((resolve) => window.setTimeout(resolve, 520))
  const nextPrompt = buildOptimizedPrompt(inputPrompt.value)
  optimizedPrompt.value = nextPrompt
  saveHistory(nextPrompt)
  loading.value = false
  showNotice('提示词已优化')
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
}

function clearHistory() {
  historyItems.value = []
  localStorage.removeItem('promptOptimizerHistory')
  showNotice('历史记录已清空')
}

onMounted(() => {
  try {
    historyItems.value = JSON.parse(localStorage.getItem('promptOptimizerHistory') || '[]')
  } catch {
    historyItems.value = []
  }
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
          <p>快速提升你的提示词质量，让 AI 输出更精准。输入原始想法，选择使用场景，一键生成结构更清晰的专业提示词。</p>
        </div>

        <div class="optimizer-layout">
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
              <h2>今日剩余免费次数</h2>
              <strong>{{ remainingCount }}</strong>
              <p>本地演示按历史记录模拟次数，不会消耗真实积分。</p>
            </section>
          </aside>
        </div>

        <section class="card optimizer-result" aria-labelledby="optimizer-result-title">
          <div class="optimizer-panel-head">
            <div>
              <h2 id="optimizer-result-title">优化结果</h2>
              <p>复制后可直接用于图像生成、写作或办公类 AI 工具。</p>
            </div>
            <button class="btn btn-soft" type="button" :disabled="!optimizedPrompt" @click="copyOptimizedPrompt">
              <Copy aria-hidden="true" />
              {{ copied ? '已复制' : '复制结果' }}
            </button>
          </div>

          <pre v-if="optimizedPrompt" class="optimizer-output">{{ optimizedPrompt }}</pre>
          <div v-else class="empty-state optimizer-empty">
            <WandSparkles aria-hidden="true" />
            <strong>优化后的提示词会显示在这里</strong>
            <p>输入原始提示词并点击“开始优化”，系统会补齐角色、任务、约束和输出格式。</p>
          </div>
        </section>

        <section class="card optimizer-history" aria-labelledby="optimizer-history-title">
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
              <small>{{ item.createdAt }}</small>
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

    <div v-if="notice" class="toast">{{ notice }}</div>
  </main>
</template>
