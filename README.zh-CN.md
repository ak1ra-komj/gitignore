# gitignore

[gitignore.io] 的自托管替代, 跑在 Cloudflare Pages 上.

前端 Vite + React + TypeScript, `/api` 由 Pages Functions 动态处理, 支持多模板拼接.
模板数据构建时从 [github/gitignore] 子模块生成, 不依赖外部网络请求.

[gitignore.io]: https://gitignore.io
[github/gitignore]: https://github.com/github/gitignore

## 快速开始

```bash
git submodule update --init --recursive
bun install
bun run dev
```

构建:

```bash
bun run build
```

## API

```
GET /api/list                    →  逗号分隔的模板列表
GET /api/Go                      →  单个模板
GET /api/Go,Node,Global/macOS    →  合并后的模板
```

Git alias:

```gitconfig
[alias]
    ignore = "!gi() { curl -sL https://<your-domain>/api/$@ ;}; gi"
```

```bash
git ignore Go,Node,macOS > .gitignore
```

## 部署

推送到 `master` 分支自动通过 GitHub Actions 部署到 Cloudflare Pages.

准备工作:

1. 在 Cloudflare Dashboard 创建 Pages 项目, 名称填 `gitignore`.
2. 创建 API Token: **My Profile → API Tokens** → 使用 _Cloudflare Pages Edit_ 模板.
3. 从 Workers & Pages 侧边栏获取 Account ID.
4. 在 GitHub 仓库 Secrets 中添加:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`

## 更新模板

```bash
git submodule update --remote --merge github/gitignore
git add github/gitignore
git commit -m "chore: update github/gitignore submodule"
git push
```

## 备注

- `community/` 下的模板默认不收录, 减少命名冲突, 行为更接近 gitignore.io.

---

[English](README.md)
