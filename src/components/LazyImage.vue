<script setup>
import { computed, ref, watch } from 'vue'
import { ImageOff } from 'lucide-vue-next'

defineOptions({
  inheritAttrs: false,
})

const props = defineProps({
  src: {
    type: String,
    default: '',
  },
  alt: {
    type: String,
    default: '',
  },
  imageClass: {
    type: [String, Array, Object],
    default: '',
  },
  imageStyle: {
    type: [String, Object, Array],
    default: null,
  },
  eager: {
    type: Boolean,
    default: false,
  },
  draggable: {
    type: [Boolean, String],
    default: undefined,
  },
})

const emit = defineEmits(['load', 'error'])

const loaded = ref(false)
const failed = ref(false)
const imageRef = ref(null)

const loadingMode = computed(() => (props.eager ? 'eager' : 'lazy'))

watch(
  () => props.src,
  () => {
    loaded.value = false
    failed.value = false
  },
)

function onLoad(event) {
  loaded.value = true
  failed.value = false
  emit('load', event)
}

function onError(event) {
  loaded.value = false
  failed.value = true
  emit('error', event)
}

defineExpose({
  imageRef,
  get naturalWidth() {
    return imageRef.value?.naturalWidth || 0
  },
  get naturalHeight() {
    return imageRef.value?.naturalHeight || 0
  },
})
</script>

<template>
  <span
    v-bind="$attrs"
    class="lazy-image-frame"
    :class="{
      'lazy-image-frame--loaded': loaded,
      'lazy-image-frame--error': failed,
    }"
  >
    <span class="lazy-image-skeleton" aria-hidden="true"></span>
    <img
      v-if="src"
      ref="imageRef"
      class="lazy-image"
      :class="imageClass"
      :src="src"
      :alt="alt"
      :style="imageStyle"
      :loading="loadingMode"
      decoding="async"
      :draggable="draggable"
      @load="onLoad"
      @error="onError"
    />
    <span v-if="failed" class="lazy-image-error" aria-hidden="true">
      <ImageOff />
    </span>
  </span>
</template>
