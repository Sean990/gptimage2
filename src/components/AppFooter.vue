<script setup>
import { RouterLink } from 'vue-router'
import { Github, Images, Mail, MessageCircle } from 'lucide-vue-next'
</script>

<template>
  <footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <RouterLink class="brand" to="/" aria-label="GPT Image 2 首页">
            <span class="brand-mark" aria-hidden="true">
              <Images />
            </span>
            <span>GPT Image 2</span>
          </RouterLink>
          <p>基于 OpenAI 最新 GPT Image 能力的 AI 图像生成与编辑平台，适用于海报、品牌、电商和社媒视觉。</p>
          <div class="header-actions">
            <a class="icon-button" href="https://x.com" aria-label="X">
              <MessageCircle aria-hidden="true" />
            </a>
            <a class="icon-button" href="https://github.com" aria-label="GitHub">
              <Github aria-hidden="true" />
            </a>
            <a class="icon-button" href="mailto:bgnwd15@gmail.com" aria-label="邮件">
              <Mail aria-hidden="true" />
            </a>
          </div>
        </div>

        <div class="footer-links">
          <strong>产品</strong>
          <RouterLink to="/generate">AI 生图</RouterLink>
          <RouterLink to="/prompt-optimizer">提示词优化</RouterLink>
          <RouterLink to="/showcase">画廊</RouterLink>
          <RouterLink to="/pricing">定价</RouterLink>
        </div>

        <div class="footer-links">
          <strong>资源</strong>
          <RouterLink to="/docs">文档</RouterLink>
          <RouterLink to="/showcase">案例</RouterLink>
        </div>
      </div>

      <div class="footer-bottom">
        <span>© 2025 • GPT Image 2 保留所有权利。</span>
        <div class="footer-bottom-links">
          <RouterLink to="/privacy-policy">隐私政策</RouterLink>
          <RouterLink to="/terms-of-service">服务条款</RouterLink>
        </div>
      </div>
    </div>
  </footer>
</template>
