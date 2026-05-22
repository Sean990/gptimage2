import { shallowMount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import DedicatedImageTools from '../../src/components/generate/DedicatedImageTools.vue'

function createTask(overrides = {}) {
  return {
    addUrlReference: vi.fn(),
    aspectRatio: ref('9:16'),
    background: ref('opaque'),
    batchMode: ref(true),
    clearReferences: vi.fn(),
    closeSelectMenu: vi.fn(),
    creditCost: ref(24),
    generate: vi.fn().mockResolvedValue(),
    getReferencePreviewImages: vi.fn(() => []),
    loading: ref(false),
    mode: ref('generate'),
    openImagePreview: vi.fn(),
    outputFormat: ref('webp'),
    processReferenceFiles: vi.fn().mockResolvedValue(),
    prompt: ref('上一轮生图提示词'),
    quality: ref('auto'),
    referenceCount: ref(0),
    resolution: ref('1K'),
    showNotice: vi.fn(),
    urlInput: ref(''),
    ...overrides,
  }
}

function mountDedicatedImageTools(task, activeToolKey = 'upscale') {
  return shallowMount(DedicatedImageTools, {
    props: {
      activeToolKey,
      task,
    },
    global: {
      stubs: {
        FloatingActionBar: {
          template: '<div><slot /></div>',
        },
      },
    },
  })
}

describe('DedicatedImageTools', () => {
  it('进入独立工具时不会继承上一轮生图数量和参数', () => {
    const task = createTask()

    mountDedicatedImageTools(task, 'upscale')

    expect(task.batchMode.value).toBe(false)
    expect(task.mode.value).toBe('image')
    expect(task.aspectRatio.value).toBe('auto')
    expect(task.resolution.value).toBe('4K')
    expect(task.outputFormat.value).toBe('png')
    expect(task.background.value).toBe('auto')
    expect(task.quality.value).toBe('high')
    expect(task.prompt.value).not.toBe('上一轮生图提示词')
    expect(task.closeSelectMenu).toHaveBeenCalled()
  })

  it('独立工具提交时固定为单图任务', async () => {
    const task = createTask({
      referenceCount: ref(1),
    })
    const wrapper = mountDedicatedImageTools(task, 'upscale')

    await wrapper.get('input[type="url"]').setValue('https://example.com/source.png')
    await wrapper.get('.image-tool-url-row .icon-button').trigger('click')
    await wrapper.get('.image-tool-submit').trigger('click')

    expect(task.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'upscale',
        n: 1,
        tool: 'upscale',
      }),
    )
  })
})
