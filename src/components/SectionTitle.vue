<script setup>
defineProps({
  eyebrow: { type: String, default: '' },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  level: { type: String, default: 'h2' },
  align: { type: String, default: 'center' },
})
</script>

<template>
  <div class="section-title" :class="{ 'align-left': align === 'left' }">
    <span v-if="eyebrow" class="eyebrow">{{ eyebrow }}</span>
    <component :is="level">{{ title }}</component>
    <p v-if="description">{{ description }}</p>
  </div>
</template>
