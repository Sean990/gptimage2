<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Copy, CreditCard, QrCode, ShieldCheck, Sparkles, Tag, X } from 'lucide-vue-next'
import PricingCards from '../components/PricingCards.vue'
import SectionTitle from '../components/SectionTitle.vue'
import { api } from '../services/api'
import { useAuthStore } from '../services/authStore'
import { useSiteStore } from '../services/siteStore'

const { siteData, loadSiteData } = useSiteStore()
const auth = useAuthStore()
const router = useRouter()
const activeMode = ref('monthly')
const selectedPlan = ref(null)
const createdOrder = ref(null)
const orderLoading = ref(false)
const orderMessage = ref('')
const copyMessage = ref('')
const pricingModes = computed(() => siteData.value.pricingModes)
const modes = computed(() => Object.entries(pricingModes.value).map(([key, value]) => ({ key, label: value.label })))
const plans = computed(() => pricingModes.value[activeMode.value]?.plans || [])
const paymentImage = computed(() => siteData.value.assets?.cnpay || '')
const paymentRemark = computed(() => createdOrder.value?.id || '')

function setMode(key) {
  activeMode.value = key
}

function changeModeByOffset(offset) {
  const currentIndex = modes.value.findIndex((mode) => mode.key === activeMode.value)
  const nextIndex = (currentIndex + offset + modes.value.length) % modes.value.length
  const nextKey = modes.value[nextIndex].key
  activeMode.value = nextKey
  window.requestAnimationFrame(() => {
    document.getElementById(`pricing-tab-${nextKey}`)?.focus()
  })
}

function selectPlan(plan) {
  selectedPlan.value = plan
  createdOrder.value = null
  orderMessage.value = ''
  copyMessage.value = ''
}

async function submitOrder() {
  if (!selectedPlan.value) return
  if (!auth.isAuthenticated.value) {
    orderMessage.value = '请先登录后购买积分套餐'
    window.dispatchEvent(new CustomEvent('open-login'))
    return
  }
  orderLoading.value = true
  orderMessage.value = ''
  copyMessage.value = ''

  try {
    const order = await api.createOrder({
      mode: activeMode.value,
      planName: selectedPlan.value.name,
    })
    createdOrder.value = order
    await auth.refreshMe().catch(() => {})
    orderMessage.value = `订单 ${order.id} 已创建。请复制订单号并联系管理员，管理员确认后会给账户充值 ${order.credits} 积分。`
  } catch (error) {
    orderMessage.value = error.message || '订单创建失败，请稍后重试'
  } finally {
    orderLoading.value = false
  }
}

async function copyPaymentRemark() {
  if (!paymentRemark.value) return
  try {
    await navigator.clipboard.writeText(paymentRemark.value)
    copyMessage.value = '订单号已复制'
  } catch {
    copyMessage.value = '复制失败，请手动复制订单号'
  }
  window.setTimeout(() => {
    copyMessage.value = ''
  }, 2200)
}

function openOrders() {
  selectedPlan.value = null
  router.push('/my-orders')
}

onMounted(() => {
  loadSiteData()
  auth.refreshMe().catch(() => {})
})
</script>

