# 图片加载优化说明

本文档记录当前项目的图片 URL 优化策略和生成工作台中的使用位置。

## 优化工具

图片 URL 优化集中在：

- `src/utils/imageOptimizer.js`

主要能力：

- `getThumbnailUrl()`：用于图库、最近任务、缩略图条等小图场景。
- `getMediumImageUrl()`：用于中等尺寸展示。
- `getLargeImageUrl()`：用于生成结果和预览等需要更高质量的场景。
- `getResponsiveImageUrl()`：根据容器宽度选择合适尺寸。
- `preloadImages()`：批量预加载图片，并支持并发控制。

## 尺寸策略

| 场景   | 建议尺寸  | 典型位置                   |
| ------ | --------- | -------------------------- |
| 缩略图 | 200x200   | 图库、最近任务、结果缩略图 |
| 中图   | 800x800   | 普通列表或卡片展示         |
| 大图   | 1200x1200 | 生成结果、图片预览         |
| 原图   | 原始尺寸  | 下载、保真预览             |

## 当前使用位置

- `src/composables/useGallery.js`
  - `galleryRecordCover()` 提供图库封面。
- `src/components/FloatingGallery.vue`
  - 全局图库浮层预览和缩略图。
- `src/components/generate/GalleryDrawer.vue`
  - 图库弹窗封面。
- `src/components/generate/GenerateOutputGrid.vue`
  - 生成结果展示、最近任务封面、批量结果缩略图。
- `src/components/generate/ImagePreviewModal.vue`
  - 图片预览弹窗使用当前预览图源。

旧的 `OutputImageItem.vue` 已经删除，输出结果展示由 `GenerateOutputGrid.vue` 直接负责。

## 设计原则

- 展示用图优先使用优化 URL，降低首屏和滚动成本。
- 下载必须保留原始图片地址，避免损失用户资产质量。
- 对不支持优化参数的 URL 自动降级为原始 URL。
- 预览和对比场景优先保证清晰度，其次考虑带宽。

## 验证建议

图片相关改动后建议运行：

```powershell
pnpm exec vitest run tests/unit/imagePreview.test.js tests/unit/generateOutputGrid.test.js
pnpm exec playwright test e2e/generation-loading.spec.js
pnpm check
```

## 后续可优化项

- 对预览弹窗加入更明确的预加载策略，提前加载相邻图片。
- 对真实 CDN 域名补充更细的参数适配。
- 接入生产监控后关注 LCP、图片失败率和预览打开耗时。
