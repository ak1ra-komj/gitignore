# gitignore

A self-hostable [gitignore.io] alternative. Deployed on Cloudflare Pages.

Built with Vite + React + TypeScript. `/api` endpoints are handled by Cloudflare Pages
Functions — supporting multi-template concatenation. Template data is generated at build
time from the [github/gitignore] submodule.

[gitignore.io]: https://gitignore.io
[github/gitignore]: https://github.com/github/gitignore

## Quick start

```bash
git submodule update --init --recursive
bun install
bun run dev
```

Production build:

```bash
bun run build
```

## API

```
GET /api/list                    →  comma-separated template names
GET /api/Go                      →  single template
GET /api/Go,Node,Global/macOS    →  concatenated
```

Git alias:

```gitconfig
[alias]
    ignore = "!gi() { curl -sL https://<your-domain>/api/$@ ;}; gi"
```

```bash
git ignore Go,Node,macOS > .gitignore
```

## Deploy

Push to `master` triggers auto-deploy via GitHub Actions to Cloudflare Pages.

Prerequisites:

1. Create a Pages project named `gitignore` in the Cloudflare Dashboard.
2. Create an API token: **My Profile → API Tokens** → use the _Cloudflare Pages Edit_ template.
3. Get your Account ID from the Workers & Pages sidebar.
4. Add these secrets to your GitHub repo:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`

## Updating templates

```bash
git submodule update --remote --merge github/gitignore
git add github/gitignore
git commit -m "chore: update github/gitignore submodule"
git push
```

## Notes

- Templates under `community/` are excluded to reduce naming ambiguity and stay
  closer to gitignore.io's behaviour.

---

[中文文档](README.zh-CN.md)
