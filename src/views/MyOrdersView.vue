<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  BadgeDollarSign,
  Coins,
  Copy,
  CreditCard,
  Gift,
  IdCard,
  LogIn,
  PackageCheck,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Ticket,
  Upload,
  UserRound,
  UsersRound,
  X,
} from 'lucide-vue-next'
import { api, resolveApiUrl } from '../services/api'
import { useAuthStore } from '../services/authStore'
import { useSiteStore } from '../services/siteStore'
import { filterVisibleGalleryRecords } from '../composables/useGallery'
import '../assets/account.css'

const auth = useAuthStore()
const { siteData, loadSiteData } = useSiteStore()
const route = useRoute()
const router = useRouter()
const createInviteOverview = () => ({
  inviteCode: '',
  inviteLink: '',
  rewardCredits: 0,
  rewardRule: '',
  totalInvites: 0,
  paidInvites: 0,
  totalRewardCredits: 0,
  records: [],
})
const orders = ref([])
const ledger = ref([])
const inviteOverview = ref(createInviteOverview())
const loading = ref(false)
const message = ref('')
const activeTab = ref('credits')
const profileName = ref('')
const profileAvatarUrl = ref('')
const profileSaving = ref(false)
const profileMessage = ref('')
const avatarFileInput = ref(null)
const avatarCropDialogOpen = ref(false)
const avatarCropImageUrl = ref('')
const avatarCropNaturalWidth = ref(0)
const avatarCropNaturalHeight = ref(0)
const avatarCropZoom = ref(1)
const avatarCropOffsetX = ref(0)
const avatarCropOffsetY = ref(0)
const avatarCropUploading = ref(false)
const avatarCropMessage = ref('')
const avatarDragState = ref(null)
const copyMessage = ref('')
const profileGalleryCount = ref(0)
const redeemCode = ref('')
const redeemLoading = ref(false)
const redeemMessage = ref('')

const isAuthenticated = computed(() => auth.isAuthenticated.value)
const user = computed(() => auth.user.value || {})
const billingEnabled = computed(() => Boolean(siteData.value.billingEnabled))
const allTabs = [
  { key: 'orders', label: '我的订单', icon: ReceiptText },
  { key: 'credits', label: '我的积分', icon: CreditCard },
  { key: 'invites', label: '我的邀请', icon: Gift },
  { key: 'profile', label: '个人资料', icon: IdCard },
]
const tabs = computed(() => allTabs.filter((tab) => tab.key !== 'orders' || billingEnabled.value))
const tabPaths = {
  orders: '/my-orders',
  credits: '/my-credits',
  invites: '/my-invites',
  profile: '/profile',
}

const totalPurchasedCredits = computed(() =>
  orders.value.filter((order) => order.status === 'paid').reduce((sum, order) => sum + Number(order.credits || 0), 0),
)
const currentPanelTitle = computed(() => tabs.value.find((tab) => tab.key === activeTab.value)?.label || '个人中心')
const profileRewardCredits = computed(() => Number(siteData.value.rewardCredits?.profileCompletion || 0))
const profileRewardRequirements = computed(() => siteData.value.rewardCredits?.profileCompletionRequirements || {})
const profileMinNameLength = computed(() => Number(profileRewardRequirements.value.minNameLength || 2))
const profileRequiresAvatar = computed(() => profileRewardRequirements.value.requireAvatar !== false)
const profileRewardCheckEnabled = computed(() => !user.value?.profileCompleted && profileRewardCredits.value > 0)
const profileInputMinNameLength = computed(() => (profileRewardCheckEnabled.value ? profileMinNameLength.value : 1))
const profileAvatarRequired = computed(() => profileRewardCheckEnabled.value && profileRequiresAvatar.value)
const profileRewardRequirementText = computed(() => {
  if (!profileRewardCredits.value) return '填写昵称即可保存资料。'
  return (
    profileRewardRequirements.value.description ||
    `填写至少 ${profileMinNameLength.value} 个字符昵称，并上传头像后，仅可领取一次。`
  )
})
const isProfileAvatarValid = computed(() => {
  const avatar = String(profileAvatarUrl.value || '').trim()
  if (!avatar) return false
  if (avatar.startsWith('/uploads/')) return true
  return /^https?:\/\/\S+$/i.test(avatar)
})
const profileAvatarPreviewUrl = computed(() => resolveApiUrl(profileAvatarUrl.value || user.value?.avatarUrl || ''))
const canClaimProfileReward = computed(() => {
  if (user.value?.profileCompleted) return true
  if (!profileRewardCredits.value) return true
  if (String(profileName.value || '').trim().length < profileMinNameLength.value) return false
  return !profileRequiresAvatar.value || isProfileAvatarValid.value
})
const profileRewardStatusText = computed(() => {
  if (user.value?.profileCompleted) return '资料已完善'
  if (!profileRewardCredits.value) return '完善资料'
  return `完善资料可领取 ${profileRewardCredits.value} 积分`
})

