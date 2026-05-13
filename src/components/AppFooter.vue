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
          <p>面向国内内容发布场景的 AI 图像生成与编辑工具，适用于海报、品牌、电商和社媒视觉的方案创作与发布前复核。</p>
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
          <RouterLink to="/generate">AI 生图</RouterLink>
          <RouterLink to="/prompt-optimizer">提示词优化</RouterLink>
          <RouterLink v-if="billingEnabled" to="/pricing">定价</RouterLink>
        </div>

        <div class="footer-links">
          <strong>资源</strong>
          <RouterLink to="/showcase">画廊</RouterLink>
          <RouterLink to="/docs">文档</RouterLink>
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
