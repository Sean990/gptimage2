<script setup>
import { RouterLink } from 'vue-router'
import { ArrowLeft, SearchX } from 'lucide-vue-next'
import '../assets/legal.css'
</script>

<template>
  <main class="page not-found">
    <div class="container">
      <SearchX class="not-found-icon" aria-hidden="true" />
      <span class="eyebrow">404</span>
      <h1>页面未找到</h1>
      <p>这个页面不存在，或已经被移动。</p>
      <RouterLink class="btn btn-primary" to="/">
        <ArrowLeft aria-hidden="true" />
        返回首页
      </RouterLink>
    </div>
  </main>
</template>
