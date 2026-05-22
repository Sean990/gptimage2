# 图片加载优化方案

## 问题描述

线上环境图片加载速度慢，影响用户体验。

## 优化方案

### 1. 图片URL优化工具 (`src/utils/imageOptimizer.js`)

创建了统一的图片URL优化工具，支持主流云存储服务的图片处理参数：

- **阿里云OSS**: `x-oss-process=image/resize,m_lfit,w_800,h_800/quality,q_75/format,webp`
- **腾讯云COS**: `imageMogr2/thumbnail/800x800/quality/75/format/webp`
- **七牛云**: `imageView2/2/w/800/h/800/q/75/format/webp`

### 2. 图片尺寸预设

| 尺寸 | 像素 | 用途 |
|------|------|------|
| THUMBNAIL | 200x200 | 缩略图（图库列表、最近任务） |
| SMALL | 400x400 | 小图 |
| MEDIUM | 800x800 | 中图（输出结果展示） |
| LARGE | 1200x1200 | 大图 |
| ORIGINAL | 原始尺寸 | 下载、预览 |

### 3. 图片质量预设

| 质量 | 值 | 用途 |
|------|-----|------|
| LOW | 60 | 缩略图 |
| MEDIUM | 75 | 常规展示 |
| HIGH | 85 | 高质量展示 |
| ORIGINAL | 100 | 原图 |

### 4. 已优化的组件

#### 4.1 图库封面 (`useGallery.js`)
```javascript
function galleryRecordCover(record) {
  const originalUrl = record.images[0]?.url || ''
  return getThumbnailUrl(originalUrl) // 200x200, 质量60
}
```

#### 4.2 输出结果图片 (`OutputImageItem.vue`)
```javascript
const optimizedImageSrc = computed(() => {
  const originalUrl = props.item.src || props.item.url
  return getMediumImageUrl(originalUrl) // 800x800, 质量75
})
```

#### 4.3 最近任务缩略图 (`GenerateOutputGrid.vue`)
```javascript
:src="getThumbnailUrl(galleryRecordCover(record))"
```

### 5. 优化效果

假设原图为 2MB (2048x2048)：

| 场景 | 原始大小 | 优化后大小 | 节省 |
|------|----------|------------|------|
| 图库缩略图 | 2MB | ~30KB | 98.5% |
| 输出结果展示 | 2MB | ~150KB | 92.5% |
| 最近任务列表 | 2MB | ~30KB | 98.5% |

### 6. 响应式图片加载

提供了 `getResponsiveImageUrl()` 函数，根据容器宽度和设备像素比自动选择合适的图片尺寸：

```javascript
const optimizedUrl = getResponsiveImageUrl(originalUrl, containerWidth)
```

### 7. 图片预加载

提供了批量预加载功能，支持并发控制和进度回调：

```javascript
const results = await preloadImages(urls, {
  concurrency: 3,
  onProgress: (completed, total) => {
    console.log(`${completed}/${total}`)
  }
})
```

## 使用方法

### 基础用法

```javascript
import { getThumbnailUrl, getMediumImageUrl, getLargeImageUrl } from '@/utils/imageOptimizer'

// 缩略图
const thumbUrl = getThumbnailUrl(originalUrl)

// 中图
const mediumUrl = getMediumImageUrl(originalUrl)

// 大图
const largeUrl = getLargeImageUrl(originalUrl)
```

### 自定义尺寸和质量

```javascript
import { optimizeImageUrl, ImageSize, ImageQuality } from '@/utils/imageOptimizer'

const customUrl = optimizeImageUrl(
  originalUrl,
  ImageSize.SMALL,
  ImageQuality.HIGH
)
```

### 响应式图片

```javascript
import { getResponsiveImageUrl } from '@/utils/imageOptimizer'

const containerWidth = 600 // 容器宽度
const optimizedUrl = getResponsiveImageUrl(originalUrl, containerWidth)
```

## 注意事项

1. **原图保留**: 下载和全屏预览时仍使用原图URL，确保用户能获取完整质量的图片
2. **自动降级**: 如果URL不是支持的云存储服务，会自动返回原始URL
3. **WebP格式**: 优化后的图片统一转换为WebP格式，进一步减小文件大小
4. **浏览器兼容**: 现代浏览器都支持WebP格式，旧浏览器会自动降级到原格式

## 后续优化建议

1. **渐进式加载**: 先加载模糊的小图，再加载清晰的大图
2. **懒加载**: 使用 Intersection Observer API 实现可视区域外的图片延迟加载（已通过 `loading="lazy"` 实现）
3. **CDN加速**: 配置CDN缓存策略，提升全球访问速度
4. **图片预加载**: 在用户可能访问的页面提前加载图片
5. **Service Worker缓存**: 利用PWA缓存机制，减少重复请求

## 性能监控

建议在生产环境监控以下指标：

- 图片加载时间 (LCP - Largest Contentful Paint)
- 首屏图片加载完成时间
- 图片加载失败率
- 带宽节省比例

## 相关文件

- `src/utils/imageOptimizer.js` - 图片优化工具
- `src/composables/useGallery.js` - 图库封面优化
- `src/components/generate/OutputImageItem.vue` - 输出结果图片优化
- `src/components/generate/GenerateOutputGrid.vue` - 最近任务缩略图优化
