import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { useGenerationBilling } from '../../src/composables/useGenerationBilling'
import { createGptLoadingDots } from '../../src/composables/useGenerationLoading'
import { normalizeGenerationRecord } from '../../src/composables/useGenerationPayload'
import { filterVisibleGalleryRecords, useGallery } from '../../src/composables/useGallery'
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
})
