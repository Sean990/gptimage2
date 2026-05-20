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

const task = useGenerationTask()

const { batchMode, footerTipText, notice, output } = task

const outputPanelRef = ref(null)
const activeTool = ref('generate')
const isMobile = ref(false)
const isGenerateWorkspace = computed(() => activeTool.value === 'generate')
const useGalleryRecordEventName = 'imgsgen:use-gallery-record'
let mobileMediaQuery = null
const galleryTask = {
  ...task,
  useGalleryRecord(record) {
    activeTool.value = 'generate'
    task.useGalleryRecord(record)
  },
}

function switchToGenerateWorkspace() {
  activeTool.value = 'generate'
}

function scrollOutputIntoView() {
  if (!isMobile.value) return
  nextTick(() => {
    const target = outputPanelRef.value?.$el || document.querySelector('.mobile-output-section')
    target?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  })
}

function updateMobileState(event = mobileMediaQuery) {
  isMobile.value = Boolean(event?.matches)
}

watch(
  () => output.value.length,
  (nextCount, previousCount) => {
    if (previousCount === 0 && nextCount > 0) scrollOutputIntoView()
  },
)

onMounted(() => {
  mobileMediaQuery = window.matchMedia('(max-width: 820px)')
  updateMobileState()
  mobileMediaQuery.addEventListener('change', updateMobileState)
  window.addEventListener(useGalleryRecordEventName, switchToGenerateWorkspace)
})

onBeforeUnmount(() => {
  mobileMediaQuery?.removeEventListener('change', updateMobileState)
  window.removeEventListener(useGalleryRecordEventName, switchToGenerateWorkspace)
})
</script>

<template>
  <main class="page generate-page" :class="{ 'batch-mode-page': batchMode, 'mobile-mode': isMobile }">
    <template v-if="isMobile">
      <GenerateMobileShell :task="task" :active-tool="activeTool" @update:active-tool="activeTool = $event" />
    </template>

    <template v-else>
      <section class="section-tight">
        <div class="container generate-shell">
          <GenerateToolboxNav class="generate-toolbox-fallback" v-model:active-tool="activeTool" />

          <div class="generate-studio" v-fade-up="{ delay: 100 }">
            <GenerateSideRail class="generate-studio-rail" v-model:active-tool="activeTool" />

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

    <GalleryDrawer :task="galleryTask" />
    <ImagePreviewModal :task="task" />

    <Toast :message="notice" />
  </main>
</template>
