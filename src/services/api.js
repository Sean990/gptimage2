const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'
const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '')

function normalizePayload(payload) {
  return payload?.success === false ? payload : (payload?.data ?? payload)
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || `接口请求失败：${response.status}`)
  }

  return normalizePayload(payload)
}

async function requestGenerateImages(payload, options = {}) {
  const response = await fetch(`${API_ORIGIN}/api/generate`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: options.signal,
  })

  if (!response.ok && response.status === 404) {
    return request('/generate/images', {
      method: 'POST',
      body: JSON.stringify(payload),
      signal: options.signal,
    })
  }

  const body = await response.json().catch(() => null)

  if (!response.ok || body?.success === false || body?.error) {
    throw new Error(body?.error?.message || body?.message || `接口请求失败：${response.status}`)
  }

  return normalizePayload(body)
}

async function requestGenerateImagesStream(payload, handlers = {}, options = {}) {
  const response = await fetch(`${API_ORIGIN}/api/generate/stream`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: options.signal,
  })

  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    const body = await response.json().catch(() => null)
    if (!response.ok || body?.success === false || body?.error) {
      throw new Error(body?.error?.message || body?.message || `接口请求失败：${response.status}`)
    }
    return normalizePayload(body)
  }

  if (!response.ok || !response.body) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.message || `接口请求失败：${response.status}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let completedRecord = null

  function handleEventBlock(block) {
    const dataLines = block
      .split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())

    if (!dataLines.length) return

    const event = JSON.parse(dataLines.join('\n'))
    if (event.type === 'error') {
      throw new Error(event.message || '图像生成失败')
    }
    if (event.type === 'completed') {
      completedRecord = event.record
    }
    handlers.onEvent?.(event)
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split(/\r?\n\r?\n/)
    buffer = parts.pop() || ''
    for (const part of parts) handleEventBlock(part)
  }

  buffer += decoder.decode()
  if (buffer.trim()) handleEventBlock(buffer)

  if (!completedRecord) {
    throw new Error('图像生成未返回最终结果')
  }

  return completedRecord
}

export const api = {
  getSite: () => request('/site'),
  getHome: () => request('/home'),
  getPricing: () => request('/pricing'),
  getShowcase: (params = {}) => request(`/showcase?${new URLSearchParams(params)}`),
  getLegal: (type) => request(`/legal/${encodeURIComponent(type)}`),
  login: (email) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email }),
  }),
  reversePrompt: (payload) => request('/generate/reverse-prompt', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  generateImages: requestGenerateImages,
  generateImagesStream: requestGenerateImagesStream,
  createOrder: (payload) => request('/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  getGallery: () => request('/gallery'),
  uploadFiles: async (files) => {
    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))

    const response = await fetch(`${API_BASE_URL}/uploads`, {
      method: 'POST',
      body: formData,
    })
    const payload = await response.json().catch(() => null)

    if (!response.ok || payload?.success === false) {
      throw new Error(payload?.message || `上传失败：${response.status}`)
    }

    return payload?.data || []
  },
}

export function resolveApiUrl(path) {
  if (!path || /^(https?:|data:|blob:)/i.test(path)) return path
  return `${API_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`
}
