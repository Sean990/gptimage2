<script setup>
import { computed, onMounted, ref, watch } from 'vue'
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
  UserRound,
  UsersRound,
} from 'lucide-vue-next'
import { api } from '../services/api'
import { useAuthStore } from '../services/authStore'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const orders = ref([])
const ledger = ref([])
const inviteOverview = ref({
  inviteCode: '',
  inviteLink: '',
  rewardCredits: 0,
  rewardRule: '',
  totalInvites: 0,
  paidInvites: 0,
  totalRewardCredits: 0,
  records: [],
})
const loading = ref(false)
const message = ref('')
const activeTab = ref('orders')
const profileName = ref('')
const profileAvatarUrl = ref('')
const profileSaving = ref(false)
const profileMessage = ref('')
const copyMessage = ref('')

const isAuthenticated = computed(() => auth.isAuthenticated.value)
const user = computed(() => auth.user.value || {})
const tabs = [
  { key: 'orders', label: '我的订单', icon: ReceiptText },
  { key: 'credits', label: '我的积分', icon: CreditCard },
  { key: 'invites', label: '我的邀请', icon: Gift },
  { key: 'profile', label: '个人资料', icon: IdCard },
]
const tabPaths = {
  orders: '/my-orders',
  credits: '/my-credits',
  invites: '/my-invites',
  profile: '/profile',
}

const totalPurchasedCredits = computed(() => orders.value.reduce((sum, order) => sum + Number(order.credits || 0), 0))
const currentPanelTitle = computed(() => tabs.find((tab) => tab.key === activeTab.value)?.label || '个人中心')

function tabFromRoute(path, queryTab) {
  if (tabs.some((tab) => tab.key === queryTab)) return queryTab
  if (path.includes('my-credits')) return 'credits'
  if (path.includes('my-invites')) return 'invites'
  if (path.includes('profile')) return 'profile'
  return 'orders'
}

function selectTab(tabKey) {
  activeTab.value = tabKey
  router.replace(tabPaths[tabKey] || '/my-orders')
}

function openLogin() {
  window.dispatchEvent(new CustomEvent('open-login'))
}

