import { computed, nextTick, onBeforeUnmount, ref } from 'vue'

export function useAuthForm(auth) {
  const emailInputRef = ref(null)
  const authMode = ref('login')
  const email = ref('')
  const password = ref('')
  const name = ref('')
  const inviteCode = ref('')
  const verificationCode = ref('')
  const loginMessage = ref('')
  const loginMessageType = ref('info')
  const loginLoading = ref(false)
  const codeLoading = ref(false)
  const codeCooldown = ref(0)
  const passwordVisible = ref(false)
  let codeCooldownTimer = null

  const emailValid = computed(() => email.value.includes('@') && email.value.trim().length >= 6)
  const passwordValid = computed(() => password.value.length >= 8)
  const verificationCodeValid = computed(() => /^\d{4,8}$/.test(verificationCode.value.trim()))
  const requiresVerificationCode = computed(() => authMode.value !== 'login')
  const loginDisabled = computed(
    () => !emailValid.value || !passwordValid.value || (requiresVerificationCode.value && !verificationCodeValid.value),
  )
  const sendCodeDisabled = computed(
    () => !emailValid.value || codeLoading.value || codeCooldown.value > 0 || loginLoading.value,
  )
  const authTitle = computed(() => {
    if (authMode.value === 'register') return '创建 ImgsGen 账号'
    if (authMode.value === 'reset') return '重置登录密码'
    return '登录 ImgsGen'
  })
  const authSubtitle = computed(() => {
    if (authMode.value === 'register') return '使用邮箱验证码创建账号，登录后可同步任务和图库。'
    if (authMode.value === 'reset') return '通过邮箱验证码设置新密码，完成后自动登录。'
    return '使用邮箱和密码进入你的 ImgsGen 工作台。'
  })
  const submitLabel = computed(() => {
    if (loginLoading.value) {
      if (authMode.value === 'register') return '正在注册...'
      if (authMode.value === 'reset') return '正在重置...'
      return '正在登录...'
    }
    if (authMode.value === 'register') return '创建账号'
    if (authMode.value === 'reset') return '重置密码并登录'
    return '登录'
  })
  const sendCodeIdleLabel = computed(() => (authMode.value === 'reset' ? '发送重置码' : '发送验证码'))
  const passwordLabel = computed(() => (authMode.value === 'reset' ? '新密码' : '密码'))
  const passwordAutocomplete = computed(() => (authMode.value === 'login' ? 'current-password' : 'new-password'))
  const passwordInputType = computed(() => (passwordVisible.value ? 'text' : 'password'))

  function focusEmailInput() {
    nextTick(() => emailInputRef.value?.focus())
  }

  function clearCodeCooldown() {
    if (!codeCooldownTimer) return
    window.clearInterval(codeCooldownTimer)
    codeCooldownTimer = null
  }

  function startCodeCooldown(seconds = 60) {
    clearCodeCooldown()
    codeCooldown.value = seconds
    codeCooldownTimer = window.setInterval(() => {
      codeCooldown.value = Math.max(0, codeCooldown.value - 1)
      if (codeCooldown.value === 0) clearCodeCooldown()
    }, 1000)
  }

  function setAuthMode(mode) {
    if (authMode.value !== mode) {
      password.value = ''
      verificationCode.value = ''
      passwordVisible.value = false
      codeCooldown.value = 0
      clearCodeCooldown()
    }
    authMode.value = mode
    loginMessage.value = ''
    loginMessageType.value = 'info'
    focusEmailInput()
  }

  function setInviteCode(code) {
    inviteCode.value = String(code || '').trim()
  }

  function resetSensitiveFields() {
    password.value = ''
    verificationCode.value = ''
    passwordVisible.value = false
    loginMessage.value = ''
    loginMessageType.value = 'info'
    clearCodeCooldown()
  }

  async function submitLogin(onAuthenticated) {
    if (loginDisabled.value) {
      loginMessageType.value = 'error'
      loginMessage.value = requiresVerificationCode.value
        ? '请填写有效邮箱、验证码和至少 8 位密码'
        : '请输入有效邮箱和至少 8 位密码'
      focusEmailInput()
      return false
    }

    loginLoading.value = true
    try {
      const currentMode = authMode.value
      const payload = {
        email: email.value,
        password: password.value,
        verificationCode: verificationCode.value,
        name: name.value,
        inviteCode: inviteCode.value,
      }
      let result
      if (currentMode === 'register') result = await auth.register(payload)
      else if (currentMode === 'reset') result = await auth.resetPassword(payload)
      else result = await auth.login(payload)

      const actionText = currentMode === 'register' ? '注册并登录' : currentMode === 'reset' ? '重置密码并登录' : '登录'
      loginMessageType.value = 'success'
      loginMessage.value = `${result.user.name} 已${actionText}，当前积分 ${result.user.credits}`
      onAuthenticated?.(result)
      return true
    } catch (error) {
      loginMessageType.value = 'error'
      loginMessage.value = error.message || '操作失败，请稍后重试'
      return false
    } finally {
      loginLoading.value = false
    }
  }

  async function sendEmailCode() {
    if (!emailValid.value) {
      loginMessageType.value = 'error'
      loginMessage.value = '请先填写有效邮箱'
      return
    }

    codeLoading.value = true
    try {
      const result =
        authMode.value === 'reset'
          ? await auth.sendPasswordResetCode({ email: email.value })
          : await auth.sendEmailCode({ email: email.value })
      loginMessageType.value = 'info'
      loginMessage.value =
        import.meta.env.DEV && result.debugCode
          ? `验证码已生成：${result.debugCode}`
          : authMode.value === 'reset'
            ? '如果邮箱已注册，验证码将发送到该邮箱'
            : '验证码已发送，请查收邮箱'
      startCodeCooldown(60)
    } catch (error) {
      loginMessageType.value = 'error'
      loginMessage.value = error.message || '验证码发送失败，请稍后重试'
    } finally {
      codeLoading.value = false
    }
  }

  onBeforeUnmount(clearCodeCooldown)

  return {
    emailInputRef,
    authMode,
    email,
    password,
    name,
    inviteCode,
    verificationCode,
    loginMessage,
    loginMessageType,
    loginLoading,
    codeLoading,
    codeCooldown,
    passwordVisible,
    emailValid,
    passwordValid,
    verificationCodeValid,
    requiresVerificationCode,
    loginDisabled,
    sendCodeDisabled,
    authTitle,
    authSubtitle,
    submitLabel,
    sendCodeIdleLabel,
    passwordLabel,
    passwordAutocomplete,
    passwordInputType,
    focusEmailInput,
    setAuthMode,
    setInviteCode,
    resetSensitiveFields,
    submitLogin,
    sendEmailCode,
  }
}
