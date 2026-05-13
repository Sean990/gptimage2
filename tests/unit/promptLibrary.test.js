import { describe, expect, it, vi } from 'vitest'
import {
  loadPromptCaseById,
  loadPromptCaseIndex,
  loadPromptLibrary,
  loadPromptLibraryMeta,
  loadRandomCasePrompt,
} from '../../src/services/promptLibrary'

describe('Prompt Library 懒加载服务', () => {
  it('可以加载轻量元数据和案例索引', async () => {
    const [meta, index] = await Promise.all([loadPromptLibraryMeta(), loadPromptCaseIndex()])

    expect(meta.manifest.counts.cases).toBeGreaterThan(0)
    expect(meta.templates.length).toBeGreaterThan(0)
    expect(index.length).toBe(meta.manifest.counts.cases)
    expect(index[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        chunk: expect.any(Number),
        promptPreview: expect.any(String),
        searchText: expect.any(String),
      }),
    )
    expect(index[0].prompt).toBeUndefined()
  })

  it('可以按 id 懒加载完整案例', async () => {
    const index = await loadPromptCaseIndex()
    const item = index[0]
    const fullCase = await loadPromptCaseById(item.id)

    expect(fullCase).toEqual(expect.objectContaining({ id: item.id, prompt: expect.any(String) }))
    expect(fullCase.prompt.length).toBeGreaterThan(item.promptPreview.length)
  })

  it('随机提示词只返回完整案例的 prompt', async () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    const index = await loadPromptCaseIndex()
    const firstCase = await loadPromptCaseById(index[0].id)

    await expect(loadRandomCasePrompt()).resolves.toBe(firstCase.prompt)
    randomSpy.mockRestore()
  })

  it('保留旧版完整加载接口', async () => {
    const library = await loadPromptLibrary()

    expect(library.cases.length).toBeGreaterThan(0)
    expect(library.cases[0].prompt).toEqual(expect.any(String))
  })
})
