<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CheckCircle2,
  Download,
  FileQuestion,
  ImagePlus,
  Layers,
  MessageSquareText,
  PenTool,
  Sparkles,
  Upload,
  Wand2,
} from 'lucide-vue-next'
import PricingCards from '../components/PricingCards.vue'
import SectionTitle from '../components/SectionTitle.vue'
import { useSiteStore } from '../services/siteStore'

const { siteData, loadSiteData } = useSiteStore()
const notice = ref('')
const homeImages = computed(() => siteData.value.homeImages)
const features = computed(() => siteData.value.features)
const faqItems = computed(() => siteData.value.faqItems)
const pricingModes = computed(() => siteData.value.pricingModes)

function showNotice(text) {
  notice.value = text
  window.setTimeout(() => {
    if (notice.value === text) notice.value = ''
  }, 2600)
}

const featureIcons = [MessageSquareText, Wand2, Sparkles, Layers, PenTool, BadgeCheck]
const workflowIcons = [Upload, Wand2, Sparkles, Download]

onMounted(loadSiteData)
</script>

<template>
  <main>
    <section class="hero">
      <div class="container hero-grid">
        <div class="hero-copy">
          <span class="eyebrow">基于 OpenAI 最新 GPT Image 能力</span>
          <h1>
            <span>GPT Image 2</span>
            <span>AI 图片生成平台</span>
          </h1>
          <p>
            GPT Image 2 是一个围绕最新 GPT Image 能力打造的 AI 图片生成与编辑产品形态。它更强调商业落地：
            更强的文字渲染、更稳的图像编辑、更逼真的真实感画质，以及更适合海报、电商和品牌视觉的工作流。
          </p>
          <div class="hero-actions">
            <RouterLink class="btn btn-primary" to="/generate">
              免费试用 GPT Image 2
              <ArrowRight aria-hidden="true" />
            </RouterLink>
            <RouterLink class="btn btn-ghost" to="/#feature">查看功能亮点</RouterLink>
          </div>
          <div class="hero-note">更强文本渲染 / 更强编辑保真 / 更强商业可用性</div>
        </div>

        <div class="hero-visual">
          <div class="hero-frame">
            <img :src="homeImages[0].src" :alt="homeImages[0].title" />
            <div class="floating-stat">
              <strong>4K</strong>
              <span>商业级输出</span>
            </div>
          </div>
          <div class="image-strip">
            <img v-for="image in homeImages.slice(1)" :key="image.title" :src="image.src" :alt="image.title" />
          </div>
        </div>
      </div>
    </section>

    <section class="section" data-nav-section="feature">
      <div class="container position-grid">
        <SectionTitle
          align="left"
          eyebrow="GPT Image 2 定位"
          title="面向高质量图像生成与编辑的专业产品界面"
          description="如果你把 GPT Image 2 看成一个产品名称而不是官方 API 模型编号，就更容易理解它的价值：它不是单纯展示模型很强，而是把最新 GPT Image 的文本、编辑、真实感和商用输出能力包装成一个对终端用户更容易理解和购买的产品。"
        />
        <ul class="check-list">
          <li>
            <CheckCircle2 aria-hidden="true" />
            <span>支持文生图、图生图、局部编辑与风格延展</span>
          </li>
          <li>
            <CheckCircle2 aria-hidden="true" />
            <span>更适合品牌、电商、广告、社媒和活动视觉素材</span>
          </li>
          <li>
            <CheckCircle2 aria-hidden="true" />
            <span>更强调从创意到交付的真实生产流程</span>
          </li>
          <li>
            <CheckCircle2 aria-hidden="true" />
            <span>页面表达上更像一个清晰的营销落地页，而不是单纯工具页</span>
          </li>
        </ul>
      </div>
    </section>

    <section class="section" id="feature">
      <div class="container">
        <SectionTitle
          eyebrow="为什么选择 GPT Image 2 进行 AI 图片生成"
          title="为什么它比旧一代图像产品更适合商用图片生产"
        />
        <div class="grid-3">
          <article class="card feature-card">
            <MessageSquareText aria-hidden="true" />
            <h3>近乎完美的文字渲染</h3>
            <p>海报标题、包装文案、横幅标语和信息图里的文本更容易生成正确，减少设计后修时间。</p>
          </article>
          <article class="card feature-card">
            <PenTool aria-hidden="true" />
            <h3>更稳的高级编辑</h3>
            <p>继续修改一张已有图片时，能更稳定地保留主体、构图、光线、材质与品牌细节。</p>
          </article>
          <article class="card feature-card">
            <Sparkles aria-hidden="true" />
            <h3>真实感商业画质</h3>
            <p>更适合产品图、人物图、广告图和品牌视觉输出，而不是停留在演示级 AI 图片。</p>
          </article>
        </div>
      </div>
    </section>

    <section class="section" data-nav-section="feature">
      <div class="container">
        <SectionTitle
          eyebrow="GPT Image 2 核心功能"
          title="围绕最新 GPT Image 能力构建的关键卖点"
          description="首页不是在列技术名词，而是在把用户真正关心的结果讲清楚：能不能生成对、改得动、够真实、能商用。"
        />
        <div class="grid-3">
          <article v-for="([title, body], index) in features" :key="title" class="card feature-card">
            <component :is="featureIcons[index]" aria-hidden="true" />
            <h3>{{ title }}</h3>
            <p>{{ body }}</p>
          </article>
        </div>
      </div>
    </section>

    <section class="section" data-nav-section="feature">
      <div class="container workflow-panel">
        <div>
          <SectionTitle
            align="left"
            eyebrow="真实工作流演示"
            title="从一张照片到可下载写真，只需要 4 步"
            description="把反推提示词放进完整流程里展示：先上传照片，再让 AI 读图生成专业提示词，最后生成可复用、可下载、可分享的人像作品。"
          />
          <div class="step-list">
            <article class="card step-card">
              <span class="step-number">
                <component :is="workflowIcons[0]" aria-hidden="true" />
              </span>
              <div>
                <h3>Step 1 上传照片</h3>
                <p>上传自拍、证件照或参考图，系统会保留人物身份与主要五官特征。</p>
              </div>
            </article>
            <article class="card step-card">
              <span class="step-number">
                <component :is="workflowIcons[1]" aria-hidden="true" />
              </span>
              <div>
                <h3>Step 2 AI 反推提示词</h3>
                <p>自动分析服装、光线、表情、镜头和氛围，生成专业摄影提示词。</p>
              </div>
            </article>
            <article class="card step-card">
              <span class="step-number">
                <component :is="workflowIcons[2]" aria-hidden="true" />
              </span>
              <div>
                <h3>Step 3 生成写真</h3>
                <p>选择风格后生成多张高质量 AI 写真，用于头像、社媒、电商或活动素材。</p>
              </div>
            </article>
            <article class="card step-card">
              <span class="step-number">
                <component :is="workflowIcons[3]" aria-hidden="true" />
              </span>
              <div>
                <h3>Step 4 下载分享</h3>
                <p>保存高清图片，复制提示词再次生成，也可以一键分享到作品社区。</p>
              </div>
            </article>
          </div>
        </div>

        <article class="card preview-card">
          <img :src="homeImages[1].src" :alt="homeImages[1].title" />
          <div class="preview-body">
            <span class="tag">AI 反推提示词示例</span>
            <div class="prompt-box">
              室内柔光人像摄影，保留上传照片的人物身份与五官特征，白色蕾丝连衣裙，窗边自然光，暖色调，中景构图，真实肤质，杂志级质感。
            </div>
            <div class="hero-actions">
              <span class="btn btn-soft">
                <Download aria-hidden="true" />
                高清下载
              </span>
              <span class="btn btn-ghost">
                <ImagePlus aria-hidden="true" />
                可分享提示词
              </span>
            </div>
          </div>
        </article>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <SectionTitle
          eyebrow="早期用户反馈"
          title="创作者更关心能不能直接出片"
          description="先用真实使用场景建立信任：头像、写真、电商素材和批量创意，都能从同一套流程里完成。"
        />
        <div class="grid-3">
          <article class="card testimonial-card">
            <h3>社媒头像 10 分钟出 12 版</h3>
            <p>以前要反复改提示词，现在先反推再生成，风格统一很多。</p>
            <span>独立创作者</span>
          </article>
          <article class="card testimonial-card">
            <h3>电商主图探索更快</h3>
            <p>同一张产品参考图可以快速测试棚拍、生活方式和节日氛围。</p>
            <span>跨境卖家</span>
          </article>
          <article class="card testimonial-card">
            <h3>提示词可以复用</h3>
            <p>生成满意后直接保存提示词，下次换照片也能复刻同一套视觉风格。</p>
            <span>内容运营</span>
          </article>
        </div>
      </div>
    </section>

    <section class="section" id="faq">
      <div class="container">
        <SectionTitle
          eyebrow="FAQ"
          title="GPT Image 2 常见问题"
          description="把产品价值和命名方式讲清楚，才是一个更完整的落地页。"
        />
        <div class="faq-grid">
          <article v-for="([question, answer], index) in faqItems" :key="question" class="card faq-item">
            <span class="tag">
              <FileQuestion aria-hidden="true" />
              {{ index + 1 }}
            </span>
            <h3>{{ question }}</h3>
            <p>{{ answer }}</p>
          </article>
        </div>
      </div>
    </section>

    <section class="section" id="pricing">
      <div class="container">
        <SectionTitle title="GPT Image 2 定价方案" description="先免费开始，再根据你的创作频率升级。" />
        <PricingCards :plans="pricingModes.credits.plans" @select="showNotice(`${$event.name} 已加入演示订单`)" />
      </div>
    </section>

    <section class="section-tight">
      <div class="container credits-guide">
        <div class="credits-copy">
          <span class="eyebrow">怎么选套餐</span>
          <h2>每个 credits 包适合什么场景？</h2>
          <p>不要只看价格，按你的实际创作频率选择：轻量体验、稳定创作或批量出图。</p>
        </div>
        <div class="credits-list">
          <article class="card credits-card">
            <h3>30 credits：先验证效果</h3>
            <p>适合第一次体验，测试 3-5 个风格方向，确认人像保真、提示词反推和下载流程。</p>
          </article>
          <article class="card credits-card">
            <h3>150 credits：持续内容创作</h3>
            <p>适合头像、社媒配图、活动 KV、电商主图探索，一次保留多个可用版本。</p>
          </article>
          <article class="card credits-card">
            <h3>500 credits：批量项目和团队</h3>
            <p>适合团队批量做风格测试、广告素材、商品视觉和长期内容生产。</p>
          </article>
        </div>
      </div>
    </section>

    <section class="dark-cta-section">
      <div class="container">
        <div class="dark-cta">
          <span class="dark-pill">GPT Image 2</span>
          <h2>上传第一张照片，免费生成一次</h2>
          <p>从反推提示词开始，看看 GPT Image 2 能不能把你的照片变成可发布、可下载、可复用的视觉作品。</p>
          <div class="hero-actions">
            <RouterLink class="btn btn-accent" to="/generate">
              立即上传照片
              <ArrowRight aria-hidden="true" />
            </RouterLink>
            <RouterLink class="btn btn-ghost dark-ghost" to="/showcase">查看案例库</RouterLink>
          </div>
        </div>
      </div>
    </section>

    <section class="section-tight browse-more-section">
      <div class="container browse-more">
        <RouterLink class="browse-more-link" to="/showcase">
          <BriefcaseBusiness aria-hidden="true" />
          浏览更多案例
        </RouterLink>
      </div>
    </section>

    <div v-if="notice" class="toast">{{ notice }}</div>
  </main>
</template>
