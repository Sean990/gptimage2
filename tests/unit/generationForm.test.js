import { describe, expect, it } from 'vitest'
import { nextTick, reactive } from 'vue'
import { useGenerationForm } from '../../src/composables/useGenerationForm'

describe('useGenerationForm', () => {
  it('同步带 prompt 的路由 query，同时保留用户正在编辑的草稿', async () => {
    const route = reactive({ query: { prompt: '第一版提示词' } })
    const form = useGenerationForm({ route })

    expect(form.prompt.value).toBe('第一版提示词')

    route.query = { prompt: '第二版提示词' }
    await nextTick()

    expect(form.prompt.value).toBe('第二版提示词')

    form.prompt.value = '用户正在编辑的提示词'
    route.query = {}
    await nextTick()

    expect(form.prompt.value).toBe('用户正在编辑的提示词')
  })
})
