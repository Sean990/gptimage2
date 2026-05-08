<script setup>
import { BookOpen, Code2, ImagePlus, KeyRound, Rocket, ShieldCheck } from 'lucide-vue-next'
import SectionTitle from '../components/SectionTitle.vue'
</script>

<template>
  <main class="page">
    <section class="section-tight">
      <div class="container">
        <SectionTitle
          level="h1"
          title="GPT Image 2 文档"
          description="原站中文文档页当前出现客户端异常；这里复刻为可用的中文文档入口，覆盖快速开始、生成器参数、图库、支付和部署说明。"
        />

        <div class="docs-layout">
          <aside class="card side-nav">
            <a href="#intro">介绍</a>
            <a href="#quickstart">快速开始</a>
            <a href="#generator">生成参数</a>
            <a href="#api">接口形态</a>
            <a href="#security">安全与合规</a>
          </aside>

          <div class="docs-content">
            <section id="intro" class="card doc-section">
              <BookOpen aria-hidden="true" />
              <h2>介绍</h2>
              <p>GPT Image 2 是面向商业视觉生产的 AI 图像生成与编辑平台，核心页面包含首页、生成器、价格、案例画廊与法律文本。</p>
            </section>

            <section id="quickstart" class="card doc-section">
              <Rocket aria-hidden="true" />
              <h2>快速开始</h2>
              <ol>
                <li>进入 AI 生图页面，输入提示词或上传参考图。</li>
                <li>选择模型、画幅比例与分辨率。</li>
                <li>使用 AI 反推提示词补齐摄影语言。</li>
                <li>点击开始生成，并把满意结果保存到图库。</li>
              </ol>
            </section>

            <section id="generator" class="card doc-section">
              <ImagePlus aria-hidden="true" />
              <h2>生成参数</h2>
              <p>模型名称、图片尺寸、数量、质量、背景、审核和输出格式按 OpenAI 图像生成文档整理。参考图最多 4 张，适合人物一致性、产品保真和局部编辑。</p>
              <div class="code-box">model: gpt-image-2
size: auto | 1024x1024 | 1536x1024 | 1024x1536 | 2048x1152 | 3840x2160 | 2160x3840
n: 1-10
quality: high | medium | low | auto
output_format: png | jpeg | webp
background: auto | opaque
moderation: auto | low
output_compression: 0-100 (jpeg/webp only)</div>
            </section>

            <section id="api" class="card doc-section">
              <Code2 aria-hidden="true" />
              <h2>接口形态</h2>
              <p>复刻版不接入真实后端，但保留前端状态与数据结构，便于后续接入真实图像生成 API。</p>
              <div class="code-box">POST /api/generate
{
  "prompt": "...",
  "model": "gpt-image-2",
  "size": "1024x1024",
  "n": 1,
  "quality": "high",
  "output_format": "png",
  "background": "auto",
  "moderation": "auto"
}</div>
            </section>

            <section id="security" class="card doc-section">
              <ShieldCheck aria-hidden="true" />
              <h2>安全与合规</h2>
              <p>上传图片、生成内容和支付信息应通过安全通道处理。商业发布前需要人工审核文字准确性、人物授权和品牌使用边界。</p>
              <p><KeyRound aria-hidden="true" /> 后续接入真实 API 时，请把密钥放在服务端环境变量中，不要暴露到浏览器。</p>
            </section>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>