function tabFromRoute(path, queryTab) {
  const requestedTab = String(queryTab || '')
  if (tabs.value.some((tab) => tab.key === requestedTab)) return requestedTab
  if (path.includes('my-credits')) return 'credits'
  if (path.includes('my-invites')) return 'invites'
  if (path.includes('profile')) return 'profile'
  return billingEnabled.value ? 'orders' : 'credits'
}

function selectTab(tabKey) {
  if (!tabs.value.some((tab) => tab.key === tabKey)) return
  activeTab.value = tabKey
  router.replace(tabPaths[tabKey] || '/my-orders')
}

function openLogin() {
  window.dispatchEvent(new CustomEvent('open-login'))
}

function resetAccountState() {
  orders.value = []
  ledger.value = []
  inviteOverview.value = createInviteOverview()
  profileName.value = ''
  profileAvatarUrl.value = ''
  message.value = ''
  profileMessage.value = ''
  copyMessage.value = ''
  profileGalleryCount.value = 0
  redeemCode.value = ''
  redeemMessage.value = ''
}

function revokeAvatarCropImage() {
  if (avatarCropImageUrl.value?.startsWith('blob:')) {
    URL.revokeObjectURL(avatarCropImageUrl.value)
  }
  avatarCropImageUrl.value = ''
}

function openAvatarFilePicker() {
  avatarFileInput.value?.click()
}

function resetAvatarCropState() {
  avatarCropNaturalWidth.value = 0
  avatarCropNaturalHeight.value = 0
  avatarCropZoom.value = 1
  avatarCropOffsetX.value = 0
  avatarCropOffsetY.value = 0
  avatarCropMessage.value = ''
  avatarDragState.value = null
}

function handleAvatarFileChange(event) {
  const file = event.target?.files?.[0]
  event.target.value = ''
  if (!file) return
  if (!file.type?.startsWith('image/')) {
    profileMessage.value = '请选择图片文件'
    return
  }
  if (file.size > 10 * 1024 * 1024) {
    profileMessage.value = '头像图片不能超过 10MB'
    return
  }

  revokeAvatarCropImage()
  resetAvatarCropState()
  avatarCropImageUrl.value = URL.createObjectURL(file)
  avatarCropDialogOpen.value = true
  profileMessage.value = ''
}

function onAvatarCropImageLoad(event) {
  const image = event.target
  avatarCropNaturalWidth.value = image.naturalWidth || 0
  avatarCropNaturalHeight.value = image.naturalHeight || 0
  clampAvatarCropOffset()
}

const avatarCropBoxSize = 280
const avatarCropOutputSize = 512

const avatarCropScale = computed(() => {
  const width = avatarCropNaturalWidth.value
  const height = avatarCropNaturalHeight.value
  if (!width || !height) return 1
  return Math.max(avatarCropBoxSize / width, avatarCropBoxSize / height) * Number(avatarCropZoom.value || 1)
})

const avatarCropImageStyle = computed(() => {
  const width = avatarCropNaturalWidth.value * avatarCropScale.value
  const height = avatarCropNaturalHeight.value * avatarCropScale.value
  return {
    width: `${width}px`,
    height: `${height}px`,
    transform: `translate(${avatarCropOffsetX.value}px, ${avatarCropOffsetY.value}px)`,
  }
})

function clampAvatarCropOffset() {
  const displayWidth = avatarCropNaturalWidth.value * avatarCropScale.value
  const displayHeight = avatarCropNaturalHeight.value * avatarCropScale.value
  const maxX = Math.max(0, (displayWidth - avatarCropBoxSize) / 2)
  const maxY = Math.max(0, (displayHeight - avatarCropBoxSize) / 2)
  avatarCropOffsetX.value = Math.min(maxX, Math.max(-maxX, Number(avatarCropOffsetX.value || 0)))
  avatarCropOffsetY.value = Math.min(maxY, Math.max(-maxY, Number(avatarCropOffsetY.value || 0)))
}

