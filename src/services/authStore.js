import { computed, ref } from 'vue'
import { api } from './api'

const hasStorage = typeof localStorage !== 'undefined'

const token = ref(hasStorage ? localStorage.getItem('token') || '' : '')
const user = ref(null)
const loading = ref(false)
const initialized = ref(false)

function persistToken(nextToken) {
  token.value = nextToken || ''
  if (!hasStorage) return
  if (token.value) localStorage.setItem('token', token.value)
  else localStorage.removeItem('token')
}

async function refreshMe() {
  loading.value = true
  try {
    user.value = await api.getMe()
    initialized.value = true
    if (user.value?.id === 'guest') persistToken('')
    return user.value
  } finally {
    loading.value = false
  }
}

async function login(payload) {
  const result = await api.login(payload)
  persistToken(result.token)
  user.value = result.user
  initialized.value = true
  return result
}

async function register(payload) {
  const result = await api.register(payload)
  persistToken(result.token)
  user.value = result.user
  initialized.value = true
  return result
}

async function resetPassword(payload) {
  const result = await api.resetPassword(payload)
  persistToken(result.token)
  user.value = result.user
  initialized.value = true
  return result
}

async function sendEmailCode(payload) {
  return api.sendEmailCode(payload)
}

async function sendPasswordResetCode(payload) {
  return api.sendPasswordResetCode(payload)
}

async function logout() {
  try {
    if (token.value) await api.logout()
  } finally {
    persistToken('')
    user.value = null
    initialized.value = false
    await refreshMe()
  }
}

export function useAuthStore() {
  return {
    token,
    user,
    loading,
    initialized,
    isAuthenticated: computed(() => Boolean(user.value && user.value.id !== 'guest')),
    credits: computed(() => Number(user.value?.credits || 0)),
    refreshMe,
    login,
    register,
    resetPassword,
    sendEmailCode,
    sendPasswordResetCode,
    logout,
  }
}

export function getAuthToken() {
  if (token.value) return token.value
  return hasStorage ? localStorage.getItem('token') || '' : ''
}

export function setAuthToken(nextToken) {
  persistToken(nextToken)
}
