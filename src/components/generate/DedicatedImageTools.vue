<script setup>
import { computed, ref, watch } from 'vue'
import {
  CheckCircle2,
  Eraser,
  Expand,
  Gem,
  ImagePlus,
  Link as LinkIcon,
  Loader2,
  Maximize2,
  Scissors,
  Sparkles,
  Trash2,
} from 'lucide-vue-next'
import FloatingActionBar from './FloatingActionBar.vue'
import { isSupportedImageUrl } from '../../composables/useReferenceImages'

const props = defineProps({
  task: {
    type: Object,
    required: true,
  },
  activeToolKey: {
    type: String,
    default: '',
  },
})

const {
  addUrlReference,
  aspectRatio,
  background,
  batchMode,
  clearReferences,
  closeSelectMenu,
  creditCost,
  generate,
  getReferencePreviewImages,
  loading,
  mode,
  openImagePreview,
  outputFormat,
  processReferenceFiles,
  prompt,
  quality,
  referenceCount,
  resolution,
  showNotice,
  urlInput,
} = props.task

const toolConfigs = [
  {
    key: 'upscale',
    title: '高清放大',
    eyebrow: '清晰度增强',
    sourceLabel: '原图',
    icon: Maximize2,
    mode: 'image',
    aspectRatio: 'auto',
    resolution: '4K',
    outputFormat: 'png',
    background: 'auto',
    actionLabel: '开始高清放大',
    metric: '最高 4K 输出',
    urlPlaceholder: '粘贴需要高清放大的图片 URL',
    notePlaceholder: '可补充需要重点保留的材质、文字、边缘或人物细节',
    prompt:
      '请基于原图进行高清放大和细节增强，保持主体、构图、颜色、透视和风格不变，提升清晰度、纹理、边缘质量和整体画面质感。',
    tips: ['不改构图', '保留文字边缘', '适合电商、人像、作品图'],
    params: [
      {
        label: '放大倍数',
        key: 'scale',
        options: [
          { label: '2X', value: '2x' },
          { label: '4X', value: '4x' },
        ],
      },
      {
        label: '优化模式',
        key: 'enhanceMode',
        options: [
          { label: '通用增强', value: 'general' },
          { label: '人像修复', value: 'portrait' },
          { label: '商品锐化', value: 'product' },
          { label: '插画动漫', value: 'illustration' },
        ],
      },
      {
        label: '锐化强度',
        key: 'sharpness',
        options: [
          { label: '自然', value: 'natural' },
          { label: '均衡', value: 'balanced' },
          { label: '更锐利', value: 'crisp' },
        ],
      },
      {
        label: '面部修复',
        key: 'faceRestore',
        options: [
          { label: '自动', value: 'auto' },
          { label: '开启', value: 'on' },
          { label: '关闭', value: 'off' },
        ],
      },
    ],
  },
  {
    key: 'outpaint',
    title: '自由扩图',
    eyebrow: '画面边界延展',
    sourceLabel: '原图',
    icon: Expand,
    mode: 'edit',
    aspectRatio: 'auto',
    resolution: '4K',
    outputFormat: 'png',
    background: 'auto',
    actionLabel: '开始自由扩图',
    metric: '自动补全画面',
    urlPlaceholder: '粘贴需要扩图的图片 URL',
    notePlaceholder: '可补充场景、背景、光线、镜头或不希望改变的区域',
    prompt:
      '请基于原图向画面外自然扩展场景，保持主体、透视、光线、色调、材质和镜头语言一致，补全边缘空间，让扩展区域看起来像原图本身的一部分。',
    tips: ['适配横竖版', '自然补全背景', '保持主体不变形'],
    params: [
      {
        label: '扩图方向',
        key: 'direction',
        options: [
          { label: '四周', value: '四周' },
          { label: '向左', value: '向左' },
          { label: '向右', value: '向右' },
          { label: '向上', value: '向上' },
          { label: '向下', value: '向下' },
        ],
      },
      {
        label: '目标比例',
        key: 'targetRatio',
        options: [
          { label: '原图比例', value: '原图比例' },
          { label: '1:1', value: '1:1' },
          { label: '4:3', value: '4:3' },
          { label: '3:4', value: '3:4' },
          { label: '16:9', value: '16:9' },
          { label: '9:16', value: '9:16' },
        ],
      },
      {
        label: '补全风格',
        key: 'fillStyle',
        options: [
          { label: '匹配原图', value: 'match' },
          { label: '更干净', value: 'clean' },
          { label: '更丰富', value: 'rich' },
        ],
      },
      {
        label: '主体处理',
        key: 'protectSubject',
        options: [
          { label: '保护主体', value: 'yes' },
          { label: '允许微调', value: 'soft' },
        ],
      },
    ],
  },
  {
    key: 'cutout',
    title: '智能抠图',
    eyebrow: '主体智能分离',
    sourceLabel: '主体图',
    icon: Scissors,
    mode: 'image',
    aspectRatio: 'auto',
    resolution: '4K',
    outputFormat: 'png',
    background: 'auto',
    actionLabel: '开始智能抠图',
    metric: 'PNG 透明输出',
    urlPlaceholder: '粘贴需要抠图的图片 URL',
    notePlaceholder: '可补充主体范围、边缘保留、发丝细节或背景处理要求',
    prompt:
      '请将原图主体完整、干净地分离出来，保留真实细节、发丝、半透明区域和自然边缘，移除背景并输出适合继续设计使用的图片。',
    tips: ['智能识别主体', '保留发丝细节', '适合商品和人物'],
    params: [
      {
        label: '识别主体',
        key: 'subject',
        options: [
          { label: '自动识别', value: 'auto' },
          { label: '人物', value: 'person' },
          { label: '商品', value: 'product' },
          { label: '动物/复杂主体', value: 'complex' },
        ],
      },
      {
        label: '边缘处理',
        key: 'edge',
        options: [
          { label: '自然边缘', value: 'natural' },
          { label: '发丝精修', value: 'hair' },
          { label: '硬边商品', value: 'hard' },
        ],
      },
      {
        label: '输出背景',
        key: 'bg',
        options: [
          { label: '透明 PNG', value: 'transparent' },
          { label: '纯白底', value: 'white' },
          { label: '浅灰底', value: 'light' },
        ],
      },
      {
        label: '阴影处理',
        key: 'shadow',
        options: [
          { label: '无阴影', value: 'none' },
          { label: '保留原阴影', value: 'keep' },
          { label: '轻微投影', value: 'soft' },
        ],
      },
    ],
  },
  {
    key: 'erase',
    title: '一键消除',
    eyebrow: '多余元素移除',
    sourceLabel: '待处理图',
    icon: Eraser,
    mode: 'edit',
    aspectRatio: 'auto',
    resolution: '4K',
    outputFormat: 'png',
    background: 'auto',
    actionLabel: '开始一键消除',
    metric: '智能修补背景',
    urlPlaceholder: '粘贴需要清理的图片 URL',
    notePlaceholder: '可补充消除对象位置、保留元素和背景修补偏好',
    prompt:
      '请从原图中移除指定的多余元素，并根据周围纹理、光影、透视和背景内容进行自然修补，保持画面真实、干净且看不出处理痕迹。',
    tips: ['移除路人杂物', '自然修补背景', '保留主体和构图'],
    extraInput: { label: '需要消除的内容', key: 'target', placeholder: '例如：右侧路人、桌面水印、背景杂物' },
    params: [
      {
        label: '修补方式',
        key: 'repair',
        options: [
          { label: '自然修补', value: 'natural' },
          { label: '纹理优先', value: 'texture' },
          { label: '背景干净', value: 'clean' },
        ],
      },
      {
        label: '保护内容',
        key: 'preserve',
        options: [
          { label: '保护主体', value: 'subject' },
          { label: '保护文字', value: 'text' },
          { label: '保护构图', value: 'composition' },
        ],
      },
      {
        label: '消除强度',
        key: 'strength',
        options: [
          { label: '轻度', value: 'light' },
          { label: '均衡', value: 'balanced' },
          { label: '强力', value: 'strong' },
        ],
      },
    ],
  },
]

