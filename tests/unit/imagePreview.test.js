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
})
