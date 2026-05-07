<script setup>
import { computed, onMounted, watch } from 'vue'
import { useSiteStore } from '../services/siteStore'

const props = defineProps({
  type: { type: String, required: true },
})

const { siteData, loadSiteData } = useSiteStore()
const page = computed(() => siteData.value.legalSections[props.type] || siteData.value.legalSections.privacy)

watch(() => props.type, loadSiteData)
onMounted(loadSiteData)
</script>

<template>
  <main class="page">
    <section class="section-tight">
      <div class="container legal-page">
        <article class="card legal-card">
          <h1>{{ page.title }}</h1>
          <p class="legal-date">{{ page.date }}</p>
          <section v-for="[title, body] in page.sections" :key="title">
            <h2>{{ title }}</h2>
            <p>{{ body }}</p>
          </section>
        </article>
      </div>
    </section>
  </main>
</template>