const activeSourceToolKey = ref('')
const toolDrafts = ref({
  upscale: {
    url: '',
    note: '',
    scale: '2x',
    enhanceMode: 'general',
    sharpness: 'balanced',
    faceRestore: 'auto',
  },
  outpaint: {
    url: '',
    note: '',
    targetRatio: '原图比例',
    direction: '四周',
    fillStyle: 'match',
    protectSubject: 'yes',
  },
  cutout: {
    url: '',
    note: '',
    subject: 'auto',
    edge: 'natural',
    bg: 'transparent',
    shadow: 'none',
  },
  erase: {
    url: '',
    note: '',
    target: '',
    repair: 'natural',
    preserve: 'subject',
    strength: 'balanced',
  },
})

const activeToolConfig = computed(() => toolConfigs.find((tool) => tool.key === props.activeToolKey) || null)

const visibleTools = computed(() => {
  if (!props.activeToolKey) return toolConfigs
  return activeToolConfig.value ? [activeToolConfig.value] : []
})

function getDraft(tool) {
  return toolDrafts.value[tool.key]
}

function findOptionLabel(options, value) {
  return options.find((option) => option.value === value)?.label || value
}

function setDraftValue(tool, key, value) {
  getDraft(tool)[key] = value
}

function buildToolPrompt(tool) {
  const draft = getDraft(tool)
  const params =
    tool.key === 'erase'
      ? [
          `需要消除：${draft.target?.trim() || '按补充说明识别需要移除的多余元素'}`,
          ...tool.params.map((p) => `${p.label}：${findOptionLabel(p.options, draft[p.key])}`),
        ].join('；')
      : tool.params.map((p) => `${p.label}：${findOptionLabel(p.options, draft[p.key])}`).join('；')

  const note = draft.note.trim()
  return `${tool.prompt}\n【处理参数】${params}${note ? `\n【补充要求】${note}` : ''}`
}

