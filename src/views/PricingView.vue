<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { CreditCard, ShieldCheck, Sparkles, Tag } from 'lucide-vue-next'
import FeatureCard from '../components/FeatureCard.vue'
import PricingCards from '../components/PricingCards.vue'
import SectionTitle from '../components/SectionTitle.vue'
import { useSiteStore } from '../services/siteStore'
import '../assets/pricing.css'

const { siteData, loadSiteData } = useSiteStore()
const router = useRouter()
const activeMode = ref('credits')
const pricingModes = computed(() => siteData.value.pricingModes)
const billingEnabled = computed(() => Boolean(siteData.value.billingEnabled))
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
  if (!billingEnabled.value) return
  if (plan.buyUrl) {
    window.open(plan.buyUrl, '_blank', 'noopener')
    return
  }
  router.push('/my-orders')
}

onMounted(() => {
  loadSiteData()
})
</script>

<template>
  <main class="page pricing-hero">
    <section class="section-tight">
      <div class="container">
        <article v-fade-up class="card sale-banner">
          <Tag aria-hidden="true" />
          <h2>{{ billingEnabled ? '高效创作积分方案' : '积分说明' }}</h2>
          <p>
            {{
              billingEnabled
                ? '新人注册赠送 30 积分，邀请好友可叠加奖励；常规套餐低至约 0.05 元一张。'
                : '积分方案暂未开放。你仍可查看积分消耗规则，后台开启后会恢复定价与订单入口。'
            }}
          </p>
        </article>

        <SectionTitle
          :title="billingEnabled ? 'ImgsGen 积分方案' : 'ImgsGen 积分说明'"
          :description="
            billingEnabled
              ? '按预计使用量选择积分包。标准文生图按 1 积分约等于 1 张计算，生成失败不扣积分。'
              : '当前仅展示积分消耗说明，不提供在线下单或支付入口。'
          "
        />

        <div v-if="billingEnabled" class="segmented" role="tablist" aria-label="积分方案模式">
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
          v-if="billingEnabled"
          :id="`pricing-panel-${activeMode}`"
          role="tabpanel"
          :aria-labelledby="`pricing-tab-${activeMode}`"
          v-fade-up="{ delay: 100 }"
        >
          <PricingCards :plans="plans" button-text="前往购买" @select="selectPlan" />
        </div>

        <div v-if="billingEnabled" class="redeem-hint" v-fade-up="{ delay: 150 }">
          <p>购买后会收到卡密兑换码，请前往 <router-link to="/my-orders">我的订单</router-link> 页面输入兑换码领取积分。</p>
        </div>

        <div v-if="!billingEnabled" class="section-tight">
          <FeatureCard
            v-fade-up
            title="积分方案暂未开放"
            description="当前站点隐藏定价、订单和支付入口。需要开放时，可在后台“积分配置”中开启 billingEnabled。"
          >
            <template #icon>
              <ShieldCheck aria-hidden="true" />
            </template>
          </FeatureCard>
        </div>

        <div v-if="billingEnabled" class="section-tight">
          <div class="grid-3">
            <FeatureCard
              v-fade-up
              title="新人先试，复购更划算"
              description="注册赠送 30 积分，新人首单 4.9 元起；高频使用可选 39.9、99.9 或 199 元套餐。"
            >
              <template #icon>
                <Sparkles aria-hidden="true" />
              </template>
            </FeatureCard>
            <FeatureCard
              v-fade-up="{ delay: 100 }"
              title="商用前完成检查"
              description="套餐适合商业视觉草稿、广告素材探索和团队协作，发布前仍需确认素材授权、广告合规和 AI 标识。"
            >
              <template #icon>
                <ShieldCheck aria-hidden="true" />
              </template>
            </FeatureCard>
            <FeatureCard
              v-fade-up="{ delay: 200 }"
              title="邀请阶梯奖励"
              description="好友完成首次生成双方各得 10 积分；好友首充满 19.9 元或 69.9 元时继续追加奖励。"
            >
              <template #icon>
                <CreditCard aria-hidden="true" />
              </template>
            </FeatureCard>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>
