<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  Check,
  ChevronDown,
  Gem,
  ImagePlus,
  Link as LinkIcon,
  Loader2,
  Shuffle,
  Sparkles,
  Square,
  Trash2,
  Wand2,
  X,
  Zap,
} from 'lucide-vue-next'
import FloatingActionBar from './FloatingActionBar.vue'
import OptionPicker from './OptionPicker.vue'
import '../../assets/generate-tool-panel.css'

const props = defineProps({
  task: {
    type: Object,
    required: true,
  },
})

const {
  activeMode,
  addMaskUrlReference,
  addUrlReference,
  advancedOpen,
  advancedSummary,
  aspectRatio,
  aspectRatios,
  background,
  backgroundOptions,
  batchCountOptions,
  batchMode,
  canAddMask,
  canAddReference,
  canReverse,
  closeModelMenu,
  closeSelectMenu,
  creditCost,
  generate,
  getMaskPreviewImages,
  getReferencePreviewImages,
  imageUrl,
  loading,
  maskCount,
  maskImageUrl,
  maskUploads,
  maskUrlInput,
  maxReferenceCount,
  mode,
  model,
  modelGroups,
  modelMenuOpen,
  modelPicker,
  moderation,
  moderationOptions,
  modes,
  normalizedImageCount,
  onFileChange,
  onMaskFileChange,
  openImagePreview,
  optimizeCurrentPrompt,
  optimizing,
  outputCompression,
  outputFormat,
  outputFormats,
  processMaskFiles,
  processReferenceFiles,
  prompt,
  promptLabel,
  promptOptimizeCostTip,
  promptPlaceholder,
  promptQualityLabel,
  promptQualityLevel,
  promptQualityScore,
  qualities,
  quality,
  randomizePrompt,
  randomPromptLoading,
  referenceCount,
  referenceInputLabel,
  referenceLabel,
  referenceUploadHint,
  removeMaskUpload,
  removeMaskUrlReference,
  removeUpload,
  removeUrlReference,
  requiresReference,
  resolution,
  resolutionLabel,
  resolutionOptions,
  reversePrompt,
  reversePromptCost,
  reversing,
  selectedModel,
  selectModel,
  selectSimpleOption,
  showReferenceSection,
  stopGeneration,
  supportsOutputCompression,
  toggleModelMenu,
  uploads,
  urlInput,
} = props.task

const referenceDragActive = ref(false)
const maskDragActive = ref(false)
const countDropdownOpen = ref('')
const reverseGuideOpen = ref(false)

const imageCountOptions = computed(() => [
  { label: '1 张', value: 1 },
  ...batchCountOptions
    .map((item) => ({ label: `${item.value} 张`, value: item.value }))
    .sort((a, b) => a.value - b.value),
])

function selectImageCount(count) {
  if (count === 1) {
    batchMode.value = false
    closeSelectMenu()
    return
  }
  batchMode.value = true
  selectSimpleOption('batchCount', count)
}

function isCountDropdownOpen(key) {
  return countDropdownOpen.value === key
}

function toggleCountDropdown(key) {
  countDropdownOpen.value = countDropdownOpen.value === key ? '' : key
}

function closeCountDropdown() {
  countDropdownOpen.value = ''
}

function getFooterCountDropdownKey(floating) {
  return floating ? 'footer-floating' : 'footer'
}

function handleSelectImageCount(count) {
  selectImageCount(count)
  closeCountDropdown()
}

function getCountOptionHint(item) {
  return item.value === normalizedImageCount.value ? '当前张数' : '切换张数'
}

onMounted(() => {
  document.addEventListener('click', closeCountDropdown)
})

onUnmounted(() => {
  document.removeEventListener('click', closeCountDropdown)
})

function hasFiles(event) {
  const types = event.dataTransfer?.types
  if (!types) return false
  return Array.from(types).includes('Files')
}

function onReferenceDragEnter(event) {
  if (!hasFiles(event)) return
  event.preventDefault()
  referenceDragActive.value = true
}

function onReferenceDragOver(event) {
  if (!hasFiles(event)) return
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
  referenceDragActive.value = true
}

function onReferenceDragLeave(event) {
  if (event.currentTarget.contains(event.relatedTarget)) return
  referenceDragActive.value = false
}

async function onReferenceDrop(event) {
  if (!hasFiles(event)) return
  event.preventDefault()
  referenceDragActive.value = false
  const files = event.dataTransfer?.files
  if (!files || !files.length) return
  await processReferenceFiles(files)
}

