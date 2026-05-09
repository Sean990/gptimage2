<script setup>
import { computed, onMounted, ref } from 'vue'
import { CreditCard, ShieldCheck, Sparkles, Tag, X } from 'lucide-vue-next'
import PricingCards from '../components/PricingCards.vue'
import SectionTitle from '../components/SectionTitle.vue'
import { api } from '../services/api'
import { useSiteStore } from '../services/siteStore'

const { siteData, loadSiteData } = useSiteStore()
const activeMode = ref('monthly')
const selectedPlan = ref(null)
const orderLoading = ref(false)
const orderMessage = ref('')
const pricingModes = computed(() => siteData.value.pricingModes)
const modes = computed(() => Object.entries(pricingModes.value).map(([key, value]) => ({ key, label: value.label })))
const plans = computed(() => pricingModes.value[activeMode.value]?.plans || [])

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
  orderMessage.value = ''
}

async function submitOrder() {
  if (!selectedPlan.value) return
  orderLoading.value = true
  orderMessage.value = ''

  try {
    const order = await api.createOrder({
      mode: activeMode.value,
      planName: selectedPlan.value.name,
    })
    orderMessage.value = `订单 ${order.id} 已创建`
  } catch (error) {
    orderMessage.value = error.message || '订单创建失败，请稍后重试'
  } finally {
    orderLoading.value = false
  }
}

onMounted(loadSiteData)
</script>

<template>
  <main class="page pricing-hero">
    <section class="section-tight">
      <div class="container">
        <article class="card sale-banner">
          <Tag aria-hidden="true" />
          <h2>创作者优惠 · 演示套餐</h2>
          <p>复刻版展示积分包、月付和年付三种购买路径，便于对比不同创作频率下的成本。</p>
        </article>

        <SectionTitle
          title="GPT Image 2 定价"
          description="选择适合你创作频率的积分包、月付订阅或年付订阅。"
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
              <p>轻量体验选积分包，稳定内容生产选月付，团队长期项目选年付。</p>
            </article>
            <article class="card feature-card">
              <ShieldCheck aria-hidden="true" />
              <h3>商业使用授权</h3>
              <p>高级套餐覆盖商业视觉交付、广告素材探索和团队协作场景。</p>
            </article>
            <article class="card feature-card">
              <CreditCard aria-hidden="true" />
              <h3>人民币支付</h3>
              <p>保留原站人民币支付入口形态，复刻版使用演示订单弹窗。</p>
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
        <p>你选择了 {{ selectedPlan.name }}，复刻版不会发起真实支付。</p>
        <p v-if="orderMessage" class="form-message" aria-live="polite">
          <ShieldCheck aria-hidden="true" />
          {{ orderMessage }}
        </p>
        <div class="price-line">
          <span class="old-price">{{ selectedPlan.oldPrice }}</span>
          <span class="new-price">{{ selectedPlan.price }}</span>
          <span class="cycle">{{ selectedPlan.cycle }}</span>
        </div>
        <button class="btn btn-primary" type="button" :disabled="orderLoading" @click="submitOrder">
          <ShieldCheck aria-hidden="true" />
          {{ orderLoading ? '创建中...' : '完成演示订单' }}
        </button>
      </div>
    </div>
  </main>
</template>
