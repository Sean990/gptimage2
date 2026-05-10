<script setup>
import { computed, onMounted, watch } from 'vue'
import { FileCheck2 } from 'lucide-vue-next'
import { useSiteStore } from '../services/siteStore'

const props = defineProps({
  type: { type: String, required: true },
})

const { siteData, loadSiteData } = useSiteStore()
const page = computed(() => siteData.value.legalSections[props.type] || siteData.value.legalSections.privacy)
const billingEnabled = computed(() => Boolean(siteData.value.billingEnabled))
const visibleSections = computed(() => {
  const sections = page.value.sections || []
  if (props.type !== 'terms' || billingEnabled.value) return sections
  return sections.filter(([title]) => !['价格与支付', '积分与支付'].includes(title))
})

watch(() => props.type, loadSiteData)
onMounted(loadSiteData)
</script>

<template>
  <main class="page">
    <section class="section-tight">
      <div class="container legal-page">
        <article class="card legal-card">
          <FileCheck2 aria-hidden="true" />
          <h1>{{ page.title }}</h1>
          <p class="legal-date">{{ page.date }}</p>
          <section v-for="[title, body] in visibleSections" :key="title">
            <h2>{{ title }}</h2>
            <p>{{ body }}</p>
          </section>
        </article>
      </div>
    </section>
  </main>
</template>
