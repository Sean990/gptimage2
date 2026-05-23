<script setup>
import { computed } from 'vue'
import { AlertCircle, Loader2 } from 'lucide-vue-next'

const props = defineProps({
  error: {
    type: [Error, Object],
    default: null,
  },
})

const isError = computed(() => Boolean(props.error))
</script>

<template>
  <div
    class="async-block-fallback"
    :class="{ 'async-block-fallback--error': isError }"
    role="status"
    aria-live="polite"
  >
    <AlertCircle v-if="isError" aria-hidden="true" />
    <Loader2 v-else class="spinner" aria-hidden="true" />
    <span>{{ isError ? '模块加载失败，请刷新页面重试' : '正在加载工作台模块' }}</span>
  </div>
</template>
