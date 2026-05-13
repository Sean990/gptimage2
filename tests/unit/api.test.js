import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, AuthExpiredError, BusinessError, TimeoutError } from '../../src/services/api'

function createResponse(payload, init = {}) {
  return new Response(JSON.stringify(payload), {
    status: init.status || 200,
    headers: { 'content-type': 'application/json' },
  })
}

function createExpiredToken() {
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 60 }))
  return `header.${payload}.signature`
}

describe('api 请求层', () => {
  beforeEach(() => {
    vi.useRealTimers()
    localStorage.clear()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('GET/HEAD 请求失败时只重试一次', async () => {
    const networkError = new Error('network down')
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce(createResponse({ success: true, data: { ok: true } }))

    await expect(api.getSite()).resolves.toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('POST 请求 30 秒超时后返回超时错误', async () => {
    vi.useFakeTimers()
    vi.spyOn(globalThis, 'fetch').mockImplementation((_url, options = {}) => {
      return new Promise((_resolve, reject) => {
        options.signal?.addEventListener('abort', () => {
          reject(options.signal.reason || new DOMException('Aborted', 'AbortError'))
        })
      })
    })

    const request = api.login({ email: 'test@example.com', password: 'password' })
    const assertion = expect(request).rejects.toMatchObject({
      name: 'TimeoutError',
      isTimeout: true,
    })
    await vi.advanceTimersByTimeAsync(30_000)

    await assertion
    await expect(request).rejects.toBeInstanceOf(TimeoutError)
  })

  it('发送请求前会清理过期 token 并广播认证过期事件', async () => {
    localStorage.setItem('token', createExpiredToken())
    const authExpiredHandler = vi.fn()
    window.addEventListener('auth-expired', authExpiredHandler)
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(createResponse({ success: true, data: { id: 'me' } }))

    await api.getMe()

    expect(localStorage.getItem('token')).toBeNull()
    expect(authExpiredHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { reason: 'token-expired' },
      }),
    )
    expect(fetchMock.mock.calls[0][1].headers.authorization).toBeUndefined()
    window.removeEventListener('auth-expired', authExpiredHandler)
  })

  it('收到 401 时抛出 AuthExpiredError 并清理 token', async () => {
    localStorage.setItem('token', 'valid.token.value')
    const authExpiredHandler = vi.fn()
    window.addEventListener('auth-expired', authExpiredHandler)
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(createResponse({ message: '请重新登录' }, { status: 401 }))

    await expect(api.getMe()).rejects.toBeInstanceOf(AuthExpiredError)

    expect(localStorage.getItem('token')).toBeNull()
    expect(authExpiredHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { reason: 'unauthorized' },
      }),
    )
    window.removeEventListener('auth-expired', authExpiredHandler)
  })

  it('匿名请求收到 401 不广播认证过期事件', async () => {
    const authExpiredHandler = vi.fn()
    window.addEventListener('auth-expired', authExpiredHandler)
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(createResponse({ message: 'unauthenticated' }, { status: 401 }))

    await expect(api.getMe()).rejects.toBeInstanceOf(AuthExpiredError)

    expect(authExpiredHandler).not.toHaveBeenCalled()
    window.removeEventListener('auth-expired', authExpiredHandler)
  })

  it('业务失败响应会抛出 BusinessError', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(createResponse({ success: false, message: '余额不足' }))
    const request = api.createOrder({ planId: 'starter' })

    await expect(request).rejects.toMatchObject({
      name: 'BusinessError',
      message: '余额不足',
      status: 200,
    })
    await expect(request).rejects.toBeInstanceOf(BusinessError)
  })

  it('删除云端图库记录时调用 DELETE /gallery/:id', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(createResponse({ success: true, data: {} }))

    await api.deleteGalleryRecord('task/id 1')

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/api/gallery/task%2Fid%201',
      expect.objectContaining({
        method: 'DELETE',
      }),
    )
  })
})
