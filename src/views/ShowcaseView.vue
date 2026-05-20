<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Copy, ExternalLink, Eye, Images, LayoutTemplate, RotateCcw, Search, Sparkles, X } from 'lucide-vue-next'
import EmptyState from '../components/EmptyState.vue'
import ModalDialog from '../components/ModalDialog.vue'
import SectionTitle from '../components/SectionTitle.vue'
import SelectPicker from '../components/SelectPicker.vue'
import Toast from '../components/Toast.vue'
import {
  formatTemplatePrompt,
  localizePromptLabel,
  localizeTagLabel,
  loadPromptCaseById,
  loadPromptCaseIndex,
  loadPromptLibraryMeta,
} from '../services/promptLibrary'
import '../assets/showcase.css'

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
const loadedImages = ref(new Set())
const CASE_PAGE_SIZE = 24
const visibleCaseCount = ref(CASE_PAGE_SIZE)

const categories = computed(() => ['全部分类', ...promptTaxonomy.value.categories.map((item) => item.value)])
const styles = computed(() => ['全部风格', ...promptTaxonomy.value.styles.map((item) => item.value)])
const scenes = computed(() => ['全部场景', ...promptTaxonomy.value.scenes.map((item) => item.value)])
const sortOptions = [
  { label: '最新发布', value: '最新发布' },
  { label: '精选优先', value: '精选优先' },
  { label: '标题排序', value: '标题排序' },
]
const categoryOptions = computed(() =>
  categories.value.map((item) => ({
    label: item === '全部分类' ? item : categoryLabel(item),
    value: item,
  })),
)
const styleOptions = computed(() =>
  styles.value.map((item) => ({
    label: item === '全部风格' ? item : styleLabel(item),
    value: item,
  })),
)
const sceneOptions = computed(() =>
  scenes.value.map((item) => ({
    label: item === '全部场景' ? item : sceneLabel(item),
    value: item,
  })),
)
const activeTemplatePrompt = computed(() =>
  selectedTemplate.value ? formatTemplatePrompt(selectedTemplate.value) : '',
)
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
      return item.searchText.includes(keyword)
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
      return `${item.title.zh} ${item.title.en} ${item.description.zh} ${item.description.en} ${item.category} ${item.tags.join(' ')}`
        .toLowerCase()
        .includes(keyword)
    })
})

const visibleCaseItems = computed(() => filteredItems.value.slice(0, visibleCaseCount.value))
const shownCaseCount = computed(() => Math.min(visibleCaseCount.value, filteredItems.value.length))
const hasMoreCases = computed(() => shownCaseCount.value < filteredItems.value.length)

function showNotice(text) {
  notice.value = text
  window.setTimeout(() => {
    if (notice.value === text) notice.value = ''
  }, 2400)
}

function markImageLoaded(id) {
  loadedImages.value = new Set(loadedImages.value).add(id)
}