async function loadAccount() {
  if (!isAuthenticated.value) return
  loading.value = true
  message.value = ''
  try {
    const [orderRows, creditPayload, invitePayload] = await Promise.all([
      api.getOrders(),
      api.getCreditLedger(),
      api.getInvites(),
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
    copyMessage.value = '已复制邀请链接'
  } catch {
    copyMessage.value = '复制失败，请手动复制'
  }
  window.setTimeout(() => {
    copyMessage.value = ''
  }, 2200)
}

function openPricing() {
  router.push('/pricing')
}

function openDocs() {
  router.push('/docs')
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
  const typeMap = {
    purchase: '充值',
    signup_bonus: '注册奖励',
    profile_bonus: '资料奖励',
    invite_bonus: '邀请奖励',
    generation_reserve: '生成扣除',
    generation_refund: '生成退款',
  }
  return typeMap[type] || type || '积分变动'
}

onMounted(async () => {
  activeTab.value = tabFromRoute(route.path, route.query.tab)
  await auth.refreshMe().catch(() => {})
  await loadAccount()
})

watch(
  () => [route.path, route.query.tab],
  ([path, queryTab]) => {
    activeTab.value = tabFromRoute(path, queryTab)
  },
)
</script>

<template>
  <main class="page account-page">
    <section class="section-tight account-section">
      <div class="container">
        <section v-if="!isAuthenticated" class="card auth-required-panel">
          <LogIn aria-hidden="true" />
          <h1>登录后查看个人中心</h1>
          <p>订单、积分、邀请奖励和生成记录都会同步到你的账户。游客不赠送免费次数。</p>
          <button class="btn btn-primary" type="button" @click="openLogin">
            <LogIn aria-hidden="true" />
            登录 / 注册
          </button>
        </section>

        <template v-else>
          <section class="account-hero" aria-label="账户概览">
            <div>
              <span class="eyebrow">个人中心</span>
              <h1>{{ user.name || 'GPT Image 2 用户' }}</h1>
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

          <section class="account-shell">
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
                  阅读文档
                </button>
                <button v-if="activeTab === 'credits'" class="btn btn-primary" type="button" @click="openPricing">
                  <CreditCard aria-hidden="true" />
                  充值
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
                <div class="account-metric-grid">
                  <article class="account-metric">
                    <span>订单数量</span>
                    <strong>{{ orders.length }}</strong>
                  </article>
                  <article class="account-metric">
                    <span>累计充值积分</span>
                    <strong>{{ totalPurchasedCredits }}</strong>
                  </article>
                  <article class="account-metric">
                    <span>当前余额</span>
                    <strong>{{ user.credits || 0 }}</strong>
                  </article>
                </div>

                <div class="account-table-wrap">
                  <table class="account-table">
                    <thead>
                      <tr>
                        <th>订单号</th>
                        <th>邮箱</th>
                        <th>产品名称</th>
                        <th>金额</th>
                        <th>周期</th>
                        <th>支付时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="order in orders" :key="order.id">
                        <td>{{ order.id }}</td>
                        <td>{{ user.email }}</td>
                        <td>{{ order.planName }} · {{ order.credits }} 积分</td>
                        <td>{{ order.amountText }}</td>
                        <td>{{ order.modeLabel }}</td>
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
                <div class="credit-overview">
                  <span>剩余积分: {{ user.credits || 0 }}</span>
                </div>
                <div class="account-table-wrap">
                  <table class="account-table">
                    <thead>
                      <tr>
                        <th>交易号</th>
                        <th>交易类型</th>
                        <th>积分</th>
                        <th>创建时间</th>
                        <th>过期时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="item in ledger" :key="item.id">
                        <td>{{ item.id }}</td>
                        <td>{{ formatLedgerType(item.type) }}</td>
                        <td>
                          <span :class="['credit-change', { positive: item.amount > 0 }]">
                            {{ item.amount > 0 ? '+' : '' }}{{ item.amount }}
                          </span>
                        </td>
                        <td>{{ formatDate(item.createdAt) }}</td>
                        <td>长期有效</td>
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
                <div class="invite-grid">
                  <article class="invite-card">
                    <span>邀请码</span>
                    <strong>{{ inviteOverview.inviteCode || 'NOT SET' }}</strong>
                    <p>{{ inviteOverview.rewardRule || `每邀请 1 位新用户注册，奖励 ${inviteOverview.rewardCredits || 0} 积分。` }}</p>
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
                <div class="account-table-wrap">
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
                <div class="profile-overview">
                  <span class="profile-avatar">
                    <img v-if="user.avatarUrl" :src="user.avatarUrl" alt="" />
                    <UserRound v-else aria-hidden="true" />
                  </span>
                  <div>
                    <strong>{{ user.name }}</strong>
                    <span>{{ user.email }}</span>
                    <em>{{ user.profileCompleted ? '资料已完善' : '完善资料可领取奖励积分' }}</em>
                  </div>
                </div>

                <div class="profile-stats">
                  <article>
                    <PackageCheck aria-hidden="true" />
                    <span>图库作品</span>
                    <strong>{{ user.galleryCount || 0 }}</strong>
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

                <form class="profile-form" @submit.prevent="submitProfile">
                  <div class="field">
                    <label for="profile-name">昵称</label>
                    <input id="profile-name" v-model.trim="profileName" type="text" autocomplete="name" required />
                  </div>
                  <div class="field">
                    <label for="profile-avatar">头像 URL</label>
                    <input id="profile-avatar" v-model.trim="profileAvatarUrl" type="url" placeholder="https://..." autocomplete="off" />
                    <small>完善资料可领取一次资料奖励积分。</small>
                  </div>
                  <p v-if="profileMessage" class="form-message" aria-live="polite">{{ profileMessage }}</p>
                  <button class="btn btn-primary" type="submit" :disabled="profileSaving">
                    <ShieldCheck aria-hidden="true" />
                    {{ profileSaving ? '保存中...' : '保存资料' }}
                  </button>
                </form>
              </section>
            </div>
          </section>
        </template>
      </div>
    </section>
  </main>
</template>
