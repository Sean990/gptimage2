<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Copy, ExternalLink, Eye, Images, LayoutTemplate, RotateCcw, Search, Sparkles, X } from 'lucide-vue-next'
import SectionTitle from '../components/SectionTitle.vue'
import {
  formatTemplatePrompt,
  localizePromptLabel,
  localizeTagLabel,
  loadPromptLibrary,
} from '../services/promptLibrary'

const router = useRouter()
const loading = ref(true)
const loadError = ref('')
const promptLibraryManifest = ref(null)
const promptCases = ref([])
const promptTemplates = ref([])
const promptTaxonomy = ref({
  categories: [],
  styles: [],
  scenes: [],
})
const query = ref('')
const category = ref('全部分类')
const style = ref('全部风格')
const scene = ref('全部场景')
const sort = ref('最新发布')
const notice = ref('')
const copiedId = ref(null)
const activeTab = ref('cases')
const selectedCase = ref(null)
const selectedTemplate = ref(null)

const categories = computed(() => ['全部分类', ...promptTaxonomy.value.categories.map((item) => item.value)])
const styles = computed(() => ['全部风格', ...promptTaxonomy.value.styles.map((item) => item.value)])
const scenes = computed(() => ['全部场景', ...promptTaxonomy.value.scenes.map((item) => item.value)])
const activeTemplatePrompt = computed(() => (selectedTemplate.value ? formatTemplatePrompt(selectedTemplate.value) : ''))
const activeModalOpen = computed(() => Boolean(selectedCase.value || selectedTemplate.value))
const sourceSummary = computed(() => {
  if (!promptLibraryManifest.value) return '正在加载本地 Prompt 内容库'
  const { counts, upstream } = promptLibraryManifest.value
  return `${counts.cases} 个案例 · ${counts.templates} 个模板 · 本地快照 ${upstream.commit.slice(0, 7)}`
})

const filteredItems = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  return promptCases.value
    .filter((item) => category.value === '全部分类' || item.category === category.value)
    .filter((item) => style.value === '全部风格' || item.styles.includes(style.value))
    .filter((item) => scene.value === '全部场景' || item.scenes.includes(scene.value))
    .filter((item) => {
      if (!keyword) return true
      return `${item.upstreamId} ${item.title} ${item.prompt} ${item.category} ${item.styles.join(' ')} ${item.scenes.join(' ')}`.toLowerCase().includes(keyword)
    })
    .sort((a, b) => {
      if (sort.value === '标题排序') return a.title.localeCompare(b.title, 'zh-CN')
      if (sort.value === '精选优先') return Number(b.featured) - Number(a.featured) || b.upstreamId - a.upstreamId
      return b.upstreamId - a.upstreamId
    })
})

const filteredTemplates = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  return promptTemplates.value
    .filter((item) => category.value === '全部分类' || item.category === category.value)
    .filter((item) => style.value === '全部风格' || item.styles.includes(style.value))
    .filter((item) => scene.value === '全部场景' || item.scenes.includes(scene.value))
    .filter((item) => {
      if (!keyword) return true
      return `${item.title.zh} ${item.title.en} ${item.description.zh} ${item.description.en} ${item.category} ${item.tags.join(' ')}`.toLowerCase().includes(keyword)
    })
})

function showNotice(text) {
  notice.value = text
  window.setTimeout(() => {
    if (notice.value === text) notice.value = ''
  }, 2400)
}

function categoryLabel(value) {
  return localizePromptLabel(value, 'categories')
}

function styleLabel(value) {
  return localizePromptLabel(value, 'styles')
}

function sceneLabel(value) {
  return localizePromptLabel(value, 'scenes')
}

function templateTitle(item) {
  return item.title.zh || item.title.en
}

function templateDescription(item) {
  return item.description.zh || item.description.en
}

