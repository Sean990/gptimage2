import { computed, ref } from 'vue'

export const IMAGE_UPLOAD_LIMITS = {
  maxBytes: 20 * 1024 * 1024,
  minWidth: 64,
  minHeight: 64,
  maxAspectRatio: 8,
}

const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export function hasUnuploadedLocalFiles(items) {
  return items.some((item) => String(item?.src || '').startsWith('blob:') && !item.remoteUrl)
}

export function isSupportedImageUrl(value) {
  const rawUrl = String(value || '').trim()
  if (!rawUrl) return false

  try {
    const url = new URL(rawUrl)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function validateImageFile(file, { requirePng = false } = {}) {
  if (!file) return '请选择图片文件'

  if (requirePng && file.type !== 'image/png') {
    return '蒙版仅支持 PNG 图片'
  }

  if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
    return '仅支持 JPG、PNG 或 WEBP 图片'
  }

  if (file.size > IMAGE_UPLOAD_LIMITS.maxBytes) {
    return `图片不能超过 ${Math.round(IMAGE_UPLOAD_LIMITS.maxBytes / 1024 / 1024)}MB`
  }

  return ''
}

async function readImageDimensions(file) {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file)
    const dimensions = {
      width: bitmap.width,
      height: bitmap.height,
    }
    bitmap.close?.()
    return dimensions
  }

  if (typeof Image === 'undefined' || typeof URL === 'undefined') return null

  const objectUrl = URL.createObjectURL(file)
  try {
    return await new Promise((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
      image.onerror = () => reject(new Error('图片无法读取'))
      image.src = objectUrl
    })
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export async function validateImageFileWithDimensions(file, options = {}) {
  const fileError = validateImageFile(file, options)
  if (fileError) return fileError

  let dimensions
  try {
    dimensions = await readImageDimensions(file)
  } catch {
    return '图片无法读取，请更换素材'
  }

  if (!dimensions) return ''

  const { width, height } = dimensions
  if (width < IMAGE_UPLOAD_LIMITS.minWidth || height < IMAGE_UPLOAD_LIMITS.minHeight) {
    return `图片尺寸不能小于 ${IMAGE_UPLOAD_LIMITS.minWidth}x${IMAGE_UPLOAD_LIMITS.minHeight}`
  }

  const aspectRatio = Math.max(width / height, height / width)
  if (aspectRatio > IMAGE_UPLOAD_LIMITS.maxAspectRatio) {
    return '图片比例异常，请更换素材'
  }

  return ''
}

export function useReferenceImages({
  api,
  isAuthenticated,
  mode,
  openLogin,
  requiresReference,
  resolveApiUrl,
  showNotice,
}) {
  const urlInput = ref('')
  const imageUrl = ref('')
  const maskUrlInput = ref('')
  const maskImageUrl = ref('')
  const uploads = ref([])
  const maskUploads = ref([])

  const referenceCount = computed(() => uploads.value.length + (imageUrl.value ? 1 : 0))
  const maskCount = computed(() => maskUploads.value.length + (maskImageUrl.value ? 1 : 0))
  const canReverse = computed(() => referenceCount.value > 0)
  const canAddMask = computed(() => maskCount.value < 1)
  const maxReferenceCount = computed(() => (mode.value === 'edit' ? 1 : 4))
  const canAddReference = computed(() => referenceCount.value < maxReferenceCount.value)
  const showReferenceSection = computed(() => requiresReference.value)

  function revokeUpload(item) {
    if (item?.src) URL.revokeObjectURL(item.src)
  }

  function trimReferencesForMode() {
    const maxCount = maxReferenceCount.value
    if (referenceCount.value <= maxCount) return

    if (mode.value === 'edit') {
      uploads.value.slice(1).forEach(revokeUpload)
      if (imageUrl.value) {
        uploads.value.forEach(revokeUpload)
        uploads.value = []
      } else {
        uploads.value = uploads.value.slice(0, 1)
      }
      showNotice('精修图模式仅保留 1 张原图')
      return
    }

    uploads.value.slice(maxCount).forEach(revokeUpload)
    uploads.value = uploads.value.slice(0, Math.max(0, maxCount - (imageUrl.value ? 1 : 0)))
  }

  function hasUnreadyUpload({ includeMask = false } = {}) {
    return hasUnuploadedLocalFiles(uploads.value) || (includeMask && hasUnuploadedLocalFiles(maskUploads.value))
  }

  async function processReferenceFiles(rawFiles) {
    if (!isAuthenticated.value) {
      showNotice('请先登录后上传参考图')
      openLogin()
      return
    }

    if (!canAddReference.value) {
      showNotice(mode.value === 'edit' ? '精修图仅支持 1 张原图' : `最多添加 ${maxReferenceCount.value} 张参考图`)
      return
    }

    const availableSlots = Math.max(0, maxReferenceCount.value - referenceCount.value)
    const selectedFiles = Array.from(rawFiles || []).slice(0, availableSlots)
    if (!selectedFiles.length) return

    const files = []
    for (const file of selectedFiles) {
      const error = await validateImageFileWithDimensions(file)
      if (error) {
        showNotice(`${file.name}：${error}`)
      } else {
        files.push(file)
      }
    }

    if (!files.length) return

    const mapped = files.map((file) => ({
      name: file.name,
      src: URL.createObjectURL(file),
    }))
    const startIndex = uploads.value.length
    uploads.value = [...uploads.value, ...mapped].slice(0, maxReferenceCount.value)
    if (mapped.length) showNotice(mode.value === 'edit' ? '原图已添加' : `已添加 ${mapped.length} 张参考图`)

    try {
      const uploaded = await api.uploadFiles(files)
      uploads.value = uploads.value.map((item, index) => ({
        ...item,
        remoteUrl: uploaded[index - startIndex]?.url ? resolveApiUrl(uploaded[index - startIndex].url) : item.remoteUrl,
      }))
    } catch (error) {
      showNotice(error.message || '参考图上传失败，已保留本地预览')
    }
  }

  async function onFileChange(event) {
    try {
      await processReferenceFiles(event.target.files)
    } finally {
      event.target.value = ''
    }
  }

  async function processMaskFiles(rawFiles) {
    if (!isAuthenticated.value) {
      showNotice('请先登录后上传蒙版')
      openLogin()
      return
    }

    if (!canAddMask.value) {
      showNotice('最多添加 1 张蒙版')
      return
    }

    const file = Array.from(rawFiles || [])[0]
    if (!file) return
    const error = await validateImageFileWithDimensions(file, { requirePng: true })
    if (error) {
      showNotice(`${file.name}：${error}`)
      return
    }

    const mapped = {
      name: file.name,
      src: URL.createObjectURL(file),
    }
    maskUploads.value = [mapped]

    try {
      const uploaded = await api.uploadFiles([file])
      maskUploads.value = maskUploads.value.map((item) => ({
        ...item,
        remoteUrl: uploaded[0]?.url ? resolveApiUrl(uploaded[0].url) : item.remoteUrl,
      }))
      showNotice('蒙版已添加')
    } catch (error) {
      showNotice(error.message || '蒙版上传失败，已保留本地预览')
    }
  }

  async function onMaskFileChange(event) {
    try {
      await processMaskFiles(event.target.files)
    } finally {
      event.target.value = ''
    }
  }

  function removeUpload(index) {
    const [removed] = uploads.value.splice(index, 1)
    revokeUpload(removed)
    showNotice('已移除参考图')
  }

  function removeMaskUpload(index) {
    const [removed] = maskUploads.value.splice(index, 1)
    revokeUpload(removed)
    showNotice('已移除蒙版')
  }

  function removeUrlReference() {
    imageUrl.value = ''
    showNotice('已移除 URL 参考图')
  }

  function removeMaskUrlReference() {
    maskImageUrl.value = ''
    showNotice('已移除 URL 蒙版')
  }

  function clearReferences({ includeMask = true, silent = false } = {}) {
    uploads.value.forEach(revokeUpload)
    uploads.value = []
    imageUrl.value = ''
    urlInput.value = ''

    if (includeMask) {
      maskUploads.value.forEach(revokeUpload)
      maskUploads.value = []
      maskImageUrl.value = ''
      maskUrlInput.value = ''
    }

    if (!silent) showNotice(includeMask ? '已清空素材' : '已清空参考图')
  }

  function addUrlReference() {
    const nextUrl = urlInput.value.trim()
    if (!nextUrl) {
      showNotice('请先输入图片 URL')
      return
    }
    if (!isSupportedImageUrl(nextUrl)) {
      showNotice('请输入 http 或 https 开头的图片 URL')
      return
    }
    if (!canAddReference.value && !imageUrl.value) {
      showNotice(mode.value === 'edit' ? '精修图仅支持 1 张原图' : `最多添加 ${maxReferenceCount.value} 张参考图`)
      return
    }
    if (mode.value === 'edit') {
      uploads.value.forEach(revokeUpload)
      uploads.value = []
    }
    imageUrl.value = nextUrl
    urlInput.value = ''
    showNotice(mode.value === 'edit' ? '图片 URL 已作为原图加入' : '图片 URL 已作为参考图加入')
  }

  function addMaskUrlReference() {
    const nextUrl = maskUrlInput.value.trim()
    if (!nextUrl) {
      showNotice('请先输入蒙版 URL')
      return
    }
    if (!isSupportedImageUrl(nextUrl)) {
      showNotice('请输入 http 或 https 开头的蒙版 URL')
      return
    }
    if (!canAddMask.value && !maskImageUrl.value) {
      showNotice('最多添加 1 张蒙版')
      return
    }
    maskImageUrl.value = nextUrl
    maskUrlInput.value = ''
    showNotice('蒙版 URL 已加入')
  }

  function getReferences() {
    return [imageUrl.value, ...uploads.value.map((item) => item.remoteUrl || item.src)].filter(Boolean)
  }

  function getMaskReference() {
    return maskImageUrl.value || maskUploads.value[0]?.remoteUrl || maskUploads.value[0]?.src || ''
  }

  function getReferencePreviewImages() {
    return [
      imageUrl.value ? { src: imageUrl.value, title: 'URL 参考图', meta: '参考图像' } : null,
      ...uploads.value.map((item) => ({ src: item.src, title: item.name, meta: '参考图像' })),
    ].filter(Boolean)
  }

  function getMaskPreviewImages() {
    return [
      maskImageUrl.value ? { src: maskImageUrl.value, title: 'URL 蒙版', meta: '蒙版' } : null,
      ...maskUploads.value.map((item) => ({ src: item.src, title: item.name, meta: '蒙版' })),
    ].filter(Boolean)
  }

  function cleanupReferenceObjectUrls() {
    uploads.value.forEach(revokeUpload)
    maskUploads.value.forEach(revokeUpload)
  }

  return {
    addMaskUrlReference,
    addUrlReference,
    canAddMask,
    canAddReference,
    canReverse,
    clearReferences,
    cleanupReferenceObjectUrls,
    getMaskPreviewImages,
    getMaskReference,
    getReferencePreviewImages,
    getReferences,
    hasUnreadyUpload,
    imageUrl,
    maskCount,
    maskImageUrl,
    maskUploads,
    maskUrlInput,
    maxReferenceCount,
    onFileChange,
    onMaskFileChange,
    processMaskFiles,
    processReferenceFiles,
    referenceCount,
    removeMaskUpload,
    removeMaskUrlReference,
    removeUpload,
    removeUrlReference,
    showReferenceSection,
    trimReferencesForMode,
    uploads,
    urlInput,
  }
}
