import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useGenerateAction } from '../../src/composables/useGenerateAction'
import { useGenerationBilling } from '../../src/composables/useGenerationBilling'
import { createGptLoadingDots } from '../../src/composables/useGenerationLoading'
import { isGenerationTaskSuccessful, useGenerationPolling } from '../../src/composables/useGenerationPolling'
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
      '任务已提交，结果区会持续显示进度；你也可以继续生成或处理下一张图片。',
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
      loadLocalGallery,
      markGalleryClearedBefore,
      markGalleryRecordsDeleted,
      mergeGalleryRecords,
      persistLocalGallery,
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
    const api = {
      getGallery: vi.fn().mockResolvedValue([restoredRecord, deletedRecord]),
      getGenerationTask: vi.fn(),
    }
    const { syncCloudGallery } = useGenerationPolling({
      activeTaskId: ref(''),
      api,
      clearGalleryClearedBefore,
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
      loadLocalGallery,
      loading: ref(false),
      loadingStage: ref(''),
      mergeGalleryRecords,
      normalizeGenerationRecord,
      persistLocalGallery,
      setGallerySyncMessage: vi.fn(),
      showNotice: vi.fn(),
    })

    markGalleryClearedBefore('2026-05-13T09:00:00.000Z')
    markGalleryRecordsDeleted(['task-deleted-single'])
    expect(mergeGalleryRecords([], [restoredRecord, deletedRecord])).toEqual([])

    await syncCloudGallery({ silent: false })

    expect(api.getGallery).toHaveBeenCalledTimes(1)
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
})
