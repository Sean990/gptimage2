# ImgsGen 前台

这是 ImgsGen 面向用户的 Vue 前台项目，包含首页、图片生成、Prompt 优化、画廊、定价购买、个人中心、订单、积分和邀请功能。

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

构建产物位于 `dist/`。生产环境未显式配置 `VITE_API_BASE_URL` 时，前台默认请求同域 `/api`，适合通过反向代理把 `/api/` 转发到 `gptimage2-api`。如果 API 使用独立域名，请在构建环境中配置：

```env
VITE_API_BASE_URL=https://api.example.com/api
```

## 上线检查

- 后端 `gptimage2-api` 已启动并通过 `pnpm smoke`。
- 生产域名的 `/api/` 能访问后端接口。
- 生产域名的 `/uploads/` 能访问后端上传文件或静态文件服务。
- `pnpm build` 通过。
- 登录、注册、下单、积分、上传和生成任务轮询在预发环境完成验证。
