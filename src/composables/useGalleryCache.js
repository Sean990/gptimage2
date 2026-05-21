import { ref } from 'vue'

/**
 * 图库记录缓存
 * 使用 Map 提升查找性能，避免频繁遍历数组
 */
export function useGalleryCache() {
  const imageKeyToRecordMap = ref(new Map())
  const recordIdMap = ref(new Map())

  function buildCache(gallery) {
    imageKeyToRecordMap.value.clear()
    recordIdMap.value.clear()

    gallery.forEach((record) => {
      if (record.id) {
        recordIdMap.value.set(record.id, record)
      }

      record.images?.forEach((image) => {
        const keys = getImageMatchKeys(image)
        keys.forEach((key) => {
          if (!imageKeyToRecordMap.value.has(key)) {
            imageKeyToRecordMap.value.set(key, record)
          }
        })
      })
    })
  }

  function getImageMatchKeys(image) {
    const keys = []
    if (image.id) keys.push(`id:${image.id}`)
    if (image.src) keys.push(`src:${image.src}`)
    if (image.url) keys.push(`url:${image.url}`)
    return keys
  }

  function findRecordByImageKey(imageKeys) {
    for (const key of imageKeys) {
      const record = imageKeyToRecordMap.value.get(key)
      if (record) return record
    }
    return null
  }

  function findRecordById(id) {
    return recordIdMap.value.get(id) || null
  }

  function clearCache() {
    imageKeyToRecordMap.value.clear()
    recordIdMap.value.clear()
  }

  return {
    buildCache,
    findRecordByImageKey,
    findRecordById,
    clearCache,
    getImageMatchKeys,
  }
}
