<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { Lightbulb } from 'lucide-vue-next'
import Toast from '../components/Toast.vue'
import GalleryDrawer from '../components/generate/GalleryDrawer.vue'
import DedicatedImageTools from '../components/generate/DedicatedImageTools.vue'
import GenerateToolboxNav from '../components/generate/GenerateToolboxNav.vue'
import GenerateOutputGrid from '../components/generate/GenerateOutputGrid.vue'
import GenerateToolPanel from '../components/generate/GenerateToolPanel.vue'
import ImagePreviewModal from '../components/generate/ImagePreviewModal.vue'
import { useGenerationTask } from '../composables/useGenerationTask'
import '../assets/generate.css'

const task = useGenerationTask()

const {
  batchMode,
  footerTipText,
  notice,
  output,
} = task

const outputPanelRef = ref(null)
const activeTool = ref('generate')
const isGenerateWorkspace = computed(() => activeTool.value === 'generate')

function scrollOutputIntoView() {
  if (!window.matchMedia('(max-width: 820px)').matches) return
  nextTick(() => {
    const target = outputPanelRef.value?.$el
    target?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  })
}

watch(
  () => output.value.length,
  (nextCount, previousCount) => {
    if (previousCount === 0 && nextCount > 0) scrollOutputIntoView()
  },
)
</script>

<template>
  <main class="page generate-page" :class="{ 'batch-mode-page': batchMode }">
    <section class="section-tight">
      <div class="container">
        <GenerateToolboxNav v-model:active-tool="activeTool" />

        <div v-if="isGenerateWorkspace" class="generator-layout" v-fade-up="{ delay: 100 }">
          <GenerateToolPanel :task="task" />

          <GenerateOutputGrid ref="outputPanelRef" :task="task" />
        </div>

        <div v-else class="image-processing-layout" v-fade-up="{ delay: 100 }">
          <DedicatedImageTools :task="task" :active-tool-key="activeTool" />

          <GenerateOutputGrid ref="outputPanelRef" :task="task" />
        </div>

        <p class="tip generate-footer-tip">
          <Lightbulb aria-hidden="true" />
          <span>{{ footerTipText }}</span>
        </p>
      </div>
    </section>

    <GalleryDrawer :task="task" />
    <ImagePreviewModal :task="task" />

    <Toast :message="notice" />
  </main>
</template>