function onMaskDragEnter(event) {
  if (!hasFiles(event)) return
  event.preventDefault()
  maskDragActive.value = true
}

function onMaskDragOver(event) {
  if (!hasFiles(event)) return
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
  maskDragActive.value = true
}

function onMaskDragLeave(event) {
  if (event.currentTarget.contains(event.relatedTarget)) return
  maskDragActive.value = false
}

async function onMaskDrop(event) {
  if (!hasFiles(event)) return
  event.preventDefault()
  maskDragActive.value = false
  const files = event.dataTransfer?.files
  if (!files || !files.length) return
  await processMaskFiles(files)
}
</script>

<template>
  <section class="card tool-panel">
    <div class="mode-switch-card">
      <div class="settings-section-head">
        <div>
          <h2>生图参数</h2>
          <span>{{ activeMode.badge }}</span>
        </div>
        <div class="image-count-segment" role="group" aria-label="生成图片数量">
          <button
            v-for="item in imageCountOptions"
            :key="item.value"
            type="button"
            :class="{ active: normalizedImageCount === item.value }"
            :aria-pressed="normalizedImageCount === item.value"
            @click="selectImageCount(item.value)"
          >
            {{ item.label }}
          </button>
        </div>
      </div>
      <div class="mode-tabs" role="tablist" aria-label="图片生成模式">
        <button
          v-for="item in modes"
          :key="item.value"
          type="button"
          role="tab"
          :aria-selected="mode === item.value"
          :class="{ active: mode === item.value }"
          @click="mode = item.value"
        >
          <strong>{{ item.label }}</strong>
          <span>{{ item.badge }}</span>
        </button>
      </div>
    </div>

    <div class="settings-grid">
      <div class="field model-field">
        <label for="model">模型选择</label>
        <div ref="modelPicker" class="model-picker">
          <button
            id="model"
            class="model-picker-button"
            type="button"
            :aria-label="`模型选择，当前为 ${selectedModel.name}`"
            :aria-expanded="modelMenuOpen"
            aria-haspopup="listbox"
            aria-controls="model-menu"
            @click="toggleModelMenu"
            @keydown.escape="closeModelMenu"
          >
            <span class="model-picker-copy">
              <span class="model-preview-head">
                <strong>{{ selectedModel.name }}</strong>
              </span>
            </span>
            <ChevronDown class="model-picker-arrow" :class="{ open: modelMenuOpen }" aria-hidden="true" />
          </button>
          <div v-if="modelMenuOpen" id="model-menu" class="model-menu" role="listbox" aria-labelledby="model">
            <div v-for="group in modelGroups" :key="group.label" class="model-menu-group">
              <button
                v-for="item in group.models"
                :key="item.value"
                class="model-option model-name-option"
                :class="{ active: item.value === model }"
                type="button"
                role="option"
                :aria-selected="item.value === model"
                @click.stop="selectModel(item.value)"
                @keydown.escape="closeModelMenu"
              >
                <span>
                  <span class="model-option-head">
                    <strong>{{ item.name }}</strong>
                  </span>
                </span>
                <Check v-if="item.value === model" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
      <OptionPicker
        id="aspect-ratio"
        label="画幅比例"
        :options="aspectRatios"
        :model-value="aspectRatio"
        @update:model-value="selectSimpleOption('aspectRatio', $event)"
      />
      <OptionPicker
        id="resolution"
        label="分辨率"
        :options="resolutionOptions"
        :model-value="resolution"
        :hint="resolution !== 'auto' ? resolutionLabel : ''"
        @update:model-value="selectSimpleOption('resolution', $event)"
      />
    </div>

    <div v-if="showReferenceSection" class="field reference-section">
      <label
        >{{ referenceLabel }}
        <span v-if="requiresReference">({{ referenceCount }}/{{ maxReferenceCount }})</span></label
      >
      <div v-if="canAddReference" class="field">
        <label for="image-url">{{ referenceInputLabel }}</label>
        <div class="control-row">
          <input
            id="image-url"
            name="reference_image_url"
            v-model.trim="urlInput"
            type="url"
            inputmode="url"
            autocomplete="off"
            placeholder="输入图片 URL"
            spellcheck="false"
          />
          <button
            class="icon-button"
            type="button"
            aria-label="加入图片 URL"
            :disabled="!urlInput.trim() || (!canAddReference && !imageUrl)"
            @click="addUrlReference"
          >
            <LinkIcon aria-hidden="true" />
          </button>
        </div>
      </div>
      <label
        v-if="!referenceCount"
        class="upload-zone"
        :class="{ 'drag-over': referenceDragActive }"
        @dragenter="onReferenceDragEnter"
        @dragover="onReferenceDragOver"
        @dragleave="onReferenceDragLeave"
        @drop="onReferenceDrop"
      >
        <ImagePlus aria-hidden="true" />
        <strong>点击上传</strong>
        <span>或拖拽图片到此区域</span>
        <span>{{ referenceUploadHint }}</span>
        <input
          name="reference_images"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          :multiple="mode !== 'edit'"
          hidden
          @change="onFileChange"
        />
      </label>
      <details v-if="canAddReference" class="compliance-hint compliance-disclosure">
        <summary>素材需本人或已获授权</summary>
        <p>包含人脸、证件、未成年人、商标、作品或隐私信息的素材，需先确认授权。</p>
      </details>
      <div v-if="referenceCount" class="reference-grid" :class="{ 'reference-grid-edit': mode === 'edit' }">
        <div v-if="imageUrl" class="reference-thumb">
          <button
            class="thumb-preview"
            type="button"
            aria-label="预览 URL 参考图"
            @click="openImagePreview(getReferencePreviewImages(), 0, '参考图像')"
          >
            <img :src="imageUrl" alt="URL 参考图" />
          </button>
          <button
            class="icon-button thumb-remove"
            type="button"
            aria-label="移除 URL 参考图"
            @click="removeUrlReference"
          >
            <X aria-hidden="true" />
          </button>
        </div>
        <div v-for="(item, index) in uploads" :key="item.src" class="reference-thumb">
          <button
            class="thumb-preview"
            type="button"
            :aria-label="`预览 ${item.name}`"
            @click="openImagePreview(getReferencePreviewImages(), imageUrl ? index + 1 : index, '参考图像')"
          >
            <img :src="item.src" :alt="item.name" />
          </button>
          <button
            class="icon-button thumb-remove"
            type="button"
            :aria-label="`移除 ${item.name}`"
            @click="removeUpload(index)"
          >
            <Trash2 aria-hidden="true" />
          </button>
        </div>
        <label
          v-if="canAddReference"
          class="upload-zone reference-upload-tile"
          :class="{ 'drag-over': referenceDragActive }"
          aria-label="继续上传参考图"
          @dragenter="onReferenceDragEnter"
          @dragover="onReferenceDragOver"
          @dragleave="onReferenceDragLeave"
          @drop="onReferenceDrop"
        >
          <ImagePlus aria-hidden="true" />
          <strong>继续上传</strong>
          <span>{{ referenceCount }}/{{ maxReferenceCount }}</span>
          <input
            name="reference_images"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            :multiple="mode !== 'edit'"
            hidden
            @change="onFileChange"
          />
        </label>
      </div>
      <div v-if="mode === 'image'" class="reverse-box reverse-box-inline reverse-feature-card">
        <div class="reverse-head">
          <span class="reverse-icon" aria-hidden="true">
            <Wand2 />
          </span>
          <div class="reverse-copy">
            <h3>
              <Sparkles aria-hidden="true" />
              AI 反推提示词
            </h3>
            <span>把参考图解析成可继续编辑的结构化 Prompt 草稿</span>
          </div>
          <button class="text-button reverse-guide-toggle" type="button" @click="reverseGuideOpen = !reverseGuideOpen">
            {{ reverseGuideOpen ? '收起' : '说明' }}
          </button>
        </div>
        <div v-if="reverseGuideOpen || canReverse" class="reverse-feature-body">
          <p>系统会整理主体、服装、光线、镜头和氛围描述，并自动写入提示词输入框。</p>
          <div class="reverse-feature-tags" aria-label="反推内容范围">
            <span>主体识别</span>
            <span>服装细节</span>
            <span>光线镜头</span>
            <span>氛围风格</span>
          </div>
        </div>
        <div class="reverse-inline-actions">
          <button class="btn reverse-action" type="button" :disabled="!canReverse || reversing" @click="reversePrompt">
            <Loader2 v-if="reversing" class="spinner" aria-hidden="true" />
            <Wand2 v-else aria-hidden="true" />
            {{ reversing ? '反推中...' : canReverse ? '生成反推提示词' : '请先上传图片' }}
          </button>
          <div class="reverse-meta">
            <span><Gem aria-hidden="true" />{{ reversePromptCost }} 积分</span>
            <span><Zap aria-hidden="true" />约 10 秒</span>
          </div>
        </div>
      </div>
    </div>

    <div class="field">
      <div class="prompt-field-head">
        <label for="prompt">{{ promptLabel }}</label>
        <div class="prompt-field-actions">
          <button
            class="btn btn-soft prompt-optimize-btn"
            type="button"
            :disabled="optimizing || !prompt.trim()"
            :title="promptOptimizeCostTip"
            @click="optimizeCurrentPrompt"
          >
            <Loader2 v-if="optimizing" class="spinner" aria-hidden="true" />
            <Sparkles v-else aria-hidden="true" />
            {{ optimizing ? '优化中...' : '一键优化' }}
          </button>
          <button class="btn btn-soft" type="button" :disabled="randomPromptLoading" @click="randomizePrompt">
            <Loader2 v-if="randomPromptLoading" class="spinner" aria-hidden="true" />
            <Shuffle v-else aria-hidden="true" />
            {{ randomPromptLoading ? '加载案例...' : '随机提示词' }}
          </button>
        </div>
      </div>
      <textarea id="prompt" name="prompt" v-model.trim="prompt" :placeholder="promptPlaceholder" spellcheck="false" />
      <div class="quality-meter" aria-live="polite">
        <div class="quality-meter-head">
          <span>{{ promptQualityLabel }}</span>
          <span>{{ promptQualityLevel }}</span>
        </div>
        <div class="quality-track" aria-hidden="true">
          <span class="quality-fill" :style="{ width: `${promptQualityScore}%` }"></span>
        </div>
        <small>仅根据描述长度、参考图和参数估算，不代表最终生成效果。</small>
      </div>
      <small class="prompt-tip-line">
        {{ promptOptimizeCostTip }}
        <template v-if="mode === 'image'"> · 不确定怎么写？参考图模式可直接使用「AI 反推提示词」。</template>
      </small>
    </div>

    <div v-if="mode === 'edit'" class="mask-panel mask-panel-inline">
      <label>蒙版 ({{ maskCount }}/1)</label>
      <div v-if="canAddMask" class="control-row">
        <input
          id="mask-url"
          name="mask_url"
          v-model.trim="maskUrlInput"
          type="url"
          inputmode="url"
          autocomplete="off"
          placeholder="输入 PNG 蒙版 URL"
          spellcheck="false"
        />
        <button
          class="icon-button"
          type="button"
          aria-label="加入蒙版 URL"
          :disabled="!maskUrlInput.trim() || (!canAddMask && !maskImageUrl)"
          @click="addMaskUrlReference"
        >
          <LinkIcon aria-hidden="true" />
        </button>
      </div>
      <label
        v-if="canAddMask"
        class="upload-zone upload-zone-compact"
        :class="{ 'drag-over': maskDragActive }"
        @dragenter="onMaskDragEnter"
        @dragover="onMaskDragOver"
        @dragleave="onMaskDragLeave"
        @drop="onMaskDrop"
      >
        <ImagePlus aria-hidden="true" />
        <strong>点击上传蒙版</strong>
        <span>或拖拽 PNG 蒙版到此区域</span>
        <span>透明区域会被编辑</span>
        <input name="mask_image" type="file" accept="image/png" hidden @change="onMaskFileChange" />
      </label>
      <details v-if="canAddMask" class="compliance-hint compliance-disclosure">
        <summary>蒙版编辑需确认授权</summary>
        <p>请勿通过蒙版编辑未获授权的人脸、身体、证件、隐私区域或可能造成误导的敏感内容。</p>
      </details>
      <div v-if="maskCount" class="reference-grid reference-grid-edit mask-grid">
        <div v-if="maskImageUrl" class="reference-thumb">
          <button
            class="thumb-preview"
            type="button"
            aria-label="预览 URL 蒙版"
            @click="openImagePreview(getMaskPreviewImages(), 0, '蒙版')"
          >
            <img :src="maskImageUrl" alt="URL 蒙版" />
          </button>
          <button
            class="icon-button thumb-remove"
            type="button"
            aria-label="移除 URL 蒙版"
            @click="removeMaskUrlReference"
          >
            <X aria-hidden="true" />
          </button>
        </div>
        <div v-for="(item, index) in maskUploads" :key="item.src" class="reference-thumb">
          <button
            class="thumb-preview"
            type="button"
            :aria-label="`预览 ${item.name}`"
            @click="openImagePreview(getMaskPreviewImages(), maskImageUrl ? index + 1 : index, '蒙版')"
          >
            <img :src="item.src" :alt="item.name" />
          </button>
          <button
            class="icon-button thumb-remove"
            type="button"
            :aria-label="`移除 ${item.name}`"
            @click="removeMaskUpload(index)"
          >
            <Trash2 aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>

    <details class="advanced-panel" :open="advancedOpen" @toggle="advancedOpen = $event.target.open">
      <summary>
        <span>输出参数</span>
        <small>{{ advancedSummary }}</small>
        <ChevronDown aria-hidden="true" />
      </summary>
      <div class="advanced-grid">
        <OptionPicker
          id="quality"
          label="质量"
          :options="qualities"
          :model-value="quality"
          @update:model-value="selectSimpleOption('quality', $event)"
        />
        <OptionPicker
          id="output-format"
          label="输出格式"
          :options="outputFormats"
          :model-value="outputFormat"
          @update:model-value="selectSimpleOption('outputFormat', $event)"
        />
        <OptionPicker
          id="background"
          label="背景"
          :options="backgroundOptions"
          :model-value="background"
          @update:model-value="selectSimpleOption('background', $event)"
        />
        <OptionPicker
          id="moderation"
          label="内容审核"
          :options="moderationOptions"
          :model-value="moderation"
          @update:model-value="selectSimpleOption('moderation', $event)"
        />
        <div v-if="supportsOutputCompression()" class="field">
          <label for="compression">压缩 {{ outputCompression }}%</label>
          <input
            id="compression"
            name="output_compression"
            v-model.number="outputCompression"
            type="range"
            min="0"
            max="100"
          />
        </div>
      </div>
    </details>

    <FloatingActionBar aria-label="快捷生成操作" :bar-class="{ 'generation-actions--loading': loading }">
      <template #default="{ floating }">
        <button class="btn btn-primary" type="button" :aria-busy="loading" :disabled="loading" @click="generate">
          <Sparkles v-if="!loading" aria-hidden="true" />
          <Loader2 v-else class="spinner" aria-hidden="true" />
          {{
            loading
              ? batchMode
                ? '批量生成中...'
                : '正在创建图像...'
              : batchMode
                ? `批量生成 ${normalizedImageCount} 张图片`
                : '开始生成'
          }}
        </button>
        <button v-if="loading" class="btn btn-soft generation-stop-button" type="button" @click="stopGeneration">
          <Square aria-hidden="true" />
          停止生成
        </button>
        <div v-if="!loading" class="count-dropdown-container" @click.stop @keydown.escape.stop="closeCountDropdown">
          <button
            class="generation-cost-pill count-dropdown-trigger"
            type="button"
            aria-haspopup="listbox"
            :aria-expanded="isCountDropdownOpen(getFooterCountDropdownKey(floating))"
            aria-label="选择生成图片数量"
            @click="toggleCountDropdown(getFooterCountDropdownKey(floating))"
          >
            <Gem aria-hidden="true" />
            消耗 {{ creditCost }} 积分
            <ChevronDown
              :class="{ rotate: isCountDropdownOpen(getFooterCountDropdownKey(floating)) }"
              aria-hidden="true"
            />
          </button>
          <ul
            v-if="isCountDropdownOpen(getFooterCountDropdownKey(floating))"
            class="count-dropdown-menu"
            role="listbox"
            aria-label="生成图片数量"
          >
            <li
              v-for="item in imageCountOptions"
              :key="item.value"
              :class="{ active: normalizedImageCount === item.value }"
              role="option"
              :aria-selected="normalizedImageCount === item.value"
            >
              <button type="button" @click.stop="handleSelectImageCount(item.value)">
                <strong>{{ item.label }}</strong>
                <span>{{ getCountOptionHint(item) }}</span>
              </button>
            </li>
          </ul>
        </div>
      </template>
    </FloatingActionBar>
    <div class="compliance-notice" role="note">
      <strong>提交前请确认素材来源合法，并同意平台进行内容安全审核和 AI 生成标识处理。</strong>
      <span>不得生成违法违规、侵权、虚假新闻、冒用身份、侵犯肖像隐私或危害公共利益的内容。</span>
    </div>
  </section>
</template>
