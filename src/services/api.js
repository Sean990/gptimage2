const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api')
const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '')
const REQUEST_TIMEOUT_MS = 30000
const RETRYABLE_METHODS = new Set(['GET', 'HEAD'])

function createAbortError(message = '请求已取消') {
  const error = new Error(message)
  error.name = 'AbortError'
  return error
}

function getToken() {
  if (typeof localStorage === 'undefined') return ''
  return localStorage.getItem('token') || ''
}

function clearToken() {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem('token')
}

function isJwtExpired(token) {
  const [, payload] = token.split('.')
  if (!payload) return false

  try {
    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/')
    const decodedPayload = typeof globalThis.atob === 'function'
      ? globalThis.atob(normalizedPayload)
      : globalThis.Buffer?.from(normalizedPayload, 'base64').toString('utf-8')
    if (!decodedPayload) return false
    const decoded = JSON.parse(decodedPayload)
    return Number(decoded.exp || 0) > 0 && decoded.exp * 1000 <= Date.now()
  } catch {
    return false
  }
}

function authHeaders() {
  const token = getToken()
  if (token && isJwtExpired(token)) {
    clearToken()
    return {}
  }
  return token ? { authorization: `Bearer ${token}` } : {}
}

function normalizePayload(payload) {
  return payload?.success === false ? payload : (payload?.data ?? payload)
}

function getRequestMethod(options = {}) {
  return String(options.method || 'GET').toUpperCase()
}

function shouldRetryRequest(error, method, attempt) {
  if (attempt > 0 || !RETRYABLE_METHODS.has(method)) return false
  if (error.name === 'AbortError' && error.isTimeout !== true) return false
  if (!error.status) return true
  return error.status === 408 || error.status === 429 || error.status >= 500
}

function composeSignal(externalSignal, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController()
  let timeoutId = null
  let timedOut = false
  let onExternalAbort = null

  const abort = (reason) => {
    if (!controller.signal.aborted) controller.abort(reason)
  }

  if (externalSignal?.aborted) {
    abort(externalSignal.reason || createAbortError())
  } else {
    onExternalAbort = () => {
      abort(externalSignal.reason || createAbortError())
    }
    externalSignal?.addEventListener('abort', onExternalAbort, { once: true })
  }

  if (Number.isFinite(timeoutMs) && timeoutMs > 0) {
    timeoutId = globalThis.setTimeout(() => {
      timedOut = true
      abort(createAbortError('请求超时，请稍后重试'))
    }, timeoutMs)
  }

  return {
    signal: controller.signal,
    didTimeout: () => timedOut,
    cleanup: () => {
      if (timeoutId) globalThis.clearTimeout(timeoutId)
      if (externalSignal && onExternalAbort) externalSignal.removeEventListener('abort', onExternalAbort)
    },
  }
}

async function fetchWithTimeout(url, options = {}) {
  const { timeout = REQUEST_TIMEOUT_MS, signal: externalSignal, ...fetchOptions } = options
  const signalContext = composeSignal(externalSignal, timeout)

  try {
    return await fetch(url, {
      ...fetchOptions,
      signal: signalContext.signal,
    })
  } catch (error) {
    if (signalContext.didTimeout()) {
      const timeoutError = createAbortError('请求超时，请稍后重试')
      timeoutError.isTimeout = true
      throw timeoutError
    }
    throw error
  } finally {
    signalContext.cleanup()
  }
}

async function request(path, options = {}) {
  const { headers = {}, ...requestOptions } = options
  const method = getRequestMethod(requestOptions)
  let lastError = null

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}${path}`, {
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
    } catch (error) {
      lastError = error
      if (!shouldRetryRequest(error, method, attempt)) throw error
    }
  }

  throw lastError
}

async function requestGenerateImages(payload, options = {}) {
  const response = await fetchWithTimeout(`${API_ORIGIN}/api/generate`, {
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
  getPricing: async () => {
    const payload = await request('/pricing')
    return payload?.pricingModes || payload
  },
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

    const response = await fetchWithTimeout(`${API_BASE_URL}/uploads`, {
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
