# 2026-05-23 GenerateView 续作参考图回弹问题

## Symptom

用户从生成记录点击“复用”，再对结果点击“继续处理”进入任意图片处理工具。进入工具后删除自动带入的参考图，切回“AI 生图”，再切回该工具时，已删除的参考图又出现。

## Root Cause

问题由两个状态不同步叠加导致：

1. `GenerateView.useOutputAsTool()` 先调用 `task.handoffOutputToTool()`，后调用 `selectTool()`。
2. `handoffOutputToTool()` 会把续作结果图写入参考图状态，并设置 `sourceToolHandoffKey`。
3. `selectTool()` 在离开 AI 生图时才调用 `captureGenerateWorkspaceDraft()`，于是创作草稿被续作源图污染。
4. `DedicatedImageTools.clearToolSources()` 只清理参考图和本地 `activeSourceToolKey`，没有同步清理 `sourceToolHandoffKey`。
5. 切回 AI 生图时恢复了被污染的草稿；再切回工具时，旧 handoff key 和参考图状态又让工具认为该源图仍属于当前工具。

## Fix

- 在 `GenerateView.useOutputAsTool()` 中，先捕获 AI 生图草稿，再执行 handoff。
- 给 `selectTool()` 增加 `preserveGenerateDraft` 选项，避免 handoff 后重复捕获被污染的参考图。
- 在 `DedicatedImageTools` 中，用户手动上传、URL 添加、拖拽添加素材时清理旧 handoff 标记。
- 在 `clearToolSources()` 中，如果当前删除的是 handoff 工具源图，同步清理 `sourceToolHandoffKey`。

## Regression Tests

- `tests/unit/generateView.test.js`
  - 覆盖续作时不会把源图写入创作草稿。
- `tests/unit/dedicatedImageTools.test.js`
  - 覆盖删除续作带入素材时清理 handoff 标记。
- `e2e/generation-loading.spec.js`
  - 覆盖“复用最近任务 -> 继续处理 -> 删除源图 -> 切回创作 -> 再切回工具”后源图不会恢复。

## Verification

- `pnpm exec vitest run tests/unit/generateView.test.js tests/unit/dedicatedImageTools.test.js`
- `pnpm exec playwright test e2e/generation-loading.spec.js -g "复用结果续作后删除工具源图"`
- `pnpm exec playwright test e2e/generation-loading.spec.js e2e/generate-layout.spec.js e2e/tool-floating-actions.spec.js`
- `pnpm exec vitest run tests/unit/generateView.test.js tests/unit/dedicatedImageTools.test.js tests/unit/generateOutputGrid.test.js`

## Status

DONE
