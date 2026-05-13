const DEFAULT_ENDPOINT = import.meta.env.VITE_WEB_VITALS_ENDPOINT || ''
const DEFAULT_SAMPLE_RATE = Number(import.meta.env.VITE_WEB_VITALS_SAMPLE_RATE ?? 1)
const APP_VERSION = import.meta.env.VITE_APP_VERSION || import.meta.env.VITE_BUILD_VERSION || ''

function clampSampleRate(value) {
  if (!Number.isFinite(value)) return 1
  return Math.min(1, Math.max(0, value))
}

function resolveRoute() {
  if (typeof location === 'undefined') return ''
  return `${location.pathname}${location.search}${location.hash}`
}

function resolveDeviceType() {
  if (typeof window === 'undefined') return 'unknown'
  if (typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '')) {
    return 'mobile'
  }
  return window.innerWidth < 768 ? 'mobile' : 'desktop'
}

function resolveNetworkType() {
  if (typeof navigator === 'undefined') return ''
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  return connection?.effectiveType || connection?.type || ''
}

export function shouldSampleWebVitals(sampleRate = DEFAULT_SAMPLE_RATE) {
  const rate = clampSampleRate(Number(sampleRate))
  if (rate <= 0) return false
  if (rate >= 1) return true
  return Math.random() <= rate
}

export function normalizeWebVitalsPayload(metric) {
  return {
    name: metric.name,
    id: metric.id,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    navigationType: metric.navigationType,
    url: typeof location === 'undefined' ? '' : location.href,
    route: resolveRoute(),
    deviceType: resolveDeviceType(),
    networkType: resolveNetworkType(),
    version: APP_VERSION,
    timestamp: Date.now(),
  }
}

function reportMetric(metric, { endpoint, debug, sampleRate }) {
  if (!shouldSampleWebVitals(sampleRate)) return

  const payload = normalizeWebVitalsPayload(metric)

  if (debug) {
    console.info('[Web Vitals]', payload)
  }

  if (!endpoint || typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') return

  try {
    const body = JSON.stringify(payload)
    navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }))
  } catch {
    // 指标上报不能影响主流程。
  }
}

export async function initWebVitals(options = {}) {
  if (typeof window === 'undefined') return

  const endpoint = options.endpoint ?? DEFAULT_ENDPOINT
  const debug = options.debug ?? import.meta.env.DEV
  const sampleRate = options.sampleRate ?? DEFAULT_SAMPLE_RATE

  try {
    const vitals = await import('web-vitals')
    const register = (name) => {
      if (typeof vitals[name] === 'function') {
        vitals[name]((metric) => reportMetric(metric, { endpoint, debug, sampleRate }))
      }
    }

    register('onCLS')
    register('onLCP')
    register('onINP')
    register('onFID')
  } catch (error) {
    if (debug) {
      console.info('[Web Vitals] web-vitals 未安装或加载失败，已跳过本地埋点', error)
    }
  }
}
