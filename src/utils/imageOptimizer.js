/**
 * 图片URL优化工具
 * 用于生成缩略图、压缩图等优化版本的URL
 */

/**
 * 图片尺寸预设
 */
export const ImageSize = {
  THUMBNAIL: 'thumbnail', // 缩略图 (200x200)
  SMALL: 'small', // 小图 (400x400)
  MEDIUM: 'medium', // 中图 (800x800)
  LARGE: 'large', // 大图 (1200x1200)
  ORIGINAL: 'original', // 原图
}

/**
 * 图片质量预设
 */
export const ImageQuality = {
  LOW: 60,
  MEDIUM: 75,
  HIGH: 85,
  ORIGINAL: 100,
}

/**
 * 检测URL是否支持阿里云OSS图片处理
 */
function isAliyunOSS(url) {
  return /aliyuncs\.com/.test(url)
}

/**
 * 检测URL是否支持腾讯云COS图片处理
 */
function isTencentCOS(url) {
  return /myqcloud\.com/.test(url)
}

/**
 * 检测URL是否支持七牛云图片处理
 */
function isQiniuCloud(url) {
  return /qiniucdn\.com|qnssl\.com/.test(url)
}

/**
 * 获取尺寸对应的像素值
 */
function getSizePixels(size) {
  const sizeMap = {
    [ImageSize.THUMBNAIL]: 200,
    [ImageSize.SMALL]: 400,
    [ImageSize.MEDIUM]: 800,
    [ImageSize.LARGE]: 1200,
    [ImageSize.ORIGINAL]: null,
  }
  return sizeMap[size] || null
}

/**
 * 为阿里云OSS URL添加图片处理参数
 */
function optimizeAliyunOSS(url, size, quality) {
  const pixels = getSizePixels(size)
  if (!pixels) return url

  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}x-oss-process=image/resize,m_lfit,w_${pixels},h_${pixels}/quality,q_${quality}/format,webp`
}

/**
 * 为腾讯云COS URL添加图片处理参数
 */
function optimizeTencentCOS(url, size, quality) {
  const pixels = getSizePixels(size)
  if (!pixels) return url

  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}imageMogr2/thumbnail/${pixels}x${pixels}/quality/${quality}/format/webp`
}

/**
 * 为七牛云URL添加图片处理参数
 */
function optimizeQiniuCloud(url, size, quality) {
  const pixels = getSizePixels(size)
  if (!pixels) return url

  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}imageView2/2/w/${pixels}/h/${pixels}/q/${quality}/format/webp`
}

/**
 * 优化图片URL
 * @param {string} url - 原始图片URL
 * @param {string} size - 图片尺寸 (ImageSize)
 * @param {number} quality - 图片质量 (1-100)
 * @returns {string} 优化后的URL
 */
export function optimizeImageUrl(url, size = ImageSize.MEDIUM, quality = ImageQuality.MEDIUM) {
  if (!url || typeof url !== 'string') return url
  if (size === ImageSize.ORIGINAL) return url

  try {
    if (isAliyunOSS(url)) {
      return optimizeAliyunOSS(url, size, quality)
    }
    if (isTencentCOS(url)) {
      return optimizeTencentCOS(url, size, quality)
    }
    if (isQiniuCloud(url)) {
      return optimizeQiniuCloud(url, size, quality)
    }

    return url
  } catch (error) {
    console.error('图片URL优化失败:', error)
    return url
  }
}

/**
 * 获取缩略图URL
 */
export function getThumbnailUrl(url, quality = ImageQuality.LOW) {
  return optimizeImageUrl(url, ImageSize.THUMBNAIL, quality)
}

/**
 * 获取小图URL
 */
export function getSmallImageUrl(url, quality = ImageQuality.MEDIUM) {
  return optimizeImageUrl(url, ImageSize.SMALL, quality)
}

/**
 * 获取中图URL
 */
export function getMediumImageUrl(url, quality = ImageQuality.MEDIUM) {
  return optimizeImageUrl(url, ImageSize.MEDIUM, quality)
}

/**
 * 获取大图URL
 */
export function getLargeImageUrl(url, quality = ImageQuality.HIGH) {
  return optimizeImageUrl(url, ImageSize.LARGE, quality)
}

/**
 * 根据容器宽度自动选择合适的图片尺寸
 */
export function getResponsiveImageUrl(url, containerWidth, quality = ImageQuality.MEDIUM) {
  if (!containerWidth) return url

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  const targetWidth = containerWidth * dpr

  let size
  if (targetWidth > 1000) {
    size = ImageSize.LARGE
  } else if (targetWidth > 600) {
    size = ImageSize.MEDIUM
  } else if (targetWidth > 300) {
    size = ImageSize.SMALL
  } else {
    size = ImageSize.THUMBNAIL
  }

  return optimizeImageUrl(url, size, quality)
}

/**
 * 预加载图片
 */
export function preloadImage(url) {
  return new Promise((resolve, reject) => {
    if (!url) {
      reject(new Error('图片URL为空'))
      return
    }

    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`图片加载失败: ${url}`))
    img.src = url
  })
}

/**
 * 批量预加载图片
 */
export async function preloadImages(urls, options = {}) {
  const { concurrency = 3, onProgress } = options

  const results = []
  const queue = [...urls]
  let completed = 0

  async function processNext() {
    if (queue.length === 0) return

    const url = queue.shift()
    try {
      const img = await preloadImage(url)
      results.push({ url, success: true, img })
    } catch (error) {
      results.push({ url, success: false, error })
    }

    completed++
    if (onProgress) {
      onProgress(completed, urls.length)
    }

    await processNext()
  }

  const workers = Array(Math.min(concurrency, urls.length))
    .fill(null)
    .map(() => processNext())

  await Promise.all(workers)
  return results
}
