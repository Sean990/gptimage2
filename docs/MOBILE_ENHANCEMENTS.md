# 移动端体验增强使用指南

本文档介绍如何使用新增的移动端体验增强功能。

## 1. 触觉反馈 (Haptic Feedback)

### 基础使用

```vue
<script setup>
import { useHaptic } from '@/utils/haptic'

const { hapticLight, hapticSuccess, hapticError } = useHaptic()

function handleButtonClick() {
  hapticLight() // 轻触反馈
  // 执行操作
}

function handleSuccess() {
  hapticSuccess() // 成功反馈
  // 显示成功提示
}

function handleError() {
  hapticError() // 错误反馈
  // 显示错误提示
}
</script>

<template>
  <button @click="handleButtonClick">点击按钮</button>
</template>
```

### 反馈类型

- `hapticLight()` - 轻触反馈，用于按钮点击、选项切换
- `hapticMedium()` - 中等反馈，用于重要操作
- `hapticHeavy()` - 重度反馈，用于警告
- `hapticSuccess()` - 成功反馈，用于操作成功
- `hapticWarning()` - 警告反馈，用于需要注意的操作
- `hapticError()` - 错误反馈，用于操作失败
- `hapticSelection()` - 选择反馈，用于滑动选择

## 2. 下拉刷新 (Pull to Refresh)

### 基础使用

```vue
<script setup>
import { ref } from 'vue'
import { useAutoPullToRefresh } from '@/composables/usePullToRefresh'
import PullToRefreshIndicator from '@/components/PullToRefreshIndicator.vue'

const containerRef = ref(null)

async function handleRefresh() {
  // 执行刷新逻辑
  await fetchData()
}

const pullToRefresh = useAutoPullToRefresh(containerRef, {
  onRefresh: handleRefresh,
  threshold: 80, // 触发刷新的距离
  maxDistance: 120, // 最大拉动距离
})
</script>

<template>
  <div ref="containerRef" class="scrollable-container">
    <PullToRefreshIndicator
      :is-pulling="pullToRefresh.isPulling.value"
      :is-refreshing="pullToRefresh.isRefreshing.value"
      :pull-distance="pullToRefresh.pullDistance.value"
      :can-refresh="pullToRefresh.canRefresh.value"
    />
    
    <!-- 内容 -->
    <div class="content">
      <!-- ... -->
    </div>
  </div>
</template>
```

### 手动控制

```vue
<script setup>
import { ref, onMounted } from 'vue'
import { usePullToRefresh } from '@/composables/usePullToRefresh'

const containerRef = ref(null)

const pullToRefresh = usePullToRefresh({
  onRefresh: async () => {
    await fetchData()
  },
})

onMounted(() => {
  if (containerRef.value) {
    pullToRefresh.setup(containerRef.value)
  }
})
</script>
```

## 3. 骨架屏加载 (Skeleton Loader)

### 基础使用

```vue
<script setup>
import { ref } from 'vue'
import SkeletonLoader from '@/components/SkeletonLoader.vue'
import { useSkeletonLoader } from '@/composables/useSkeletonLoader'

const { isLoading, withLoading } = useSkeletonLoader({
  initialLoading: true,
  minLoadingTime: 300, // 最小加载时间，避免闪烁
})

async function loadData() {
  await withLoading(async () => {
    // 加载数据
    await fetchData()
  })
}
</script>

<template>
  <div>
    <SkeletonLoader v-if="isLoading" variant="card" :count="3" />
    <div v-else class="content">
      <!-- 实际内容 -->
    </div>
  </div>
</template>
```

### 骨架屏变体

```vue
<template>
  <!-- 卡片骨架屏 -->
  <SkeletonLoader variant="card" :count="3" />
  
  <!-- 列表骨架屏 -->
  <SkeletonLoader variant="list" :count="5" />
  
  <!-- 图片骨架屏 -->
  <SkeletonLoader variant="image" />
  
  <!-- 图库骨架屏 -->
  <SkeletonLoader variant="gallery" />
  
  <!-- 文本骨架屏 -->
  <SkeletonLoader variant="text" :count="3" />
  
  <!-- 头像骨架屏 -->
  <SkeletonLoader variant="avatar" />
  
  <!-- 按钮骨架屏 -->
  <SkeletonLoader variant="button" />
  
  <!-- 禁用动画 -->
  <SkeletonLoader variant="card" :animated="false" />
</template>
```

## 4. 完整示例

### 移动端图库页面

```vue
<script setup>
import { ref, onMounted } from 'vue'
import { useHaptic } from '@/utils/haptic'
import { useAutoPullToRefresh } from '@/composables/usePullToRefresh'
import { useSkeletonLoader } from '@/composables/useSkeletonLoader'
import PullToRefreshIndicator from '@/components/PullToRefreshIndicator.vue'
import SkeletonLoader from '@/components/SkeletonLoader.vue'

const containerRef = ref(null)
const images = ref([])

const { hapticLight, hapticSuccess } = useHaptic()
const { isLoading, withLoading } = useSkeletonLoader()

async function fetchImages() {
  await withLoading(async () => {
    // 模拟 API 调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    images.value = [/* ... */]
  })
}

async function handleRefresh() {
  await fetchImages()
  hapticSuccess()
}

const pullToRefresh = useAutoPullToRefresh(containerRef, {
  onRefresh: handleRefresh,
})

function handleImageClick(image) {
  hapticLight()
  // 打开图片预览
}

onMounted(() => {
  fetchImages()
})
</script>

<template>
  <div ref="containerRef" class="gallery-container">
    <PullToRefreshIndicator
      :is-pulling="pullToRefresh.isPulling.value"
      :is-refreshing="pullToRefresh.isRefreshing.value"
      :pull-distance="pullToRefresh.pullDistance.value"
      :can-refresh="pullToRefresh.canRefresh.value"
    />
    
    <SkeletonLoader v-if="isLoading" variant="gallery" :count="2" />
    
    <div v-else class="gallery-grid">
      <div
        v-for="image in images"
        :key="image.id"
        class="gallery-item"
        @click="handleImageClick(image)"
      >
        <img :src="image.url" :alt="image.title" />
      </div>
    </div>
  </div>
</template>
```

## 5. 最佳实践

### 触觉反馈
- 不要过度使用，避免用户疲劳
- 为重要操作提供反馈
- 尊重用户的系统设置（某些用户可能禁用震动）

### 下拉刷新
- 只在列表/内容页面使用
- 确保刷新逻辑快速响应
- 提供清晰的视觉反馈

### 骨架屏
- 设置合理的最小加载时间，避免闪烁
- 骨架屏布局应与实际内容相似
- 支持无障碍访问（aria-label）

## 6. 浏览器兼容性

- **触觉反馈**: 支持大部分现代移动浏览器，iOS Safari 和 Android Chrome
- **下拉刷新**: 支持所有支持触摸事件的浏览器
- **骨架屏**: 支持所有现代浏览器

## 7. 性能考虑

- 触觉反馈是轻量级操作，性能影响可忽略
- 下拉刷新使用 passive 事件监听器，不影响滚动性能
- 骨架屏使用 CSS 动画，GPU 加速，性能优秀
- 支持 `prefers-reduced-motion`，尊重用户的动画偏好
