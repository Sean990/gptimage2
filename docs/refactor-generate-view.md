# GenerateView 完整重构规划

> 目标：把 `/generate` 从"长表单 + 横向工具卡"重构成 **PC 端三栏 Studio + 移动端 App 式外壳** 两套布局，提升信息密度、缩短"配置 → 看到结果"的视觉路径。

## 1. 现状问题

| 维度 | 现状 | 痛点 |
| --- | --- | --- |
| 工具切换 | `GenerateToolboxNav` 横排五张大卡 | 桌面端吃 ~150px 垂直空间，每次切换"撞一下页面" |
| 主体布局 | `generator-layout` / `image-processing-layout` 两套并存的 2 列 grid | 工具切换时 grid 列宽抖动；列宽差异（0.88/1.12 vs 0.9/1.1）无意义 |
| 输出区 | 桌面 sticky、移动随表单滚动 | 移动端用户被迫先滚穿表单才能看到结果，"App 感"缺失 |
| 操作入口 | `mobile-generate-dock` 已是底部条雏形，但工具配置仍在主流上方 | 移动端形态卡在"网页 + 浮条"之间，没真正变成 App |
| 跨页面跳转 | `FloatingGallery` 通过 `imgsgen:use-gallery-record` 事件唤醒 GenerateView | 路径正确，重构需保留 |

## 2. 设计目标

1. **PC（≥1280px）**：参考 Midjourney / Ideogram / Krea 的 Studio 形态 —— 左 rail（工具切换）+ 中工作台（配置）+ 右画布（输出，sticky）。
2. **平板（820–1279px）**：保留两栏，rail 折叠为顶部 segmented tabs（替换现有大卡）。
3. **移动（<820px）**：App 式外壳 —— 顶部画布常驻、底部 BottomTabBar 切工具、点"配置/参考图/历史"弹 BottomSheet、生成 CTA 锁底部。
4. **数据流**：`useGenerationTask` composable 不动，仅对 UI 容器解耦；`activeTool` 提升为视图状态由 GenerateView 管。

## 3. 总体方案

### 3.1 PC 三栏 Studio

```
┌─────┬───────────────────────────┬───────────────────────────┐
│     │                           │                           │
│ S   │   GenerateToolPanel       │   GenerateOutputGrid      │
│ I   │   / DedicatedImageTools   │   (sticky, top: 88px)     │
│ D   │                           │                           │
│ E   │   - Prompt                │   - 画布                  │
│     │   - Settings              │   - Recent strip          │
│ R   │   - Reference             │                           │
│ A   │   - Advanced              │                           │
│ I   │                           │                           │
│ L   │   ── Floating CTA bar ──  │                           │
└─────┴───────────────────────────┴───────────────────────────┘
  72px         minmax(440px, 1fr)        minmax(480px, 1.05fr)
```

- **SideRail**：64–72px 窄列，仅图标 + tooltip + 文字 caption；sticky 跟随滚动。
- **中列**：现有 `GenerateToolPanel` / `DedicatedImageTools`（v-if 切换，但不影响右侧）。
- **右列**：`GenerateOutputGrid` 不变，sticky `top: 88px` 已有。

### 3.2 移动端 App 式

```
┌─────────────────────────────┐
│    顶部画布（OutputGrid）    │  ← 常驻，骨架屏 / 占位 / 结果
│      45–55dvh，可下滑        │
├─────────────────────────────┤
│                             │
│   prompt 摘要 + 快捷操作     │  ← collapsed 卡片，点开 → 全屏 sheet
│                             │
├─────────────────────────────┤
│  [ 创作 ] [生图] [✨ 生成 ]  │  ← BottomTabBar，中间 CTA 凸起
│  [ 工具 ] [图库] [ 我的 ]    │
└─────────────────────────────┘
```

- **顶部画布**：`OutputGrid` 提到滚动容器顶部，固定 `position: sticky; top: 0`，未生成时显示空态 + Hero 引导。
- **配置区**：默认折叠为一张"Prompt 卡片"展示当前提示词、模式、张数；点卡片或底栏「创作」按钮，弹起 `BottomSheet` 全屏覆盖配置面板（带顶部抓手 / 关闭手势）。
- **底部 Tab**：5 项 —— 创作（默认）/ 工具（高清/扩图/抠图/消除）/ 生成（CTA，凸起）/ 图库 / 我的；中间 CTA 直接调 `task.generate()`，无需先开 sheet。
- **保留**：`FloatingGallery`、`Toast`、`ImagePreviewModal`，`mobile-generate-dock` 删除。

## 4. 模块拆分

### 4.1 新增组件