function handleAvatarZoomChange() {
  nextTick(clampAvatarCropOffset)
}

function startAvatarDrag(event) {
  if (avatarCropUploading.value) return
  event.currentTarget.setPointerCapture?.(event.pointerId)
  avatarDragState.value = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    offsetX: avatarCropOffsetX.value,
    offsetY: avatarCropOffsetY.value,
  }
}

function moveAvatarDrag(event) {
  if (!avatarDragState.value || avatarDragState.value.pointerId !== event.pointerId) return
  avatarCropOffsetX.value = avatarDragState.value.offsetX + event.clientX - avatarDragState.value.startX
  avatarCropOffsetY.value = avatarDragState.value.offsetY + event.clientY - avatarDragState.value.startY
  clampAvatarCropOffset()
}

function stopAvatarDrag(event) {
  if (avatarDragState.value?.pointerId === event.pointerId) {
    event.currentTarget.releasePointerCapture?.(event.pointerId)
    avatarDragState.value = null
  }
}

function closeAvatarCropDialog() {
  if (avatarCropUploading.value) return
  avatarCropDialogOpen.value = false
  revokeAvatarCropImage()
  resetAvatarCropState()
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })
}

async function createAvatarCropFile() {
  const image = await loadImage(avatarCropImageUrl.value)
  const scale = avatarCropScale.value
  const displayWidth = avatarCropNaturalWidth.value * scale
  const displayHeight = avatarCropNaturalHeight.value * scale
  const imageLeft = (avatarCropBoxSize - displayWidth) / 2 + avatarCropOffsetX.value
  const imageTop = (avatarCropBoxSize - displayHeight) / 2 + avatarCropOffsetY.value
  const sourceX = Math.max(0, -imageLeft / scale)
  const sourceY = Math.max(0, -imageTop / scale)
  const sourceSize = avatarCropBoxSize / scale

  const canvas = document.createElement('canvas')
  canvas.width = avatarCropOutputSize
  canvas.height = avatarCropOutputSize
  const context = canvas.getContext('2d')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,
    0,
    0,
    avatarCropOutputSize,
    avatarCropOutputSize,
  )

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
  if (!blob) throw new Error('头像裁剪失败，请重新选择图片')
  return new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
}

async function uploadCroppedAvatar() {
  avatarCropUploading.value = true
  avatarCropMessage.value = ''
  try {
    const file = await createAvatarCropFile()
    const [uploaded] = await api.uploadFiles([file])
    if (!uploaded?.url) throw new Error('头像上传失败，请重试')
    profileAvatarUrl.value = uploaded.url
    profileMessage.value = '头像已上传，保存资料后生效'
    avatarCropDialogOpen.value = false
    revokeAvatarCropImage()
    resetAvatarCropState()
  } catch (error) {
    avatarCropMessage.value = error.message || '头像上传失败，请重试'
  } finally {
    avatarCropUploading.value = false
  }
}

async function loadAccount() {
  if (!isAuthenticated.value) return
  if (loading.value) return
  loading.value = true
  message.value = ''
  try {
    const [orderRows, creditPayload, invitePayload, galleryRows] = await Promise.all([
      billingEnabled.value ? api.getOrders() : Promise.resolve([]),
      api.getCreditLedger(),
      api.getInvites(),
      api.getGallery().catch(() => null),
      auth.refreshMe(),
    ])
    orders.value = Array.isArray(orderRows) ? orderRows : []
    ledger.value = Array.isArray(creditPayload?.ledger) ? creditPayload.ledger : []
    inviteOverview.value = {
      ...inviteOverview.value,
      ...(invitePayload || {}),
      records: Array.isArray(invitePayload?.records) ? invitePayload.records : [],
    }
    profileName.value = user.value?.name || ''
    profileAvatarUrl.value = user.value?.avatarUrl || ''
    profileGalleryCount.value = Array.isArray(galleryRows)
      ? filterVisibleGalleryRecords(galleryRows).length
      : Number(user.value?.galleryCount || 0)
  } catch (error) {
    message.value = error.message || '账户数据读取失败'
  } finally {
    loading.value = false
  }
}

