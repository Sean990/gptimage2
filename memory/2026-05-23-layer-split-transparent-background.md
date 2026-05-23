# 智能分层透明背景参数问题

## 症状

用户在点击“开始分层”后，网络请求里仍能看到 `background: "transparent"`，模型返回 `Transparent background is not supported for this model.`

## 根因

前端主分层入口已经不再主动传透明背景，但 API 请求层最初只通过顶层 `action/tool` 判断是否为 `layer-split`。如果请求在合并参数过程中顶层 `action` 仍是 `generate`，但 `tool_params.layer_types` 已经表示它是分层请求，透明背景字段不会被兜底清理。

## 修复

- `src/services/api.js`：分层请求识别扩展为同时检查 `tool_params.layer_types/layerTypes`。
- `src/services/api.js`：对识别为分层的请求递归移除 `background`、`output_background`、`outputBackground`。
- `tests/unit/api.test.js`：增加 `action` 未覆盖但带 `layer_types` 的回归测试。
- `e2e/generation-loading.spec.js`：来源任务和来源图片均带 `background: "transparent"` 时，验证点击“开始分层”发出的请求不包含透明背景字段。

## 验证

- `pnpm vitest run tests/unit/api.test.js tests/unit/generateOutputGrid.test.js tests/unit/generationComposables.test.js`
- `pnpm exec playwright test e2e/generation-loading.spec.js --grep "智能分层请求不传透明背景参数"`
- `pnpm exec eslint src/services/api.js tests/unit/api.test.js e2e/generation-loading.spec.js`
- `pnpm build`

状态：完成。