function buildToolParams(tool) {
  const draft = getDraft(tool)
  const baseParams = {
    note: draft.note.trim(),
  }

  if (tool.key === 'upscale') {
    return {
      ...baseParams,
      scale: draft.scale,
      enhance_mode: draft.enhanceMode,
      sharpness: draft.sharpness,
      face_restore: draft.faceRestore,
    }
  }

  if (tool.key === 'outpaint') {
    return {
      ...baseParams,
      direction: draft.direction,
      target_ratio: draft.targetRatio,
      fill_style: draft.fillStyle,
      protect_subject: draft.protectSubject,
    }
  }

  if (tool.key === 'cutout') {
    return {
      ...baseParams,
      subject: draft.subject,
      edge: draft.edge,
      output_background: draft.bg,
      shadow: draft.shadow,
    }
  }

  if (tool.key === 'erase') {
    return {
      ...baseParams,
      target: draft.target.trim(),
      repair: draft.repair,
      preserve: draft.preserve,
      strength: draft.strength,
    }
  }

  return baseParams
}

function applyToolSettings(tool) {
  batchMode.value = false
  mode.value = tool.mode
  aspectRatio.value = tool.aspectRatio
  resolution.value = tool.resolution
  outputFormat.value = tool.outputFormat
  background.value = tool.key === 'cutout' && getDraft(tool).bg !== 'transparent' ? 'opaque' : tool.background
  quality.value = 'high'
  prompt.value = buildToolPrompt(tool)
  closeSelectMenu()
}

watch(
  activeToolConfig,
  (tool) => {
    if (tool) applyToolSettings(tool)
  },
  { immediate: true },
)

function getToolSources(tool) {
  if (activeSourceToolKey.value !== tool.key) return []
  return getReferencePreviewImages()
}

async function handleToolFiles(tool, event) {
  try {
    const files = event.target.files
    if (!files?.length) return
    clearReferences({ silent: true })
    activeSourceToolKey.value = tool.key
    applyToolSettings(tool)
    await processReferenceFiles(files)
  } finally {
    event.target.value = ''
  }
}

