<script setup>
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  GalleryHorizontal,
  Coins,
  CreditCard,
  Lightbulb,
  LogIn,
  Save,
  Images,
  Square,
  Wand,
  Sparkles,
  ArrowUp,
} from 'lucide-vue-next'
import Toast from '../components/Toast.vue'
import GalleryDrawer from '../components/generate/GalleryDrawer.vue'
import GenerateOutputGrid from '../components/generate/GenerateOutputGrid.vue'
import GenerateToolPanel from '../components/generate/GenerateToolPanel.vue'
import ImagePreviewModal from '../components/generate/ImagePreviewModal.vue'
import { useGenerationTask } from '../composables/useGenerationTask'
import '../assets/generate.css'

const task = useGenerationTask()

const {
  batchMode,
  disableBatchMode,
  enableBatchMode,
  footerTipText,
  gallery,
  generate,
  heroDescription,
  heroTitle,
  isAuthenticated,
  loading,
  normalizedImageCount,
  notice,
  openGallery,
  openLoginFromGenerate,
  openPricingFromGenerate,
  output,
  saveCurrentOutputToGallery,
  stopGeneration,
  userCredits,
} = task

const outputPanelRef = ref(null)
const dockHidden = ref(false)
const showBackToTop = ref(false)

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

let lastScrollY = 0
let rafId = 0
let scrollHandlerActive = false

function updateDockVisibility() {
  rafId = 0
  const y = window.scrollY
  const dy = y - lastScrollY
  showBackToTop.value = y > window.innerHeight
  if (Math.abs(dy) < 8) return
  if (y < 60) {
    dockHidden.value = false
  } else if (dy > 0 && y > 120) {
    dockHidden.value = true
  } else if (dy < 0) {
    dockHidden.value = false
  }
  lastScrollY = y
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function onScroll() {
  if (rafId) return
  rafId = window.requestAnimationFrame(updateDockVisibility)
}

onMounted(() => {
  if (typeof window === 'undefined') return
  if (!window.matchMedia('(max-width: 820px)').matches) return
  lastScrollY = window.scrollY
  window.addEventListener('scroll', onScroll, { passive: true })
  scrollHandlerActive = true
})

onUnmounted(() => {
  if (scrollHandlerActive) window.removeEventListener('scroll', onScroll)
  if (rafId) window.cancelAnimationFrame(rafId)
})
</script>

<template>
  <main class="page generate-page" :class="{ 'batch-mode-page': batchMode }">
    <section class="section-tight">
      <div class="container">
        <div class="generate-hero" v-fade-up>
          <div class="generate-hero-copy">
            <span v-if="batchMode" class="batch-hero-badge">
              <Images aria-hidden="true" />
              高级功能
            </span>
            <h1>{{ heroTitle }}</h1>
            <p>{{ heroDescription }}</p>
            <div class="tool-toolbar" aria-label="生成工具栏">
              <div class="tool-toolbar-row tool-toolbar-row-primary">
                <button v-if="!batchMode" class="btn hero-utility-button" type="button" @click="enableBatchMode">
                  <Images aria-hidden="true" />
                  <span>需要多版方案？切换批量生成</span>
                </button>
                <button v-else class="btn hero-utility-button" type="button" @click="disableBatchMode">
                  <Wand aria-hidden="true" />
                  <span>只要单张？返回单张生成</span>
                </button>
                <button class="btn hero-utility-button hero-gallery-button" type="button" @click="openGallery">
                  <GalleryHorizontal aria-hidden="true" />
                  <span>我的图库</span>
                  <span v-if="gallery.length" class="hero-gallery-count">{{ gallery.length }}</span>
                </button>
              </div>
              <div class="tool-toolbar-row tool-toolbar-row-secondary">
                <div v-if="isAuthenticated" class="hero-credit-group" aria-label="账户积分">
                  <span class="toolbar-credit hero-balance-pill">
                    <Coins aria-hidden="true" />
                    {{ userCredits }} 积分
                  </span>
                  <button class="btn hero-recharge-button" type="button" @click="openPricingFromGenerate">
                    <CreditCard aria-hidden="true" />
                    <span>积分规则</span>
                  </button>
                </div>
                <template v-else>
                  <span class="toolbar-credit">
                    <Wand aria-hidden="true" />
                    登录后同步任务和图库
                  </span>
                  <button class="btn hero-login-button" type="button" @click="openLoginFromGenerate">
                    <LogIn aria-hidden="true" />
                    <span>登录 / 注册</span>
                  </button>
                </template>
                <button
                  v-if="output.length"
                  class="btn hero-save-button"
                  type="button"
                  @click="saveCurrentOutputToGallery"
                >
                  <Save aria-hidden="true" />
                  <span>保存当前结果</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="generator-layout" v-fade-up="{ delay: 100 }">
          <GenerateToolPanel :task="task" />

          <GenerateOutputGrid ref="outputPanelRef" :task="task" />
        </div>

        <p class="tip generate-footer-tip">
          <Lightbulb aria-hidden="true" />
          <span>{{ footerTipText }}</span>
        </p>

        <div class="mobile-generate-dock" :class="{ 'is-hidden': dockHidden }" aria-label="移动端快捷生图操作">
          <button v-if="!loading" class="btn btn-primary" type="button" @click="generate">
            <Sparkles aria-hidden="true" />
            <span>{{ batchMode ? `生成 ${normalizedImageCount} 张` : '开始生图' }}</span>
          </button>
          <button v-else class="btn btn-primary" type="button" @click="stopGeneration">
            <Square aria-hidden="true" />
            <span>停止生成</span>
          </button>
          <button class="btn btn-soft" type="button" @click="openGallery">
            <GalleryHorizontal aria-hidden="true" />
            <span>图库</span>
            <span v-if="gallery.length" class="mobile-generate-dock-count">{{ gallery.length }}</span>
          </button>
          <button
            v-show="showBackToTop"
            class="mobile-back-to-top"
            :class="{ 'is-elevated': dockHidden }"
            type="button"
            aria-label="回到顶部"
            @click="scrollToTop"
          >
            <ArrowUp aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>

    <GalleryDrawer :task="task" />
    <ImagePreviewModal :task="task" />

    <Toast :message="notice" />
  </main>
</template>
