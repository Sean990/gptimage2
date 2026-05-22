export const ImageSize = {
  THUMBNAIL: 'thumbnail',
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large',
  ORIGINAL: 'original',
}

export const ImageQuality = {
  LOW: 60,
  MEDIUM: 75,
  HIGH: 85,
  ORIGINAL: 100,
}

function isAliyunOSS(url) {
  return /aliyuncs\.com/.test(url)
}

function isTencentCOS(url) {
  return /myqcloud\.com/.test(url)
}

function isQiniuCloud(url) {
  return /qiniucdn\.com|qnssl\.com/.test(url)
}

function isLocalUpload(url) {
  return /^\/uploads\//.test(url) || /\/uploads\//.test(url)
}

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

function optimizeAliyunOSS(url, size, quality) {
  const pixels = getSizePixels(size)
  if (!pixels) return url

  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}x-oss-process=image/resize,m_lfit,w_${pixels},h_${pixels}/quality,q_${quality}/format,webp`
}

function optimizeTencentCOS(url, size, quality) {
  const pixels = getSizePixels(size)
  if (!pixels) return url

  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}imageMogr2/thumbnail/${pixels}x${pixels}/quality/${quality}/format/webp`
}

function optimizeQiniuCloud(url, size, quality) {
  const pixels = getSizePixels(size)
  if (!pixels) return url

  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}imageView2/2/w/${pixels}/h/${pixels}/q/${quality}/format/webp`
}

function optimizeLocalUpload(url, size, quality) {
  const pixels = getSizePixels(size)
  if (!pixels) return url

  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}w=${pixels}&q=${quality}&fmt=webp`
}

/**
 * @param {string} url
 * @param {string} size - ImageSize
 * @param {number} quality - 1-100
 * @returns {string}
 */
export function optimizeImageUrl(url, size = ImageSize.MEDIUM, quality = ImageQuality.MEDIUM) {
  if (!url || typeof url !== 'string') return url
  if (size === ImageSize.ORIGINAL) return url

  try {
    if (isAliyunOSS(url)) return optimizeAliyunOSS(url, size, quality)
    if (isTencentCOS(url)) return optimizeTencentCOS(url, size, quality)
    if (isQiniuCloud(url)) return optimizeQiniuCloud(url, size, quality)
    if (isLocalUpload(url)) return optimizeLocalUpload(url, size, quality)
    return url
  } catch {
    return url
  }
}

export function getThumbnailUrl(url, quality = ImageQuality.LOW) {
  return optimizeImageUrl(url, ImageSize.THUMBNAIL, quality)
}

export function getSmallImageUrl(url, quality = ImageQuality.MEDIUM) {
  return optimizeImageUrl(url, ImageSize.SMALL, quality)
}

export function getMediumImageUrl(url, quality = ImageQuality.MEDIUM) {
  return optimizeImageUrl(url, ImageSize.MEDIUM, quality)
}

export function getLargeImageUrl(url, quality = ImageQuality.HIGH) {
  return optimizeImageUrl(url, ImageSize.LARGE, quality)
}

export function getResponsiveImageUrl(url, containerWidth, quality = ImageQuality.MEDIUM) {
  if (!containerWidth) return url

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  const targetWidth = containerWidth * dpr

  let size
  if (targetWidth > 1000) size = ImageSize.LARGE
  else if (targetWidth > 600) size = ImageSize.MEDIUM
  else if (targetWidth > 300) size = ImageSize.SMALL
  else size = ImageSize.THUMBNAIL

  return optimizeImageUrl(url, size, quality)
}

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
    if (onProgress) onProgress(completed, urls.length)
    await processNext()
  }

  const workers = Array(Math.min(concurrency, urls.length))
    .fill(null)
    .map(() => processNext())

  await Promise.all(workers)
  return results
}
