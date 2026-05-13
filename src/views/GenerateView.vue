<script setup>
import { GalleryHorizontal, Coins, CreditCard, Lightbulb, LogIn, Save, Images, Wand } from 'lucide-vue-next'
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
  heroDescription,
  heroTitle,
  isAuthenticated,
  notice,
  openGallery,
  openLoginFromGenerate,
  openPricingFromGenerate,
  output,
  saveCurrentOutputToGallery,
  userCredits,
} = task
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
                  <span>需要批量生成？试试高级批量生图功能</span>
                </button>
                <button v-else class="btn hero-utility-button" type="button" @click="disableBatchMode">
                  <Wand aria-hidden="true" />
                  <span>只需要单张？返回普通生图</span>
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
                    <span>积分说明</span>
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

          <GenerateOutputGrid :task="task" />
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
