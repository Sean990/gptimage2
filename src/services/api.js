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
