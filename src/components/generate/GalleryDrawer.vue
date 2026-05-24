<script setup>
import { computed, ref } from 'vue'
import { Copy, Download, ImagePlus, Loader2, RefreshCw, Save, Search, Square, Trash2, X } from 'lucide-vue-next'
import EmptyState from '../EmptyState.vue'
import LazyImage from '../LazyImage.vue'
import ModalDialog from '../ModalDialog.vue'
import '../../assets/gallery-drawer.css'

const props = defineProps({
  task: {
    type: Object,
    required: true,
  },
})

const {
  canPreviewGalleryRecord,
  canCancelGalleryRecord = () => false,
  canRetryGalleryRecord = () => false,
  canReuseGalleryRecord,
  clearGallery,
  closeGallery,
  copyGalleryPrompt,
  downloadGalleryRecord,
  formatGalleryDate,
  gallery,
  galleryCloudStatusText,
  galleryHasMore = ref(false),
  galleryOpen,
  galleryPage = ref(1),
  galleryPageSize = 9,
  galleryRecordCover,
  galleryRecordMeta,
  galleryRecordModelLabel = () => '',
  galleryRecordMode,
  galleryRecordNotice,
  galleryRecordProgressText,
  galleryRecordStatusLabel,
  gallerySummary,
  gallerySyncError,
  gallerySyncing,
  gallerySyncMessage,
  galleryTotal = ref(0),
  isAuthenticated,
  isGalleryRecordPending,
  maxLocalGalleryRecords,
  openGalleryImage,
  removeGalleryRecord,
  cancelGalleryRecord = () => false,
  retryGalleryRecord = () => false,
  syncCloudGallery,
  useGalleryRecord,
} = props.task

const gallerySearch = ref('')
const galleryStatusFilter = ref('all')
const loadingMoreGallery = ref(false)
const galleryStatusFilterOptions = [
  { value: 'all', label: '全部' },
  { value: 'completed', label: '已完成' },
  { value: 'pending', label: '生成中' },
  { value: 'failed', label: '异常' },
]

