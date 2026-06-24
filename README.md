# gitignore

一个可自托管的 gitignore.io 替代方案, 部署在 Cloudflare Pages 上.

前端使用 Vite + React + TypeScript 构建, `/api` 端点由 Cloudflare Pages Functions 动态处理,
支持多模板拼接. `/data/` 下的 JSON 数据文件在构建时生成, 供前端和 Function 使用.

## Why this shape

- **Cloudflare Pages** 静态站点 + Functions 处理 `/api/*`, 零服务器运维, 免费额度充足.
- **`github/gitignore` submodule** 以 git submodule 方式跟踪 `github.com/github/gitignore`, 构建时扫描生成模板数据, 无需运行时网络请求.
- **Bun** 用于依赖管理与构建.

## Features

- 以 `github/gitignore` git submodule 方式同步上游模板
- 构建时生成模板索引及内容映射 JSON
- 前端支持搜索, 选择, 预览, 复制, 下载合并后的 `.gitignore`
- `/api/list` 返回全部可用模板列表
- `/api/{template}` 返回单模板内容
- `/api/{template1},{template2}` 返回多模板拼接内容
- 开发环境下 Vite dev 插件支持 `/api/*` 动态请求
- GitHub Actions 推送到 `master` 时自动构建并部署到 Cloudflare Pages

## Repository layout

```
github/gitignore/       上游模板仓库 submodule
scripts/                构建脚本
  generate-templates.mjs  扫描 submodule, 生成 JSON 数据文件
src/                    前端 (React + TypeScript)
shared/                 前端共用的类型和工具函数
functions/              Cloudflare Pages Functions
  api/
    [[path]].ts         处理 /api/* 请求, 支持单模板和多模板拼接
public/
  .nojekyll             禁用 Jekyll (历史遗留)
  data/                 构建时生成, 不纳入版本控制
vite.config.ts          Vite 配置, 含 apiDevPlugin 开发中间件
.github/workflows/
  deploy.yml            自动构建并部署到 Cloudflare Pages
```

## Local development

先初始化子模块:

```bash
git submodule update --init --recursive
```

安装依赖:

```bash
bun install
```

启动前端开发环境 (同时生成模板数据):

```bash
bun run dev
```

本地生成静态构建:

```bash
bun run build
```

## API behavior

### List templates

```text
GET /api/list
```

返回以逗号分隔的 canonical template name 列表, 例如:

```text
Actionscript,Ada,Global/macOS,Go,Node,...
```

### Fetch single template

```text
GET /api/Go
GET /api/macOS
GET /api/Global%2FmacOS
```

### Fetch multiple templates (concatenated)

```text
GET /api/Go,Node
GET /api/Python,Rust,Global/macOS
```

多个模板以 `\n\n` 分隔后拼接, 返回合并后的 `.gitignore` 内容.

### Git alias example

```gitconfig
[alias]
    ignore = "!gi() { curl -sL https://<your-pages-domain>/api/$@ ;}; gi"
```

用法与 gitignore.io 完全兼容:

```bash
git ignore Go > .gitignore
git ignore Go,Node,macOS > .gitignore
```

## Cloudflare Pages deployment

仓库包含 GitHub Actions 工作流, 推送到 `master` 时自动构建并部署.

### 前置准备

1. 在 Cloudflare Dashboard 中创建 Pages 项目, 名称设为 `gitignore`.
2. 创建 API Token: My Profile → API Tokens → Create Token → 使用 "Cloudflare Pages Edit" 模板.
3. 获取 Account ID: Cloudflare Dashboard 右侧边栏 → Workers & Pages → Account ID.
4. 在 GitHub 仓库 Settings → Secrets and variables → Actions 中添加:
   - `CLOUDFLARE_API_TOKEN`: API Token
   - `CLOUDFLARE_ACCOUNT_ID`: Account ID

## Updating templates

更新上游模板:

```bash
git submodule update --remote --merge github/gitignore
```

然后提交 submodule 指针更新并推送, GitHub Actions 将自动重新构建:

```bash
git add github/gitignore
git commit -m "chore: update github/gitignore submodule"
git push
```

## Notes

- 当前模板来源默认排除了 `community/` 目录, 优先保留官方和 `Global/` 模板, 以减少命名歧义并维持更接近 gitignore.io 的使用体验
