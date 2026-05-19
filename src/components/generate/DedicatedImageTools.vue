<script setup>
import { computed, ref } from 'vue'
import {
  ArrowRight,
  CheckCircle2,
  Expand,
  ImagePlus,
  Link as LinkIcon,
  Loader2,
  Maximize2,
  Scissors,
  Sparkles,
  Trash2,
} from 'lucide-vue-next'
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

const tools = [
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
    prompt: '请基于原图进行高清放大和细节增强，保持主体、构图与风格不变，提升清晰度、纹理、边缘质量和整体画面质感。',
    urlPlaceholder: '粘贴需要高清放大的图片 URL',
    notePlaceholder: '可填写清晰度、纹理或边缘增强重点',
    actionLabel: '开始高清放大',
    metric: '4K 输出',
    result: '增强清晰度',
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
    prompt:
      '请基于原图向画面外自然扩展场景，保持主体、透视、光线、色调和材质一致，补全边缘空间，让扩展区域看起来像原图本身的一部分。',
    urlPlaceholder: '粘贴需要扩图的图片 URL',
    notePlaceholder: '可填写向左、向右、横版、竖版或场景延展要求',
    actionLabel: '开始自由扩图',
    metric: '自动比例',
    result: '延展画面',
  },
  {
    key: 'cutout',
    title: '一键抠图',
    eyebrow: '主体分离',
    sourceLabel: '主体图',
    icon: Scissors,
    mode: 'image',
    aspectRatio: 'auto',
    resolution: '4K',
    outputFormat: 'png',
    prompt: '请将原图主体完整抠出，移除背景并输出干净边缘，保留主体真实细节、发丝和半透明区域，背景保持透明或纯净。',
    urlPlaceholder: '粘贴需要抠图的图片 URL',
    notePlaceholder: '可填写主体范围、边缘保留或背景处理要求',
    actionLabel: '开始一键抠图',
    metric: 'PNG 输出',
    result: '主体分离',
  },
]

const activeSourceToolKey = ref('')
const toolDrafts = ref(
  Object.fromEntries(
    tools.map((tool) => [
      tool.key,
      {
        url: '',
        note: '',
      },
    ]),
  ),
)

function getDraft(tool) {
  return toolDrafts.value[tool.key]
}

const visibleTools = computed(() => {
  if (!props.activeToolKey) return tools
  return tools.filter((tool) => tool.key === props.activeToolKey)
})

function getCostLabel() {
  return creditCost.value > 0 ? `约 ${creditCost.value} 积分` : '按成功扣分'
}

function buildToolPrompt(tool) {
  const note = getDraft(tool).note.trim()
  if (!note) return tool.prompt
  return `${tool.prompt}\n补充要求：${note}`
}

function applyToolSettings(tool) {
  batchMode.value = false
  mode.value = tool.mode
  aspectRatio.value = tool.aspectRatio
  resolution.value = tool.resolution
  outputFormat.value = tool.outputFormat
  background.value = 'auto'
  quality.value = 'high'
  prompt.value = buildToolPrompt(tool)
  closeSelectMenu()
}

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

async function submitTool(tool) {
  if (activeSourceToolKey.value !== tool.key || !referenceCount.value) {
    showNotice(`请先在${tool.title}板块添加${tool.sourceLabel}`)
    return
  }
  applyToolSettings(tool)
  await generate()
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
      <p>高清放大、自由扩图、一键抠图分别独立提交，结果进入生成结果与图库。</p>
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
            <em>{{ getCostLabel() }}</em>
          </div>
        </header>

        <div class="image-tool-body">
          <label class="image-tool-upload" :for="`image-tool-upload-${tool.key}`">
            <ImagePlus aria-hidden="true" />
            <span>上传{{ tool.sourceLabel }}</span>
            <small>JPG / PNG / WEBP</small>
            <input
              :id="`image-tool-upload-${tool.key}`"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              @change="handleToolFiles(tool, $event)"
            />
          </label>

          <div class="image-tool-url-box">
            <label class="image-tool-field">
              <span>{{ tool.sourceLabel }} URL</span>
              <div class="image-tool-url-row">
                <input
                  :value="getDraft(tool).url"
                  type="url"
                  :placeholder="tool.urlPlaceholder"
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
        </div>

        <label class="image-tool-field image-tool-note">
          <span>处理要求</span>
          <textarea
            :value="getDraft(tool).note"
            :placeholder="tool.notePlaceholder"
            rows="3"
            @input="getDraft(tool).note = $event.target.value"
          ></textarea>
        </label>

        <div class="image-tool-footer">
          <span>{{ tool.result }}</span>
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
            <ArrowRight v-if="!(loading && activeSourceToolKey === tool.key)" aria-hidden="true" />
          </button>
        </div>
      </article>
    </div>
  </section>
</template>
