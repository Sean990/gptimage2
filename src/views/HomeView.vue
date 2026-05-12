<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
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
import FeatureCard from '../components/FeatureCard.vue'
import PricingCards from '../components/PricingCards.vue'
import SectionTitle from '../components/SectionTitle.vue'
import Toast from '../components/Toast.vue'
import { useSiteStore } from '../services/siteStore'

const { siteData, loadSiteData } = useSiteStore()
const router = useRouter()
const notice = ref('')
const homeImages = computed(() => siteData.value.homeImages)
const features = computed(() => siteData.value.features)
const faqItems = computed(() => siteData.value.faqItems)
const pricingModes = computed(() => siteData.value.pricingModes)
const billingEnabled = computed(() => Boolean(siteData.value.billingEnabled))

function showNotice(text) {
  notice.value = text
  window.setTimeout(() => {
    if (notice.value === text) notice.value = ''
  }, 2600)
}

function openPricing() {
  if (!billingEnabled.value) {
    showNotice('积分服务暂未开放，请先查看积分说明。')
    router.push('/docs#credits')
    return
  }
  router.push('/pricing')
}

const featureIcons = [MessageSquareText, Wand2, Sparkles, Layers, PenTool, BadgeCheck]
const workflowIcons = [Upload, Wand2, Sparkles, Download]

onMounted(() => {
  loadSiteData()
})
</script>

