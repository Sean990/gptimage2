<script setup>
import { Loader2, RefreshCw } from 'lucide-vue-next'

defineProps({
  isPulling: {
    type: Boolean,
    default: false,
  },
  isRefreshing: {
    type: Boolean,
    default: false,
  },
  pullDistance: {
    type: Number,
    default: 0,
  },
  canRefresh: {
    type: Boolean,
    default: false,
  },
  threshold: {
    type: Number,
    default: 80,
  },
})
</script>

<template>
  <div
    class="pull-to-refresh-indicator"
    :class="{
      'pull-to-refresh-indicator--active': isPulling,
      'pull-to-refresh-indicator--refreshing': isRefreshing,
      'pull-to-refresh-indicator--ready': canRefresh,
    }"
    :style="{ transform: `translateY(${pullDistance}px)` }"
  >
    <div class="pull-to-refresh-content">
      <Loader2 v-if="isRefreshing" class="pull-to-refresh-icon spinner" aria-hidden="true" />
      <RefreshCw v-else class="pull-to-refresh-icon" :class="{ 'icon-flip': canRefresh }" aria-hidden="true" />
      <span class="pull-to-refresh-text">
        {{ isRefreshing ? '刷新中...' : canRefresh ? '松开刷新' : '下拉刷新' }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.pull-to-refresh-indicator {
  position: absolute;
  top: -60px;
  left: 0;
  right: 0;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
  pointer-events: none;
  z-index: 100;
}

.pull-to-refresh-indicator--active {
  opacity: 1;
}

.pull-to-refresh-indicator--refreshing {
  opacity: 1;
  transform: translateY(80px) !important;
}

.pull-to-refresh-content {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.1);
  backdrop-filter: blur(8px);
}

.pull-to-refresh-icon {
  width: 20px;
  height: 20px;
  color: var(--primary);
  transition: transform 0.3s ease;
}

.pull-to-refresh-icon.icon-flip {
  transform: rotate(180deg);
}

.pull-to-refresh-text {
  font-size: 14px;
  font-weight: var(--fw-medium);
  color: var(--text);
}

:root[data-theme='dark'] .pull-to-refresh-content {
  background: rgba(15, 23, 42, 0.95);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
</style>
