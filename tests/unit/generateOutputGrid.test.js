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

function mountGrid(task, props = {}) {
  return mount(GenerateOutputGrid, {
    props: { task, ...props },
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

  it('点击结果续作按钮时会带出当前结果图和目标工具', async () => {
    const task = createTask({
      output: ref([
        {
          id: 'output-continue-1',
          src: '/uploads/result.png',
          title: '生成结果',
          ratio: '1:1',
        },
      ]),
    })
    const wrapper = mountGrid(task, { compact: true })

    await wrapper.get('.output-continuation-trigger').trigger('click')
    await wrapper.findAll('.output-continuation-popover button').at(0).trigger('click')

    expect(wrapper.emitted('use-as-tool')).toEqual([
      [
        {
          toolKey: 'upscale',
          image: expect.objectContaining({
            id: 'output-continue-1',
            src: '/uploads/result.png',
            title: '生成结果',
          }),
          index: 0,
        },
      ],
    ])
  })

  it('紧凑模式下使用续作菜单避免操作按钮拥挤', async () => {
    const task = createTask({
      output: ref([
        {
          id: 'output-compact-menu',
          src: '/uploads/compact.png',
          title: '生成结果',
          ratio: '1:1',
        },
      ]),
    })
    const wrapper = mountGrid(task, { compact: true })

    expect(wrapper.find('.output-continuation-tools').exists()).toBe(false)
    await wrapper.get('.output-continuation-trigger').trigger('click')
    await wrapper.findAll('.output-continuation-popover button').at(1).trigger('click')

    expect(wrapper.emitted('use-as-tool')).toEqual([
      [
        {
          toolKey: 'outpaint',
          image: expect.objectContaining({
            id: 'output-compact-menu',
            src: '/uploads/compact.png',
          }),
          index: 0,
        },
      ],
    ])
    expect(wrapper.find('.output-continuation-popover').exists()).toBe(false)
  })

  it('多图总览中会把局部改图状态绑定到被点击的结果图', async () => {
    const task = createTask({
      output: ref([
        { id: 'output-a', src: '/uploads/a.png', title: '结果 A', ratio: '1:1' },
        { id: 'output-b', src: '/uploads/b.png', title: '结果 B', ratio: '1:1' },
        { id: 'output-c', src: '/uploads/c.png', title: '结果 C', ratio: '1:1' },
      ]),
    })
    const wrapper = mountGrid(task)

    await wrapper.findAll('.output-view-toggle button').at(0).trigger('click')
    await wrapper.vm.$nextTick()

    await wrapper.findAll('.output-actions .icon-button').at(8).trigger('click')

    const outputItems = wrapper.findAll('.output-item')
    expect(outputItems).toHaveLength(3)
    expect(outputItems[0].classes()).not.toContain('output-item--editing')
    expect(outputItems[1].classes()).not.toContain('output-item--editing')
    expect(outputItems[2].classes()).toContain('output-item--editing')
    expect(outputItems[2].attributes('data-output-key')).toBe('output-c')
  })

  it('多图总览点击图片后进入精看并显示缩略图导航', async () => {
    const task = createTask({
      output: ref([
        { id: 'overview-a', src: '/uploads/a.png', title: '结果 A', ratio: '1:1' },
        { id: 'overview-b', src: '/uploads/b.png', title: '结果 B', ratio: '1:1' },
        { id: 'overview-c', src: '/uploads/c.png', title: '结果 C', ratio: '1:1' },
        { id: 'overview-d', src: '/uploads/d.png', title: '结果 D', ratio: '1:1' },
      ]),
    })
    const wrapper = mountGrid(task)

    await wrapper.findAll('.output-view-toggle button').at(0).trigger('click')
    await wrapper.findAll('.output-image-stage').at(2).trigger('click')

    const outputItems = wrapper.findAll('.output-item')
    expect(outputItems).toHaveLength(1)
    expect(outputItems[0].attributes('data-output-key')).toBe('overview-c')
    expect(wrapper.find('.output-grid--overview').exists()).toBe(false)
    expect(wrapper.findAll('.output-thumbnail-button')).toHaveLength(4)
    expect(wrapper.findAll('.output-thumbnail-button').at(2).classes()).toContain('active')
  })

  it('分层浮层支持通过 Escape 关闭', async () => {
    const task = createTask({
      output: ref([{ id: 'output-layer-close', src: '/uploads/layer.png', title: '结果图', ratio: '1:1' }]),
    })
    const wrapper = mountGrid(task)

    await wrapper.findAll('.output-actions .icon-button').at(1).trigger('click')
    expect(wrapper.find('.output-layer-panel').exists()).toBe(true)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.output-layer-panel').exists()).toBe(false)
  })

  it('局部改图浮层提供显式关闭按钮', async () => {
    const task = createTask({
      output: ref([{ id: 'output-edit-close', src: '/uploads/edit.png', title: '结果图', ratio: '1:1' }]),
    })
    const wrapper = mountGrid(task)

    await wrapper.findAll('.output-actions .icon-button').at(2).trigger('click')
    expect(wrapper.find('.output-edit-popover').exists()).toBe(true)

    await wrapper.get('.output-edit-popover .output-floating-close').trigger('click')

    expect(wrapper.find('.output-edit-popover').exists()).toBe(false)
    expect(wrapper.find('.output-item').classes()).not.toContain('output-item--editing')
  })
})
