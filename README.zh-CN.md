# gitignore

[English](README.md) | **简体中文**

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
4. 在 GitHub 仓库 Secrets 中添加 (在 Environment `cloudflare-pages` 下):
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
   - `GITIGNORE_BOT_PAT` -- Fine-grained PAT, 权限 `contents: write` (供定时子模块更新器使用)

可选:

5. 在仓库 Settings → Code security 中开启 **Dependabot security updates**.
6. 在仓库 Settings → General → Pull Requests 中开启 **Allow auto-merge**.
7. `dependabot-auto-merge.yml` 会在 CI 通过后自动 approve 并 squash 合并 Dependabot PR.

## 更新模板

模板更新已全自动化. 定时 GitHub Actions 工作流 (`update-submodule.yml`) 每周运行,
检查 [github/gitignore] 是否有新提交, 有则推送更新后的子模块引用. 推送动作触发
`deploy.yml` 重新构建并部署站点.

如需手动触发更新, 在 Actions 标签页运行 **Update Submodule** 工作流即可.

## 备注

- 全部 312 个模板均已收录: Core, Global 和 Community.
