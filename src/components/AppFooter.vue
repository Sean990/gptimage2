<script setup>
import { RouterLink } from 'vue-router'
import { Github, Images, Mail, MessageCircle } from 'lucide-vue-next'
import { computed, onMounted } from 'vue'
import { useSiteStore } from '../services/siteStore'

const currentYear = new Date().getFullYear()
const { siteData, loadSiteData } = useSiteStore()
const billingEnabled = computed(() => Boolean(siteData.value.billingEnabled))

onMounted(() => {
  loadSiteData().catch(() => {})
})
</script>

<template>
  <footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <RouterLink class="brand" to="/" aria-label="ImgsGen 首页">
            <span class="brand-mark" aria-hidden="true">
              <Images />
            </span>
            <span>ImgsGen</span>
          </RouterLink>
          <p>面向内容团队和创作者的 AI 图片生成与编辑工作台，适用于海报、电商、品牌视觉和社媒素材的快速打样。</p>
          <div class="header-actions">
            <a class="icon-button" href="https://weixin.com" alt="微信" aria-label="微信">
              <MessageCircle aria-hidden="true" />
            </a>
            <a class="icon-button" href="https://github.com/Sean990" alt="GitHub" aria-label="GitHub">
              <Github aria-hidden="true" />
            </a>
            <a class="icon-button" href="mailto:imgsgen@163.com" alt="邮件" aria-label="邮件">
              <Mail aria-hidden="true" />
            </a>
          </div>
        </div>

        <div class="footer-links">
          <strong>产品</strong>
          <RouterLink to="/generate">图片生成</RouterLink>
          <RouterLink to="/prompt-optimizer">Prompt 优化</RouterLink>
          <RouterLink v-if="billingEnabled" to="/pricing">积分方案</RouterLink>
        </div>

        <div class="footer-links">
          <strong>资源</strong>
          <RouterLink to="/showcase">案例库</RouterLink>
          <RouterLink to="/docs">使用文档</RouterLink>
        </div>
      </div>

      <div class="footer-bottom">
        <span>© {{ currentYear }} • ImgsGen 保留所有权利。</span>
        <div class="footer-bottom-links">
          <RouterLink to="/privacy-policy">隐私政策</RouterLink>
          <RouterLink to="/terms-of-service">服务条款</RouterLink>
        </div>
      </div>
    </div>
  </footer>
</template>
