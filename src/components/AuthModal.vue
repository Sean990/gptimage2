<script setup>
import { computed, watch } from 'vue'
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Image,
  Images,
  KeyRound,
  LogIn,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
  X,
} from 'lucide-vue-next'
import { useAuthForm } from '../composables/useAuthForm'
import { useAuthStore } from '../services/authStore'
import ModalDialog from './ModalDialog.vue'

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  initialMode: {
    type: String,
    default: 'login',
  },
  inviteCode: {
    type: String,
    default: '',
  },
  returnFocusEl: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['close', 'authenticated'])

const auth = useAuthStore()
const form = useAuthForm(auth)
const hasBoundInviteCode = computed(() => Boolean(String(props.inviteCode || '').trim()))

function closeModal() {
  form.resetSensitiveFields()
  emit('close')
}

function openRegister() {
  form.setInviteCode(props.inviteCode)
  form.setAuthMode('register')
}

async function submitLogin() {
  const success = await form.submitLogin((result) => emit('authenticated', result))
  if (success) {
    window.setTimeout(closeModal, 900)
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    form.setInviteCode(props.inviteCode)
    form.setAuthMode(props.initialMode)
  },
)

watch(
  () => props.inviteCode,
  (code) => {
    if (props.open) form.setInviteCode(code)
  },
)
</script>

<template>
  <ModalDialog
    :open="open"
    title-id="login-title"
    card-class="auth-modal-card"
    :initial-focus="form.emailInputRef"
    :return-focus-el="returnFocusEl"
    @close="closeModal"
  >
    <div class="modal-head">
      <div class="auth-title-block">
        <span class="auth-modal-mark" aria-hidden="true">
          <Images />
        </span>
        <div>
          <h2 id="login-title">{{ form.authTitle.value }}</h2>
          <p>{{ form.authSubtitle.value }}</p>
        </div>
      </div>
      <button class="icon-button" type="button" aria-label="关闭登录弹窗" @click="closeModal">
        <X aria-hidden="true" />
      </button>
    </div>

    <div v-if="form.authMode.value !== 'reset'" class="auth-mode-tabs" role="tablist" aria-label="账号入口">
      <button
        type="button"
        role="tab"
        :aria-selected="form.authMode.value === 'login'"
        :class="{ active: form.authMode.value === 'login' }"
        @click="form.setAuthMode('login')"
      >
        登录
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="form.authMode.value === 'register'"
        :class="{ active: form.authMode.value === 'register' }"
        @click="openRegister"
      >
        注册
      </button>
    </div>
    <div v-else class="auth-return-row">
      <button class="auth-link-button" type="button" @click="form.setAuthMode('login')">返回登录</button>
    </div>

    <form class="auth-form" @submit.prevent="submitLogin">
      <div v-if="form.authMode.value === 'register'" class="field">
        <label for="name">昵称</label>
        <div class="auth-field-control">
          <User aria-hidden="true" />
          <input
            id="name"
            v-model.trim="form.name.value"
            type="text"
            placeholder="选填，默认使用邮箱前缀"
            autocomplete="name"
          />
        </div>
      </div>
      <div class="field">
        <label for="email">邮箱</label>
        <div class="auth-field-control">
          <Mail aria-hidden="true" />
          <input
            id="email"
            :ref="
              (element) => {
                form.emailInputRef.value = element
              }
            "
            v-model.trim="form.email.value"
            type="email"
            placeholder="name@example.com"
            autocomplete="username"
            required
          />
        </div>
      </div>
      <div v-if="form.requiresVerificationCode.value" class="auth-code-row">
        <div class="field compact-field">
          <label for="verification-code">验证码</label>
          <div class="auth-field-control">
            <ShieldCheck aria-hidden="true" />
            <input
              id="verification-code"
              v-model.trim="form.verificationCode.value"
              type="text"
              inputmode="numeric"
              maxlength="8"
              placeholder="邮箱验证码"
              autocomplete="one-time-code"
              required
            />
          </div>
        </div>
        <button
          class="btn btn-soft auth-code-button"
          type="button"
          :disabled="form.sendCodeDisabled.value"
          @click="form.sendEmailCode"
        >
          <Mail aria-hidden="true" />
          {{
            form.codeLoading.value
              ? '发送中'
              : form.codeCooldown.value > 0
                ? `${form.codeCooldown.value}s`
                : form.sendCodeIdleLabel.value
          }}
        </button>
      </div>
      <div class="field">
        <label for="password">{{ form.passwordLabel.value }}</label>
        <div class="auth-field-control auth-password-control">
          <KeyRound aria-hidden="true" />
          <input
            id="password"
            v-model="form.password.value"
            :type="form.passwordInputType.value"
            placeholder="至少 8 位密码"
            :autocomplete="form.passwordAutocomplete.value"
            required
          />
          <button
            class="auth-password-toggle"
            type="button"
            :aria-label="form.passwordVisible.value ? '隐藏密码' : '显示密码'"
            :aria-pressed="form.passwordVisible.value"
            @click="form.passwordVisible.value = !form.passwordVisible.value"
          >
            <EyeOff v-if="form.passwordVisible.value" aria-hidden="true" />
            <Eye v-else aria-hidden="true" />
          </button>
        </div>
      </div>
      <div v-if="form.authMode.value === 'login'" class="auth-form-meta">
        <button class="auth-link-button" type="button" @click="form.setAuthMode('reset')">忘记密码？</button>
      </div>
      <div v-if="form.authMode.value === 'register'" class="field">
        <label for="invite-code">推荐邀请码</label>
        <div class="auth-field-control" :class="{ 'auth-field-control-readonly': hasBoundInviteCode }">
          <Sparkles aria-hidden="true" />
          <input
            id="invite-code"
            v-model.trim="form.inviteCode.value"
            type="text"
            placeholder="选填"
            autocomplete="off"
            :readonly="hasBoundInviteCode"
            :aria-describedby="hasBoundInviteCode ? 'invite-code-bound-note' : undefined"
          />
        </div>
        <small v-if="hasBoundInviteCode" id="invite-code-bound-note">
          已绑定推荐邀请码，注册时会自动使用，不可修改。
        </small>
      </div>
      <p
        v-if="form.loginMessage.value"
        class="form-message auth-form-message"
        :class="`is-${form.loginMessageType.value}`"
        role="status"
        aria-live="polite"
      >
        <CheckCircle2 aria-hidden="true" />
        {{ form.loginMessage.value }}
      </p>
      <button
        class="btn btn-primary auth-submit-button"
        type="submit"
        :disabled="form.loginDisabled.value || form.loginLoading.value"
      >
        <LogIn v-if="form.authMode.value === 'login'" aria-hidden="true" />
        <ShieldCheck v-else-if="form.authMode.value === 'reset'" aria-hidden="true" />
        <Image v-else aria-hidden="true" />
        {{ form.submitLabel.value }}
      </button>
    </form>
  </ModalDialog>
</template>
