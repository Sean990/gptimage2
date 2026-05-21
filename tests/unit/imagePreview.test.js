import { describe, expect, it } from 'vitest'
import { useImagePreview } from '../../src/composables/useImagePreview'

describe('图片预览 composable', () => {
  it('打开预览时会规范化索引并支持边界循环', () => {
    const preview = useImagePreview()

    preview.openImagePreview(
      [
        { src: '/a.png', title: 'A' },
        { src: '/b.png', title: 'B' },
      ],
      5,
    )
    expect(preview.previewPosition.value).toBe('2 / 2')
    expect(preview.currentPreviewImage.value.title).toBe('B')

    preview.showNextPreviewImage()
    expect(preview.previewPosition.value).toBe('1 / 2')

    preview.showPreviousPreviewImage()
    expect(preview.previewPosition.value).toBe('2 / 2')
  })

  it('关闭预览会清理当前状态', () => {
    const preview = useImagePreview()

    preview.openImagePreview('/a.png')
    preview.closeImagePreview()

    expect(preview.imagePreview.value).toBeNull()
    expect(preview.previewCount.value).toBe(0)
  })

  it('会保留工具图的原图对比信息', () => {
    const preview = useImagePreview()
    const record = {
      id: 'tool-task',
      tool: 'upscale',
      sourceImages: ['/source.png'],
    }

    preview.openImagePreview([
      {
        src: '/result.png',
        title: '高清结果',
        originalSrc: '/source.png',
        sourceImages: ['/source.png'],
        tool: 'upscale',
        record,
      },
    ])

    expect(preview.currentPreviewImage.value).toEqual(
      expect.objectContaining({
        src: '/result.png',
        originalSrc: '/source.png',
        sourceImages: ['/source.png'],
        tool: 'upscale',
        record,
      }),
    )
  })

  it('会保留图生图和精修图的原图对比信息', () => {
    const preview = useImagePreview()

    preview.openImagePreview(
      [
        {
          src: '/image-result.png',
          title: '图生图结果',
          record: {
            id: 'image-task',
            mode: 'image',
            references: ['/reference.png'],
          },
        },
        {
          src: '/edit-result.png',
          title: '精修图结果',
          record: {
            id: 'edit-task',
            mode: 'edit',
            sourceImages: ['/origin.png'],
          },
        },
      ],
      1,
    )

    expect(preview.previewImages.value[0]).toEqual(
      expect.objectContaining({
        mode: 'image',
        originalSrc: '/reference.png',
        sourceImages: ['/reference.png'],
      }),
    )
    expect(preview.currentPreviewImage.value).toEqual(
      expect.objectContaining({
        mode: 'edit',
        originalSrc: '/origin.png',
        sourceImages: ['/origin.png'],
      }),
    )
  })

  it('预览元信息会从记录级字段兜底，保持不同入口展示一致', () => {
    const preview = useImagePreview()

    preview.openImagePreview({
      src: '/gallery-result.png',
      title: '图库结果',
      record: {
        id: 'gallery-task',
        model: 'gpt-image-2',
        resolution: '1K',
        ratio: '4:3',
        output_format: 'png',
      },
    })

    expect(preview.currentPreviewImage.value).toEqual(
      expect.objectContaining({
        meta: '1K · 4:3',
        model: 'gpt-image-2',
        modelLabel: 'ImgsGen',
        outputFormat: 'png',
      }),
    )
  })
})
