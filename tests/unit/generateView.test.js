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
  const references = ref([])
  const resetGenerationOutput = vi.fn(() => {
    output.value = []
  })

  return {
    mode: ref('generate'),
    aspectRatio: ref('3:4'),
    resolution: ref('4K'),
    batchMode: ref(false),
    batchCount: ref(4),
    quality: ref('auto'),
    outputFormat: ref('png'),
    background: ref('auto'),
    moderation: ref('auto'),
    outputCompression: ref(0),
    prompt: ref(''),
    footerTipText: ref('提示'),
    getMaskReference: vi.fn(() => ''),
    getReferences: vi.fn(() => references.value),
    notice: ref(''),
    output,
    handoffOutputToTool: vi.fn(() => {
      references.value = ['/old-result.png']
      return true
    }),
    references,
    resetGenerationOutput,
    setReferenceUrls: vi.fn(),
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
        GenerateOutputGrid: {
          emits: ['use-as-tool'],
          template:
            '<aside data-test="output-grid"><button data-test="continue-upscale" @click="$emit(\'use-as-tool\', { toolKey: \'upscale\', image: { src: \'/old-result.png\' } })">续作</button></aside>',
        },
        GenerateSideRail: {
          emits: ['update:activeTool'],
          props: ['activeTool'],
          template: '<button data-test="side-upscale" @click="$emit(\'update:activeTool\', \'upscale\')">高清</button>',
        },
        GenerateToolboxNav: {
          emits: ['update:activeTool'],
          props: ['activeTool'],
          template:
            '<button data-test="toolbox-generate" @click="$emit(\'update:activeTool\', \'generate\')">创作</button>',
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

  it('切换到其他图片工具时保留当前结果区上下文', async () => {
    const wrapper = mountGenerateView()

    expect(mockState.task.output.value).toHaveLength(1)

    await wrapper.get('[data-test="side-upscale"]').trigger('click')

    expect(mockState.task.resetGenerationOutput).not.toHaveBeenCalled()
    expect(mockState.task.output.value).toHaveLength(1)
    expect(wrapper.get('[data-test="dedicated-tools"]').text()).toBe('upscale')
  })

  it('进入独立工具时临时关闭批量状态，回到 AI 生图后恢复原张数', async () => {
    mockState.task.batchMode.value = true
    mockState.task.batchCount.value = 4
    const wrapper = mountGenerateView()

    await wrapper.get('[data-test="side-upscale"]').trigger('click')

    expect(mockState.task.batchMode.value).toBe(false)

    await wrapper.get('[data-test="toolbox-generate"]').trigger('click')

    expect(mockState.task.batchMode.value).toBe(true)
    expect(mockState.task.batchCount.value).toBe(4)
  })

  it('重复选择当前板块不会清空结果', async () => {
    const wrapper = mountGenerateView()

    await wrapper.get('[data-test="toolbox-generate"]').trigger('click')

    expect(mockState.task.resetGenerationOutput).not.toHaveBeenCalled()
    expect(mockState.task.output.value).toHaveLength(1)
  })

  it('从结果图进入续作工具时保留当前结果上下文', async () => {
    const wrapper = mountGenerateView()

    await wrapper.get('[data-test="continue-upscale"]').trigger('click')

    expect(mockState.task.handoffOutputToTool).toHaveBeenCalledWith('upscale', { src: '/old-result.png' })
    expect(mockState.task.resetGenerationOutput).not.toHaveBeenCalled()
    expect(mockState.task.output.value).toHaveLength(1)
    expect(wrapper.get('[data-test="dedicated-tools"]').text()).toBe('upscale')
  })

  it('从生成结果继续处理时不会把续作源图写入创作草稿', async () => {
    mockState.task.references.value = ['/original-reference.png']
    const wrapper = mountGenerateView()

    await wrapper.get('[data-test="continue-upscale"]').trigger('click')
    await wrapper.get('[data-test="toolbox-generate"]').trigger('click')

    expect(mockState.task.setReferenceUrls).toHaveBeenLastCalledWith(['/original-reference.png'], {
      maskUrl: '',
      silent: true,
    })
  })
})
