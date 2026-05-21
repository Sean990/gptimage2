<script setup>
defineProps({
  variant: {
    type: String,
    default: 'card', // card, list, image, text, avatar, button
    validator: (value) => ['card', 'list', 'image', 'text', 'avatar', 'button', 'gallery'].includes(value),
  },
  count: {
    type: Number,
    default: 1,
  },
  animated: {
    type: Boolean,
    default: true,
  },
})
</script>

<template>
  <div class="skeleton-wrapper">
    <div
      v-for="index in count"
      :key="index"
      class="skeleton"
      :class="[`skeleton--${variant}`, { 'skeleton--animated': animated }]"
    >
      <!-- Card Skeleton -->
      <template v-if="variant === 'card'">
        <div class="skeleton-image"></div>
        <div class="skeleton-content">
          <div class="skeleton-title"></div>
          <div class="skeleton-text"></div>
          <div class="skeleton-text skeleton-text--short"></div>
        </div>
      </template>

      <!-- List Skeleton -->
      <template v-else-if="variant === 'list'">
        <div class="skeleton-avatar"></div>
        <div class="skeleton-content">
          <div class="skeleton-title"></div>
          <div class="skeleton-text"></div>
        </div>
      </template>

      <!-- Image Skeleton -->
      <template v-else-if="variant === 'image'">
        <div class="skeleton-image-full"></div>
      </template>

      <!-- Gallery Skeleton -->
      <template v-else-if="variant === 'gallery'">
        <div class="skeleton-gallery-grid">
          <div v-for="i in 4" :key="i" class="skeleton-gallery-item"></div>
        </div>
      </template>

      <!-- Text Skeleton -->
      <template v-else-if="variant === 'text'">
        <div class="skeleton-text"></div>
      </template>

      <!-- Avatar Skeleton -->
      <template v-else-if="variant === 'avatar'">
        <div class="skeleton-avatar"></div>
      </template>

      <!-- Button Skeleton -->
      <template v-else-if="variant === 'button'">
        <div class="skeleton-button"></div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.skeleton-wrapper {
  display: grid;
  gap: 16px;
}

.skeleton {
  display: flex;
  gap: 12px;
}

.skeleton--card {
  flex-direction: column;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 12px;
  background: var(--surface);
}

.skeleton--list {
  flex-direction: row;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  background: var(--surface);
}

.skeleton--image,
.skeleton--gallery,
.skeleton--text,
.skeleton--avatar,
.skeleton--button {
  flex-direction: column;
}

/* Base skeleton elements */
.skeleton-image,
.skeleton-image-full,
.skeleton-gallery-item,
.skeleton-title,
.skeleton-text,
.skeleton-avatar,
.skeleton-button {
  background: linear-gradient(90deg, var(--surface-soft) 0%, var(--surface-muted) 50%, var(--surface-soft) 100%);
  background-size: 200% 100%;
  border-radius: 8px;
}

.skeleton--animated .skeleton-image,
.skeleton--animated .skeleton-image-full,
.skeleton--animated .skeleton-gallery-item,
.skeleton--animated .skeleton-title,
.skeleton--animated .skeleton-text,
.skeleton--animated .skeleton-avatar,
.skeleton--animated .skeleton-button {
  animation: skeleton-loading 1.5s ease-in-out infinite;
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.skeleton-image {
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 8px;
}

.skeleton-image-full {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 12px;
}

.skeleton-gallery-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.skeleton-gallery-item {
  aspect-ratio: 1 / 1;
  border-radius: 8px;
}

.skeleton-content {
  display: grid;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.skeleton-title {
  height: 20px;
  width: 60%;
  border-radius: 4px;
}

.skeleton-text {
  height: 14px;
  width: 100%;
  border-radius: 4px;
}

.skeleton-text--short {
  width: 80%;
}

.skeleton-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  flex-shrink: 0;
}

.skeleton-button {
  height: 40px;
  width: 120px;
  border-radius: 8px;
}

/* Dark theme */
:root[data-theme='dark'] .skeleton-image,
:root[data-theme='dark'] .skeleton-image-full,
:root[data-theme='dark'] .skeleton-gallery-item,
:root[data-theme='dark'] .skeleton-title,
:root[data-theme='dark'] .skeleton-text,
:root[data-theme='dark'] .skeleton-avatar,
:root[data-theme='dark'] .skeleton-button {
  background: linear-gradient(
    90deg,
    rgba(30, 41, 59, 0.6) 0%,
    rgba(51, 65, 85, 0.6) 50%,
    rgba(30, 41, 59, 0.6) 100%
  );
  background-size: 200% 100%;
}

/* Responsive */
@media (max-width: 640px) {
  .skeleton-wrapper {
    gap: 12px;
  }

  .skeleton--card {
    padding: 10px;
  }

  .skeleton-gallery-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton--animated .skeleton-image,
  .skeleton--animated .skeleton-image-full,
  .skeleton--animated .skeleton-gallery-item,
  .skeleton--animated .skeleton-title,
  .skeleton--animated .skeleton-text,
  .skeleton--animated .skeleton-avatar,
  .skeleton--animated .skeleton-button {
    animation: none;
  }
}
</style>
