const DEFAULT_ENDPOINT = import.meta.env.VITE_WEB_VITALS_ENDPOINT || ''

function normalizeMetric(metric) {
  return {
    name: metric.name,
    id: metric.id,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    navigationType: metric.navigationType,
    url: typeof location === 'undefined' ? '' : location.href,
    timestamp: Date.now(),
  }
}

function reportMetric(metric, { endpoint, debug }) {
  const payload = normalizeMetric(metric)

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

  try {
    const vitals = await import('web-vitals')
    const register = (name) => {
      if (typeof vitals[name] === 'function') {
        vitals[name]((metric) => reportMetric(metric, { endpoint, debug }))
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
