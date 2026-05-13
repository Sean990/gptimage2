import { describe, expect, it } from 'vitest'
import { normalizeWebVitalsPayload, shouldSampleWebVitals } from '../../src/services/webVitals'

describe('Web Vitals 本地封装', () => {
  it('按采样率判断是否上报', () => {
    expect(shouldSampleWebVitals(0)).toBe(false)
    expect(shouldSampleWebVitals(1)).toBe(true)
  })

  it('补充路由、设备、网络和版本字段', () => {
    const payload = normalizeWebVitalsPayload({
      name: 'LCP',
      id: 'metric-1',
      value: 1200,
      rating: 'good',
      delta: 1200,
      navigationType: 'navigate',
    })

    expect(payload).toEqual(
      expect.objectContaining({
        name: 'LCP',
        id: 'metric-1',
        route: '/',
        deviceType: expect.any(String),
        networkType: expect.any(String),
        version: expect.any(String),
        timestamp: expect.any(Number),
      }),
    )
  })
})
