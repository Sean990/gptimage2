let libraryPromise = null
let activeLibrary = null
let labelMaps = {
  categories: {},
  styles: {},
  scenes: {},
}

export async function loadPromptLibrary() {
  if (activeLibrary) return activeLibrary
  if (!libraryPromise) {
    libraryPromise = Promise.all([
      import('../data/prompt-library/cases.json'),
      import('../data/prompt-library/manifest.json'),
      import('../data/prompt-library/taxonomy.json'),
      import('../data/prompt-library/templates.json'),
    ]).then(([casesModule, manifestModule, taxonomyModule, templatesModule]) => {
      const promptTaxonomy = taxonomyModule.default
      labelMaps = {
        categories: buildLabelMap(promptTaxonomy.categories),
        styles: buildLabelMap(promptTaxonomy.styles),
        scenes: buildLabelMap(promptTaxonomy.scenes),
      }

      activeLibrary = {
        manifest: manifestModule.default,
        cases: casesModule.default.cases,
        templates: templatesModule.default.templates,
        taxonomy: promptTaxonomy,
      }

      return activeLibrary
    })
  }

  return libraryPromise
}

export function localizePromptLabel(value, group = 'categories', language = 'zh') {
  if (!value) return ''
  const map = labelMaps[group] || {}
  const item = map[value]
  return item?.title?.[language] || item?.title?.zh || item?.title?.en || value
}

export function localizeTagLabel(value, language = 'zh') {
  const tagLabel = activeLibrary?.taxonomy?.tagLabels?.[value]
  if (tagLabel) return tagLabel[language] || tagLabel.zh || tagLabel.en || value

  const styleItem = labelMaps.styles[value]
  if (styleItem) return styleItem.title?.[language] || styleItem.title?.zh || styleItem.title?.en || value

  const sceneItem = labelMaps.scenes[value]
  if (sceneItem) return sceneItem.title?.[language] || sceneItem.title?.zh || sceneItem.title?.en || value

  return value
}

export function getCaseByUpstreamId(upstreamId) {
  return activeLibrary?.cases?.find((item) => Number(item.upstreamId) === Number(upstreamId))
}

export function formatTemplatePrompt(template, language = 'zh') {
  const title = template.title?.[language] || template.title?.zh || template.title?.en || template.upstreamId
  const description = template.description?.[language] || template.description?.zh || template.description?.en || ''
  const useWhen = template.useWhen?.[language] || template.useWhen?.zh || template.useWhen?.en || description
  const guidance = template.guidance?.[language] || []
  const pitfalls = template.pitfalls?.[language] || []
  const tags = [
    localizePromptLabel(template.category, 'categories', language),
    ...(template.styles || []).map((item) => localizePromptLabel(item, 'styles', language)),
    ...(template.scenes || []).map((item) => localizePromptLabel(item, 'scenes', language)),
    ...(template.tags || []).map((item) => localizeTagLabel(item, language)),
  ].filter(Boolean)

  if (language === 'zh') {
    return [
      `模板：${title}`,
      `用途：${useWhen}`,
      `视觉方向：${[...new Set(tags)].join(' / ')}`,
      '',
      '请基于以下结构生成一条可直接用于 GPT Image 2 的图片 Prompt：',
      '- 主体：[要生成的产品、人物、空间、界面或信息主题]',
      '- 场景：[使用环境、叙事背景、受众语境]',
      '- 构图：[画面比例、镜头距离、主体位置、层级关系]',
      '- 风格：[材质、光线、色彩、时代感、品牌气质]',
      '- 文本：[必须准确显示的标题、标签、按钮或说明文字]',
      '- 细节：[关键装饰、辅助元素、信息标注、交互层]',
      '- 输出：[清晰度、比例、完成度、可读性要求]',
      '',
      '核心约束：',
      ...guidance.map((item) => `- ${item}`),
      '',
      '需要避免：',
      ...pitfalls.map((item) => `- ${item}`),
    ].join('\n')
  }

  return [
    `Template: ${title}`,
    `Use case: ${useWhen}`,
    `Visual direction: ${[...new Set(tags)].join(' / ')}`,
    '',
    'Create a copy-ready GPT Image 2 prompt with this structure:',
    '- Subject: [product, person, space, interface, or information topic]',
    '- Scene: [context, audience, narrative setting]',
    '- Composition: [aspect ratio, camera distance, focal hierarchy, placement]',
    '- Style: [material, lighting, color, era, brand tone]',
    '- Text: [exact title, labels, buttons, or annotations that must be readable]',
    '- Details: [decorative elements, callouts, UI layers, supporting objects]',
    '- Output: [resolution, aspect ratio, polish level, readability requirements]',
    '',
    'Core constraints:',
    ...guidance.map((item) => `- ${item}`),
    '',
    'Avoid:',
    ...pitfalls.map((item) => `- ${item}`),
  ].join('\n')
}

function buildLabelMap(items = []) {
  return Object.fromEntries(items.map((item) => [item.value, item]))
}
