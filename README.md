# gitignore

一个可自托管的 gitignore.io 替代方案，部署在 Cloudflare Pages 上。

前端使用 Vite + React + TypeScript 构建，API 端点由 Cloudflare Pages Functions 提供，
无需独立的 Worker 项目，前端与 API 共享同一域名。

## Why this shape

- **Cloudflare Pages** 同时托管静态前端和 Functions（serverless handlers），无需额外 Worker 或独立 API 域名。
- **`github/gitignore` submodule** 以 git submodule 方式跟踪 `github.com/github/gitignore`，构建时扫描生成模板数据，无需运行时网络请求。
- **Bun** 用于依赖管理与构建。

## Features

- 以 `github/gitignore` git submodule 方式同步上游模板
- 构建时生成模板索引与内容映射，注入前端与 Pages Functions
- 前端支持搜索、选择、预览、复制、下载合并后的 `.gitignore`
- `/api/list` 返回全部可用模板列表
- `/api/{template}` 返回单模板内容
- `/api/{template1},{template2}` 返回多个模板拼接后的内容
- GitHub Actions 推送到 `master` 时自动构建并部署到 Cloudflare Pages

## Repository layout

```
github/gitignore/       上游模板仓库 submodule
scripts/                构建脚本
  generate-templates.mjs  扫描 submodule，生成 JSON 数据文件
src/                    静态前端 (React + TypeScript)
functions/              Cloudflare Pages Functions
  api/
    [[catchall]].ts     处理 /api/* 请求
shared/                 前端与 Functions 共用的类型和工具函数
wrangler.toml           Cloudflare Pages 配置
.github/workflows/
  deploy.yml            自动构建并部署到 Cloudflare Pages
```

## Local development

先初始化子模块：

```bash
git submodule update --init --recursive
```

安装依赖：

```bash
bun install
```

启动前端开发环境：

```bash
bun run dev
```

本地生成静态构建：

```bash
bun run build
```

## API behavior

### List templates

```text
GET /api/list
```

返回以逗号分隔的 canonical template name 列表，例如：

```text
AL,Actionscript,Global/macOS,Go,Node,...
```

### Fetch one or more templates

```text
GET /api/Go
GET /api/Go,Node
GET /api/macOS
GET /api/Global%2FmacOS
```

说明：

- API 支持 canonical name，例如 `Global/macOS`
- API 也支持常用短别名，例如 `macOS`
- 模板合并时会按请求顺序拼接输出
- 如果有未知模板，会返回 `404`

## Git alias example

```gitconfig
[alias]
ignore = "!gi() { curl -sL https://<your-pages-domain>/api/$@ ;}; gi"
```

## Cloudflare Pages deployment

仓库包含 GitHub Actions 工作流，推送到 `master` 时自动构建并部署。

需要在 GitHub 仓库中配置：

- Repository secret: `CLOUDFLARE_API_TOKEN`
- Repository variable: `CLOUDFLARE_ACCOUNT_ID`

Cloudflare Pages 项目名称为 `gitignore`，首次部署前需在 Cloudflare Dashboard 创建该项目（或首次 push 时由 wrangler 自动创建）。

## Updating templates

更新上游模板：

```bash
git submodule update --remote --merge github/gitignore
```

然后重新构建：

```bash
bun run build
```

## Notes

- 当前模板来源默认排除了 `community/` 目录，优先保留官方和 `Global/` 模板
- 这能减少命名歧义，并维持更接近 gitignore.io 的使用体验
