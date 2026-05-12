<script setup>
import { ArrowRight, CheckCircle2, Flame } from 'lucide-vue-next'
import { useSiteStore } from '../services/siteStore'

const { siteData } = useSiteStore()

defineProps({
  plans: { type: Array, required: true },
  buttonText: { type: String, default: '' },
})

const emit = defineEmits(['select'])

function isFeatureGroup(feature) {
  return feature === '包含功能' || feature.includes('所有功能')
}

function formatCredits(credits) {
  const value = Number(credits || 0)
  if (!Number.isFinite(value) || value <= 0) return ''
  return new Intl.NumberFormat('zh-CN').format(value)
}
</script>

<template>
  <div class="grid-3">
    <article
      v-for="plan in plans"
      :key="plan.name"
      class="card price-card"
      :class="{ featured: plan.badge }"
    >
      <div class="plan-head">
        <h3>{{ plan.name }}</h3>
        <span v-if="plan.badge" class="badge">
          <Flame aria-hidden="true" />
          {{ plan.badge }}
        </span>
      </div>
      <div class="price-line">
        <span class="old-price">{{ plan.oldPrice }}</span>
        <span class="new-price">{{ plan.price }}</span>
        <span class="cycle">{{ plan.cycle }}</span>
      </div>
      <p class="note">{{ plan.note }}</p>
      <div v-if="formatCredits(plan.credits)" class="plan-credit-line">
        <strong>{{ formatCredits(plan.credits) }}</strong>
        <span>可用积分</span>
      </div>
      <ul class="plan-features">
        <li v-for="feature in plan.features" :key="feature" :class="{ 'feature-group': isFeatureGroup(feature) }">
          <CheckCircle2 v-if="!isFeatureGroup(feature)" aria-hidden="true" />
          <span>{{ feature }}</span>
        </li>
      </ul>
      <div class="pay-row">
        <span>人民币支付</span>
        <ArrowRight aria-hidden="true" />
        <span class="pay-logo">
          <img :src="siteData.assets.cnpay" alt="人民币支付" />
        </span>
      </div>
      <button class="btn btn-primary" type="button" @click="emit('select', plan)">
        {{ buttonText || plan.cta }}
        <ArrowRight aria-hidden="true" />
      </button>
      <div class="unit-note">{{ plan.unit }}</div>
    </article>
  </div>
</template>
