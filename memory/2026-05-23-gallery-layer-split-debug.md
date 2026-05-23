# 图库智能分层记录不显示排查

## 症状

图库接口返回了分页数据，`records` 中有多条记录，但抽屉里显示“云端图库暂无记录”。

## 根因

接口返回的记录都是 `tool: "layer-split"`。前端在 `filterVisibleGalleryRecords` 和 `mergeGalleryRecords` 中主动排除了 `layer-split`，导致同步成功后 `gallery.value` 仍为空。

## 修复

- 移除图库可见记录过滤中的 `layer-split` 排除逻辑。
- 移除合并图库记录时对 `layer-split` 的提前返回。
- 更新单测，要求智能分层云端记录可以进入图库。

## 验证

运行：

```bash
pnpm vitest run tests/unit/generationComposables.test.js tests/unit/generationPayload.test.js
```

结果：2 个测试文件通过，30 个测试通过。