<template>
  <main class="page pricing-hero">
    <section class="section-tight">
      <div class="container">
        <article class="card sale-banner">
          <Tag aria-hidden="true" />
          <h2>创作者优惠 · 积分套餐</h2>
          <p>展示积分包、月付和年付三种购买路径，便于按预计使用量对比成本；最终权益以下单页面和订单记录为准。</p>
        </article>

        <SectionTitle
          title="ImgsGen 定价"
          description="选择适合你预计使用量的积分包、月付订阅或年付订阅。生成结果公开使用前仍需完成授权和内容复核。"
        />

        <div class="segmented" role="tablist" aria-label="定价模式">
          <button
            v-for="mode in modes"
            :key="mode.key"
            :id="`pricing-tab-${mode.key}`"
            role="tab"
            type="button"
            :class="{ active: activeMode === mode.key }"
            :aria-selected="activeMode === mode.key"
            :aria-controls="`pricing-panel-${mode.key}`"
            :tabindex="activeMode === mode.key ? 0 : -1"
            @click="setMode(mode.key)"
            @keydown.left.prevent="changeModeByOffset(-1)"
            @keydown.right.prevent="changeModeByOffset(1)"
          >
            {{ mode.label }}
          </button>
        </div>

        <div
          :id="`pricing-panel-${activeMode}`"
          role="tabpanel"
          :aria-labelledby="`pricing-tab-${activeMode}`"
        >
          <PricingCards :plans="plans" @select="selectPlan" />
        </div>

        <div class="section-tight">
          <div class="grid-3">
            <article class="card feature-card">
              <Sparkles aria-hidden="true" />
              <h3>按创作频率选择</h3>
              <p>轻量体验选积分包，稳定创作测试选月付，团队长期项目可考虑年付。</p>
            </article>
            <article class="card feature-card">
              <ShieldCheck aria-hidden="true" />
              <h3>商用前合规确认</h3>
              <p>套餐适合商业视觉草稿、广告素材探索和团队协作，发布前仍需确认素材授权、广告合规和 AI 标识。</p>
            </article>
            <article class="card feature-card">
              <CreditCard aria-hidden="true" />
              <h3>人民币支付</h3>
              <p>提交订单后复制订单号联系管理员，管理员确认后积分会自动到账。</p>
            </article>
          </div>
        </div>
      </div>
    </section>

    <div
      v-if="selectedPlan"
      class="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-title"
      @click.self="selectedPlan = null"
    >
      <div class="modal-card">
        <div class="modal-head">
          <h2 id="checkout-title">确认套餐</h2>
          <button class="icon-button" type="button" aria-label="关闭" @click="selectedPlan = null">
            <X aria-hidden="true" />
          </button>
        </div>
        <p>你选择了 {{ selectedPlan.name }}，提交后只会创建订单，请把订单号发给管理员处理。</p>
        <p v-if="orderMessage" class="form-message" aria-live="polite">
          <ShieldCheck aria-hidden="true" />
          {{ orderMessage }}
        </p>
        <div class="price-line">
          <span class="old-price">{{ selectedPlan.oldPrice }}</span>
          <span class="new-price">{{ selectedPlan.price }}</span>
          <span class="cycle">{{ selectedPlan.cycle }}</span>
        </div>
        <section v-if="createdOrder && createdOrder.status !== 'paid'" class="checkout-payment-panel" aria-label="订单付款信息">
          <div class="checkout-payment-qr">
            <img v-if="paymentImage" :src="paymentImage" alt="人民币支付二维码" />
            <QrCode v-else aria-hidden="true" />
          </div>
          <div class="checkout-payment-copy">
            <span>付款备注</span>
            <strong>{{ paymentRemark }}</strong>
            <button class="btn btn-soft" type="button" @click="copyPaymentRemark">
              <Copy aria-hidden="true" />
              复制订单号
            </button>
          </div>
          <dl class="checkout-order-lines">
            <div>
              <dt>订单金额</dt>
              <dd>{{ createdOrder.amountText || selectedPlan.price }}</dd>
            </div>
            <div>
              <dt>到账积分</dt>
              <dd>{{ createdOrder.credits }} 积分</dd>
            </div>
          </dl>
          <p>请把订单号发给管理员。管理员在后台将订单标记为已支付后，积分会自动到账。</p>
          <p v-if="copyMessage" class="form-message" aria-live="polite">
            <ShieldCheck aria-hidden="true" />
            {{ copyMessage }}
          </p>
          <button class="btn btn-soft" type="button" @click="openOrders">
            查看我的订单
          </button>
        </section>
        <button
          v-if="!createdOrder || createdOrder.status === 'paid'"
          class="btn btn-primary"
          type="button"
          :disabled="orderLoading"
          @click="submitOrder"
        >
          <ShieldCheck aria-hidden="true" />
          {{ orderLoading ? '创建中...' : '创建订单' }}
        </button>
      </div>
    </div>
  </main>
</template>
