# ImgsGen 前台应用

这是 ImgsGen 面向用户的 Vue 前台项目，覆盖首页、图片生成、Prompt 优化、案例库、积分方案、个人中心、订单、积分流水和邀请功能。

## 快速开始

```bash
pnpm install
pnpm dev
```

默认开发接口地址为 `http://localhost:3001/api`。如需覆盖接口地址，复制 `.env.example` 为 `.env` 并修改：

```env
VITE_API_BASE_URL=http://localhost:3001/api
```

## 构建

```bash
pnpm build
```

构建产物位于 `dist/`。项目使用 **vite-ssg** 做静态预渲染（SSG），会为每个路由生成独立的 HTML 文件，并写入该路由专属的 `<title>`、`<meta name="description">`、`<link rel="canonical">` 和 `og:*` 标签，方便百度、微信、360 等弱 JS 渲染能力的抓取器识别。

生产环境未显式配置 `VITE_API_BASE_URL` 时，前台默认请求同域 `/api`，适合通过反向代理把 `/api/` 转发到 `gptimage2-api`。如果 API 使用独立域名，请在构建环境中配置：

```env
VITE_API_BASE_URL=https://api.example.com/api
```

构建时设置 `VITE_SITE_URL`（例如 `VITE_SITE_URL=https://ai.imgsgen.cn pnpm build`），会：

- 把 `index.html` 模板里的 `%VITE_SITE_URL%` 占位符替换为实际域名（用于 canonical / og:url / JSON-LD）。
- 每个路由的 `<link rel="canonical">` 和 `og:url` 指向 `VITE_SITE_URL + 路径`。
- 生成 `dist/sitemap.xml` 并把 `Sitemap:` 行追加到 `dist/robots.txt`。

未设置则跳过上述注入，仅输出基础静态文件。

`vite.config.js` 已启用 `build.sourcemap: 'hidden'`，sourcemap 会随构建产物一起输出，但 bundle 末尾不会追加 `sourceMappingURL`，便于线上排障且不直接暴露给普通用户。部署时建议将 `*.map` 保留在服务器并限制访问，或上传到 Sentry 等监控平台。

## 后端接口约定

### `GET /api/site`

`usageCosts.promptOptimize` 字段供前台"一键优化提示词"使用：

```jsonc
{
  "usageCosts": {
    "promptOptimize": {
      "credits": 2, // 超出免费额度后每次消耗的积分
      "dailyFreeQuota": 3, // 每个用户每天的免费次数，0 表示无免费
    },
  },
}
```

### `GET /api/me`

用户信息中需携带当日剩余免费次数，便于前台展示"今日还剩 N 次免费优化"：

```jsonc
{
  "id": "...",
  "credits": 120,
  "promptOptimizeFreeRemaining": 2,
}
```

字段缺省或为 `null` 时视为“无免费额度或额度未知”，前台会按积分扣费规则提示。

### `POST /api/prompt/optimize`（或 `/prompt-optimizer/optimize`）

后端收到请求后先检查该用户当日免费配额：有剩余则免费处理并扣减配额；无剩余则按 `credits` 扣费。响应至少包含 `optimizedPrompt` 字段，成功后前台会调用 `/api/me` 刷新余额。

## 上线检查

- 后端 `gptimage2-api` 已启动并通过 `pnpm smoke`。
- 生产域名的 `/api/` 能访问后端接口。
- 生产域名的 `/uploads/` 能访问后端上传文件或静态文件服务。
- `VITE_SITE_URL=https://your-domain.com pnpm build` 通过，`dist/*.html` 各页 title/description 不同，`dist/sitemap.xml` 域名正确。
- 反代或 CDN 已开启 gzip / brotli（`cases-part-*.js` 单片约 270KB，压缩后约 60-77KB，直传体积较大）。
- 登录、注册、下单、积分、上传和生成任务轮询在预发环境完成验证。