function addToolUrl(tool) {
  const draft = getDraft(tool)
  const nextUrl = draft.url.trim()
  if (!nextUrl) {
    showNotice(`请先输入${tool.sourceLabel} URL`)
    return
  }
  if (!isSupportedImageUrl(nextUrl)) {
    showNotice('请输入 http 或 https 开头的图片 URL')
    return
  }

  clearReferences({ silent: true })
  activeSourceToolKey.value = tool.key
  applyToolSettings(tool)
  urlInput.value = nextUrl
  addUrlReference()
  draft.url = ''
}

function clearToolSources(tool) {
  if (activeSourceToolKey.value !== tool.key) return
  clearReferences({ silent: false })
  activeSourceToolKey.value = ''
}

function validateToolBeforeSubmit(tool) {
  if (activeSourceToolKey.value !== tool.key || !referenceCount.value) {
    showNotice(`请先在${tool.title}板块添加${tool.sourceLabel}`)
    return false
  }
  if (tool.key === 'erase' && !getDraft(tool).target.trim() && !getDraft(tool).note.trim()) {
    showNotice('请描述需要消除的内容，例如“右侧路人”或“桌面水印”')
    return false
  }
  return true
}

async function submitTool(tool) {
  if (!validateToolBeforeSubmit(tool)) return
  applyToolSettings(tool)
  await generate({
    n: 1,
    tool: tool.key,
    action: tool.key,
    tool_params: buildToolParams(tool),
  })
}

const dragActive = ref('')

function onDragEnter(tool, event) {
  event.preventDefault()
  dragActive.value = tool.key
}

function onDragOver(tool, event) {
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
  dragActive.value = tool.key
}

function onDragLeave(tool, event) {
  if (event.currentTarget.contains(event.relatedTarget)) return
  dragActive.value = ''
}

async function onDrop(tool, event) {
  event.preventDefault()
  dragActive.value = ''
  const files = event.dataTransfer?.files
  if (!files?.length) return
  clearReferences({ silent: true })
  activeSourceToolKey.value = tool.key
  applyToolSettings(tool)
  await processReferenceFiles(files)
}
</script>

