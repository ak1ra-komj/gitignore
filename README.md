# gitignore

一个可自托管的 gitignore.io 替代方案，部署在 GitHub Pages 上。

前端使用 Vite + React + TypeScript 构建，`/api` 端点在构建时生成为静态文件，
无需服务器，可直接部署到任何静态站点托管服务。

## Why this shape

- **纯静态部署** 构建产物为普通静态文件，可部署到 GitHub Pages、Cloudflare Pages 等任意静态托管，无需服务端运行时。
- **`github/gitignore` submodule** 以 git submodule 方式跟踪 `github.com/github/gitignore`，构建时扫描生成模板数据，无需运行时网络请求。
- **Bun** 用于依赖管理与构建。

## Features

- 以 `github/gitignore` git submodule 方式同步上游模板
- 构建时生成模板索引、内容映射及静态 `/api/` 文件树
- 前端支持搜索、选择、预览、复制、下载合并后的 `.gitignore`
- `/api/list` 返回全部可用模板列表
- `/api/{template}` 返回单模板内容（静态文件）
- 多模板合并通过浏览器客户端完成，下载时输出合并内容
- 开发环境下 Vite dev 插件支持 `/api/Go,Node` 多模板拼接
- GitHub Actions 推送到 `master` 时自动构建并部署到 GitHub Pages

## Repository layout

```
github/gitignore/       上游模板仓库 submodule
scripts/                构建脚本
  generate-templates.mjs  扫描 submodule，生成 JSON 数据文件与静态 API 文件树
src/                    前端 (React + TypeScript)
shared/                 前端共用的类型和工具函数
public/
  .nojekyll             禁用 Jekyll，确保无扩展名的 /api/* 文件正常服务
  api/                  构建时生成，不纳入版本控制
  data/                 构建时生成，不纳入版本控制
vite.config.ts          Vite 配置，含 apiDevPlugin 开发中间件
.github/workflows/
  deploy.yml            自动构建并部署到 GitHub Pages
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

启动前端开发环境（同时生成模板数据）：

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
Actionscript,Ada,Global/macOS,Go,Node,...
```

### Fetch a single template

```text
GET /api/Go
GET /api/macOS
GET /api/Global%2FmacOS
```

说明：

- API 支持 canonical name，例如 `Global/macOS`
- API 也支持常用短别名，例如 `macOS`
- 每个模板对应一个静态文件，直接返回 `.gitignore` 内容
- **多模板拼接**（如 `/api/Go,Node`）在静态部署下不支持，请使用前端 UI 选择多个模板后下载合并文件；本地开发时 Vite dev 插件支持此用法

### Git alias example

```gitconfig
[alias]
    ignore = "!gi() { curl -sL https://<your-pages-domain>/api/$@ ;}; gi"
```

单模板用法与 gitignore.io 完全兼容：

```bash
git ignore Go > .gitignore
git ignore macOS >> .gitignore
```

## GitHub Pages deployment

仓库包含 GitHub Actions 工作流，推送到 `master` 时自动构建并部署。

在 GitHub 仓库中启用 Pages：Settings → Pages → Source 选择 **GitHub Actions**。

无需额外配置 Secret 或 Variable。

## Updating templates

更新上游模板：

```bash
git submodule update --remote --merge github/gitignore
```

然后提交 submodule 指针更新并推送，GitHub Actions 将自动重新构建：

```bash
git add github/gitignore
git commit -m "chore: update github/gitignore submodule"
git push
```

## Notes

- 当前模板来源默认排除了 `community/` 目录，优先保留官方和 `Global/` 模板，以减少命名歧义并维持更接近 gitignore.io 的使用体验