async function submitProfile() {
  profileSaving.value = true
  profileMessage.value = ''
  try {
    const updated = await api.updateProfile({
      name: profileName.value,
      avatarUrl: profileAvatarUrl.value,
    })
    auth.user.value = updated
    profileMessage.value = '个人资料已更新'
  } catch (error) {
    profileMessage.value = error.message || '个人资料更新失败'
  } finally {
    profileSaving.value = false
  }
}

async function copyInviteLink() {
  const text = inviteOverview.value.inviteLink || inviteOverview.value.inviteCode
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    copyMessage.value = '邀请链接已复制'
  } catch {
    copyMessage.value = '复制失败，请手动复制'
  }
  window.setTimeout(() => {
    copyMessage.value = ''
  }, 2200)
}

function openPricing() {
  if (!billingEnabled.value) {
    router.push('/docs#credits')
    return
  }
  router.push('/pricing')
}

function openDocs() {
  router.push('/docs')
}

async function submitRedeemCode() {
  const code = redeemCode.value.trim()
  if (!code) {
    redeemMessage.value = '请输入卡密后再兑换'
    return
  }

  redeemLoading.value = true
  redeemMessage.value = ''
  try {
    const result = await api.redeemCode({ code })
    redeemCode.value = ''
    redeemMessage.value = `兑换成功，已到账 ${result.credits} 积分，当前余额 ${result.balance} 积分`
    await Promise.all([auth.refreshMe().catch(() => {}), loadAccount()])
  } catch (error) {
    redeemMessage.value = error.message || '卡密兑换失败，请检查后重试'
  } finally {
    redeemLoading.value = false
  }
}

function formatDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '未知时间'
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatLedgerType(type) {
  const normalizedType = String(type || '')
    .trim()
    .toLowerCase()
  const typeMap = {
    admin_adjustment: '管理员调整',
    adjustment: '积分调整',
    purchase: '积分到账',
    recharge: '积分到账',
    credit_purchase: '积分到账',
    order_purchase: '积分到账',
    redeem_code: '卡密兑换',
    signup_bonus: '注册奖励',
    profile_bonus: '资料奖励',
    invite_bonus: '邀请奖励',
    invite_generation_bonus: '邀请首图奖励',
    invite_purchase_bonus: '邀请首充奖励',
    invitee_generation_bonus: '受邀首图奖励',
    invitee_purchase_bonus: '受邀首充奖励',
    prompt_reverse: '提示词反推',
    generation_consume: '生成消耗',
    generation_reserve: '生成预扣',
    generation_refund: '生成退款',
    generation_delete: '生成删除',
    refund: '退款返还',
    consume: '积分消耗',
  }
  return typeMap[normalizedType] || '积分变更'
}

function formatLedgerDescription(item) {
  return item?.description || formatLedgerType(item?.type)
}

function formatOrderStatus(status) {
  const statusMap = {
    paid: '已发放',
    pending: '待管理员确认',
    canceled: '已取消',
    refunded: '已退款',
  }
  return statusMap[status] || status || '-'
}

onMounted(async () => {
  await Promise.all([loadSiteData(), auth.refreshMe().catch(() => {})])
  activeTab.value = tabFromRoute(route.path, route.query.tab)
  await loadAccount()
})

onBeforeUnmount(() => {
  revokeAvatarCropImage()
})

watch(
  () => [route.path, route.query.tab],
  ([path, queryTab]) => {
    activeTab.value = tabFromRoute(path, queryTab)
  },
)

watch(billingEnabled, () => {
  activeTab.value = tabFromRoute(route.path, route.query.tab)
})

watch(isAuthenticated, (authenticated) => {
  if (authenticated) {
    loadAccount()
  } else {
    resetAccountState()
  }
})
</script>

