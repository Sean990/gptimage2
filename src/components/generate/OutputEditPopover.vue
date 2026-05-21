<script setup>
import { Loader2, WandSparkles } from 'lucide-vue-next'

defineProps({
  item: {
    type: Object,
    required: true,
  },
  index: {
    type: Number,
    required: true,
  },
  editPrompt: {
    type: String,
    default: '',
  },
  editSelection: {
    type: Object,
    default: null,
  },
  isOutputActionBusy: {
    type: Function,
    required: true,
  },
  floatingPanelStyle: {
    type: Object,
    default: () => ({}),
  },
})

defineEmits(['update:edit-prompt', 'clear-selection', 'submit'])
</script>

<template>
  <form class="output-edit-popover" :style="floatingPanelStyle" @submit.prevent="$emit('submit', item, index)">
    <div>
      <strong>局部改图</strong>
      <button v-if="editSelection" class="text-button" type="button" @click="$emit('clear-selection', item, index)">
        取消选区
      </button>
      <span v-else>拖动图片框选修改区域</span>
    </div>
    <textarea
      rows="2"
      :value="editPrompt"
      placeholder="例如：把这里换成金属质感按钮，保持周围光影"
      @input="$emit('update:edit-prompt', $event.target.value)"
    ></textarea>
    <button class="btn btn-primary" type="submit" :disabled="isOutputActionBusy(item, index, 'region-edit')">
      <WandSparkles v-if="!isOutputActionBusy(item, index, 'region-edit')" aria-hidden="true" />
      <Loader2 v-else class="spinner" aria-hidden="true" />
      修改
    </button>
  </form>
</template>