<template>
  <section
    id="image-tools"
    class="image-tools-section"
    :class="{ 'image-tools-section-single': props.activeToolKey }"
    aria-labelledby="image-tools-title"
  >
    <div v-if="!props.activeToolKey" class="image-tools-head">
      <div>
        <span>独立工具</span>
        <h2 id="image-tools-title">图片处理板块</h2>
      </div>
      <p>高清放大、自由扩图、智能抠图和一键消除分别独立提交，结果进入生成结果与图库。</p>
    </div>
    <h2 v-else id="image-tools-title" class="sr-only">图片处理板块</h2>

    <div class="image-tool-grid">
      <article v-for="tool in visibleTools" :key="tool.key" class="image-tool-panel" :class="`image-tool-${tool.key}`">
        <header class="image-tool-panel-head">
          <span class="image-tool-icon" aria-hidden="true">
            <component :is="tool.icon" />
          </span>
          <div>
            <span>{{ tool.eyebrow }}</span>
            <h3>{{ tool.title }}</h3>
          </div>
          <div class="image-tool-meta">
            <em>{{ tool.metric }}</em>
            <em>本次消耗 {{ creditCost > 0 ? creditCost : '按成功扣除' }} 积分</em>
          </div>
        </header>

        <div class="image-tool-tip-row" aria-label="工具特点">
          <span v-for="tip in tool.tips" :key="tip">{{ tip }}</span>
        </div>

        <div class="image-tool-body">
          <div class="image-tool-field image-tool-source-field">
            <span>{{ tool.sourceLabel }} ({{ getToolSources(tool).length }}/1)</span>
            <label :for="`image-tool-url-${tool.key}`">上传{{ tool.sourceLabel }}或输入图片 URL</label>
            <div class="image-tool-url-row">
              <input
                :id="`image-tool-url-${tool.key}`"
                :name="`${tool.key}_image_url`"
                :value="getDraft(tool).url"
                type="url"
                :placeholder="tool.urlPlaceholder"
                autocomplete="off"
                spellcheck="false"
                @input="getDraft(tool).url = $event.target.value"
              />
              <button
                class="icon-button"
                type="button"
                :aria-label="`添加${tool.title}图片 URL`"
                @click="addToolUrl(tool)"
              >
                <LinkIcon aria-hidden="true" />
              </button>
            </div>
          </div>
          <label
            class="upload-zone"
            :class="{ 'drag-over': dragActive === tool.key }"
            :for="`image-tool-upload-${tool.key}`"
            @dragenter="onDragEnter(tool, $event)"
            @dragover="onDragOver(tool, $event)"
            @dragleave="onDragLeave(tool, $event)"
            @drop="onDrop(tool, $event)"
          >
            <ImagePlus aria-hidden="true" />
            <strong>点击上传{{ tool.sourceLabel }}</strong>
            <span>或拖拽图片到此区域</span>
            <span>JPG / PNG / WEBP，单次处理 1 张图片</span>
            <input
              :id="`image-tool-upload-${tool.key}`"
              :name="`${tool.key}_image`"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              @change="handleToolFiles(tool, $event)"
            />
          </label>
          <div v-if="getToolSources(tool).length" class="image-tool-source-preview">
            <button
              v-for="(image, index) in getToolSources(tool)"
              :key="`${tool.key}-${image.src}`"
              type="button"
              :aria-label="`预览${tool.title}素材 ${image.title}`"
              @click="openImagePreview(getToolSources(tool), index, `${tool.title}素材`)"
            >
              <img :src="image.src" :alt="image.title" />
              <CheckCircle2 aria-hidden="true" />
            </button>
            <button class="image-tool-clear" type="button" @click="clearToolSources(tool)">
              <Trash2 aria-hidden="true" />
              清空素材
            </button>
          </div>
        </div>

        <p class="compliance-hint image-tool-source-hint">
          请仅上传本人或已获授权的图片。包含人脸、证件、商标、作品或隐私信息的素材，需先确认授权。
        </p>

        <div class="tool-params-group" aria-label="处理参数">
          <div v-if="tool.extraInput" class="field tool-param-wide">
            <label :for="`${tool.key}-extra`">{{ tool.extraInput.label }}</label>
            <input
              :id="`${tool.key}-extra`"
              :name="`${tool.key}_${tool.extraInput.key}`"
              :value="getDraft(tool)[tool.extraInput.key]"
              type="text"
              :placeholder="tool.extraInput.placeholder"
              @input="getDraft(tool)[tool.extraInput.key] = $event.target.value"
            />
          </div>
          <div v-for="param in tool.params" :key="param.key" class="field">
            <label>{{ param.label }}</label>
            <div class="choice-pills">
              <button
                v-for="option in param.options"
                :key="option.value"
                type="button"
                :class="{ active: getDraft(tool)[param.key] === option.value }"
                @click="setDraftValue(tool, param.key, option.value)"
              >
                {{ option.label }}
              </button>
            </div>
          </div>
        </div>

        <label class="image-tool-field image-tool-note">
          <span>处理要求</span>
          <textarea
            :name="`${tool.key}_note`"
            :value="getDraft(tool).note"
            :placeholder="tool.notePlaceholder"
            rows="3"
            @input="getDraft(tool).note = $event.target.value"
          ></textarea>
        </label>

        <FloatingActionBar
          slot-class="image-tool-actions-slot"
          bar-class="image-tool-actions"
          :aria-label="`${tool.title}快捷生成操作`"
        >
          <template #default>
            <button
              class="btn btn-primary image-tool-submit"
              type="button"
              :aria-busy="loading && activeSourceToolKey === tool.key"
              :disabled="loading"
              @click="submitTool(tool)"
            >
              <Loader2 v-if="loading && activeSourceToolKey === tool.key" class="spinner" aria-hidden="true" />
              <Sparkles v-else aria-hidden="true" />
              {{ loading && activeSourceToolKey === tool.key ? '提交中...' : tool.actionLabel }}
            </button>
            <span class="generation-cost-pill">
              <Gem aria-hidden="true" />
              本次消耗 {{ creditCost > 0 ? `${creditCost} 积分` : '按成功扣除' }}
            </span>
          </template>
        </FloatingActionBar>
      </article>
    </div>
  </section>
</template>
