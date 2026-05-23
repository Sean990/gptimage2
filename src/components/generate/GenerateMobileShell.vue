<script setup>
import { computed } from 'vue'
import { ArrowDownToLine, Eraser, Expand, GalleryHorizontal, ImagePlus, Maximize2, Scissors } from 'lucide-vue-next'
import GenerateOutputGrid from './GenerateOutputGrid.vue'
import GenerateToolPanel from './GenerateToolPanel.vue'
import DedicatedImageTools from './DedicatedImageTools.vue'
import '../../assets/generate-mobile.css'

const props = defineProps({
  task: {
    type: Object,
    required: true,
  },
  activeTool: {
    type: String,
    default: 'generate',
  },
})

const emit = defineEmits(['update:activeTool', 'use-output-as-tool'])

const isGenerateWorkspace = computed(() => props.activeTool === 'generate')

const { activeMode, activeModelLabel, creditCost, gallery, normalizedImageCount, openGallery, output, outputLoading } =
  props.task

const toolItems = [
  { key: 'generate', title: 'AI 生图', caption: '提示词创作与参考图生成', icon: ImagePlus },
  { key: 'upscale', title: '高清放大', caption: '增强细节、纹理和清晰度', icon: Maximize2 },
  { key: 'outpaint', title: '自由扩图', caption: '延展边界并自然补全画面', icon: Expand },
  { key: 'cutout', title: '智能抠图', caption: '主体分离与透明背景输出', icon: Scissors },
  { key: 'erase', title: '一键消除', caption: '移除杂物并智能修补背景', icon: Eraser },
]

const activeToolMeta = computed(() => toolItems.find((item) => item.key === props.activeTool) || toolItems[0])
const hasOutputActivity = computed(() => outputLoading.value || output.value.length > 0)
const outputStatusText = computed(() => {
  if (outputLoading.value) return '任务进行中，结果完成后会自动刷新'
  if (output.value.length) return `${output.value.length} 张结果可预览和下载`
  return '提交任务后在这里查看结果'
})
const galleryStatusText = computed(() => {
  if (!gallery.value.length) return '暂无记录'
  return `${gallery.value.length} 组记录`
})
const activeModeText = computed(() =>
  isGenerateWorkspace.value ? activeMode.value.label : activeToolMeta.value.caption,
)

function updateActiveTool(tool) {
  emit('update:activeTool', tool)
}

function useOutputAsTool(payload) {
  emit('use-output-as-tool', payload)
}

function scrollToOutput() {
  if (typeof document === 'undefined') return
  const target = document.querySelector('.mobile-output-section')
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  target?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' })
}
</script>

<template>
  <div class="generate-mobile-shell mobile-workbench-shell">
    <header class="mobile-workbench-header" aria-labelledby="mobile-workbench-title">
      <div class="mobile-workbench-title">
        <span>AI 图像工作台</span>
        <h1 id="mobile-workbench-title">生成与处理</h1>
      </div>
      <button class="mobile-gallery-button" type="button" @click="openGallery">
        <GalleryHorizontal aria-hidden="true" />
        <span>{{ galleryStatusText }}</span>
      </button>
    </header>

    <div class="mobile-tool-strip-wrap">
      <nav class="mobile-tool-strip" role="tablist" aria-label="图像工具切换">
        <button
          v-for="tool in toolItems"
          :key="tool.key"
          type="button"
          class="mobile-tool-strip-item"
          :class="{ active: activeTool === tool.key }"
          role="tab"
          :aria-selected="activeTool === tool.key"
          @click="updateActiveTool(tool.key)"
        >
          <span class="mobile-tool-strip-icon" aria-hidden="true">
            <component :is="tool.icon" />
          </span>
          <strong>{{ tool.title }}</strong>
        </button>
      </nav>
    </div>

    <section class="mobile-workbench-panel" :aria-label="`${activeToolMeta.title}参数面板`">
      <div class="mobile-panel-head">
        <div class="mobile-panel-title-row">
          <div>
            <span>{{ activeToolMeta.title }}</span>
            <h2>{{ activeModeText }}</h2>
          </div>
          <button class="mobile-panel-output-jump" type="button" @click="scrollToOutput">
            <ArrowDownToLine aria-hidden="true" />
            <span>{{ hasOutputActivity ? '查看结果' : '结果区' }}</span>
          </button>
        </div>
        <dl class="mobile-panel-metrics">
          <div>
            <dt>模型</dt>
            <dd>{{ activeModelLabel }}</dd>
          </div>
          <div>
            <dt>数量</dt>
            <dd>{{ normalizedImageCount }} 张</dd>
          </div>
          <div>
            <dt>积分</dt>
            <dd>{{ creditCost }}</dd>
          </div>
        </dl>
      </div>

      <GenerateToolPanel v-if="isGenerateWorkspace" :task="task" />
      <DedicatedImageTools v-else :task="task" :active-tool-key="activeTool" />
    </section>

    <section class="mobile-output-section mobile-output-dock" aria-label="生成结果">
      <div class="mobile-output-dock-head">
        <div>
          <span>结果预览</span>
          <strong>{{ outputStatusText }}</strong>
        </div>
        <button type="button" class="mobile-output-gallery-link" @click="openGallery">
          <GalleryHorizontal aria-hidden="true" />
          图库
        </button>
      </div>
      <GenerateOutputGrid :task="task" compact @use-as-tool="useOutputAsTool" />
    </section>
  </div>
</template>
