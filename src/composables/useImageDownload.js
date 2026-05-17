import { inferImageExtension, sanitizeFileName } from './useGenerationPayload'

export function useImageDownload({ showNotice }) {
  async function downloadImage(image, fallbackTitle = '生成图片') {
    const src = typeof image === 'string' ? image : image?.src || image?.url
    if (!src) {
      showNotice('图片地址不存在，无法下载')
      return
    }
    const title = typeof image === 'string' ? fallbackTitle : image?.title || fallbackTitle
    const ext = inferImageExtension(src, image?.outputFormat || 'png')
    const filename = `${sanitizeFileName(title)}.${ext}`

    try {
      const response = await fetch(src, { mode: 'cors', credentials: 'omit' })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)
      showNotice('图片已开始下载')
    } catch {
      window.open(src, '_blank', 'noreferrer')
      showNotice('直接下载失败，已在新标签页打开原图')
    }
  }

  function downloadPreviewImage(currentPreviewImage) {
    if (!currentPreviewImage) return
    downloadImage(currentPreviewImage, '生成图片')
  }

  function downloadGalleryRecord(record) {
    const images = Array.isArray(record?.images) ? record.images : []
    if (!images.length) {
      showNotice('这条记录暂无可下载图片')
      return
    }
    const title = record.prompt?.slice(0, 40) || 'imgsgen-image'
    images.forEach((item, index) => {
      downloadImage(
        {
          src: item.url || item.src,
          title: `${title}-${index + 1}`,
          outputFormat: item.outputFormat,
        },
        '图库图片',
      )
    })
  }

  return {
    downloadImage,
    downloadPreviewImage,
    downloadGalleryRecord,
  }
}
