const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api')
const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '')

function getToken() {
  return localStorage.getItem('token') || ''
}

function authHeaders() {
  const token = getToken()
  return token ? { authorization: `Bearer ${token}` } : {}
}

function normalizePayload(payload) {
  return payload?.success === false ? payload : (payload?.data ?? payload)
}

async function request(path, options = {}) {
  const { headers = {}, ...requestOptions } = options
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...requestOptions,
    headers: {
      'content-type': 'application/json',
      ...authHeaders(),
      ...headers,
    },
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok || payload?.success === false) {
    const error = new Error(payload?.message || `接口请求失败：${response.status}`)
    error.status = response.status
    error.payload = payload
    throw error
  }

  return normalizePayload(payload)
}

async function requestGenerateImages(payload, options = {}) {
  const response = await fetch(`${API_ORIGIN}/api/generate`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...authHeaders(),
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

async function requestPromptOptimization(payload, options = {}) {
  const paths = [
    '/prompt/optimize',
    '/prompt-optimizer/optimize',
    '/generate/optimize-prompt',
  ]
  let lastError = null

  for (const path of paths) {
    try {
      return await request(path, {
        method: 'POST',
        body: JSON.stringify(payload),
        signal: options.signal,
      })
    } catch (error) {
      lastError = error
      if (error.status !== 404) throw error
    }
  }

  throw lastError || new Error('提示词优化接口不可用')
}

export const api = {
  getModels: () => request('/models'),
  getSite: () => request('/site'),
  getHome: () => request('/home'),
  getPricing: () => request('/pricing'),
  getShowcase: (params = {}) => request(`/showcase?${new URLSearchParams(params)}`),
  getLegal: (type) => request(`/legal/${encodeURIComponent(type)}`),
  getMe: () => request('/me'),
  sendEmailCode: (payload) => request('/auth/email-code', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  sendPasswordResetCode: (payload) => request('/auth/reset-password-code', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  register: (payload) => request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  login: (payload) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  resetPassword: (payload) => request('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  logout: () => request('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({}),
  }),
  getCreditLedger: () => request('/me/credits'),
  getInvites: () => request('/me/invites'),
  updateProfile: (payload) => request('/me/profile', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }),
  reversePrompt: (payload) => request('/generate/reverse-prompt', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  optimizePrompt: requestPromptOptimization,
  generateImages: requestGenerateImages,
  createOrder: (payload) => request('/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  getOrders: () => request('/orders'),
  getGallery: () => request('/gallery'),
  getGenerationTask: (id) => request(`/generate/tasks/${encodeURIComponent(id)}`),
  cancelGenerationTask: (id) => request(`/generate/tasks/${encodeURIComponent(id)}/cancel`, {
    method: 'POST',
    body: JSON.stringify({}),
  }),
  uploadFiles: async (files) => {
    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))

    const response = await fetch(`${API_BASE_URL}/uploads`, {
      method: 'POST',
      headers: {
        ...authHeaders(),
      },
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
