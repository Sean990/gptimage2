<script setup>
import { RouterLink } from 'vue-router'
import { ArrowLeft, SearchX } from 'lucide-vue-next'
</script>

<template>
  <main class="page not-found">
    <div class="container">
      <SearchX class="not-found-icon" aria-hidden="true" />
      <span class="eyebrow">404</span>
      <h1>页面未找到</h1>
      <p>这个路由不在 ImgsGen 站点中。</p>
      <RouterLink class="btn btn-primary" to="/">
        <ArrowLeft aria-hidden="true" />
        返回首页
      </RouterLink>
    </div>
  </main>
</template>
