<script setup>
import { RouterLink } from 'vue-router'
import { AlertTriangle, Github, Images, Mail, MessageCircle } from 'lucide-vue-next'
import { computed, onMounted } from 'vue'
import { useSiteStore } from '../services/siteStore'
import wechatQr from '../assets/wx.png'

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
            <div class="wechat-popover-container">
              <button class="icon-button" type="button" aria-label="微信">
                <MessageCircle aria-hidden="true" />
              </button>
              <div class="wechat-popover-card">
                <div class="wechat-qr-wrapper">
                  <img :src="wechatQr" alt="微信二维码" class="wechat-qr-image" />
                </div>
                <div class="wechat-popover-info">
                  <h4>微信联系我</h4>
                  <p>扫码获取技术支持与合作咨询</p>
                </div>
              </div>
            </div>
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

      <div class="footer-compliance-notice" role="note">
        <AlertTriangle aria-hidden="true" />
        <p>
          <strong>合规提示：</strong
          >使用生成、上传、下载或传播功能时，请遵守所在地和内容发布地适用法律法规，确认素材授权，并按要求保留或添加 AI 生成标识。
        </p>
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

<style scoped>
.wechat-popover-container {
  position: relative;
  display: inline-block;
}

.wechat-popover-card {
  position: absolute;
  bottom: calc(100% + 14px);
  left: 50%;
  transform: translateX(-50%) translateY(10px) scale(0.95);
  width: 220px;
  padding: 16px;
  border-radius: var(--radius-md, 14px);
  border: 1px solid var(--line, rgba(228, 233, 241, 0.7));
  background: var(--surface, #ffffff);
  box-shadow: var(--shadow-lg, 0 10px 30px rgba(0, 0, 0, 0.15));
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--dur-3, 320ms) var(--ease-standard),
              transform var(--dur-3, 320ms) var(--ease-standard);
}

.wechat-popover-card::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border-width: 6px;
  border-style: solid;
  border-color: var(--surface, #ffffff) transparent transparent transparent;
}

:root[data-theme='dark'] .wechat-popover-card {
  border-color: rgba(255, 255, 255, 0.08);
  background: rgba(17, 26, 44, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.5);
}

:root[data-theme='dark'] .wechat-popover-card::after {
  border-color: rgba(17, 26, 44, 0.95) transparent transparent transparent;
}

.wechat-popover-container:hover .wechat-popover-card,
.wechat-popover-container:focus-within .wechat-popover-card {
  opacity: 1;
  pointer-events: auto;
  transform: translateX(-50%) translateY(0) scale(1);
}

.wechat-qr-wrapper {
  width: 130px;
  height: 130px;
  border-radius: var(--radius-sm, 10px);
  padding: 4px;
  background: #ffffff;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}

.wechat-qr-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.wechat-popover-info h4 {
  margin: 0 0 4px 0;
  color: var(--text-strong, #0f172a);
  font-size: var(--fs-md, 14px);
  font-weight: var(--fw-semibold, 600);
}

.wechat-popover-info p {
  margin: 0;
  color: var(--subtle, #64748b);
  font-size: var(--fs-xs, 12px);
  line-height: 1.4;
}

:root[data-theme='dark'] .wechat-popover-info h4 {
  color: #ffffff;
}

:root[data-theme='dark'] .wechat-popover-info p {
  color: var(--subtle, #8a96b0);
}
</style>
