<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Lightbulb } from 'lucide-vue-next'
import Toast from '../components/Toast.vue'
import GalleryDrawer from '../components/generate/GalleryDrawer.vue'
import DedicatedImageTools from '../components/generate/DedicatedImageTools.vue'
import GenerateToolboxNav from '../components/generate/GenerateToolboxNav.vue'
import GenerateSideRail from '../components/generate/GenerateSideRail.vue'
import GenerateOutputGrid from '../components/generate/GenerateOutputGrid.vue'
import GenerateToolPanel from '../components/generate/GenerateToolPanel.vue'
import GenerateMobileShell from '../components/generate/GenerateMobileShell.vue'
import ImagePreviewModal from '../components/generate/ImagePreviewModal.vue'
import { useGenerationTask } from '../composables/useGenerationTask'
import '../assets/generate.css'

const outputPanelRef = ref(null)
const activeTool = ref('generate')
const isMobile = ref(false)
let mobileMediaQuery = null

const task = useGenerationTask({ onGalleryRecordUsed: handleGalleryRecordUsed })

const { batchMode, footerTipText, notice, output, resetGenerationOutput } = task

const isGenerateWorkspace = computed(() => activeTool.value === 'generate')
const outputSignature = computed(() => output.value.map((item) => item.src || item.url || item.title || '').join('|'))

function handleGalleryRecordUsed() {
  activeTool.value = 'generate'
  scrollOutputIntoView()
}

function selectTool(toolKey) {
  if (!toolKey || activeTool.value === toolKey) return
  resetGenerationOutput()
  activeTool.value = toolKey
}

function scrollOutputIntoView() {
  if (!isMobile.value || typeof document === 'undefined') return
  nextTick(() => {
    const target = outputPanelRef.value?.$el || document.querySelector('.mobile-output-section')
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    target?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'nearest' })
  })
}

function updateMobileState(event = mobileMediaQuery) {
  isMobile.value = Boolean(event?.matches)
}

watch(
  outputSignature,
  (nextSignature, previousSignature) => {
    if (nextSignature && nextSignature !== previousSignature) scrollOutputIntoView()
  },
)

onMounted(() => {
  mobileMediaQuery = window.matchMedia('(max-width: 820px)')
  updateMobileState()
  mobileMediaQuery.addEventListener('change', updateMobileState)
})

onBeforeUnmount(() => {
  mobileMediaQuery?.removeEventListener('change', updateMobileState)
})
</script>

<template>
  <main class="page generate-page" :class="{ 'batch-mode-page': batchMode, 'mobile-mode': isMobile }">
    <template v-if="isMobile">
      <GenerateMobileShell :task="task" :active-tool="activeTool" @update:active-tool="selectTool" />
    </template>

    <template v-else>
      <section class="section-tight">
        <div class="container generate-shell">
          <GenerateToolboxNav class="generate-toolbox-fallback" :active-tool="activeTool" @update:active-tool="selectTool" />

          <div class="generate-studio" v-fade-up="{ delay: 100 }">
            <GenerateSideRail class="generate-studio-rail" :active-tool="activeTool" @update:active-tool="selectTool" />

            <div
              class="generate-studio-main"
              :class="isGenerateWorkspace ? 'generator-layout' : 'image-processing-layout'"
            >
              <GenerateToolPanel v-if="isGenerateWorkspace" :task="task" />
              <DedicatedImageTools v-else :task="task" :active-tool-key="activeTool" />

              <GenerateOutputGrid ref="outputPanelRef" :task="task" />
            </div>
          </div>

          <p class="tip generate-footer-tip">
            <Lightbulb aria-hidden="true" />
            <span>{{ footerTipText }}</span>
          </p>
        </div>
      </section>
    </template>

    <GalleryDrawer :task="task" />
    <ImagePreviewModal :task="task" />

    <Toast :message="notice" />
  </main>
</template>
