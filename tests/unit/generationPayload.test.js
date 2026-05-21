import { describe, expect, it } from 'vitest'
import {
  canReuseGenerationRecord,
  compactPayload,
  getGenerationRecordTypeLabel,
  inferImageExtension,
  mapRecordImages,
  normalizeGenerationRecord,
  resolveOutputSize,
  sanitizeFileName,
} from '../../src/composables/useGenerationPayload'

describe('生成 payload 工具', () => {
  it('构造 payload 时只移除空值', () => {
    expect(compactPayload({ a: '', b: null, c: undefined, d: 0, e: false, f: [] })).toEqual({
      d: 0,
      e: false,
      f: [],
    })
  })

  it('按分辨率和比例解析输出尺寸', () => {
    const matrix = { '4K': { '3:4': '2448x3264' } }

    expect(resolveOutputSize(matrix, '4K', '3:4')).toBe('2448x3264')
    expect(resolveOutputSize(matrix, 'auto', '3:4')).toBe('auto')
  })

  it('标准化图库记录和输出图片', () => {
    const record = normalizeGenerationRecord(
      {
        id: 'task-1',
        status: 'completed',
        images: [{ url: '/uploads/a.png', title: '结果' }],
      },
      {
        prompt: '一张图',
        model: 'gpt-image-2',
        mode: 'generate',
        resolution: '4K',
      },
    )

    expect(record.images[0]).toEqual(
      expect.objectContaining({
        title: '结果',
        prompt: '一张图',
        model: 'gpt-image-2',
      }),
    )
    expect(mapRecordImages(record)[0]).toEqual(
      expect.objectContaining({ src: expect.stringContaining('/uploads/a.png') }),
    )
  })

  it('保留结果图原图、图层和改图历史元数据', () => {
    const record = normalizeGenerationRecord(
      {
        id: 'task-layer-1',
        prompt: '分层',
        tool: 'layer-split',
        status: 'completed',
        images: [
          {
            url: '/uploads/current.png',
            originalSrc: '/uploads/source.png',
            layers: [{ type: 'subject', label: '主体', url: '/uploads/subject.png' }],
            editHistory: [{ beforeSrc: '/uploads/before.png', afterSrc: '/uploads/current.png', prompt: '换颜色' }],
          },
        ],
      },
      { model: 'gpt-image-2' },
    )
    const [image] = mapRecordImages(record)

    expect(getGenerationRecordTypeLabel(record)).toBe('智能分层')
    expect(image.originalSrc).toContain('/uploads/source.png')
    expect(image.layers[0]).toEqual(
      expect.objectContaining({
        type: 'subject',
        label: '主体',
        src: expect.stringContaining('/uploads/subject.png'),
      }),
    )
    expect(image.editHistory[0]).toEqual(
      expect.objectContaining({
        beforeSrc: expect.stringContaining('/uploads/before.png'),
        afterSrc: expect.stringContaining('/uploads/current.png'),
        prompt: '换颜色',
      }),
    )
  })

  it('独立图片工具记录只显示工具类型且不可复用提示词', () => {
    const record = normalizeGenerationRecord(
      {
        id: 'task-tool-1',
        prompt: '内部处理提示词',
        tool: 'upscale',
        action: 'upscale',
        mode: 'image',
        status: 'completed',
        images: [{ url: '/uploads/upscale.png', title: '放大结果' }],
      },
      {
        model: 'gpt-image-2',
      },
    )

    expect(canReuseGenerationRecord(record)).toBe(false)
    expect(getGenerationRecordTypeLabel(record)).toBe('高清放大')
  })

  it('下载文件名和扩展名保持可控', () => {
    expect(sanitizeFileName('a/b:c*图?\n')).toBe('a b c 图')
    expect(inferImageExtension('https://example.com/image.jpeg?x=1')).toBe('jpg')
    expect(inferImageExtension('', 'webp')).toBe('webp')
  })
})