<template>
  <main class="page account-page">
    <section class="section-tight account-section">
      <div class="container">
        <section v-if="!isAuthenticated" class="card auth-required-panel" v-fade-up>
          <LogIn aria-hidden="true" />
          <h1>登录后查看个人中心</h1>
          <p>积分、邀请奖励和生成记录会同步到你的账户。登录后才能提交生成任务。</p>
          <button class="btn btn-primary" type="button" @click="openLogin">
            <LogIn aria-hidden="true" />
            登录 / 注册
          </button>
        </section>

        <template v-else>
          <section class="account-hero" aria-label="账户概览" v-fade-up>
            <div>
              <span class="eyebrow">个人中心</span>
              <h1>{{ user.name || 'ImgsGen 用户' }}</h1>
              <p>{{ user.email }}</p>
            </div>
            <div class="account-hero-actions">
              <span class="account-balance">
                <Coins aria-hidden="true" />
                {{ user.credits || 0 }} 积分
              </span>
              <button class="btn btn-soft" type="button" :disabled="loading" @click="loadAccount">
                <RefreshCw aria-hidden="true" />
                {{ loading ? '刷新中...' : '刷新' }}
              </button>
            </div>
          </section>

          <p v-if="message" class="form-message account-message" aria-live="polite">{{ message }}</p>

          <section class="account-shell" v-fade-up="{ delay: 100 }">
            <nav class="account-sidebar" aria-label="个人中心导航">
              <button
                v-for="tab in tabs"
                :key="tab.key"
                :id="`account-tab-${tab.key}`"
                type="button"
                role="tab"
                :class="{ active: activeTab === tab.key }"
                :aria-selected="activeTab === tab.key"
                :aria-controls="`account-panel-${tab.key}`"
                @click="selectTab(tab.key)"
              >
                <component :is="tab.icon" aria-hidden="true" />
                {{ tab.label }}
              </button>
            </nav>

            <div class="account-content">
              <header class="account-panel-head">
                <h2>{{ currentPanelTitle }}</h2>
                <button v-if="activeTab === 'orders'" class="btn btn-primary" type="button" @click="openDocs">
                  <ReceiptText aria-hidden="true" />
                  查看文档
                </button>
                <button
                  v-if="activeTab === 'credits' && billingEnabled"
                  class="btn btn-primary"
                  type="button"
                  @click="openPricing"
                >
                  <CreditCard aria-hidden="true" />
                  积分规则
                </button>
                <button v-if="activeTab === 'invites'" class="btn btn-soft" type="button" @click="copyInviteLink">
                  <Copy aria-hidden="true" />
                  复制链接
                </button>
              </header>

              <section
                v-if="activeTab === 'orders'"
                id="account-panel-orders"
                role="tabpanel"
                aria-labelledby="account-tab-orders"
              >
                <div class="account-metric-grid" v-fade-up="{ delay: 200 }">
                  <article class="account-metric">
                    <span>订单数量</span>
                    <strong>{{ orders.length }}</strong>
                  </article>
                  <article class="account-metric">
                    <span>累计发放积分</span>
                    <strong>{{ totalPurchasedCredits }}</strong>
                  </article>
                  <article class="account-metric">
                    <span>当前余额</span>
                    <strong>{{ user.credits || 0 }}</strong>
                  </article>
                </div>

                <div class="account-table-wrap" v-fade-up="{ delay: 300 }">
                  <table class="account-table">
                    <thead>
                      <tr>
                        <th>订单号</th>
                        <th>产品名称</th>
                        <th>金额</th>
                        <th>周期</th>
                        <th>状态</th>
                        <th>创建时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="order in orders" :key="order.id">
                        <td>{{ order.id }}</td>
                        <td>{{ order.planName }} · {{ order.credits }} 积分</td>
                        <td>{{ order.amountText }}</td>
                        <td>{{ order.modeLabel }}</td>
                        <td>{{ formatOrderStatus(order.status) }}</td>
                        <td>{{ formatDate(order.createdAt) }}</td>
                      </tr>
                    </tbody>
                  </table>
                  <p v-if="!orders.length" class="empty-copy">暂无订单记录。</p>
                </div>
              </section>

              <section
                v-if="activeTab === 'credits'"
                id="account-panel-credits"
                role="tabpanel"
                aria-labelledby="account-tab-credits"
              >
                <form class="redeem-code-card" v-fade-up="{ delay: 180 }" @submit.prevent="submitRedeemCode">
                  <div class="redeem-code-copy">
                    <Ticket aria-hidden="true" />
                    <div>
                      <strong>卡密兑换</strong>
                      <span>从发卡网购买后，把卡密粘贴到这里，兑换成功后积分自动到账。</span>
                    </div>
                  </div>
                  <div class="redeem-code-actions">
                    <input
                      v-model.trim="redeemCode"
                      type="text"
                      autocomplete="off"
                      inputmode="text"
                      placeholder="请输入卡密"
                      :disabled="redeemLoading"
                      aria-label="卡密"
                    />
                    <button class="btn btn-primary" type="submit" :disabled="redeemLoading">
                      <ShieldCheck aria-hidden="true" />
                      {{ redeemLoading ? '兑换中...' : '立即兑换' }}
                    </button>
                  </div>
                  <p v-if="redeemMessage" class="form-message" aria-live="polite">{{ redeemMessage }}</p>
                </form>

                <div class="credit-overview" v-fade-up="{ delay: 200 }">
                  <span>剩余积分：{{ user.credits || 0 }}</span>
                </div>
                <div class="account-table-wrap" v-fade-up="{ delay: 300 }">
                  <table class="account-table">
                    <thead>
                      <tr>
                        <th>变更类型</th>
                        <th>描述</th>
                        <th>积分</th>
                        <th>变更时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="item in ledger" :key="item.id">
                        <td>{{ formatLedgerType(item.type) }}</td>
                        <td class="ledger-description-cell">{{ formatLedgerDescription(item) }}</td>
                        <td>
                          <span :class="['credit-change', { positive: item.amount > 0 }]">
                            {{ item.amount > 0 ? '+' : '' }}{{ item.amount }}
                          </span>
                        </td>
                        <td>{{ formatDate(item.createdAt) }}</td>
                      </tr>
                    </tbody>
                  </table>
                  <p v-if="!ledger.length" class="empty-copy">暂无积分流水。</p>
                </div>
              </section>

              <section
                v-if="activeTab === 'invites'"
                id="account-panel-invites"
                role="tabpanel"
                aria-labelledby="account-tab-invites"
              >
                <div class="invite-grid" v-fade-up="{ delay: 200 }">
                  <article class="invite-card">
                    <span>邀请码</span>
                    <strong>{{ inviteOverview.inviteCode || 'NOT SET' }}</strong>
                    <p>
                      {{
                        inviteOverview.rewardRule ||
                        `每邀请 1 位新用户完成首次生成，奖励 ${inviteOverview.rewardCredits || 0} 积分。`
                      }}
                    </p>
                    <button class="btn btn-soft" type="button" @click="copyInviteLink">
                      <Copy aria-hidden="true" />
                      复制邀请链接
                    </button>
                  </article>
                  <article class="invite-card invite-card-stats">
                    <span>邀请奖励余额</span>
                    <strong>{{ inviteOverview.totalRewardCredits || 0 }} 积分</strong>
                    <div>
                      <span>
                        <b>{{ inviteOverview.totalInvites || 0 }}</b>
                        总邀请人数
                      </span>
                      <span>
                        <b>{{ inviteOverview.paidInvites || 0 }}</b>
                        已购买人数
                      </span>
                      <span>
                        <b>{{ inviteOverview.totalRewardCredits || 0 }}</b>
                        总奖励积分
                      </span>
                    </div>
                  </article>
                </div>
                <p v-if="copyMessage" class="form-message invite-copy-message" aria-live="polite">{{ copyMessage }}</p>
                <div class="account-table-wrap" v-fade-up="{ delay: 300 }">
                  <table class="account-table">
                    <thead>
                      <tr>
                        <th>邀请时间</th>
                        <th>邀请用户</th>
                        <th>状态</th>
                        <th>奖励积分</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="record in inviteOverview.records" :key="record.id">
                        <td>{{ formatDate(record.invitedAt) }}</td>
                        <td>{{ record.invitedUser }}</td>
                        <td>{{ record.status }}</td>
                        <td>{{ record.rewardCredits }}</td>
                      </tr>
                    </tbody>
                  </table>
                  <p v-if="!inviteOverview.records.length" class="empty-copy">暂无邀请记录。</p>
                </div>
              </section>

              <section
                v-if="activeTab === 'profile'"
                id="account-panel-profile"
                class="profile-panel"
                role="tabpanel"
                aria-labelledby="account-tab-profile"
              >
                <div class="profile-overview" v-fade-up="{ delay: 200 }">
                  <span class="profile-avatar">
                    <img v-if="profileAvatarPreviewUrl" :src="profileAvatarPreviewUrl" alt="" />
                    <UserRound v-else aria-hidden="true" />
                  </span>
                  <div>
                    <strong>{{ user.name }}</strong>
                    <span>{{ user.email }}</span>
                    <em>{{ profileRewardStatusText }}</em>
                  </div>
                </div>

                <div class="profile-stats" v-fade-up="{ delay: 300 }">
                  <article>
                    <PackageCheck aria-hidden="true" />
                    <span>图库作品</span>
                    <strong>{{ profileGalleryCount }}</strong>
                  </article>
                  <article>
                    <UsersRound aria-hidden="true" />
                    <span>邀请人数</span>
                    <strong>{{ inviteOverview.totalInvites || 0 }}</strong>
                  </article>
                  <article>
                    <BadgeDollarSign aria-hidden="true" />
                    <span>当前积分</span>
                    <strong>{{ user.credits || 0 }}</strong>
                  </article>
                </div>

                <form class="profile-form" v-fade-up="{ delay: 400 }" @submit.prevent="submitProfile">
                  <div class="field">
                    <label for="profile-name">昵称</label>
                    <input
                      id="profile-name"
                      v-model.trim="profileName"
                      type="text"
                      autocomplete="name"
                      :minlength="profileInputMinNameLength"
                      required
                    />
                  </div>
                  <div class="field">
                    <label for="profile-avatar-file">头像{{ profileAvatarRequired ? '（必填）' : '' }}</label>
                    <div class="avatar-upload-row">
                      <span class="profile-avatar profile-avatar-preview">
                        <img v-if="profileAvatarPreviewUrl" :src="profileAvatarPreviewUrl" alt="" />
                        <UserRound v-else aria-hidden="true" />
                      </span>
                      <div>
                        <input
                          id="profile-avatar-file"
                          ref="avatarFileInput"
                          class="avatar-file-input"
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          @change="handleAvatarFileChange"
                        />
                        <button class="btn btn-soft" type="button" @click="openAvatarFilePicker">
                          <Upload aria-hidden="true" />
                          选择并裁剪头像
                        </button>
                      </div>
                    </div>
                    <small>{{ profileRewardRequirementText }}</small>
                  </div>
                  <p v-if="profileMessage" class="form-message" aria-live="polite">{{ profileMessage }}</p>
                  <button class="btn btn-primary" type="submit" :disabled="profileSaving || !canClaimProfileReward">
                    <ShieldCheck aria-hidden="true" />
                    {{ profileSaving ? '保存中...' : '保存资料' }}
                  </button>
                </form>

                <Teleport to="body">
                  <div v-if="avatarCropDialogOpen" class="avatar-crop-backdrop" role="presentation">
                    <section
                      class="avatar-crop-dialog"
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="avatar-crop-title"
                    >
                      <header>
                        <div>
                          <h2 id="avatar-crop-title">裁剪头像</h2>
                          <p>拖动画面调整位置，缩放后确认上传。</p>
                        </div>
                        <button
                          class="icon-button"
                          type="button"
                          aria-label="关闭裁剪"
                          :disabled="avatarCropUploading"
                          @click="closeAvatarCropDialog"
                        >
                          <X aria-hidden="true" />
                        </button>
                      </header>

                      <div
                        class="avatar-crop-stage"
                        @pointerdown.prevent="startAvatarDrag"
                        @pointermove.prevent="moveAvatarDrag"
                        @pointerup="stopAvatarDrag"
                        @pointercancel="stopAvatarDrag"
                      >
                        <img
                          v-if="avatarCropImageUrl"
                          :src="avatarCropImageUrl"
                          :style="avatarCropImageStyle"
                          alt=""
                          draggable="false"
                          @load="onAvatarCropImageLoad"
                        />
                        <span class="avatar-crop-mask" aria-hidden="true" />
                      </div>

                      <label class="avatar-crop-zoom">
                        <span>缩放</span>
                        <input
                          v-model.number="avatarCropZoom"
                          type="range"
                          min="1"
                          max="3"
                          step="0.01"
                          :disabled="avatarCropUploading"
                          @input="handleAvatarZoomChange"
                        />
                      </label>

                      <p v-if="avatarCropMessage" class="form-message" aria-live="polite">{{ avatarCropMessage }}</p>

                      <footer>
                        <button class="btn btn-soft" type="button" :disabled="avatarCropUploading" @click="closeAvatarCropDialog">
                          取消
                        </button>
                        <button class="btn btn-primary" type="button" :disabled="avatarCropUploading" @click="uploadCroppedAvatar">
                          <Upload aria-hidden="true" />
                          {{ avatarCropUploading ? '上传中...' : '确认上传' }}
                        </button>
                      </footer>
                    </section>
                  </div>
                </Teleport>
              </section>
            </div>
          </section>
        </template>
      </div>
    </section>
  </main>
</template>
