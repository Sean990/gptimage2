<script setup>
import { ArrowRight, CheckCircle2 } from 'lucide-vue-next'
import { useSiteStore } from '../services/siteStore'

const { siteData } = useSiteStore()

defineProps({
  plans: { type: Array, required: true },
})

const emit = defineEmits(['select'])

function isFeatureGroup(feature) {
  return feature === '包含功能' || feature.includes('所有功能')
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
      <span v-if="plan.badge" class="badge">{{ plan.badge }}</span>
      <h3>{{ plan.name }}</h3>
      <div class="price-line">
        <span class="old-price">{{ plan.oldPrice }}</span>
        <span class="new-price">{{ plan.price }}</span>
        <span class="cycle">{{ plan.cycle }}</span>
      </div>
      <p class="note">{{ plan.note }}</p>
      <ul class="plan-features">
        <li v-for="feature in plan.features" :key="feature" :class="{ 'feature-group': isFeatureGroup(feature) }">
          <CheckCircle2 v-if="!isFeatureGroup(feature)" aria-hidden="true" />
          <span>{{ feature }}</span>
        </li>
      </ul>
      <div class="pay-row">
        <span>人民币支付</span>
        <ArrowRight aria-hidden="true" />
        <img :src="siteData.assets.cnpay" alt="人民币支付" />
      </div>
      <button class="btn btn-primary" type="button" @click="emit('select', plan)">
        {{ plan.cta }}
      </button>
      <div class="unit-note">{{ plan.unit }}</div>
    </article>
  </div>
</template>
