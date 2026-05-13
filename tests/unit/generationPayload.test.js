import { describe, expect, it } from 'vitest'
import {
  compactPayload,
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

  it('下载文件名和扩展名保持可控', () => {
    expect(sanitizeFileName('a/b:c*图?\n')).toBe('a b c 图')
    expect(inferImageExtension('https://example.com/image.jpeg?x=1')).toBe('jpg')
    expect(inferImageExtension('', 'webp')).toBe('webp')
  })
})
