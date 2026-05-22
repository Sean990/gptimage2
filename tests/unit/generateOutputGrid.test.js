import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import GenerateOutputGrid from '../../src/components/generate/GenerateOutputGrid.vue'

function createTask(overrides = {}) {
  return {
    activeMode: { label: '文生图' },
    batchMode: ref(false),
    canPreviewGalleryRecord: vi.fn((record) => Boolean(record.images?.length)),
    canRetryGalleryRecord: vi.fn(() => false),
    canReuseGalleryRecord: vi.fn(() => true),
    copyGalleryPrompt: vi.fn(),
    downloadGalleryRecord: vi.fn(),
    downloadImage: vi.fn(),
    gallery: ref([]),
    galleryRecordCover: vi.fn((record) => record.images?.[0]?.url || ''),
    galleryRecordMode: vi.fn(() => '文生图'),
    galleryRecordStatusLabel: vi.fn(() => ''),
    generationSubmittedTip: '任务已提交',
    gptLoadingDots: [],
    isGalleryRecordPending: vi.fn(() => false),
    loadingTileCount: ref(1),
    loadingVariant: ref('standard'),
    normalizedImageCount: ref(1),
    openGallery: vi.fn(),
    openGalleryImage: vi.fn(),
    openImagePreview: vi.fn(),
    output: ref([]),
    outputActionLoading: ref(false),
    outputActionTargetId: ref(''),
    outputActionType: ref(''),
    outputAspectStyle: ref({ '--output-ratio': '1 / 1' }),
    outputGridClass: ref('output-grid--single'),
    outputLoading: ref(false),
    outputPlaceholders: ref([1]),
    resolutionLabel: ref('4K'),
    retryGalleryRecord: vi.fn(),
    selectedModel: { name: 'ImgsGen' },
    submitOutputLayerSplit: vi.fn().mockResolvedValue({ id: 'layer-retry' }),
    submitOutputRegionEdit: vi.fn(),
    useGalleryRecord: vi.fn(),
    ...overrides,
  }
}

function mountGrid(task) {
  return mount(GenerateOutputGrid, {
    props: { task },
    global: {
      stubs: {
        Teleport: true,
        Transition: false,
      },
    },
  })
}

describe('GenerateOutputGrid', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn(() => ({
      addEventListener: vi.fn(),
      matches: false,
      removeEventListener: vi.fn(),
    }))
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('分层部分失败时在当前图层面板提供单层重试', async () => {
    const task = createTask({
      output: ref([
        {
          id: 'output-1',
          src: '/uploads/source.png',
          title: '结果图',
          layers: [{ id: 'subject', type: 'subject', label: '主体', src: '/uploads/subject.png' }],
          layerSplitRequestedTypes: ['subject', 'text', 'background'],
          layerSplitFailedSlots: [
            { id: 'text-failed', type: 'text', label: '文字' },
            { id: 'background-failed', type: 'background', label: '背景' },
          ],
          layerSplitRecord: {
            requestedCount: 3,
            failedCount: 2,
            partialFailureMessage: '已生成 1/3 张，失败 2 张未扣积分，可单独重新生成。',
          },
        },
      ]),
    })
    const wrapper = mountGrid(task)

    await wrapper.get('button[aria-label="查看 结果图 图层"]').trigger('click')

    expect(wrapper.text()).toContain('1/3 个图层，2 个失败')
    expect(wrapper.text()).toContain('文字图层生成失败')
    expect(wrapper.text()).toContain('背景图层生成失败')

    await wrapper.get('button[aria-label="重新生成文字图层"]').trigger('click')

    expect(task.submitOutputLayerSplit).toHaveBeenCalledWith(expect.objectContaining({ id: 'output-1' }), 0, {
      layerType: 'text',
    })
  })
})