<template>
  <main>
    <section class="hero">
      <div class="container hero-grid">
        <div class="hero-copy">
          <span class="eyebrow">面向国内上线的 AI 图片生成工具</span>
          <h1>
            <span>ImgsGen</span>
            <span>AI 图片生成平台</span>
          </h1>
          <p>
            ImgsGen 面向合法合规的图片生成与编辑场景，覆盖提示词创作、参考图编辑、生成内容标识和人工复核流程，
            适合海报、电商、品牌视觉和社媒素材的日常生产。
          </p>
          <div class="hero-actions">
            <RouterLink class="btn btn-primary" to="/generate">
              开始使用 ImgsGen
              <ArrowRight aria-hidden="true" />
            </RouterLink>
            <RouterLink class="btn btn-ghost" to="/#feature">查看功能亮点</RouterLink>
          </div>
          <div class="hero-note">AI 生成标识 / 内容安全审核 / 授权素材使用</div>
        </div>

        <div class="hero-visual">
          <div class="hero-frame">
            <img
              :src="homeImages[0].src"
              :alt="homeImages[0].title"
              decoding="async"
              fetchpriority="high"
            />
            <div class="floating-stat">
              <strong>高分辨率</strong>
              <span>以实际参数为准</span>
            </div>
          </div>
          <div class="image-strip">
            <img
              v-for="image in homeImages.slice(1)"
              :key="image.title"
              :src="image.src"
              :alt="image.title"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      </div>
    </section>

    <section class="section" data-nav-section="feature">
      <div class="container position-grid">
        <SectionTitle
          align="left"
          eyebrow="ImgsGen 定位"
          title="面向合规创作与素材方案生产的专业产品界面"
          description="ImgsGen 不只关注出图效果，也把国内上线需要的内容安全、AI 生成标识、人物授权、隐私保护和发布前人工复核放进产品表达里。"
        />
        <ul class="check-list">
          <li>
            <CheckCircle2 aria-hidden="true" />
            <span>支持文生图、图生图、局部编辑与风格延展</span>
          </li>
          <li>
            <CheckCircle2 aria-hidden="true" />
            <span>适合品牌、电商、广告、社媒和活动视觉的方案探索</span>
          </li>
          <li>
            <CheckCircle2 aria-hidden="true" />
            <span>强调从创意到审核、标识和发布的完整流程</span>
          </li>
          <li>
            <CheckCircle2 aria-hidden="true" />
            <span>上传真人、商标、作品和敏感素材前需确认合法授权</span>
          </li>
        </ul>
      </div>
    </section>

    <section class="section" id="feature">
      <div class="container">
        <SectionTitle
          eyebrow="为什么选择 ImgsGen 进行 AI 图片生成"
          title="更适合国内内容发布流程的 AI 图片生产"
        />
        <div class="grid-3">
          <FeatureCard
            v-fade-up
            title="清晰可读的文字渲染"
            description="海报标题、包装文案、横幅标语和信息图里的文本更容易生成正确，发布前仍建议人工校对。"
          >
            <template #icon>
              <MessageSquareText aria-hidden="true" />
            </template>
          </FeatureCard>
          <FeatureCard
            v-fade-up="{ delay: 100 }"
            title="更稳的高级编辑"
            description="继续修改一张已有图片时，能更稳定地保留主体、构图、光线、材质与品牌细节。"
          >
            <template #icon>
              <PenTool aria-hidden="true" />
            </template>
          </FeatureCard>
          <FeatureCard
            v-fade-up="{ delay: 200 }"
            title="可复核的视觉效果"
            description="适合产品图、人物图、广告图和品牌视觉草稿，并保留人工复核和权利确认空间。"
          >
            <template #icon>
              <Sparkles aria-hidden="true" />
            </template>
          </FeatureCard>
        </div>
      </div>
    </section>

    <section class="section" data-nav-section="feature">
      <div class="container">
        <SectionTitle
          eyebrow="ImgsGen 核心功能"
          title="围绕图片生成、编辑和合规发布构建的关键能力"
          description="用户真正关心的不只是能不能出图，还包括素材是否有授权、结果是否需要标识、内容是否能通过发布前审核。"
        />
        <div class="grid-3">
          <FeatureCard
            v-for="([title, body], index) in features"
            :key="title"
            v-fade-up="{ delay: (index % 3) * 100 }"
            :title="title"
            :description="body"
          >
            <template #icon>
              <component :is="featureIcons[index]" aria-hidden="true" />
            </template>
          </FeatureCard>
        </div>
      </div>
    </section>

    <section class="section" data-nav-section="feature">
      <div class="container workflow-panel">
        <div>
          <SectionTitle
            align="left"
            eyebrow="创作工作流"
            title="从授权参考图到可复核图片，分 4 步完成"
            description="把反推提示词放进完整流程里展示：先上传已授权素材，再让 AI 读图生成提示词，最后生成可下载、可复核的图片方案。"
          />
          <div class="step-list">
            <article v-fade-up class="card step-card">
              <span class="step-number">
                <component :is="workflowIcons[0]" aria-hidden="true" />
              </span>
              <div>
                <h3>Step 1 上传照片</h3>
            <p>上传本人或已获授权的照片与参考图，不要上传证件、隐私照片或未经授权的人脸素材。</p>
              </div>
            </article>
            <article v-fade-up="{ delay: 100 }" class="card step-card">
              <span class="step-number">
                <component :is="workflowIcons[1]" aria-hidden="true" />
              </span>
              <div>
                <h3>Step 2 AI 反推提示词</h3>
                <p>辅助分析服装、光线、表情、镜头和氛围，生成可继续修改的摄影提示词草稿。</p>
              </div>
            </article>
            <article v-fade-up="{ delay: 200 }" class="card step-card">
              <span class="step-number">
                <component :is="workflowIcons[2]" aria-hidden="true" />
              </span>
              <div>
                <h3>Step 3 生成图片方案</h3>
            <p>选择风格后生成多张 AI 图片，结果应保留 AI 生成提示，并在公开发布前进行人工审核。</p>
              </div>
            </article>
            <article v-fade-up="{ delay: 300 }" class="card step-card">
              <span class="step-number">
                <component :is="workflowIcons[3]" aria-hidden="true" />
              </span>
              <div>
                <h3>Step 4 下载复核</h3>
            <p>保存图片，复制提示词再次生成；商用或公开传播前请确认授权、标识和内容合规。</p>
              </div>
            </article>
          </div>
        </div>

        <article class="card preview-card">
          <img
            :src="homeImages[1].src"
            :alt="homeImages[1].title"
            loading="lazy"
            decoding="async"
          />
          <div class="preview-body">
            <span class="tag">AI 反推提示词示例</span>
            <div class="prompt-box">
              室内柔光人像摄影，在已授权前提下参考上传照片的人物特征，白色蕾丝连衣裙，窗边自然光，暖色调，中景构图，摄影质感，发布前人工复核。
            </div>
            <div class="hero-actions">
              <span class="btn btn-soft">
                <Download aria-hidden="true" />
                下载图片
              </span>
              <span class="btn btn-ghost">
                <ImagePlus aria-hidden="true" />
                复制提示词
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
          title="创作者更关心能不能快速拿到可选方案"
          description="用常见使用场景说明流程：头像草稿、写真方案、电商素材和批量创意，都可以从同一套流程里完成初步探索。"
        />
        <div class="grid-3">
          <article v-fade-up class="card testimonial-card">
            <h3>社媒头像快速探索多版</h3>
            <p>先反推再生成，能更方便地比较不同风格方向。</p>
            <span>独立创作者</span>
          </article>
          <article v-fade-up="{ delay: 100 }" class="card testimonial-card">
            <h3>电商主图方案探索</h3>
            <p>同一张已授权产品参考图可以测试棚拍、生活方式和节日氛围。</p>
            <span>跨境卖家</span>
          </article>
          <article v-fade-up="{ delay: 200 }" class="card testimonial-card">
            <h3>提示词可以复用</h3>
            <p>生成满意后保存提示词，下次可在授权素材范围内参考同一套视觉风格。</p>
            <span>内容运营</span>
          </article>
        </div>
      </div>
    </section>

    <section class="section" id="faq">
      <div class="container">
        <SectionTitle
          eyebrow="FAQ"
          title="ImgsGen 常见问题"
          description="重点说明使用边界、内容标识、授权和发布前复核要求。"
        />
        <div class="faq-grid">
          <article v-for="([question, answer], index) in faqItems" :key="question" v-fade-up="{ delay: (index % 4) * 80 }" class="card faq-item">
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

    <section v-if="billingEnabled" class="section" id="pricing">
      <div class="container">
        <SectionTitle title="ImgsGen 定价方案" description="按预计使用量选择套餐，具体权益、有效期和消耗规则以下单页与个人中心记录为准。" />
        <PricingCards :plans="pricingModes.credits.plans" button-text="查看说明" @select="openPricing" />
      </div>
    </section>

    <section v-if="billingEnabled" class="section-tight">
      <div class="container credits-guide">
        <div class="credits-copy">
          <span class="eyebrow">按用途选套餐</span>
          <h2>多少积分才刚好？</h2>
          <p>从首次试水到稳定产出，再到团队批量交付，用量越明确，套餐越好选。</p>
        </div>
        <div class="credits-list">
          <article class="card credits-card">
            <h3>30 积分：小预算试水</h3>
            <p>适合首次体验和小批量测试。先跑 3-5 个风格方向，确认人像保真、提示词反推、下载流程和成图质感。</p>
          </article>
          <article class="card credits-card">
            <h3>150 积分：稳定内容产出</h3>
          <p>适合头像、社媒配图、活动 KV、电商主图等高频任务，一次探索多版方案，方便筛选和复用。</p>
          </article>
          <article class="card credits-card">
            <h3>500 积分：团队批量交付</h3>
            <p>适合广告素材、商品视觉、品牌风格测试和长期内容生产，支持多人协作下的集中出图需求。</p>
          </article>
        </div>
      </div>
    </section>

    <section class="dark-cta-section">
      <div class="container">
        <div class="dark-cta">
          <span class="dark-pill">ImgsGen</span>
          <h2>上传已授权素材，登录后开始生成</h2>
          <p>从反推提示词开始，把你的照片或参考图转成可下载、可复用，并便于后续人工审核的视觉方案。</p>
          <div class="hero-actions">
            <RouterLink class="btn btn-accent" to="/generate">
              立即上传照片
              <ArrowRight aria-hidden="true" />
            </RouterLink>
            <RouterLink class="btn btn-ghost dark-ghost" to="/showcase">查看画廊</RouterLink>
          </div>
        </div>
      </div>
    </section>

    <section class="section-tight browse-more-section">
      <div class="container browse-more">
        <RouterLink class="browse-more-link" to="/showcase">
          <BriefcaseBusiness aria-hidden="true" />
          浏览更多画廊内容
        </RouterLink>
      </div>
    </section>

    <Toast :message="notice" />
  </main>
</template>