function itemTags(item) {
  return [...new Set([...(item.styles || []), ...(item.scenes || []), ...(item.tags || [])])].slice(0, 5)
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

async function copyTemplatePrompt(item) {
  const prompt = formatTemplatePrompt(item)
  try {
    await navigator.clipboard.writeText(prompt)
    copiedId.value = item.id
    showNotice('模板 Prompt 已复制')
    window.setTimeout(() => {
      if (copiedId.value === item.id) copiedId.value = null
    }, 1800)
  } catch {
    showNotice(prompt)
  }
}

function generateSimilar(item) {
  router.push({ path: '/generate', query: { prompt: item.prompt } })
}

function useTemplate(item) {
  router.push({ path: '/generate', query: { prompt: formatTemplatePrompt(item) } })
}

function openCase(item) {
  selectedCase.value = item
}

function openTemplate(item) {
  selectedTemplate.value = item
}

function closeModal() {
  selectedCase.value = null
  selectedTemplate.value = null
}

function resetFilters() {
  query.value = ''
  category.value = '全部分类'
  style.value = '全部风格'
  scene.value = '全部场景'
  sort.value = '最新发布'
}

async function loadLocalLibrary() {
  loading.value = true
  loadError.value = ''
  try {
    const library = await loadPromptLibrary()
    promptLibraryManifest.value = library.manifest
    promptCases.value = library.cases
    promptTemplates.value = library.templates
    promptTaxonomy.value = library.taxonomy
  } catch (error) {
    loadError.value = error.message || 'Prompt 内容库加载失败'
  } finally {
    loading.value = false
  }
}

function onKeydown(event) {
  if (event.key === 'Escape') closeModal()
}

watch(activeModalOpen, (isOpen) => {
  document.documentElement.classList.toggle('gallery-scroll-locked', isOpen)
  document.body.classList.toggle('gallery-scroll-locked', isOpen)
  if (isOpen) window.addEventListener('keydown', onKeydown)
  else window.removeEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  document.documentElement.classList.remove('gallery-scroll-locked')
  document.body.classList.remove('gallery-scroll-locked')
})

onMounted(loadLocalLibrary)
</script>

<template>
  <main class="page">
    <section class="section-tight">
      <div class="container showcase-head">
        <SectionTitle
          level="h1"
          align="left"
          title="GPT Image 2 Prompt 内容中台"
          :description="`已本地镜像 awesome-gpt-image-2 的 Prompt 案例与工业模板。${sourceSummary}，Prompt 数据运行时不依赖对方站点。`"
        />

        <div class="library-tabs" role="tablist" aria-label="内容类型">
          <button type="button" :class="{ active: activeTab === 'cases' }" @click="activeTab = 'cases'">
            <Images aria-hidden="true" />
            案例库
            <span>{{ filteredItems.length }}</span>
          </button>
          <button type="button" :class="{ active: activeTab === 'templates' }" @click="activeTab = 'templates'">
            <LayoutTemplate aria-hidden="true" />
            模板库
            <span>{{ filteredTemplates.length }}</span>
          </button>
        </div>

        <div class="filter-row prompt-library-filters">
          <label class="field compact-field" for="showcase-search">
            <span class="sr-only">搜索作品</span>
            <input id="showcase-search" v-model.trim="query" class="search-input" placeholder="搜索案例、模板、来源、Prompt..." />
          </label>
          <select v-model="category" class="select-button" aria-label="分类筛选">
            <option v-for="item in categories" :key="item" :value="item">{{ item === '全部分类' ? item : categoryLabel(item) }}</option>
          </select>
          <select v-model="style" class="select-button" aria-label="风格筛选">
            <option v-for="item in styles" :key="item" :value="item">{{ item === '全部风格' ? item : styleLabel(item) }}</option>
          </select>
          <select v-model="scene" class="select-button" aria-label="场景筛选">
            <option v-for="item in scenes" :key="item" :value="item">{{ item === '全部场景' ? item : sceneLabel(item) }}</option>
          </select>
          <select v-model="sort" class="select-button" aria-label="排序">
            <option>最新发布</option>
            <option>精选优先</option>
            <option>标题排序</option>
          </select>
        </div>

        <section v-if="activeTab === 'cases'">
          <div class="section-title align-left" style="margin-bottom: 18px">
            <h2>案例库</h2>
            <p>当前显示 {{ filteredItems.length }} 个案例。每条都保留完整 Prompt、来源链接和上游快照信息。</p>
          </div>
          <div v-if="loading" class="empty-state">
            <Search aria-hidden="true" />
            <strong>正在加载本地 Prompt 内容库</strong>
            <p>案例和模板来自项目内置快照。</p>
          </div>
          <div v-else-if="loadError" class="empty-state">
            <Search aria-hidden="true" />
            <strong>内容库加载失败</strong>
            <p>{{ loadError }}</p>
          </div>
          <div v-else-if="filteredItems.length" class="showcase-grid">
            <article v-for="item in filteredItems" :key="item.id" class="card showcase-card">
              <div class="image-wrap">
                <button class="showcase-image-button" type="button" @click="openCase(item)">
                  <img :src="item.image" :alt="item.title" loading="lazy" />
                </button>
                <button class="btn btn-accent image-action" type="button" @click="generateSimilar(item)">
                  <Sparkles aria-hidden="true" />
                  生成同款
                </button>
              </div>
              <div class="showcase-body">
                <span class="tag">{{ categoryLabel(item.category) }}</span>
                <h3>{{ item.title }}</h3>
                <p>{{ item.promptPreview }}</p>
                <div class="prompt-tag-row">
                  <span v-for="tag in itemTags(item)" :key="`${item.id}-${tag}`">{{ localizeTagLabel(tag) }}</span>
                </div>
                <div class="card-actions">
                  <button class="btn btn-ghost" type="button" @click="openCase(item)">
                    <Eye aria-hidden="true" />
                    查看详情
                  </button>
                  <button class="btn btn-soft" type="button" @click="generateSimilar(item)">
                    <Search aria-hidden="true" />
                    生成同款
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

        <section v-else>
          <div class="section-title align-left" style="margin-bottom: 18px">
            <h2>工业模板库</h2>
            <p>当前显示 {{ filteredTemplates.length }} 个模板。模板会被转换成结构化 GPT Image 2 Prompt，可直接带入生成器。</p>
          </div>
          <div v-if="loading" class="empty-state">
            <Search aria-hidden="true" />
            <strong>正在加载本地模板库</strong>
            <p>模板数据会按需载入，不影响首页首屏。</p>
          </div>
          <div v-else-if="loadError" class="empty-state">
            <Search aria-hidden="true" />
            <strong>模板库加载失败</strong>
            <p>{{ loadError }}</p>
          </div>
          <div v-else-if="filteredTemplates.length" class="showcase-grid template-library-grid">
            <article v-for="item in filteredTemplates" :key="item.id" class="card showcase-card template-library-card">
              <div class="image-wrap">
                <button class="showcase-image-button" type="button" @click="openTemplate(item)">
                  <img :src="item.cover" :alt="templateTitle(item)" loading="lazy" />
                  <span class="template-badge">模板</span>
                </button>
              </div>
              <div class="showcase-body">
                <span class="tag">{{ categoryLabel(item.category) }}</span>
                <h3>{{ templateTitle(item) }}</h3>
                <p>{{ templateDescription(item) }}</p>
                <div class="prompt-tag-row">
                  <span v-for="tag in itemTags(item)" :key="`${item.id}-${tag}`">{{ localizeTagLabel(tag) }}</span>
                </div>
                <div class="card-actions">
                  <button class="btn btn-ghost" type="button" @click="openTemplate(item)">
                    <Eye aria-hidden="true" />
                    查看模板
                  </button>
                  <button class="btn btn-soft" type="button" @click="useTemplate(item)">
                    <Sparkles aria-hidden="true" />
                    使用模板
                  </button>
                  <button class="btn btn-ghost" type="button" @click="copyTemplatePrompt(item)">
                    <Copy aria-hidden="true" />
                    {{ copiedId === item.id ? '已复制' : '复制模板' }}
                  </button>
                </div>
              </div>
            </article>
          </div>
          <div v-else class="empty-state">
            <Search aria-hidden="true" />
            <strong>没有匹配的模板</strong>
            <p>换一个关键词或恢复全部分类后再试。</p>
            <button class="btn btn-soft" type="button" @click="resetFilters">
              <RotateCcw aria-hidden="true" />
              重置筛选
            </button>
          </div>
        </section>
      </div>
    </section>

    <div
      v-if="selectedCase"
      class="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="prompt-case-title"
      @click.self="closeModal"
    >
      <div class="modal-card prompt-detail-modal">
        <div class="modal-head">
          <div>
            <span class="tag">案例 #{{ selectedCase.upstreamId }}</span>
            <h2 id="prompt-case-title">{{ selectedCase.title }}</h2>
          </div>
          <button class="icon-button" type="button" aria-label="关闭" @click="closeModal">
            <X aria-hidden="true" />
          </button>
        </div>
        <div class="prompt-detail-layout">
          <div class="prompt-detail-image">
            <img :src="selectedCase.image" :alt="selectedCase.imageAlt" />
          </div>
          <div class="prompt-detail-body">
            <div class="prompt-tag-row">
              <span>{{ categoryLabel(selectedCase.category) }}</span>
              <span v-for="tag in itemTags(selectedCase)" :key="`modal-${tag}`">{{ localizeTagLabel(tag) }}</span>
            </div>
            <pre class="prompt-block">{{ selectedCase.prompt }}</pre>
            <p class="license-note">来源内容已本地建档，默认标记为需授权复核；商业宣传位建议只使用已确认授权素材。</p>
            <div class="card-actions">
              <button class="btn btn-primary" type="button" @click="generateSimilar(selectedCase)">
                <Sparkles aria-hidden="true" />
                用这个 Prompt 生成
              </button>
              <button class="btn btn-soft" type="button" @click="copyPrompt(selectedCase)">
                <Copy aria-hidden="true" />
                {{ copiedId === selectedCase.id ? '已复制' : '复制 Prompt' }}
              </button>
              <a v-if="selectedCase.sourceUrl" class="btn btn-ghost" :href="selectedCase.sourceUrl" target="_blank" rel="noreferrer">
                <ExternalLink aria-hidden="true" />
                原始来源
              </a>
              <a class="btn btn-ghost" :href="selectedCase.githubUrl" target="_blank" rel="noreferrer">
                <ExternalLink aria-hidden="true" />
                GitHub 条目
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="selectedTemplate"
      class="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="prompt-template-title"
      @click.self="closeModal"
    >
      <div class="modal-card prompt-detail-modal">
        <div class="modal-head">
          <div>
            <span class="tag">{{ categoryLabel(selectedTemplate.category) }}</span>
            <h2 id="prompt-template-title">{{ templateTitle(selectedTemplate) }}</h2>
          </div>
          <button class="icon-button" type="button" aria-label="关闭" @click="closeModal">
            <X aria-hidden="true" />
          </button>
        </div>
        <div class="prompt-detail-layout">
          <div class="prompt-detail-image">
            <img :src="selectedTemplate.cover" :alt="templateTitle(selectedTemplate)" />
          </div>
          <div class="prompt-detail-body">
            <p>{{ selectedTemplate.useWhen.zh || selectedTemplate.description.zh }}</p>
            <div class="prompt-tag-row">
              <span v-for="tag in itemTags(selectedTemplate)" :key="`template-modal-${tag}`">{{ localizeTagLabel(tag) }}</span>
            </div>
            <pre class="prompt-block">{{ activeTemplatePrompt }}</pre>
            <div class="prompt-detail-columns">
              <div>
                <h3>核心约束</h3>
                <ul>
                  <li v-for="item in selectedTemplate.guidance.zh" :key="item">{{ item }}</li>
                </ul>
              </div>
              <div>
                <h3>需要避免</h3>
                <ul>
                  <li v-for="item in selectedTemplate.pitfalls.zh" :key="item">{{ item }}</li>
                </ul>
              </div>
            </div>
            <div class="card-actions">
              <button class="btn btn-primary" type="button" @click="useTemplate(selectedTemplate)">
                <Sparkles aria-hidden="true" />
                使用模板生成
              </button>
              <button class="btn btn-soft" type="button" @click="copyTemplatePrompt(selectedTemplate)">
                <Copy aria-hidden="true" />
                {{ copiedId === selectedTemplate.id ? '已复制' : '复制模板 Prompt' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="notice" class="toast">{{ notice }}</div>
  </main>
</template>
