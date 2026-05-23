# GenerateView 工作台重构说明

本文档记录当前 `/generate` 工作台的真实实现状态，作为后续维护和上线验收依据。

## 当前目标

生成工作台已经从单页长表单升级为桌面 Studio + 移动工作台双形态：

- 桌面端：左侧工具 rail，中间参数区，右侧结果工作台。
- 移动端：顶部工作台信息、横向工具切换、参数面板、结果区和底部悬浮提交栏。
- 结果区常驻：切换高清放大、自由扩图、智能抠图、一键消除时，不清空当前结果。
- 结果续作：可从生成结果直接带入后续工具，保留当前结果上下文。

## 核心结构

### 页面容器

- `src/views/GenerateView.vue`
  - 持有 `activeTool`。
  - 根据 `matchMedia('(max-width: 820px)')` 分流桌面端和移动端。
  - 在离开 AI 生图工作台时保存草稿，回到 AI 生图时恢复草稿。
  - 通过 `useOutputAsTool` 将当前结果交给图片处理工具。

### 桌面端

- `GenerateSideRail.vue`：桌面工具切换入口。
- `GenerateToolboxNav.vue`：保留为非桌面窄布局的顶部工具入口。
- `GenerateToolPanel.vue`：AI 生图参数区。
- `DedicatedImageTools.vue`：高清放大、自由扩图、智能抠图、一键消除。
- `GenerateOutputGrid.vue`：结果区、最近任务、精看、总览、局部改图、智能分层。

### 移动端

- `GenerateMobileShell.vue`：移动端外壳。
- `GenerateToolPanel.vue` 和 `DedicatedImageTools.vue` 在移动端复用同一套参数能力。
- `GenerateOutputGrid.vue` 通过 `compact` 模式压缩操作区，并提供紧凑续作菜单。
- 底部提交操作由 `FloatingActionBar.vue` 承载。

当前移动端不再使用旧的 `BottomSheet.vue`、`BottomTabBar.vue`、`PromptSummaryCard.vue` 方案。

## 结果区能力

`GenerateOutputGrid.vue` 负责生成结果的主要交互：

- 单图结果展示和下载。
- 批量结果总览。
- 批量结果精看和缩略图切换。
- 图片预览弹窗。
- 原图对比。
- 局部改图选区。
- 智能分层、图层下载、失败图层重试。
- 最近任务预览、复用、下载、复制提示词和重试。
- 结果续作到高清放大、自由扩图、智能抠图、一键消除。

## 数据流

- `useGenerationTask()` 是生成工作台的业务编排入口。
- `useGenerationForm()` 维护参数状态。
- `useGenerationPayload()` 统一生成请求 payload。
- `useGenerationPolling()` 负责任务轮询和图库同步。
- `useGallery()` 与 `useGalleryActions()` 负责本地图库、云端图库和记录复用。
- `useImagePreview()` 负责预览弹窗状态、索引切换和当前图片元信息。

关键不变量：

- 工具切换不清空结果。
- 从结果续作时必须保留源图，并把工具模式写入 `sourceToolHandoffKey`。
- 图库复用必须恢复 prompt、模式、参考图、蒙版和输出配置。
- 批量精看状态在误触工具切换后仍保留当前选中结果。

## 已清理的旧实现

以下旧组件和组合函数已经删除，源码和测试中不应再引用：

- `src/components/generate/BottomSheet.vue`
- `src/components/generate/BottomTabBar.vue`
- `src/components/generate/OutputEditPopover.vue`
- `src/components/generate/OutputImageItem.vue`
- `src/components/generate/OutputLayerPanel.vue`
- `src/components/generate/PromptSummaryCard.vue`
- `src/composables/useOutputActions.js`
- `src/composables/useOutputPerformance.js`

## 验收证据

当前上线验收以自动化测试和浏览器 QA 双重验证：

- `pnpm test:e2e`
  - 覆盖生成页布局、移动端、图库、预览弹窗、失败重试、部分失败重试、结果续作和无障碍。
- `pnpm check`
  - 覆盖 lint、格式、单测、生产构建和 bundle 门禁。
- 浏览器人工 QA
  - 桌面端 `/generate` 无横向溢出，参数区和结果区稳定。
  - 移动端 AI 生图和图片处理工具无横向溢出，底部悬浮操作栏在视口内。

## 维护建议

- 新增功能优先接入 `useGenerationTask()` 暴露的既有状态和动作，不单独复制生成请求逻辑。
- 新增结果操作应优先落在 `OutputActionBar.vue` 或 `GenerateOutputGrid.vue` 的现有续作体系里。
- 新增移动端交互必须同时跑 `e2e/generate-layout.spec.js` 和 `e2e/generation-loading.spec.js`。
- 删除或移动组件后，需要同步运行遗留引用搜索：

```powershell
rg -n "BottomSheet|BottomTabBar|OutputImageItem|useOutputActions|useOutputPerformance|/api/image/generate" src tests e2e docs
```
