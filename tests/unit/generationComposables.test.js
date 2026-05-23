import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useGenerateAction } from '../../src/composables/useGenerateAction'
import { useGalleryActions } from '../../src/composables/useGalleryActions'
import { useGenerationBilling } from '../../src/composables/useGenerationBilling'
import { createGptLoadingDots } from '../../src/composables/useGenerationLoading'
import { isGenerationTaskSuccessful, useGenerationPolling } from '../../src/composables/useGenerationPolling'
import { useGenerationUI } from '../../src/composables/useGenerationUI'
import { normalizeGenerationRecord } from '../../src/composables/useGenerationPayload'
import { filterVisibleGalleryRecords, useGallery } from '../../src/composables/useGallery'
import { normalizeModelListPayload } from '../../src/composables/useModelPicker'
import {
  hasUnuploadedLocalFiles,
  isSupportedImageUrl,
  validateImageFile,
} from '../../src/composables/useReferenceImages'

describe('生成页拆分 composables', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
    localStorage.clear()
  })

  it('生成 GPT loading 点阵数据', () => {
    const dots = createGptLoadingDots()

    expect(dots).toHaveLength(169)
    expect(dots[0]).toEqual(
      expect.objectContaining({
        cx: expect.any(Number),
        cy: expect.any(Number),
        restRadius: expect.any(Number),
        litRadius: expect.any(Number),
      }),
    )
  })

  it('2 张和 4 张结果使用多图布局样式', () => {
    const normalizedImageCount = ref(2)
    const aspectRatio = ref('1:1')
    const ui = useGenerationUI({
      batchMode: ref(false),
      galleryOpen: ref(false),
      imagePreview: ref(null),
      loading: ref(false),
      maskCount: ref(0),
      mode: ref('generate'),
      normalizedImageCount,
      output: ref([]),
      aspectRatio,
      closeGallery: vi.fn(),
      closeImagePreview: vi.fn(),
      showNextPreviewImage: vi.fn(),
      showPreviousPreviewImage: vi.fn(),
    })

    expect(ui.outputGridClass.value).toBe('output-grid--many')

    normalizedImageCount.value = 4
    expect(ui.outputGridClass.value).toBe('output-grid--many')

    normalizedImageCount.value = 3
    expect(ui.outputGridClass.value).toBe('output-grid--three')

    expect(ui.outputAspectStyle.value).toEqual({ '--output-ratio': '1 / 1' })
    aspectRatio.value = 'auto'
    expect(ui.outputAspectStyle.value).toEqual({})
  })

  it('识别尚未上传完成的本地引用图', () => {
    expect(hasUnuploadedLocalFiles([{ src: 'blob:http://local/1' }])).toBe(true)
    expect(hasUnuploadedLocalFiles([{ src: 'blob:http://local/1', remoteUrl: '/uploads/1.png' }])).toBe(false)
  })

  it('校验参考图文件类型、大小和蒙版 PNG 要求', () => {
    const jpeg = new File(['x'], 'reference.jpg', { type: 'image/jpeg' })
    const text = new File(['x'], 'bad.txt', { type: 'text/plain' })
    const webpMask = new File(['x'], 'mask.webp', { type: 'image/webp' })
    const oversized = new File([new Uint8Array(21 * 1024 * 1024)], 'large.png', { type: 'image/png' })

    expect(validateImageFile(jpeg)).toBe('')
    expect(validateImageFile(text)).toBe('仅支持 JPG、PNG 或 WEBP 图片')
    expect(validateImageFile(webpMask, { requirePng: true })).toBe('蒙版仅支持 PNG 图片')
    expect(validateImageFile(oversized)).toBe('图片不能超过 20MB')
  })

  it('只接受 http 或 https 图片 URL', () => {
    expect(isSupportedImageUrl('https://example.com/image.png')).toBe(true)
    expect(isSupportedImageUrl('http://example.com/image.webp')).toBe(true)
    expect(isSupportedImageUrl('/relative/image.png')).toBe(false)
    expect(isSupportedImageUrl('javascript:alert(1)')).toBe(false)
  })

  it('按模式、画质和张数计算生成积分', () => {
    const billing = useGenerationBilling({
      auth: {
        credits: ref(30),
        user: ref({ promptOptimizeFreeRemaining: 1 }),
      },
      batchMode: ref(true),
      mode: ref('generate'),
      normalizedImageCount: ref(4),
      quality: ref('high'),
      requiresReference: ref(false),
      siteData: ref({
        billingEnabled: true,
        usageCosts: {
          reversePrompt: { credits: 2 },
          promptOptimize: { credits: 1, dailyFreeQuota: 3 },
          imageGeneration: {
            textToImageBase: 3,
            imageToImageBase: 4,
            editBase: 5,
            highQualityExtra: 2,
            billingTip: '成功后扣费。',
          },
        },
      }),
    })

    expect(billing.creditCost.value).toBe(20)
    expect(billing.promptOptimizeUsesFreeQuota.value).toBe(true)
    expect(billing.footerTipText.value).toContain('批量生成 4 张图片')
  })

  it('兼容上游健康返回的对象模型列表', () => {
    expect(
      normalizeModelListPayload({
        upstreams: [
          {
            name: 'default',
            models: [{ id: 'gpt-image-2' }, { value: 'nano-banana-2' }],
          },
        ],
      }),
    ).toEqual([{ id: 'gpt-image-2' }, { value: 'nano-banana-2' }])
    expect(normalizeModelListPayload({ data: { models: [{ model: 'nano-banana' }] } })).toEqual([
      { model: 'nano-banana' },
    ])
  })

  it('图库记录会把模型 ID 转成用户可读名称', () => {
    const { galleryRecordModelLabel } = useGallery({
      normalizeGenerationRecord,
    })

    expect(galleryRecordModelLabel({ model: 'gpt-image-2', images: [] })).toBe('ImgsGen')
    expect(galleryRecordModelLabel({ images: [{ model: 'nano-banana-pro' }] })).toBe('Nano Banana Pro')
    expect(galleryRecordModelLabel({ model: '', images: [] })).toBe('')
  })

  it('把批量生成的部分成功记录保留为可用结果', () => {
    const record = normalizeGenerationRecord({
      id: 'task-partial',
      prompt: '批量部分成功',
      status: 'failed',
      requestedCount: 4,
      failedCount: 1,
      images: [{ url: '/uploads/partial-1.png' }, { url: '/uploads/partial-2.png' }, { url: '/uploads/partial-3.png' }],
    })

    expect(record.status).toBe('partial_completed')
    expect(record.images).toHaveLength(3)
    expect(record.partialFailureMessage).toContain('已生成 3/4 张')
    expect(isGenerationTaskSuccessful(record)).toBe(true)
  })

  it('图库只展示主任务，不把分层操作当成独立卡片', () => {
    const layerRecord = {
      id: 'task-layer-split',
      tool: 'layer-split',
      status: 'partial_completed',
      requestedCount: 3,
      failedCount: 2,
      images: [{ url: '/uploads/subject.png' }],
    }
    const upscaleRecord = {
      id: 'task-upscale',
      tool: 'upscale',
      status: 'completed',
      images: [{ url: '/uploads/upscale.png' }],
    }
    const { mergeGalleryRecords } = useGallery({
      normalizeGenerationRecord,
    })

    expect(filterVisibleGalleryRecords([layerRecord, upscaleRecord]).map((record) => record.id)).toEqual([
      'task-upscale',
    ])
    expect(mergeGalleryRecords([layerRecord, upscaleRecord]).map((record) => record.id)).toEqual(['task-upscale'])
  })

  it('图库取消中的状态会覆盖正在生成的旧记录', () => {
    const { mergeGalleryRecords } = useGallery({
      normalizeGenerationRecord,
    })
    const runningRecord = {
      id: 'task-cancelable',
      prompt: '排队后取消的任务',
      status: 'running',
      createdAt: '2026-05-13T08:00:00.000Z',
      updatedAt: '2026-05-13T08:01:00.000Z',
      images: [],
    }
    const cancelingRecord = {
      ...runningRecord,
      status: 'cancel_requested',
      updatedAt: '2026-05-13T08:02:00.000Z',
      errorMessage: '用户请求取消生成',
    }

    expect(mergeGalleryRecords([cancelingRecord], [runningRecord])[0]).toMatchObject({
      id: 'task-cancelable',
      status: 'cancel_requested',
      errorMessage: '用户请求取消生成',
    })
  })

  it('图库本地缓存保留 100 条，但云端分页每页只请求 9 条', () => {
    const {
      applyGalleryPagePayload,
      galleryHasMore,
      galleryPage,
      galleryPageSize,
      galleryTotal,
      getGalleryPageParams,
      loadLocalGallery,
      maxLocalGalleryRecords,
      mergeGalleryRecords,
      persistLocalGallery,
    } = useGallery({
      normalizeGenerationRecord,
    })
    const records = Array.from({ length: 25 }, (_, index) => ({
      id: `task-gallery-${index}`,
      prompt: `图库记录 ${index}`,
      status: 'completed',
      createdAt: new Date(Date.UTC(2026, 4, 13, 8, index)).toISOString(),
      images: [{ url: `/uploads/gallery-${index}.png` }],
    }))

    const mergedRecords = mergeGalleryRecords(records)
    persistLocalGallery(mergedRecords)

    expect(maxLocalGalleryRecords).toBe(100)
    expect(galleryPageSize).toBe(9)
    expect(getGalleryPageParams(3)).toEqual({ limit: 9, offset: 18, page: 3, pageSize: 9 })
    expect(mergedRecords).toHaveLength(25)
    expect(loadLocalGallery()).toHaveLength(25)

    const pageRecords = applyGalleryPagePayload(
      {
        records: records.slice(0, 9),
        total: 25,
      },
      1,
    )
    expect(pageRecords).toHaveLength(9)
    expect(galleryPage.value).toBe(1)
    expect(galleryTotal.value).toBe(25)
    expect(galleryHasMore.value).toBe(true)
  })

  it('兼容云端图库嵌套分页响应', () => {
    const { applyGalleryPagePayload, galleryHasMore, galleryTotal } = useGallery({
      normalizeGenerationRecord,
    })

    const pageRecords = applyGalleryPagePayload(
      {
        data: {
          records: [
            {
              id: 'task-nested-gallery',
              prompt: '嵌套分页记录',
              status: 'completed',
              images: [{ url: '/uploads/nested-gallery.png' }],
            },
          ],
          total: 12,
          hasMore: true,
        },
      },
      1,
    )

    expect(pageRecords).toHaveLength(1)
    expect(pageRecords[0].id).toBe('task-nested-gallery')
    expect(galleryTotal.value).toBe(12)
    expect(galleryHasMore.value).toBe(true)
  })

  it('复用多图图库记录时同步生成张数', () => {
    const output = ref([])
    const formState = {
      prompt: ref(''),
      mode: ref('generate'),
      aspectRatio: ref('3:4'),
      resolution: ref('1K'),
      quality: ref('auto'),
      outputFormat: ref('png'),
      background: ref('auto'),
      batchMode: ref(false),
      batchCount: ref(2),
      batchCountOptions: [{ value: 2 }, { value: 4 }, { value: 6 }, { value: 8 }, { value: 10 }],
    }
    const actions = useGalleryActions({
      api: {},
      gallery: ref([]),
      galleryOpen: ref(true),
      gallerySyncMessage: ref(''),
      isAuthenticated: ref(false),
      markGalleryRecordsDeleted: vi.fn(),
      mergeGalleryRecords: vi.fn((records, current = []) => [...records, ...current]),
      model: ref('gpt-image-2'),
      modelOptions: ref([]),
      output,
      persistLocalGallery: vi.fn(),
      selectedModelAvailable: ref(true),
      showNotice: vi.fn(),
    })

    const used = actions.useGalleryRecord(
      normalizeGenerationRecord({
        id: 'task-batch-reuse',
        prompt: '复用四张图',
        mode: 'generate',
        ratio: '1:1',
        resolution: '4K',
        requestedCount: 4,
        images: [
          { url: '/uploads/reuse-1.png' },
          { url: '/uploads/reuse-2.png' },
          { url: '/uploads/reuse-3.png' },
          { url: '/uploads/reuse-4.png' },
        ],
      }),
      formState,
    )

    expect(used).toBe(true)
    expect(formState.batchMode.value).toBe(true)
    expect(formState.batchCount.value).toBe(4)
    expect(output.value).toHaveLength(4)
  })

  it('复用图生图记录时也会同步生成张数', () => {
    const formState = {
      prompt: ref(''),
      mode: ref('generate'),
      aspectRatio: ref('3:4'),
      resolution: ref('1K'),
      quality: ref('auto'),
      outputFormat: ref('png'),
      background: ref('auto'),
      batchMode: ref(true),
      batchCount: ref(4),
      batchCountOptions: [{ value: 2 }, { value: 4 }, { value: 6 }],
    }
    const actions = useGalleryActions({
      api: {},
      gallery: ref([]),
      galleryOpen: ref(true),
      gallerySyncMessage: ref(''),
      isAuthenticated: ref(false),
      markGalleryRecordsDeleted: vi.fn(),
      mergeGalleryRecords: vi.fn((records, current = []) => [...records, ...current]),
      model: ref('gpt-image-2'),
      modelOptions: ref([]),
      output: ref([]),
      persistLocalGallery: vi.fn(),
      selectedModelAvailable: ref(true),
      showNotice: vi.fn(),
    })

    actions.useGalleryRecord(
      normalizeGenerationRecord({
        id: 'task-image-reuse',
        prompt: '参考图改图',
        mode: 'image',
        ratio: 'auto',
        requestedCount: 4,
        images: [{ url: '/uploads/image-1.png' }, { url: '/uploads/image-2.png' }],
      }),
      formState,
    )

    expect(formState.mode.value).toBe('image')
    expect(formState.batchMode.value).toBe(true)
    expect(formState.batchCount.value).toBe(4)
  })

  it('专用图片工具提交时合并结构化工具参数', async () => {
    const loading = ref(false)
    const outputLoading = ref(false)
    const output = ref([])
    const gallery = ref([])
    const activeTaskId = ref('')
    const api = {
      generateImages: vi.fn().mockResolvedValue({
        id: 'task-tool-upscale',
        status: 'completed',
        images: [{ url: '/uploads/upscale.png' }],
      }),
    }
    const action = useGenerateAction({
      api,
      auth: {
        token: ref('token'),
        initialized: ref(true),
        refreshMe: vi.fn().mockResolvedValue(),
      },
      activeTaskId,
      creditCost: ref(5),
      formState: {
        prompt: ref('高清保留产品文字边缘'),
        mode: ref('image'),
        size: ref('auto'),
        aspectRatio: ref('auto'),
        resolution: ref('4K'),
        normalizedImageCount: ref(1),
        quality: ref('high'),
        outputFormat: ref('png'),
        background: ref('auto'),
        moderation: ref('auto'),
        outputCompression: ref(100),
        requiresReference: ref(true),
        batchMode: ref(false),
        supportsOutputCompression: () => false,
      },
      gallery,
      generationAbortController: ref(null),
      getMaskReference: vi.fn(),
      getReferences: vi.fn(() => ['https://example.com/source.png']),
      hasUnreadyUpload: vi.fn(() => false),
      hasUsageCostConfig: ref(true),
      isAuthenticated: ref(true),
      loadSiteData: vi.fn(),
      loading,
      loadingStage: ref('准备提交生成任务'),
      mergeGalleryRecords: vi.fn((records, current = []) => [...records, ...current]),
      model: ref('gpt-image-2'),
      modelOptions: ref([]),
      openLoginFromGenerate: vi.fn(),
      output,
      outputLoading,
      persistLocalGallery: vi.fn(),
      referenceCount: ref(1),
      selectedModelAvailable: ref(true),
      setLastGenerationNotice: vi.fn(),
      showNotice: vi.fn(),
      showReferenceSection: ref(true),
      userCredits: ref(30),
      waitForGenerationTask: vi.fn(),
    })

    await action.generate({
      tool: 'upscale',
      action: 'upscale',
      tool_params: {
        scale: '4x',
        enhance_mode: 'product',
        sharpness: 'crisp',
        face_restore: 'off',
      },
    })

    expect(api.generateImages).toHaveBeenCalledWith(
      expect.objectContaining({
        tool: 'upscale',
        action: 'upscale',
        tool_params: expect.objectContaining({
          scale: '4x',
          enhance_mode: 'product',
          sharpness: 'crisp',
          face_restore: 'off',
        }),
        mode: 'image',
        references: ['https://example.com/source.png'],
      }),
      expect.any(Object),
    )
    expect(output.value[0]).toEqual(expect.objectContaining({ tool: 'upscale' }))
  })

  it('提交后释放按钮但结果区保持生成动画直到轮询完成', async () => {
    let resolveGenerationTask
    const waitForGenerationTask = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveGenerationTask = resolve
        }),
    )
    const loading = ref(false)
    const outputLoading = ref(false)
    const output = ref([])
    const gallery = ref([])
    const activeTaskId = ref('')
    const showNotice = vi.fn()
    const setLastGenerationNotice = vi.fn()
    const mergeGalleryRecords = vi.fn((records, current = []) => [...records, ...current])
    const persistLocalGallery = vi.fn()
    const auth = {
      token: ref('token'),
      initialized: ref(true),
      refreshMe: vi.fn().mockResolvedValue(),
    }
    const action = useGenerateAction({
      api: {
        generateImages: vi.fn().mockResolvedValue({
          id: 'task-running',
          status: 'running',
          images: [],
        }),
      },
      auth,
      activeTaskId,
      creditCost: ref(3),
      formState: {
        prompt: ref('生成一张蓝色产品海报'),
        mode: ref('generate'),
        size: ref('auto'),
        aspectRatio: ref('1:1'),
        resolution: ref('1K'),
        normalizedImageCount: ref(1),
        quality: ref('auto'),
        outputFormat: ref('png'),
        background: ref('auto'),
        moderation: ref('auto'),
        outputCompression: ref(100),
        requiresReference: ref(false),
        batchMode: ref(false),
        supportsOutputCompression: () => false,
      },
      gallery,
      generationAbortController: ref(null),
      getMaskReference: vi.fn(),
      getReferences: vi.fn(() => []),
      hasUnreadyUpload: vi.fn(() => false),
      hasUsageCostConfig: ref(true),
      isAuthenticated: ref(true),
      loadSiteData: vi.fn(),
      loading,
      loadingStage: ref('准备提交生成任务'),
      mergeGalleryRecords,
      model: ref('gpt-image-2'),
      modelOptions: ref([]),
      openLoginFromGenerate: vi.fn(),
      output,
      outputLoading,
      persistLocalGallery,
      referenceCount: ref(0),
      selectedModelAvailable: ref(true),
      setLastGenerationNotice,
      showNotice,
      showReferenceSection: ref(false),
      userCredits: ref(30),
      waitForGenerationTask,
    })

    await action.generate()

    await vi.waitFor(() => {
      expect(waitForGenerationTask).toHaveBeenCalledWith('task-running')
    })
    expect(loading.value).toBe(false)
    expect(outputLoading.value).toBe(true)
    expect(activeTaskId.value).toBe('task-running')
    expect(setLastGenerationNotice).toHaveBeenCalledWith(
      '任务已提交，预计1~3分钟完成。结果区会显示生成动画，你也可以继续生成或处理下一张图片，进度可在我的图库查看。',
    )

    resolveGenerationTask({
      id: 'task-running',
      status: 'completed',
      images: [{ url: '/uploads/result.png' }],
    })
    await vi.waitFor(() => {
      expect(output.value).toHaveLength(1)
    })

    expect(loading.value).toBe(false)
    expect(outputLoading.value).toBe(false)
    expect(activeTaskId.value).toBe('')
    expect(output.value[0].src).toContain('/uploads/result.png')
    expect(showNotice).toHaveBeenLastCalledWith('图像生成完成')
    expect(persistLocalGallery).toHaveBeenCalled()
  })

  it('生成任务失败后会开放前端重试入口', async () => {
    const loading = ref(false)
    const outputLoading = ref(false)
    const output = ref([])
    const gallery = ref([])
    const activeTaskId = ref('')
    const setLastGenerationNotice = vi.fn()
    const setLastGenerationRetryAvailable = vi.fn()
    const action = useGenerateAction({
      api: {
        generateImages: vi.fn().mockResolvedValue({
          id: 'task-failed',
          status: 'running',
          images: [],
        }),
      },
      auth: {
        token: ref('token'),
        initialized: ref(true),
        refreshMe: vi.fn().mockResolvedValue(),
      },
      activeTaskId,
      creditCost: ref(3),
      formState: {
        prompt: ref('生成一张蓝色产品海报'),
        mode: ref('generate'),
        size: ref('auto'),
        aspectRatio: ref('1:1'),
        resolution: ref('1K'),
        normalizedImageCount: ref(1),
        quality: ref('auto'),
        outputFormat: ref('png'),
        background: ref('auto'),
        moderation: ref('auto'),
        outputCompression: ref(100),
        requiresReference: ref(false),
        batchMode: ref(false),
        supportsOutputCompression: () => false,
      },
      gallery,
      generationAbortController: ref(null),
      getMaskReference: vi.fn(),
      getReferences: vi.fn(() => []),
      hasUnreadyUpload: vi.fn(() => false),
      hasUsageCostConfig: ref(true),
      isAuthenticated: ref(true),
      loadSiteData: vi.fn(),
      loading,
      loadingStage: ref('准备提交生成任务'),
      mergeGalleryRecords: vi.fn((records, current = []) => [...records, ...current]),
      model: ref('gpt-image-2'),
      modelOptions: ref([]),
      openLoginFromGenerate: vi.fn(),
      output,
      outputLoading,
      persistLocalGallery: vi.fn(),
      referenceCount: ref(0),
      selectedModelAvailable: ref(true),
      setLastGenerationNotice,
      setLastGenerationRetryAvailable,
      showNotice: vi.fn(),
      showReferenceSection: ref(false),
      userCredits: ref(30),
      waitForGenerationTask: vi.fn().mockRejectedValue(new Error('生成失败，请稍后重试')),
    })

    await action.generate()

    await vi.waitFor(() => {
      expect(setLastGenerationRetryAvailable).toHaveBeenLastCalledWith(true)
    })
    expect(setLastGenerationNotice).toHaveBeenLastCalledWith('生成失败，请稍后重试')
    expect(outputLoading.value).toBe(false)
    expect(activeTaskId.value).toBe('')
  })

  it('删除图库记录后，云端同步返回同一记录不会重新显示', () => {
    const { gallery, markGalleryRecordsDeleted, mergeGalleryRecords, persistLocalGallery } = useGallery({
      normalizeGenerationRecord,
    })
    const cloudRecord = {
      id: 'task-1',
      prompt: '被删除的图库记录',
      status: 'completed',
      createdAt: '2026-05-13T08:00:00.000Z',
      images: [{ url: '/uploads/task-1.png' }],
    }

    gallery.value = mergeGalleryRecords([cloudRecord])
    expect(gallery.value).toHaveLength(1)

    markGalleryRecordsDeleted(['task-1'])
    gallery.value = gallery.value.filter((record) => record.id !== 'task-1')
    persistLocalGallery()

    expect(mergeGalleryRecords(gallery.value, [cloudRecord])).toEqual([])
    expect(filterVisibleGalleryRecords([cloudRecord])).toEqual([])
  })

  it('删除缺少稳定 ID 的图库记录后，也会按记录内容阻止复活', () => {
    const { gallery, markGalleryRecordsDeleted, mergeGalleryRecords, persistLocalGallery } = useGallery({
      normalizeGenerationRecord,
    })
    const cloudRecord = {
      prompt: '没有稳定 ID 的记录',
      status: 'completed',
      createdAt: '2026-05-13T08:30:00.000Z',
      images: [{ url: '/uploads/no-id.png' }],
    }

    gallery.value = mergeGalleryRecords([cloudRecord])
    expect(gallery.value).toHaveLength(1)

    markGalleryRecordsDeleted(gallery.value)
    gallery.value = []
    persistLocalGallery()

    expect(mergeGalleryRecords(gallery.value, [cloudRecord])).toEqual([])
  })

  it('删除有稳定 ID 的失败记录不会误隐藏同文案其他记录', () => {
    const { gallery, markGalleryRecordsDeleted, mergeGalleryRecords, persistLocalGallery } = useGallery({
      normalizeGenerationRecord,
    })
    const firstFailed = {
      id: 'task-failed-1',
      prompt: '相同失败提示词',
      status: 'failed',
      createdAt: '2026-05-13T08:00:00.000Z',
      images: [],
    }
    const secondFailed = {
      id: 'task-failed-2',
      prompt: '相同失败提示词',
      status: 'failed',
      createdAt: '2026-05-13T08:01:00.000Z',
      images: [],
    }

    gallery.value = mergeGalleryRecords([firstFailed, secondFailed])
    expect(gallery.value).toHaveLength(2)

    markGalleryRecordsDeleted([firstFailed])
    gallery.value = gallery.value.filter((record) => record.id !== firstFailed.id)
    persistLocalGallery()

    expect(mergeGalleryRecords(gallery.value, [firstFailed, secondFailed]).map((record) => record.id)).toEqual([
      'task-failed-2',
    ])
    expect(filterVisibleGalleryRecords([firstFailed, secondFailed]).map((record) => record.id)).toEqual([
      'task-failed-2',
    ])
  })

  it('清空本地图库不会写入删除标记，后续云端记录可以重新显示', () => {
    const { gallery, mergeGalleryRecords, persistLocalGallery } = useGallery({
      normalizeGenerationRecord,
    })
    const cloudRecord = {
      id: 'task-cloud-restored',
      prompt: '清空本地后重新显示的云端记录',
      status: 'completed',
      createdAt: '2026-05-13T08:00:00.000Z',
      images: [{ url: '/uploads/task-cloud-restored.png' }],
    }

    gallery.value = mergeGalleryRecords([cloudRecord])
    expect(gallery.value).toHaveLength(1)

    gallery.value = []
    persistLocalGallery([])

    expect(localStorage.getItem('gptImage2DeletedGalleryIds')).toBeNull()
    expect(mergeGalleryRecords(gallery.value, [cloudRecord]).map((record) => record.id)).toEqual([
      'task-cloud-restored',
    ])
    expect(filterVisibleGalleryRecords([cloudRecord]).map((record) => record.id)).toEqual(['task-cloud-restored'])
  })

  it('手动同步云端会清除旧版整库清空标记，但保留单条删除标记', async () => {
    const {
      clearGalleryClearedBefore,
      gallery,
      galleryPage,
      applyGalleryPagePayload,
      getGalleryPageParams,
      loadLocalGallery,
      markGalleryClearedBefore,
      markGalleryRecordsDeleted,
      mergeGalleryRecords,
      persistLocalGallery,
      setGalleryPage,
    } = useGallery({
      normalizeGenerationRecord,
    })
    const restoredRecord = {
      id: 'task-cleared-before',
      prompt: '旧版清空标记隐藏的云端记录',
      status: 'completed',
      createdAt: '2026-05-13T08:00:00.000Z',
      images: [{ url: '/uploads/task-cleared-before.png' }],
    }
    const deletedRecord = {
      id: 'task-deleted-single',
      prompt: '单条删除过的云端记录',
      status: 'completed',
      createdAt: '2026-05-13T10:00:00.000Z',
      images: [{ url: '/uploads/task-deleted-single.png' }],
    }
    const staleLoadedRecord = {
      id: 'task-stale-loaded',
      prompt: '上一轮分页残留记录',
      status: 'completed',
      createdAt: '2026-05-13T11:00:00.000Z',
      images: [{ url: '/uploads/task-stale-loaded.png' }],
    }
    const api = {
      getGallery: vi.fn().mockResolvedValue([restoredRecord, deletedRecord]),
      getGenerationTask: vi.fn(),
    }
    const { syncCloudGallery } = useGenerationPolling({
      activeTaskId: ref(''),
      api,
      applyGalleryPagePayload,
      clearGalleryClearedBefore,
      gallery,
      galleryPage,
      galleryLastSyncedAt: ref(''),
      galleryOpen: ref(false),
      gallerySyncError: ref(''),
      gallerySyncing: ref(false),
      gallerySyncMessage: ref(''),
      generationAbortController: ref(null),
      hasPendingGalleryRecords: ref(false),
      getGalleryPageParams,
      isAuthenticated: ref(true),
      isGalleryRecordPending: () => false,
      loadLocalGallery,
      loading: ref(false),
      loadingStage: ref(''),
      mergeGalleryRecords,
      normalizeGenerationRecord,
      persistLocalGallery,
      setGalleryPage,
      setGallerySyncMessage: vi.fn(),
      showNotice: vi.fn(),
    })

    markGalleryClearedBefore('2026-05-13T09:00:00.000Z')
    markGalleryRecordsDeleted(['task-deleted-single'])
    gallery.value = mergeGalleryRecords([staleLoadedRecord])
    persistLocalGallery()
    expect(mergeGalleryRecords([], [restoredRecord, deletedRecord])).toEqual([])

    await syncCloudGallery({ silent: false })

    expect(api.getGallery).toHaveBeenCalledTimes(1)
    expect(api.getGallery).toHaveBeenCalledWith({ limit: 9, offset: 0, page: 1, pageSize: 9 })
    expect(localStorage.getItem('gptImage2GalleryClearedBefore')).toBeNull()
    expect(localStorage.getItem('gptImage2DeletedGalleryIds')).toContain('id:task-deleted-single')
    expect(gallery.value.map((record) => record.id)).toEqual(['task-cleared-before'])
  })

  it('多个生成任务轮询不会互相取消', async () => {
    vi.useFakeTimers()
    const callCounts = new Map()
    const api = {
      getGenerationTask: vi.fn(async (id) => {
        const count = (callCounts.get(id) || 0) + 1
        callCounts.set(id, count)
        if (id === 'task-a' && count > 1) {
          return {
            id,
            status: 'completed',
            images: [{ url: '/uploads/task-a.png' }],
          }
        }
        return { id, status: 'running', images: [] }
      }),
      getQueuePosition: vi.fn(),
    }
    const { clearTaskPollTimer, waitForGenerationTask } = useGenerationPolling({
      activeTaskId: ref('task-b'),
      api,
      clearGalleryClearedBefore: vi.fn(),
      gallery: ref([]),
      galleryLastSyncedAt: ref(''),
      galleryOpen: ref(false),
      gallerySyncError: ref(''),
      gallerySyncing: ref(false),
      gallerySyncMessage: ref(''),
      generationAbortController: ref(null),
      hasPendingGalleryRecords: ref(false),
      isAuthenticated: ref(true),
      isGalleryRecordPending: () => false,
      loadLocalGallery: () => [],
      loading: ref(false),
      loadingStage: ref(''),
      mergeGalleryRecords: (records, current = []) => [...records, ...current],
      normalizeGenerationRecord,
      persistLocalGallery: vi.fn(),
      queuePosition: ref(null),
      setGallerySyncMessage: vi.fn(),
      showNotice: vi.fn(),
    })

    const firstTask = waitForGenerationTask('task-a')
    await vi.waitFor(() => {
      expect(api.getGenerationTask).toHaveBeenCalledWith('task-a')
    })

    waitForGenerationTask('task-b')
    await vi.waitFor(() => {
      expect(api.getGenerationTask).toHaveBeenCalledWith('task-b')
    })

    await vi.advanceTimersByTimeAsync(1500)

    await expect(firstTask).resolves.toMatchObject({ id: 'task-a', status: 'completed' })
    expect(callCounts.get('task-a')).toBe(2)
    clearTaskPollTimer()
  })

  it('分层类派生任务轮询时可以不写入图库', async () => {
    const gallery = ref([])
    const mergeGalleryRecords = vi.fn((records, current = []) => [...records, ...current])
    const persistLocalGallery = vi.fn()
    const api = {
      getGenerationTask: vi.fn().mockResolvedValue({
        id: 'task-layer-split',
        status: 'completed',
        tool: 'layer-split',
        images: [{ url: '/uploads/subject.png' }],
      }),
      getQueuePosition: vi.fn(),
    }
    const { waitForGenerationTask } = useGenerationPolling({
      activeTaskId: ref('task-layer-split'),
      api,
      clearGalleryClearedBefore: vi.fn(),
      gallery,
      galleryLastSyncedAt: ref(''),
      galleryOpen: ref(false),
      gallerySyncError: ref(''),
      gallerySyncing: ref(false),
      gallerySyncMessage: ref(''),
      generationAbortController: ref(null),
      hasPendingGalleryRecords: ref(false),
      isAuthenticated: ref(true),
      isGalleryRecordPending: () => false,
      loadLocalGallery: () => [],
      loading: ref(false),
      loadingStage: ref(''),
      mergeGalleryRecords,
      normalizeGenerationRecord,
      persistLocalGallery,
      queuePosition: ref(null),
      setGallerySyncMessage: vi.fn(),
      showNotice: vi.fn(),
    })

    await expect(waitForGenerationTask('task-layer-split', { syncGallery: false })).resolves.toMatchObject({
      id: 'task-layer-split',
    })
    expect(gallery.value).toEqual([])
    expect(mergeGalleryRecords).not.toHaveBeenCalled()
    expect(persistLocalGallery).not.toHaveBeenCalled()
  })
})
