<script setup>
import { computed, onMounted } from 'vue'
import {
  BookOpen,
  Coins,
  GalleryHorizontal,
  ImagePlus,
  KeyRound,
  ReceiptText,
  Rocket,
  ShieldCheck,
  Sparkles,
  UserRound,
  WandSparkles,
} from 'lucide-vue-next'
import SectionTitle from '../components/SectionTitle.vue'
import { useSiteStore } from '../services/siteStore'
import '../assets/docs.css'

const { siteData, loadSiteData } = useSiteStore()
const billingEnabled = computed(() => Boolean(siteData.value.billingEnabled))

onMounted(() => {
  loadSiteData()
})
</script>

<template>
  <main class="page">
    <section class="section-tight">
      <div class="container">
        <SectionTitle
          level="h1"
          title="ImgsGen 文档"
          description="面向用户的功能说明和上手教程，帮助你完成注册、积分查看、提示词优化、图片生成、图库管理和发布前复核。"
          v-fade-up
        />

        <div class="docs-layout">
          <aside v-fade-up="{ delay: 100 }" class="card side-nav">
            <a href="#intro">产品介绍</a>
            <a href="#quickstart">快速开始</a>
            <a href="#account">账号与积分</a>
            <a href="#generate">AI 生图教程</a>
            <a href="#reference">参考图与精修</a>
            <a href="#optimizer">提示词优化</a>
            <a href="#gallery">云端图库</a>
            <a href="#showcase">案例库与模板</a>
            <a v-if="billingEnabled" href="#orders">订单与积分发放</a>
            <a href="#credits">积分说明</a>
            <a href="#security">安全与合规</a>
          </aside>

          <div class="docs-content">
            <section id="intro" class="card doc-section" v-fade-up="{ delay: 200 }">
              <BookOpen aria-hidden="true" />
              <h2>产品介绍</h2>
              <p>
                ImgsGen 是一个 AI
                图片创作平台，适合用来生成海报、产品图、人物写真方案、社媒封面、插画、界面图和创意视觉草稿。
              </p>
              <p>
                你可以输入文字生成图片，也可以上传参考图进行图生图、局部精修和提示词反推。平台会保存生成任务和结果，方便后续复用、查看和管理。
              </p>
            </section>

            <section id="quickstart" class="card doc-section" v-fade-up>
              <Rocket aria-hidden="true" />
              <h2>快速开始</h2>
              <ol>
                <li>点击右上角登录，使用邮箱注册或登录账号。</li>
                <li>进入 AI 生图页面，输入你想要的画面描述。</li>
                <li>选择生成模式、模型、比例、清晰度、数量和输出格式。</li>
                <li>点击开始生成。任务提交后可以留在页面等待，也可以打开我的图库查看进度。</li>
                <li>生成完成后，预览图片、复制提示词，或在图库中复用这次生成设置。</li>
              </ol>
            </section>

            <section id="account" class="card doc-section" v-fade-up>
              <UserRound aria-hidden="true" />
              <h2>账号与积分</h2>
              <p>登录后可以使用图片上传、AI 反推提示词、生图任务、云端图库、积分流水和邀请奖励等功能。</p>
              <ul>
                <li>积分用于图片生成、提示词反推等消耗型功能。</li>
                <li>个人中心可以查看积分流水、邀请链接和个人资料。订单入口仅在积分服务开放时显示。</li>
                <li>完善资料后，如果平台配置了奖励规则，系统会按规则发放一次性奖励。</li>
              </ul>
            </section>

            <section id="generate" class="card doc-section" v-fade-up>
              <ImagePlus aria-hidden="true" />
              <h2>AI 生图教程</h2>
              <p>
                AI
                生图页支持文生图、图生图和精修图。第一次使用时，建议先从文生图开始，写清楚主体、场景、风格、光线、构图和用途。
              </p>
              <ol>
                <li>
                  选择文生图，输入一句完整提示词，例如“高级护肤品海报，透明精华瓶，白色背景，柔和光线，商业摄影质感”。
                </li>
                <li>选择比例。小红书封面常用 3:4 或 9:16，头像和图标常用 1:1，横幅常用 16:9。</li>
                <li>选择分辨率和质量。质量越高通常更适合正式交付，但消耗可能更高。</li>
                <li>如果需要多张方案，打开批量生成，选择 2、4、6、8 或 10 张。</li>
                <li>提交前检查积分消耗、素材授权和内容合规提示。</li>
              </ol>
            </section>

            <section id="reference" class="card doc-section" v-fade-up>
              <Sparkles aria-hidden="true" />
              <h2>参考图与精修</h2>
              <p>参考图适合保持人物、产品、空间、构图或风格的一致性。上传图片前，请确认你拥有使用权或已经取得授权。</p>
              <ul>
                <li>图生图最多可以添加 4 张参考图，适合保持人物形象、产品外观或整体风格。</li>
                <li>精修图只保留 1 张原图，适合替换背景、调整局部、增强质感和修正画面。</li>
                <li>蒙版只支持 PNG。透明区域代表需要编辑的区域，非透明区域应尽量保持不变。</li>
                <li>上传真人、人脸、证件、未成年人、商标、艺术作品或隐私素材时，务必先确认授权边界。</li>
              </ul>
            </section>

            <section id="optimizer" class="card doc-section" v-fade-up>
              <WandSparkles aria-hidden="true" />
              <h2>提示词优化</h2>
              <p>
                如果你只有一个模糊想法，可以先使用提示词优化器。它会把简单描述改写成结构更完整、便于继续修改的提示词草稿。
              </p>
              <ol>
                <li>打开提示词优化页面，选择图像生成、文案写作或办公任务。</li>
                <li>输入原始想法，例如“做一张咖啡店新品海报”。</li>
                <li>点击开始优化，等待 AI 返回优化结果。</li>
                <li>复制优化后的提示词草稿，按实际素材、用途和合规要求修改后再使用。</li>
              </ol>
              <p>优化历史只保存在当前浏览器，清空浏览器数据或更换设备后不会自动同步。</p>
            </section>

            <section id="gallery" class="card doc-section" v-fade-up>
              <GalleryHorizontal aria-hidden="true" />
              <h2>云端图库</h2>
              <p>我的图库用于查看生成记录、任务进度和已完成图片。登录后，图库会自动同步云端数据。</p>
              <ul>
                <li>排队中、生成中和保存中的任务会显示当前状态。</li>
                <li>生成完成后，可以点击图片预览大图，或复制当次提示词。</li>
                <li>点击复用，可以把这条记录的提示词、模式、比例、质量和格式带回生成页。</li>
                <li>清空本地只会清理当前浏览器里的临时记录，不代表删除云端历史。</li>
              </ul>
            </section>

            <section id="showcase" class="card doc-section" v-fade-up>
              <BookOpen aria-hidden="true" />
              <h2>案例库与模板</h2>
              <p>
                画廊里收录了 Prompt 案例和工业模板。你可以搜索分类、风格和场景，查看完整提示词，再作为草稿带入生成器。
              </p>
              <ul>
                <li>案例适合学习别人如何描述画面、构图、文字和风格。</li>
                <li>模板适合快速生成结构化 Prompt，尤其适合海报、信息图、界面图和产品图。</li>
                <li>来源案例默认需要做授权复核，公开传播或商业使用前请确认图片、文字、品牌和人物权益边界。</li>
              </ul>
            </section>

            <section v-if="billingEnabled" id="orders" class="card doc-section" v-fade-up>
              <ReceiptText aria-hidden="true" />
              <h2>订单与积分发放</h2>
              <p>如平台开放积分服务，定价页会展示可用积分方案。提交方案后会创建订单，并显示订单号等处理信息。</p>
              <ol>
                <li>选择积分方案并创建订单。</li>
                <li>复制订单号并按页面提示联系管理员处理。</li>
                <li>管理员确认后，积分会自动到账，可以在个人中心查看订单状态和积分流水。</li>
                <li>积分服务关闭时，前台不会展示定价入口、首页定价方案和个人中心订单页签。</li>
              </ol>
            </section>

            <section id="credits" class="card doc-section" v-fade-up>
              <Coins aria-hidden="true" />
              <h2>积分说明</h2>
              <p>
                实际消耗以页面提交前展示的预计积分和个人中心积分流水为准。不同模式、图片数量、质量和平台配置都可能影响消耗。
              </p>
              <ul>
                <li>图片生成通常在任务成功后扣除积分。</li>
                <li>AI 反推提示词会按页面展示的规则消耗积分。</li>
                <li>如果生成失败或任务取消，积分扣除、返还和调整规则以页面提示、订单状态和个人中心积分流水为准。</li>
              </ul>
            </section>

            <section id="security" class="card doc-section" v-fade-up>
              <ShieldCheck aria-hidden="true" />
              <h2>安全与合规</h2>
              <p>
                上传图片、生成内容和支付信息应通过安全通道处理。商业发布前需要人工审核文字准确性、人物授权、品牌使用边界、广告合规和是否需要
                AI 生成内容标识。
              </p>
              <p>
                不得生成或传播违法违规、侵权、虚假新闻、冒用身份、侵犯肖像隐私、损害未成年人权益或危害公共利益的内容。平台可对输入和输出进行自动或人工审核，并处理投诉举报。
              </p>
              <p>
                页面内合规提示只用于帮助理解平台规则，不构成法律意见。涉及广告投放、商业授权、肖像权、著作权、未成年人或监管敏感场景时，请自行咨询专业人士。
              </p>
              <p>
                <KeyRound aria-hidden="true" />
                请妥善保管账号密码、邮箱验证码、订单号和付款凭证，不要把账号借给他人使用。
              </p>
            </section>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>
