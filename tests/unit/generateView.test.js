import { shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import GenerateView from '../../src/views/GenerateView.vue'

const mockState = vi.hoisted(() => ({
  task: null,
}))

vi.mock('../../src/composables/useGenerationTask', () => ({
  useGenerationTask: () => mockState.task,
}))

function createTask() {
  const output = ref([{ src: '/old-result.png', title: '旧结果' }])
  const resetGenerationOutput = vi.fn(() => {
    output.value = []
  })

  return {
    batchMode: ref(false),
    footerTipText: ref('提示'),
    notice: ref(''),
    output,
    resetGenerationOutput,
  }
}

function mountGenerateView() {
  return shallowMount(GenerateView, {
    global: {
      directives: {
        fadeUp: {},
      },
      stubs: {
        DedicatedImageTools: {
          props: ['activeToolKey'],
          template: '<section data-test="dedicated-tools">{{ activeToolKey }}</section>',
        },
        GalleryDrawer: { template: '<div />' },
        GenerateMobileShell: { template: '<div />' },
        GenerateOutputGrid: { template: '<aside data-test="output-grid" />' },
        GenerateSideRail: {
          emits: ['update:activeTool'],
          props: ['activeTool'],
          template: '<button data-test="side-upscale" @click="$emit(\'update:activeTool\', \'upscale\')">高清</button>',
        },
        GenerateToolboxNav: {
          emits: ['update:activeTool'],
          props: ['activeTool'],
          template: '<button data-test="toolbox-generate" @click="$emit(\'update:activeTool\', \'generate\')">创作</button>',
        },
        GenerateToolPanel: { template: '<section data-test="generate-panel" />' },
        ImagePreviewModal: { template: '<div />' },
        Toast: { template: '<div />' },
      },
    },
  })
}

describe('GenerateView', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn(() => ({
      addEventListener: vi.fn(),
      matches: false,
      removeEventListener: vi.fn(),
    }))
    mockState.task = createTask()
  })

  it('切换到其他图片工具时会重置结果区域', async () => {
    const wrapper = mountGenerateView()

    expect(mockState.task.output.value).toHaveLength(1)

    await wrapper.get('[data-test="side-upscale"]').trigger('click')

    expect(mockState.task.resetGenerationOutput).toHaveBeenCalledTimes(1)
    expect(mockState.task.output.value).toEqual([])
    expect(wrapper.get('[data-test="dedicated-tools"]').text()).toBe('upscale')
  })

  it('重复选择当前板块不会清空结果', async () => {
    const wrapper = mountGenerateView()

    await wrapper.get('[data-test="toolbox-generate"]').trigger('click')

    expect(mockState.task.resetGenerationOutput).not.toHaveBeenCalled()
    expect(mockState.task.output.value).toHaveLength(1)
  })
})
