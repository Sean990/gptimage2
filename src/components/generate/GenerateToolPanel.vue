<script setup>
import {
  Check,
  ChevronDown,
  GalleryHorizontal,
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
  generationCostText,
  generationIdleTip,
  generationSubmittedTip,
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
  openGallery,
  openImagePreview,
  optimizeCurrentPrompt,
  optimizing,
  outputCompression,
  outputFormat,
  outputFormats,
  prompt,
  promptLabel,
  promptOptimizeCostTip,
  promptPlaceholder,
  promptQualityLabel,
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
  selectedAspectRatioLabel,
  selectedBackgroundLabel,
  selectedBatchCountLabel,
  selectedModel,
  selectedModerationLabel,
  selectedOutputFormatLabel,
  selectedQualityLabel,
  selectedResolutionLabel,
  selectMenuOpen,
  selectModel,
  selectSimpleOption,
  showReferenceSection,
  stopGeneration,
  supportsOutputCompression,
  toggleModelMenu,
  toggleSelectMenu,
  uploads,
  urlInput,
} = props.task
</script>

<template>
  <section class="card tool-panel">
    <div class="mode-switch-card">
      <div class="settings-section-head">
        <h2>选择模式</h2>
        <span>{{ batchMode ? `${normalizedImageCount} 张图片` : activeMode.badge }}</span>
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
    <div
      v-if="batchMode"
      class="batch-count-card"
      :class="{ 'menu-open': selectMenuOpen === 'batchCount' }"
      aria-label="批量生成数量"
    >
      <div>
        <span>生成数量</span>
        <strong>{{ normalizedImageCount }} 张图片</strong>
      </div>
      <div class="model-picker select-picker batch-count-picker">
        <button
          id="batch-count"
          class="model-picker-button select-picker-button"
          type="button"
          :aria-label="`生成数量，当前为 ${selectedBatchCountLabel}`"
          :aria-expanded="selectMenuOpen === 'batchCount'"
          aria-haspopup="listbox"
          aria-controls="batch-count-menu"
          @click.stop="toggleSelectMenu('batchCount')"
          @keydown.escape="closeSelectMenu"
        >
          <span class="model-picker-copy">
            <span class="model-preview-head">
              <strong>{{ selectedBatchCountLabel }}</strong>
            </span>
          </span>
          <ChevronDown
            class="model-picker-arrow"
            :class="{ open: selectMenuOpen === 'batchCount' }"
            aria-hidden="true"
          />
        </button>
        <div
          v-if="selectMenuOpen === 'batchCount'"
          id="batch-count-menu"
          class="model-menu select-menu"
          role="listbox"
          aria-labelledby="batch-count"
        >
          <button
            v-for="item in batchCountOptions"
            :key="item.value"
            class="model-option select-option batch-count-option"
            :class="{ active: item.value === normalizedImageCount }"
            type="button"
            role="option"
            :aria-selected="item.value === normalizedImageCount"
            @click.stop="selectSimpleOption('batchCount', item.value)"
            @keydown.escape="closeSelectMenu"
          >
            <span>
              <span class="model-option-head">
                <strong>{{ item.label }}</strong>
                <em v-if="item.recommended">推荐</em>
              </span>
            </span>
            <Check v-if="item.value === normalizedImageCount" aria-hidden="true" />
          </button>
        </div>
      </div>
      <small>预计消耗 {{ creditCost }} 积分</small>
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
            @click.stop="toggleModelMenu"
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
      <div class="field">
        <label for="aspect-ratio">画幅比例</label>
        <div class="model-picker select-picker">
          <button
            id="aspect-ratio"
            class="model-picker-button select-picker-button"
            type="button"
            :aria-label="`画幅比例，当前为 ${selectedAspectRatioLabel}`"
            :aria-expanded="selectMenuOpen === 'aspectRatio'"
            aria-haspopup="listbox"
            aria-controls="aspect-ratio-menu"
            @click.stop="toggleSelectMenu('aspectRatio')"
            @keydown.escape="closeSelectMenu"
          >
            <span class="model-picker-copy">
              <span class="model-preview-head">
                <strong>{{ selectedAspectRatioLabel }}</strong>
              </span>
            </span>
            <ChevronDown
              class="model-picker-arrow"
              :class="{ open: selectMenuOpen === 'aspectRatio' }"
              aria-hidden="true"
            />
          </button>
          <div
            v-if="selectMenuOpen === 'aspectRatio'"
            id="aspect-ratio-menu"
            class="model-menu select-menu"
            role="listbox"
            aria-labelledby="aspect-ratio"
          >
            <button
              v-for="item in aspectRatios"
              :key="item.value"
              class="model-option select-option"
              :class="{ active: item.value === aspectRatio }"
              type="button"
              role="option"
              :aria-selected="item.value === aspectRatio"
              @click.stop="selectSimpleOption('aspectRatio', item.value)"
              @keydown.escape="closeSelectMenu"
            >
              <span>
                <span class="model-option-head">
                  <strong>{{ item.label }}</strong>
                </span>
              </span>
              <Check v-if="item.value === aspectRatio" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
      <div class="field">
        <label for="resolution">分辨率</label>
        <div class="model-picker select-picker">
          <button
            id="resolution"
            class="model-picker-button select-picker-button"
            type="button"
            :aria-label="`分辨率，当前为 ${selectedResolutionLabel}`"
            :aria-expanded="selectMenuOpen === 'resolution'"
            aria-haspopup="listbox"
            aria-controls="resolution-menu"
            @click.stop="toggleSelectMenu('resolution')"
            @keydown.escape="closeSelectMenu"
          >
            <span class="model-picker-copy">
              <span class="model-preview-head">
                <strong>{{ selectedResolutionLabel }}</strong>
              </span>
            </span>
            <ChevronDown
              class="model-picker-arrow"
              :class="{ open: selectMenuOpen === 'resolution' }"
              aria-hidden="true"
            />
          </button>
          <div
            v-if="selectMenuOpen === 'resolution'"
            id="resolution-menu"
            class="model-menu select-menu"
            role="listbox"
            aria-labelledby="resolution"
          >
            <button
              v-for="item in resolutionOptions"
              :key="item.value"
              class="model-option select-option"
              :class="{ active: item.value === resolution }"
              type="button"
              role="option"
              :aria-selected="item.value === resolution"
              @click.stop="selectSimpleOption('resolution', item.value)"
              @keydown.escape="closeSelectMenu"
            >
              <span>
                <span class="model-option-head">
                  <strong>{{ item.label }}</strong>
                </span>
              </span>
              <Check v-if="item.value === resolution" aria-hidden="true" />
            </button>
          </div>
        </div>
        <small v-if="resolution !== 'auto'">{{ resolutionLabel }}</small>
      </div>
    </div>

    <div v-if="showReferenceSection" class="field reference-section">
      <label
        >{{ referenceLabel }}
        <span v-if="requiresReference">({{ referenceCount }}/{{ maxReferenceCount }})</span></label
      >
      <div class="field">
        <label for="image-url">{{ referenceInputLabel }}</label>
        <div class="control-row">
          <input
            id="image-url"
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
      <label class="upload-zone">
        <ImagePlus aria-hidden="true" />
        <strong>点击上传</strong>
        <span>或拖拽图片</span>
        <span>{{ referenceUploadHint }}</span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          :multiple="mode !== 'edit'"
          hidden
          @change="onFileChange"
        />
      </label>
      <p class="compliance-hint">
        请仅上传本人或已获授权的图片。包含人脸、证件、未成年人、商标、作品或隐私信息的素材，需先确认授权。
      </p>
      <div v-if="referenceCount" class="reference-grid">
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
      <textarea id="prompt" v-model.trim="prompt" :placeholder="promptPlaceholder" spellcheck="false" />
      <div class="quality-meter" aria-live="polite">
        <div class="quality-meter-head">
          <span>{{ promptQualityLabel }}</span>
          <span>{{ promptQualityScore }}%</span>
        </div>
        <div class="quality-track" aria-hidden="true">
          <span class="quality-fill" :style="{ width: `${promptQualityScore}%` }"></span>
        </div>
      </div>
      <small class="prompt-tip-line">{{ promptOptimizeCostTip }} · 不确定怎么写？试试下方的「AI 反推提示词」功能</small>
    </div>

    <details class="advanced-panel" :open="advancedOpen" @toggle="advancedOpen = $event.target.open">
      <summary>
        <span>输出参数</span>
        <small>{{ advancedSummary }}</small>
        <ChevronDown aria-hidden="true" />
      </summary>
      <div class="advanced-grid">
        <div class="field">
          <label for="quality">质量</label>
          <div class="model-picker select-picker">
            <button
              id="quality"
              class="model-picker-button select-picker-button"
              type="button"
              :aria-label="`质量，当前为 ${selectedQualityLabel}`"
              :aria-expanded="selectMenuOpen === 'quality'"
              aria-haspopup="listbox"
              aria-controls="quality-menu"
              @click.stop="toggleSelectMenu('quality')"
              @keydown.escape="closeSelectMenu"
            >
              <span class="model-picker-copy">
                <span class="model-preview-head">
                  <strong>{{ selectedQualityLabel }}</strong>
                </span>
              </span>
              <ChevronDown
                class="model-picker-arrow"
                :class="{ open: selectMenuOpen === 'quality' }"
                aria-hidden="true"
              />
            </button>
            <div
              v-if="selectMenuOpen === 'quality'"
              id="quality-menu"
              class="model-menu select-menu"
              role="listbox"
              aria-labelledby="quality"
            >
              <button
                v-for="item in qualities"
                :key="item.value"
                class="model-option select-option"
                :class="{ active: item.value === quality }"
                type="button"
                role="option"
                :aria-selected="item.value === quality"
                @click.stop="selectSimpleOption('quality', item.value)"
                @keydown.escape="closeSelectMenu"
              >
                <span>
                  <span class="model-option-head">
                    <strong>{{ item.label }}</strong>
                  </span>
                </span>
                <Check v-if="item.value === quality" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
        <div class="field">
          <label for="output-format">输出格式</label>
          <div class="model-picker select-picker">
            <button
              id="output-format"
              class="model-picker-button select-picker-button"
              type="button"
              :aria-label="`输出格式，当前为 ${selectedOutputFormatLabel}`"
              :aria-expanded="selectMenuOpen === 'outputFormat'"
              aria-haspopup="listbox"
              aria-controls="output-format-menu"
              @click.stop="toggleSelectMenu('outputFormat')"
              @keydown.escape="closeSelectMenu"
            >
              <span class="model-picker-copy">
                <span class="model-preview-head">
                  <strong>{{ selectedOutputFormatLabel }}</strong>
                </span>
              </span>
              <ChevronDown
                class="model-picker-arrow"
                :class="{ open: selectMenuOpen === 'outputFormat' }"
                aria-hidden="true"
              />
            </button>
            <div
              v-if="selectMenuOpen === 'outputFormat'"
              id="output-format-menu"
              class="model-menu select-menu"
              role="listbox"
              aria-labelledby="output-format"
            >
              <button
                v-for="item in outputFormats"
                :key="item.value"
                class="model-option select-option"
                :class="{ active: item.value === outputFormat }"
                type="button"
                role="option"
                :aria-selected="item.value === outputFormat"
                @click.stop="selectSimpleOption('outputFormat', item.value)"
                @keydown.escape="closeSelectMenu"
              >
                <span>
                  <span class="model-option-head">
                    <strong>{{ item.label }}</strong>
                  </span>
                </span>
                <Check v-if="item.value === outputFormat" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
        <div class="field">
          <label for="background">背景</label>
          <div class="model-picker select-picker">
            <button
              id="background"
              class="model-picker-button select-picker-button"
              type="button"
              :aria-label="`背景，当前为 ${selectedBackgroundLabel}`"
              :aria-expanded="selectMenuOpen === 'background'"
              aria-haspopup="listbox"
              aria-controls="background-menu"
              @click.stop="toggleSelectMenu('background')"
              @keydown.escape="closeSelectMenu"
            >
              <span class="model-picker-copy">
                <span class="model-preview-head">
                  <strong>{{ selectedBackgroundLabel }}</strong>
                </span>
              </span>
              <ChevronDown
                class="model-picker-arrow"
                :class="{ open: selectMenuOpen === 'background' }"
                aria-hidden="true"
              />
            </button>
            <div
              v-if="selectMenuOpen === 'background'"
              id="background-menu"
              class="model-menu select-menu"
              role="listbox"
              aria-labelledby="background"
            >
              <button
                v-for="item in backgroundOptions"
                :key="item.value"
                class="model-option select-option"
                :class="{ active: item.value === background }"
                type="button"
                role="option"
                :aria-selected="item.value === background"
                @click.stop="selectSimpleOption('background', item.value)"
                @keydown.escape="closeSelectMenu"
              >
                <span>
                  <span class="model-option-head">
                    <strong>{{ item.label }}</strong>
                  </span>
                </span>
                <Check v-if="item.value === background" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
        <div class="field">
          <label for="moderation">内容审核</label>
          <div class="model-picker select-picker">
            <button
              id="moderation"
              class="model-picker-button select-picker-button"
              type="button"
              :aria-label="`内容审核，当前为 ${selectedModerationLabel}`"
              :aria-expanded="selectMenuOpen === 'moderation'"
              aria-haspopup="listbox"
              aria-controls="moderation-menu"
              @click.stop="toggleSelectMenu('moderation')"
              @keydown.escape="closeSelectMenu"
            >
              <span class="model-picker-copy">
                <span class="model-preview-head">
                  <strong>{{ selectedModerationLabel }}</strong>
                </span>
              </span>
              <ChevronDown
                class="model-picker-arrow"
                :class="{ open: selectMenuOpen === 'moderation' }"
                aria-hidden="true"
              />
            </button>
            <div
              v-if="selectMenuOpen === 'moderation'"
              id="moderation-menu"
              class="model-menu select-menu"
              role="listbox"
              aria-labelledby="moderation"
            >
              <button
                v-for="item in moderationOptions"
                :key="item.value"
                class="model-option select-option"
                :class="{ active: item.value === moderation }"
                type="button"
                role="option"
                :aria-selected="item.value === moderation"
                @click.stop="selectSimpleOption('moderation', item.value)"
                @keydown.escape="closeSelectMenu"
              >
                <span>
                  <span class="model-option-head">
                    <strong>{{ item.label }}</strong>
                  </span>
                </span>
                <Check v-if="item.value === moderation" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
        <div v-if="supportsOutputCompression()" class="field">
          <label for="compression">压缩 {{ outputCompression }}%</label>
          <input id="compression" v-model.number="outputCompression" type="range" min="0" max="100" />
        </div>
      </div>
      <div v-if="mode === 'edit'" class="mask-panel">
        <label>蒙版 ({{ maskCount }}/1)</label>
        <div class="control-row">
          <input
            id="mask-url"
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
        <label class="upload-zone upload-zone-compact">
          <ImagePlus aria-hidden="true" />
          <strong>点击上传蒙版</strong>
          <span>仅支持 PNG，透明区域会被编辑</span>
          <input type="file" accept="image/png" hidden @change="onMaskFileChange" />
        </label>
        <p class="compliance-hint">请勿通过蒙版编辑未获授权的人脸、身体、证件、隐私区域或可能造成误导的敏感内容。</p>
        <div v-if="maskCount" class="reference-grid mask-grid">
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
    </details>

    <div v-if="requiresReference" class="reverse-box">
      <div class="reverse-head">
        <span class="reverse-icon" aria-hidden="true">
          <Wand2 />
        </span>
        <div class="reverse-copy">
          <h3>
            <Sparkles aria-hidden="true" />
            AI 反推提示词 <span class="tag">核心功能</span>
          </h3>
          <span>上传已授权图片，生成可修改的摄影提示词草稿</span>
        </div>
      </div>
      <p>
        AI
        辅助分析参考图，生成包含主体特征、服装细节、光线描述和镜头参数的提示词草稿。上传真人照片前请确认已取得合法授权。
      </p>
      <button
        class="btn btn-soft reverse-action"
        type="button"
        :disabled="!canReverse || reversing"
        @click="reversePrompt"
      >
        <Loader2 v-if="reversing" class="spinner" aria-hidden="true" />
        <Wand2 v-else aria-hidden="true" />
        {{ reversing ? '反推中...' : canReverse ? '生成反推提示词' : '请先上传图片' }}
      </button>
      <div class="reverse-meta">
        <span><Gem aria-hidden="true" />消耗 {{ reversePromptCost }} 积分</span>
        <span><Zap aria-hidden="true" />约 10 秒</span>
      </div>
    </div>

    <div class="generation-actions">
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
      <button v-if="loading" class="btn btn-soft" type="button" @click="stopGeneration">
        <Square aria-hidden="true" />
        停止生成
      </button>
    </div>
    <div class="compliance-notice" role="note">
      <strong>提交前请确认素材来源合法，并同意平台进行内容安全审核和 AI 生成标识处理。</strong>
      <span>不得生成违法违规、侵权、虚假新闻、冒用身份、侵犯肖像隐私或危害公共利益的内容。</span>
    </div>
    <div class="generation-inline-notice" :class="{ active: loading }" role="note">
      <div>
        <strong>{{ loading ? generationSubmittedTip : generationIdleTip }}</strong>
        <span>{{ generationCostText }}</span>
      </div>
      <button v-if="loading" class="btn btn-ghost" type="button" @click="openGallery">
        <GalleryHorizontal aria-hidden="true" />
        查看图库进度
      </button>
    </div>
  </section>
</template>