function isImageLoaded(id) {
  return loadedImages.value.has(id)
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

async function resolveCase(item) {
  return (await loadPromptCaseById(item.id)) || item
}

async function copyPrompt(item) {
  const fullCase = await resolveCase(item)
  try {
    await navigator.clipboard.writeText(fullCase.prompt)
    copiedId.value = item.id
    showNotice('提示词已复制')
    window.setTimeout(() => {
      if (copiedId.value === item.id) copiedId.value = null
    }, 1800)
  } catch {
    showNotice(fullCase.prompt || item.promptPreview)
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

async function generateSimilar(item) {
  const fullCase = await resolveCase(item)
  router.push({ path: '/generate', query: { prompt: fullCase.prompt || item.promptPreview } })
}

function useTemplate(item) {
  router.push({ path: '/generate', query: { prompt: formatTemplatePrompt(item) } })
}

async function openCase(item) {
  selectedCase.value = {
    ...item,
    prompt: '正在加载完整 Prompt...',
  }
  selectedCase.value = await resolveCase(item)
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
  visibleCaseCount.value = CASE_PAGE_SIZE
}

function loadMoreCases() {
  visibleCaseCount.value = Math.min(visibleCaseCount.value + CASE_PAGE_SIZE, filteredItems.value.length)
}

async function loadLocalLibrary() {
  loading.value = true
  loadError.value = ''
  try {
    const [meta, caseIndex] = await Promise.all([loadPromptLibraryMeta(), loadPromptCaseIndex()])
    promptLibraryManifest.value = meta.manifest
    promptCases.value = caseIndex
    promptTemplates.value = meta.templates
    promptTaxonomy.value = meta.taxonomy
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

watch([query, category, style, scene, sort], () => {
  visibleCaseCount.value = CASE_PAGE_SIZE
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  document.documentElement.classList.remove('gallery-scroll-locked')
  document.body.classList.remove('gallery-scroll-locked')
})

onMounted(loadLocalLibrary)
</script>

<template>
  <main class="page showcase-page">
    <section class="section-tight">
      <div class="container showcase-head">
        <SectionTitle
          level="h1"
          align="left"
          title="ImgsGen 案例库"
          :description="`内置 Prompt 案例与模板快照。${sourceSummary}，内容仅供学习参考，复用前请自行核验来源、授权和发布边界。`"
        />

        <div v-fade-up="{ delay: 100 }" class="library-tabs" role="tablist" aria-label="内容类型">
          <button
            id="library-tab-cases"
            type="button"
            role="tab"
            :aria-selected="activeTab === 'cases'"
            aria-controls="library-panel-cases"
            :class="{ active: activeTab === 'cases' }"
            @click="activeTab = 'cases'"
          >
            <Images aria-hidden="true" />
            案例
            <span>{{ filteredItems.length }}</span>
          </button>
          <button
            id="library-tab-templates"
            type="button"
            role="tab"
            :aria-selected="activeTab === 'templates'"
            aria-controls="library-panel-templates"
            :class="{ active: activeTab === 'templates' }"
            @click="activeTab = 'templates'"
          >
            <LayoutTemplate aria-hidden="true" />
            模板库
            <span>{{ filteredTemplates.length }}</span>
          </button>
        </div>

        <div class="filter-row prompt-library-filters">
          <label class="field compact-field" for="showcase-search">
            <span class="sr-only">搜索作品</span>
            <input
              id="showcase-search"
              v-model.trim="query"
              class="search-input"
              placeholder="搜索案例、模板、来源、Prompt..."
            />
          </label>
          <SelectPicker id="showcase-category" v-model="category" :options="categoryOptions" aria-label="分类筛选" />
          <SelectPicker id="showcase-style" v-model="style" :options="styleOptions" aria-label="风格筛选" />
          <SelectPicker id="showcase-scene" v-model="scene" :options="sceneOptions" aria-label="场景筛选" />
          <SelectPicker id="showcase-sort" v-model="sort" :options="sortOptions" aria-label="排序" />
        </div>

        <section
          v-if="activeTab === 'cases'"
          id="library-panel-cases"
          role="tabpanel"
          aria-labelledby="library-tab-cases"
        >
          <div class="section-title align-left" style="margin-bottom: 18px">
            <h2>案例</h2>
            <p>
              匹配 {{ filteredItems.length }} 个案例，已加载
              {{ shownCaseCount }} 个。先看高相关内容，继续浏览时再按需展开。
            </p>
          </div>
          <EmptyState v-if="loading" title="正在加载本地 Prompt 内容库" description="案例和模板来自项目内置快照。">
            <template #icon>
              <Search aria-hidden="true" />
            </template>
          </EmptyState>
          <EmptyState v-else-if="loadError" title="内容库加载失败" :description="loadError">
            <template #icon>
              <Search aria-hidden="true" />
            </template>
          </EmptyState>
          <template v-else-if="filteredItems.length">
            <div class="showcase-grid">
              <article
                v-for="(item, index) in visibleCaseItems"
                :key="item.id"
                v-fade-up="{ delay: (index % 12) * 50 }"
                class="card showcase-card"
              >
                <div class="image-wrap">
                  <button class="showcase-image-button" type="button" @click="openCase(item)">
                    <img
                      :src="item.image"
                      :alt="item.title"
                      loading="lazy"
                      :class="{ loaded: isImageLoaded(`case-${item.id}`) }"
                      @load="markImageLoaded(`case-${item.id}`)"
                    />
                  </button>
                  <button class="btn btn-accent image-action" type="button" @click="generateSimilar(item)">
                    <Sparkles aria-hidden="true" />
                    参考生成
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
                      参考生成
                    </button>
                    <button class="btn btn-ghost" type="button" @click="copyPrompt(item)">
                      <Copy aria-hidden="true" />
                      {{ copiedId === item.id ? '已复制' : '复制提示词' }}
                    </button>
                  </div>
                </div>
              </article>
            </div>
            <div v-if="hasMoreCases" class="showcase-load-more" aria-live="polite">
              <p>已显示 {{ shownCaseCount }} / {{ filteredItems.length }} 个案例，筛选条件会保留。</p>
              <button class="btn btn-soft" type="button" @click="loadMoreCases">
                <Images aria-hidden="true" />
                加载更多案例
              </button>
            </div>
          </template>
          <EmptyState v-else title="没有匹配的案例" description="换一个关键词或重置筛选后再试。">
            <template #icon>
              <Search aria-hidden="true" />
            </template>
            <button class="btn btn-soft" type="button" @click="resetFilters">
              <RotateCcw aria-hidden="true" />
              重置筛选
            </button>
          </EmptyState>
        </section>

        <section v-else id="library-panel-templates" role="tabpanel" aria-labelledby="library-tab-templates">
          <div class="section-title align-left" style="margin-bottom: 18px">
            <h2>工业模板库</h2>
            <p>
              当前显示 {{ filteredTemplates.length }} 个模板。模板会被转换成结构化 ImgsGen Prompt
              草稿，使用前请按业务目标和内容边界修改。
            </p>
          </div>
          <EmptyState v-if="loading" title="正在加载本地模板库" description="模板数据会按需载入，不影响首页首屏。">
            <template #icon>
              <Search aria-hidden="true" />
            </template>
          </EmptyState>
          <EmptyState v-else-if="loadError" title="模板库加载失败" :description="loadError">
            <template #icon>
              <Search aria-hidden="true" />
            </template>
          </EmptyState>
          <div v-else-if="filteredTemplates.length" class="showcase-grid template-library-grid">
            <article
              v-for="(item, index) in filteredTemplates"
              :key="item.id"
              v-fade-up="{ delay: (index % 12) * 50 }"
              class="card showcase-card template-library-card"
            >
              <div class="image-wrap">
                <button class="showcase-image-button" type="button" @click="openTemplate(item)">
                  <img
                    :src="item.cover"
                    :alt="templateTitle(item)"
                    loading="lazy"
                    :class="{ loaded: isImageLoaded(`template-${item.id}`) }"
                    @load="markImageLoaded(`template-${item.id}`)"
                  />
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
          <EmptyState v-else title="没有匹配的模板" description="换一个关键词或重置筛选后再试。">
            <template #icon>
              <Search aria-hidden="true" />
            </template>
            <button class="btn btn-soft" type="button" @click="resetFilters">
              <RotateCcw aria-hidden="true" />
              重置筛选
            </button>
          </EmptyState>
        </section>
      </div>
    </section>

    <ModalDialog
      :open="Boolean(selectedCase)"
      title-id="prompt-case-title"
      card-class="prompt-detail-modal"
      @close="closeModal"
    >
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
          <p class="license-note">
            来源内容仅供学习参考，默认标记为需授权复核；公开传播或商业使用前请确认图片、文字、品牌和人物权益。
          </p>
          <div class="card-actions">
            <button class="btn btn-primary" type="button" @click="generateSimilar(selectedCase)">
              <Sparkles aria-hidden="true" />
              参考这个 Prompt
            </button>
            <button class="btn btn-soft" type="button" @click="copyPrompt(selectedCase)">
              <Copy aria-hidden="true" />
              {{ copiedId === selectedCase.id ? '已复制' : '复制 Prompt' }}
            </button>
            <a
              v-if="selectedCase.sourceUrl"
              class="btn btn-ghost"
              :href="selectedCase.sourceUrl"
              target="_blank"
              rel="noreferrer"
            >
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
    </ModalDialog>

    <ModalDialog
      :open="Boolean(selectedTemplate)"
      title-id="prompt-template-title"
      card-class="prompt-detail-modal"
      @close="closeModal"
    >
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
            <span v-for="tag in itemTags(selectedTemplate)" :key="`template-modal-${tag}`">{{
              localizeTagLabel(tag)
            }}</span>
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
    </ModalDialog>

    <Toast :message="notice" />
  </main>
</template>
