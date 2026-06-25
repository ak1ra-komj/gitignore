# gitignore

**English** | [简体中文](README.zh-CN.md)

A self-hostable [gitignore.io] alternative. Deployed on Cloudflare Pages.

Built with Vite + React + TypeScript. `/api` endpoints are handled by Cloudflare Pages
Functions -- supporting multi-template concatenation. Template data is generated at build
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
4. Add these secrets to your GitHub repo (under Environment `cloudflare-pages`):
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
   - `GITIGNORE_BOT_PAT` -- a fine-grained PAT with `contents: write` (used by the scheduled submodule updater)

Optional:

5. Enable **Dependabot security updates** in repo Settings → Code security.
6. Enable **Allow auto-merge** in repo Settings → General → Pull Requests.
7. `dependabot-auto-merge.yml` will approve and auto-merge Dependabot PRs once CI passes.

## Updating templates

Template updates are fully automated. A scheduled GitHub Actions workflow
(`update-submodule.yml`) runs weekly, checks [github/gitignore] for new commits,
and pushes the updated submodule reference if changes are found. The push triggers
`deploy.yml`, which rebuilds and redeploys the site.

To trigger an update manually, run the **Update Submodule** workflow from the
Actions tab.

## Notes

- All 312 templates are included: Core, Global, and Community.
