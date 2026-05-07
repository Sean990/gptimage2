<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <main class="page not-found">
    <div class="container">
      <span class="eyebrow">404</span>
      <h1>页面未找到</h1>
      <p>这个路由不在 GPT Image 2 站点中。</p>
      <RouterLink class="btn btn-primary" to="/">返回首页</RouterLink>
    </div>
  </main>
</template>