const normalizedGallerySearch = computed(() => gallerySearch.value.trim().toLowerCase())
const currentGalleryPage = computed(() => Math.max(1, Number(galleryPage?.value || 1)))
const resolvedGalleryPageSize = computed(() => Math.max(1, Number(galleryPageSize?.value || galleryPageSize || 9)))
const hasGalleryFilters = computed(() => Boolean(normalizedGallerySearch.value) || galleryStatusFilter.value !== 'all')
const filteredGallery = computed(() => {
  const records = Array.isArray(gallery?.value) ? gallery.value : []
  const keyword = normalizedGallerySearch.value

  return records.filter((record) => {
    if (galleryStatusFilter.value !== 'all' && getGalleryStatusGroup(record) !== galleryStatusFilter.value) {
      return false
    }

    if (!keyword) return true

    return [
      record.prompt,
      galleryRecordMode(record),
      galleryRecordMeta(record),
      galleryRecordStatusLabel(record),
      galleryRecordModelLabel(record),
      formatGalleryDate(record.createdAt),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(keyword)
  })
})
const galleryKnownTotal = computed(() => Math.max(Number(galleryTotal?.value || 0), filteredGallery.value.length))
const canLoadMoreGallery = computed(
  () => !gallerySyncing?.value && !loadingMoreGallery.value && Boolean(galleryHasMore?.value),
)

function getGalleryStatusGroup(record = {}) {
  const status = String(record.status || '').toLowerCase()
  if (isGalleryRecordPending(record)) return 'pending'
  if (['failed', 'canceled'].includes(status)) return 'failed'
  if (canPreviewGalleryRecord(record)) return 'completed'
  return 'failed'
}

function clearGalleryFilters() {
  gallerySearch.value = ''
  galleryStatusFilter.value = 'all'
}

async function loadMoreGalleryRecords() {
  if (!canLoadMoreGallery.value) return
  loadingMoreGallery.value = true
  try {
    await syncCloudGallery({ page: currentGalleryPage.value + 1, silent: true })
  } finally {
    loadingMoreGallery.value = false
  }
}

function onGalleryScroll(event) {
  const target = event.currentTarget
  if (!target) return
  const remaining = target.scrollHeight - target.scrollTop - target.clientHeight
  if (remaining <= 220) loadMoreGalleryRecords()
}
</script>

<template>
  <ModalDialog :open="galleryOpen" title-id="gallery-title" card-class="gallery-modal" @close="closeGallery">
    <div class="modal-head">
      <div>
        <h2 id="gallery-title">我的图库</h2>
        <p>{{ gallerySummary }}</p>
      </div>
      <button class="icon-button" type="button" aria-label="关闭图库" @click="closeGallery">
        <X aria-hidden="true" />
      </button>
    </div>

    <div class="gallery-toolbar">
      <div class="gallery-cloud-status" :class="{ error: gallerySyncError }" role="status" aria-live="polite">
        <span>
          <Loader2 v-if="gallerySyncing" class="spinner" aria-hidden="true" />
          <RefreshCw v-else aria-hidden="true" />
        </span>
        <div>
          <strong>{{ gallerySyncMessage || galleryCloudStatusText }}</strong>
          <small>
            每页加载 {{ resolvedGalleryPageSize }} 组，最多本地缓存最近 {{ maxLocalGalleryRecords }} 组记录。
          </small>
        </div>
      </div>
      <div class="gallery-toolbar-actions">
        <button
          class="btn btn-soft"
          type="button"
          :disabled="gallerySyncing || !isAuthenticated"
          @click="syncCloudGallery({ page: 1, silent: false })"
        >
          <RefreshCw :class="{ spinner: gallerySyncing }" aria-hidden="true" />
          同步云端
        </button>
        <button class="btn btn-ghost" type="button" :disabled="!gallery.length" @click="clearGallery">
          <Trash2 aria-hidden="true" />
          清空本地
        </button>
      </div>
    </div>

    <div v-if="gallery.length" class="gallery-filterbar">
      <label class="gallery-search">
        <Search aria-hidden="true" />
        <input v-model="gallerySearch" type="search" placeholder="搜索提示词、模式、状态" aria-label="搜索图库记录" />
      </label>
      <div class="gallery-status-tabs" aria-label="筛选图库状态">
        <button
          v-for="option in galleryStatusFilterOptions"
          :key="option.value"
          type="button"
          :class="{ active: galleryStatusFilter === option.value }"
          @click="galleryStatusFilter = option.value"
        >
          {{ option.label }}
        </button>
      </div>
      <div class="gallery-filter-summary">
        <span>已显示 {{ filteredGallery.length }} / {{ galleryKnownTotal || filteredGallery.length }} 组</span>
        <button v-if="hasGalleryFilters" type="button" @click="clearGalleryFilters">清除筛选</button>
      </div>
    </div>

    <div v-if="filteredGallery.length" class="gallery-grid" @scroll.passive="onGalleryScroll">
      <article v-for="record in filteredGallery" :key="record.id" class="gallery-card">
        <component
          :is="canPreviewGalleryRecord(record) ? 'button' : 'div'"
          class="gallery-cover"
          :class="{ 'gallery-cover--status': !canPreviewGalleryRecord(record) }"
          v-bind="
            canPreviewGalleryRecord(record)
              ? {
                  type: 'button',
                  'aria-label': `预览 ${
                    canReuseGalleryRecord(record) ? record.prompt || '图库图片' : galleryRecordMode(record)
                  }`,
                }
              : {
                  role: 'img',
                  'aria-label': `${galleryRecordStatusLabel(record)} ${
                    canReuseGalleryRecord(record) ? record.prompt || '生成任务' : galleryRecordMode(record)
                  }`,
                }
          "
          @click="canPreviewGalleryRecord(record) ? openGalleryImage(record) : null"
        >
          <LazyImage
            v-if="canPreviewGalleryRecord(record)"
            :src="galleryRecordCover(record)"
            :alt="canReuseGalleryRecord(record) ? record.prompt || '图库图片' : galleryRecordMode(record)"
          />
          <span v-else class="gallery-task-placeholder" :class="{ active: isGalleryRecordPending(record) }">
            <span class="gallery-task-icon" aria-hidden="true">
              <Loader2 v-if="isGalleryRecordPending(record)" class="spinner" />
              <ImagePlus v-else />
            </span>
            <span class="gallery-task-copy">
              <strong>{{ galleryRecordStatusLabel(record) || '生成任务' }}</strong>
              <small>{{ galleryRecordProgressText(record) }}</small>
            </span>
          </span>
          <span class="gallery-cover-chips">
            <span class="thumb-chip">{{ galleryRecordMode(record) }}</span>
            <span v-if="galleryRecordModelLabel(record)" class="thumb-chip thumb-chip--model">
              模型：{{ galleryRecordModelLabel(record) }}
            </span>
          </span>
        </component>
        <div class="gallery-card-body">
          <div class="gallery-card-meta">
            <span>{{ formatGalleryDate(record.createdAt) }}</span>
            <span>{{ galleryRecordMeta(record) }}</span>
          </div>
          <p v-if="canReuseGalleryRecord(record)">{{ record.prompt || '无提示词记录' }}</p>
          <p v-if="galleryRecordNotice(record)" class="gallery-card-notice">
            {{ galleryRecordNotice(record) }}
          </p>
          <div class="gallery-actions">
            <button
              v-if="canCancelGalleryRecord(record)"
              class="btn btn-soft"
              type="button"
              :disabled="gallerySyncing"
              @click="cancelGalleryRecord(record)"
            >
              <Square aria-hidden="true" />
              取消
            </button>
            <button
              v-if="canRetryGalleryRecord(record)"
              class="btn btn-soft"
              type="button"
              :disabled="gallerySyncing"
              @click="retryGalleryRecord(record)"
            >
              <RefreshCw aria-hidden="true" />
              重试
            </button>
            <button
              v-if="canReuseGalleryRecord(record)"
              class="btn btn-soft"
              type="button"
              @click="useGalleryRecord(record)"
            >
              <Save aria-hidden="true" />
              复用
            </button>
            <button
              v-if="canPreviewGalleryRecord(record)"
              class="icon-button"
              type="button"
              aria-label="下载该批图片"
              @click="downloadGalleryRecord(record)"
            >
              <Download aria-hidden="true" />
            </button>
            <button
              v-if="canReuseGalleryRecord(record)"
              class="icon-button"
              type="button"
              aria-label="复制提示词"
              @click="copyGalleryPrompt(record)"
            >
              <Copy aria-hidden="true" />
            </button>
            <button class="icon-button" type="button" aria-label="删除记录" @click="removeGalleryRecord(record.id)">
              <Trash2 aria-hidden="true" />
            </button>
          </div>
        </div>
      </article>
      <div v-if="galleryHasMore || gallerySyncing || loadingMoreGallery" class="gallery-load-more" aria-live="polite">
        <Loader2 v-if="gallerySyncing || loadingMoreGallery" class="spinner" aria-hidden="true" />
        <span>{{ gallerySyncing || loadingMoreGallery ? '正在加载更多记录' : '继续下滑加载更多' }}</span>
      </div>
    </div>
    <EmptyState
      v-else-if="gallery.length"
      title="没有匹配的图库记录"
      description="换一个关键词或状态筛选，可以继续查看已同步的历史记录。"
    >
      <template #icon>
        <Search aria-hidden="true" />
      </template>
    </EmptyState>

    <EmptyState
      v-else
      :title="isAuthenticated ? '云端图库暂无记录' : '本地暂无生成记录'"
      :description="
        isAuthenticated ? '完成一次生成后，任务进度和图片结果会同步到这里。' : '登录后可以同步云端图库和生成进度。'
      "
    >
      <template #icon>
        <ImagePlus aria-hidden="true" />
      </template>
    </EmptyState>
  </ModalDialog>
</template>
