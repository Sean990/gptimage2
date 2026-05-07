<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Copy, RotateCcw, Search, Sparkles } from 'lucide-vue-next'
import SectionTitle from '../components/SectionTitle.vue'
import { useSiteStore } from '../services/siteStore'

const router = useRouter()
const { siteData, loadSiteData } = useSiteStore()
const query = ref('')
const category = ref('全部分类')
const sort = ref('最新发布')
const notice = ref('')
const copiedId = ref(null)
const showcaseItems = computed(() => siteData.value.showcaseItems)

const categories = computed(() => ['全部分类', ...new Set(showcaseItems.value.map((item) => item.category))])

const filteredItems = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  return showcaseItems.value
    .filter((item) => category.value === '全部分类' || item.category === category.value)
    .filter((item) => {
      if (!keyword) return true
      return `${item.title} ${item.description} ${item.category}`.toLowerCase().includes(keyword)
    })
    .sort((a, b) => (sort.value === '标题排序' ? a.title.localeCompare(b.title, 'zh-CN') : b.id - a.id))
})

function showNotice(text) {
  notice.value = text
  window.setTimeout(() => {
    if (notice.value === text) notice.value = ''
  }, 2400)
}

async function copyPrompt(item) {
  try {
    await navigator.clipboard.writeText(item.prompt)
    copiedId.value = item.id
    showNotice('提示词已复制')
    window.setTimeout(() => {
      if (copiedId.value === item.id) copiedId.value = null
    }, 1800)
  } catch {
    showNotice(item.prompt)
  }
}

function generateSimilar(item) {
  router.push({ path: '/generate', query: { prompt: item.prompt } })
}

function resetFilters() {
  query.value = ''
  category.value = '全部分类'
  sort.value = '最新发布'
}

onMounted(loadSiteData)
</script>

<template>
  <main class="page">
    <section class="section-tight">
      <div class="container showcase-head">
        <SectionTitle
          align="left"
          title="AI 图像生成作品展示"
          description="探索由 Nano Banana AI 创造的精美图像，从人像写真到创意场景，每一张都附带完整的 AI 提示词。"
        />

        <div class="filter-row">
          <label class="field compact-field" for="showcase-search">
            <span class="sr-only">搜索作品</span>
            <input id="showcase-search" v-model.trim="query" class="search-input" placeholder="搜索风格、场景、关键词..." />
          </label>
          <select v-model="category" class="select-button" aria-label="分类筛选">
            <option v-for="item in categories" :key="item">{{ item }}</option>
          </select>
          <select v-model="sort" class="select-button" aria-label="排序">
            <option>最新发布</option>
            <option>标题排序</option>
          </select>
        </div>

        <section>
          <div class="section-title align-left" style="margin-bottom: 18px">
            <h2>案例库</h2>
            <p>当前显示 {{ filteredItems.length }} 个案例。</p>
          </div>
          <div v-if="filteredItems.length" class="showcase-grid">
            <article v-for="item in filteredItems" :key="item.id" class="card showcase-card">
              <div class="image-wrap">
                <img :src="item.image" :alt="item.title" loading="lazy" />
                <button class="btn btn-accent image-action" type="button" @click="generateSimilar(item)">
                  <Sparkles aria-hidden="true" />
                  生成同款
                </button>
              </div>
              <div class="showcase-body">
                <span class="tag">{{ item.category }}</span>
                <h3>{{ item.title }}</h3>
                <p>{{ item.description }}</p>
                <div class="card-actions">
                  <button class="btn btn-soft" type="button" @click="generateSimilar(item)">
                    <Search aria-hidden="true" />
                    生成同款写真
                  </button>
                  <button class="btn btn-ghost" type="button" @click="copyPrompt(item)">
                    <Copy aria-hidden="true" />
                    {{ copiedId === item.id ? '已复制' : '复制提示词' }}
                  </button>
                </div>
              </div>
            </article>
          </div>
          <div v-else class="empty-state">
            <Search aria-hidden="true" />
            <strong>没有匹配的案例</strong>
            <p>换一个关键词或恢复全部分类后再试。</p>
            <button class="btn btn-soft" type="button" @click="resetFilters">
              <RotateCcw aria-hidden="true" />
              重置筛选
            </button>
          </div>
        </section>
      </div>
    </section>

    <div v-if="notice" class="toast">{{ notice }}</div>
  </main>
</template>
