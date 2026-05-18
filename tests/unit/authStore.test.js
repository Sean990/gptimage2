import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const apiMock = {
  getMe: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  resetPassword: vi.fn(),
  sendEmailCode: vi.fn(),
  sendPasswordResetCode: vi.fn(),
  logout: vi.fn(),
}

async function loadAuthStore() {
  vi.doMock('../../src/services/api', () => ({ api: apiMock }))
  return import('../../src/services/authStore.js')
}

describe('authStore 认证刷新', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('没有 token 时 refreshMe 不请求 /me', async () => {
    const { useAuthStore } = await loadAuthStore()
    const auth = useAuthStore()

    await expect(auth.refreshMe()).resolves.toBeNull()

    expect(apiMock.getMe).not.toHaveBeenCalled()
    expect(auth.initialized.value).toBe(true)
    expect(auth.isAuthenticated.value).toBe(false)
  })

  it('多个并发 refreshMe 复用同一个 /me 请求', async () => {
    localStorage.setItem('token', 'valid.token.value')
    apiMock.getMe.mockResolvedValue({ id: 'user-1', credits: 8 })
    const { useAuthStore } = await loadAuthStore()
    const auth = useAuthStore()

    const [firstUser, secondUser] = await Promise.all([auth.refreshMe(), auth.refreshMe()])

    expect(apiMock.getMe).toHaveBeenCalledTimes(1)
    expect(firstUser).toEqual({ id: 'user-1', credits: 8 })
    expect(secondUser).toEqual({ id: 'user-1', credits: 8 })
    expect(auth.isAuthenticated.value).toBe(true)
  })
})