| 组件 | 路径 | 职责 |
| --- | --- | --- |
| `GenerateSideRail.vue` | `src/components/generate/GenerateSideRail.vue` | PC ≥1280px 显示，竖向工具列表，复用现有 5 项 |
| `GenerateMobileShell.vue` | `src/components/generate/GenerateMobileShell.vue` | 移动端外壳，组合 OutputGrid + Sheet + TabBar |
| `BottomSheet.vue` | `src/components/generate/BottomSheet.vue` | 通用底部抽屉（带抓手、遮罩、ESC、滑动关闭） |
| `BottomTabBar.vue` | `src/components/generate/BottomTabBar.vue` | 5 项 tab + 中间凸起 CTA |
| `PromptSummaryCard.vue` | `src/components/generate/PromptSummaryCard.vue` | 移动端折叠卡，显示当前 prompt / 设置摘要 |

### 4.2 改动组件

| 组件 | 改动 |
| --- | --- |
| `GenerateView.vue` | 容器分流：用 `useMediaQuery` 判 `pc` / `tablet` / `mobile`，渲染对应外壳；保留 `activeTool` 状态与事件监听 |
| `GenerateToolboxNav.vue` | 仅平板用（顶部 segmented），桌面被 SideRail 替代；移动端被 BottomTabBar 替代 |
| `GenerateToolPanel.vue` / `DedicatedImageTools.vue` | 内容不动，外层去掉自带边框（由容器统一加 panel 样式） |
| `GenerateOutputGrid.vue` | 移动端模式下：禁用底部 recent strip 的横滚（移到 sheet 内）；新增 `compact` prop 控制内边距 |

### 4.3 删除

- `mobile-generate-dock` 全套样式（`generate.css` 4 处 + `mobile-tuning.css` 多处）
- `generator-layout` / `image-processing-layout` 的 grid 列定义（被新容器接管），保留响应式回退

## 5. 数据流

- `useGenerationTask()` 返回值不变；
- `activeTool` 仍由 `GenerateView` 持有，通过 props 同时下发到 SideRail / TabBar / ToolboxNav；
- `BottomSheet` 开关由 GenerateView 的 `sheetOpen` 控制，避开污染 composable；
- `imgsgen:use-gallery-record` 事件链路保留（FloatingGallery → useGenerationTask + GenerateView），无需迁移到 store。

## 6. 阶段拆分

| 阶段 | 范围 | 可独立合入 |
| --- | --- | --- |
| **阶段 0** | 已完成：将 `GenerateOutputGrid` 提到 v-if 外避免销毁 | ✅ 已合 |
| **阶段 1** | PC 三栏：新增 `GenerateSideRail`，GenerateView 改三栏 grid，桌面隐藏 ToolboxNav | 是 |
| **阶段 2** | 移动 App 式：新增 `BottomSheet` / `BottomTabBar` / `PromptSummaryCard` / `GenerateMobileShell`，GenerateView 接入媒体分流 | 是 |
| **阶段 3** | CSS 清理 + 回归：删除 `mobile-generate-dock` 等死样式，统一断点，跑一轮三档屏幕 + 暗色主题验证 | 是 |

## 7. 文件改动清单（预估）

```
新增
  src/components/generate/GenerateSideRail.vue
  src/components/generate/GenerateMobileShell.vue
  src/components/generate/BottomSheet.vue
  src/components/generate/BottomTabBar.vue
  src/components/generate/PromptSummaryCard.vue
  src/composables/useMediaQuery.js          (若现仓库无)

改动
  src/views/GenerateView.vue                 (容器分流)
  src/components/generate/GenerateToolboxNav.vue   (仅 tablet)
  src/components/generate/GenerateOutputGrid.vue   (compact prop)
  src/assets/generate.css                    (新增三栏 / 移动 shell 样式，删 dock)
  src/assets/mobile-tuning.css               (删 dock 相关条目)
```

## 8. 风险与回滚

| 风险 | 缓解 |
| --- | --- |
| BottomSheet 滑动关闭与表单 `textarea` 滚动冲突 | sheet 内部用 `overscroll-behavior: contain`，抓手区域单独绑 touchmove |
| sticky 输出区在 iOS Safari `position: sticky` 嵌套异常 | 移动端不用 sticky，直接 `position: fixed` + 顶部 padding |
| `useGenerationTask` 监听的 window 事件在移动端 sheet 内是否正常 | 事件挂在 window，与 DOM 树位置无关，无影响 |
| 暗色主题样式漂移 | 阶段 3 跑一遍 dark + 三档屏幕断点 |
| FloatingGallery 浮窗与 BottomTabBar 在移动端遮挡 | TabBar 高度固定，FloatingGallery `bottom` 改为 `calc(72px + safe-bottom)` |

## 9. 验收

- 桌面 ≥1280px：三栏可见，rail sticky，输出区滚动不跳；切换工具时输出区不重挂载。
- 平板 820–1279px：顶部 segmented tabs，输出区在工具配置下方。
- 移动 <820px：输出区 sticky 顶部 / 配置在 sheet / TabBar 锁底；键盘弹起时 TabBar 隐藏。
- 暗色：三档断点视觉一致。
- `imgsgen:use-gallery-record` 流程保留：`FloatingGallery` 跨页跳转 + `GalleryDrawer` 内部回填均生效。
- `mobile-generate-dock` 选择器在三个 CSS 文件中 0 命中。
