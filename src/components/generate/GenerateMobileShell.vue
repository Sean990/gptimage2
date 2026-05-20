<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Eraser, Expand, ImagePlus, Maximize2, Scissors } from 'lucide-vue-next'
import BottomSheet from './BottomSheet.vue'
import BottomTabBar from './BottomTabBar.vue'
import PromptSummaryCard from './PromptSummaryCard.vue'
import GenerateOutputGrid from './GenerateOutputGrid.vue'
import GenerateToolPanel from './GenerateToolPanel.vue'
import DedicatedImageTools from './DedicatedImageTools.vue'

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

const emit = defineEmits(['update:activeTool'])
const router = useRouter()

const sheetOpen = ref(false)
const sheetMode = ref('settings')
const isGenerateWorkspace = computed(() => props.activeTool === 'generate')

const {
  prompt,
  mode,
  normalizedImageCount,
  activeModelLabel,
  loading,
  generate,
  openGallery,
} = props.task

const toolItems = [
  { key: 'generate', title: 'AI 生图', caption: '提示词创作', icon: ImagePlus },
  { key: 'upscale', title: '高清放大', caption: '增强细节、纹理和清晰度', icon: Maximize2 },
  { key: 'outpaint', title: '自由扩图', caption: '延展边界并自然补全画面', icon: Expand },
  { key: 'cutout', title: '智能抠图', caption: '主体分离与透明背景输出', icon: Scissors },
  { key: 'erase', title: '一键消除', caption: '移除杂物并智能修补背景', icon: Eraser },
]

const activeToolMeta = computed(() => toolItems.find((item) => item.key === props.activeTool) || toolItems[0])
const sheetTitle = computed(() => (sheetMode.value === 'tools' ? '选择工具' : activeToolMeta.value.title))

function openSheet(modeName = 'settings') {
  sheetMode.value = typeof modeName === 'string' ? modeName : 'settings'
  sheetOpen.value = true
}

function closeSheet() {
  sheetOpen.value = false
}

function handleGenerate() {
  closeSheet()
  generate()
}

function handleOpenGallery() {
  closeSheet()
  openGallery()
}

function handleOpenProfile() {
  closeSheet()
  router.push('/profile')
}

function updateActiveTool(tool) {
  emit('update:activeTool', tool)
}

function openCreateSettings() {
  updateActiveTool('generate')
  openSheet('settings')
}

function openToolPicker() {
  openSheet('tools')
}

function selectTool(tool) {
  updateActiveTool(tool.key)
  openSheet('settings')
}
</script>

<template>
  <div class="generate-mobile-shell">
    <div class="mobile-output-section">
      <GenerateOutputGrid :task="task" compact />
    </div>

    <div class="mobile-summary-section">
      <PromptSummaryCard
        :prompt="prompt"
        :mode="mode"
        :image-count="normalizedImageCount"
        :model-label="activeModelLabel"
        :active-tool-label="activeToolMeta.title"
        :is-generate-workspace="isGenerateWorkspace"
        @click="openSheet"
      />
    </div>

    <BottomSheet :open="sheetOpen" :title="sheetTitle" @update:open="sheetOpen = $event">
      <div class="mobile-sheet-content">
        <div v-if="sheetMode === 'tools'" class="mobile-tool-picker" role="listbox" aria-label="图片处理工具">
          <button
            v-for="tool in toolItems"
            :key="tool.key"
            type="button"
            class="mobile-tool-picker-item"
            :class="{ active: activeTool === tool.key }"
            role="option"
            :aria-selected="activeTool === tool.key"
            @click="selectTool(tool)"
          >
            <span class="mobile-tool-picker-icon" aria-hidden="true">
              <component :is="tool.icon" />
            </span>
            <span>
              <strong>{{ tool.title }}</strong>
              <small>{{ tool.caption }}</small>
            </span>
          </button>
        </div>
        <GenerateToolPanel v-else-if="isGenerateWorkspace" :task="task" />
        <DedicatedImageTools v-else :task="task" :active-tool-key="activeTool" />
      </div>
    </BottomSheet>

    <BottomTabBar
      :active-tool="activeTool"
      :loading="loading"
      @update:active-tool="updateActiveTool"
      @open-create="openCreateSettings"
      @open-tools="openToolPicker"
      @generate="handleGenerate"
      @open-gallery="handleOpenGallery"
      @open-profile="handleOpenProfile"
    />
  </div>
</template>
