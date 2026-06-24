# scaffold gitignore.io alternative on GitHub Pages

Built a self-hostable gitignore.io alternative from scratch: Vite + React +
TypeScript frontend, build-time template generation from the `github/gitignore`
submodule, a compatible `/api` layer served as static files, and automated
deployment to GitHub Pages via GitHub Actions.

## Summary

The project replaces gitignore.io with a self-hosted alternative that requires no
server at runtime. The `github/gitignore` repository is tracked as a git submodule;
at build time a Node script scans it and produces a JSON index, a full content map,
and a static file tree under `public/api/` that mirrors the gitignore.io API surface
(`/api/list`, `/api/{template}`, `/api/{alias}`). Multi-template concatenation
(e.g. `/api/Go,Node`) is handled client-side in the browser using the pre-built
content map; during local development a Vite middleware plugin fills the gap so
`curl http://localhost:5173/api/Go,Node` also returns plain text. The frontend is
minimal: a sticky header, popular-template pill quick-toggles, a search-as-you-type
dropdown (only visible while typing), a merged output panel that appears only after
at least one template is selected, and API reference docs in a `<dialog>` modal.
Deployment uses the standard GitHub Actions Pages workflow (`upload-pages-artifact` +
`deploy-pages`) triggered on push to `master`.

## Changed files

### Root / config

- `.gitmodules` — declares `github/gitignore` submodule pointing to `https://github.com/github/gitignore.git`
- `.gitignore` — ignores `node_modules/`, `dist/`, `public/api/`, `public/data/`, `*.tsbuildinfo`
- `package.json` — project manifest; scripts: `dev`, `build`, `preview`, `check`, `generate:templates`; devDependencies: Vite, React types, TypeScript, `@vitejs/plugin-react`; no Cloudflare/wrangler packages
- `bun.lock` — Bun 1.2 text-format lockfile
- `index.html` — Vite entry HTML
- `tsconfig.json` — composite project referencing `tsconfig.app.json` and `tsconfig.node.json`
- `tsconfig.app.json` — TypeScript config for `src/` (React, strict, `noEmit: true`)
- `tsconfig.node.json` — TypeScript config for `vite.config.ts`
- `vite.config.ts` — Vite config with `base: './'`, `@vitejs/plugin-react`, and `apiDevPlugin` middleware
- `README.md` — full project documentation: architecture, local development, API behaviour, git alias example, deployment, template update workflow

### Scripts

- `scripts/generate-templates.mjs` — scans `github/gitignore` (excluding `community/`), builds alias map and template records, writes:
  - `public/data/templates-index.json` — array of `{canonicalName, shortName, displayName, group, aliases, summary}`
  - `public/data/templates-map.json` — `{aliases, templates, list}` full content map
  - `public/api/list` — comma-separated list of all canonical names
  - `public/api/{canonicalName}` — raw `.gitignore` content (e.g. `public/api/Global/macOS`)
  - `public/api/{shortName}` — alias file when short name differs from canonical (e.g. `public/api/macOS`)

### Shared

- `shared/templates.ts` — types (`TemplateMeta`, `TemplateRecord`, `TemplateData`) and helpers (`normalizeTemplateKey`, `parseTemplateQuery`, `uniqueValues`) used by both frontend and previously by Pages Functions

### Frontend

- `src/main.tsx` — React 18 `createRoot` entry point
- `src/vite-env.d.ts` — `ImportMeta` env type stub
- `src/App.tsx` — main application component:
  - Loads `templates-index.json` on mount; restores selection from `?templates=` query param
  - Loads `templates-map.json` lazily on first template selection
  - `buildApiBase()` uses `new URL('.', location.href)` — works at any base path including `user.github.io/repo/` subdirectory deployments
  - `POPULAR_TEMPLATES` pills act as quick-toggles (add/remove on click)
  - Search input filters by canonical name, display name, short name, aliases; results shown only while query is non-empty
  - `ApiModal` component uses native `<dialog>` — opened by the header "API" button; documents list and single-template endpoints; notes that multi-template concatenation requires dynamic backend (use UI download for merged output)
  - Merged output panel renders only when selection is non-empty; Copy and Download buttons
  - `?templates=` URL param updated via `history.replaceState` on selection change
- `src/styles/app.css` — styles for all components: sticky header, pill quick-toggles, searchbox + dropdown overlay, output panel, `<dialog>` modal, API cards

### CI / deployment

- `.github/workflows/deploy.yml` — two-job workflow:
  - `build`: checkout with `submodules: recursive`, setup Bun, `bun install --frozen-lockfile`, `bun run build`, `actions/upload-pages-artifact@v3`
  - `deploy`: `actions/deploy-pages@v4` with `environment: github-pages`
  - `permissions: pages: write, id-token: write, contents: read`
  - `concurrency: group: pages, cancel-in-progress: false`
  - triggers on push to `master` and `workflow_dispatch`
- `public/.nojekyll` — empty file; disables Jekyll processing so extensionless `/api/*` files are served by GitHub Pages

## Git commits

- `52b80c5` scaffold gitignore.io alternative on GitHub Pages

## Notes

- **Static multi-template API is not feasible at runtime**: a request like
  `/api/Go,Node` cannot be served by a static file host without pre-generating
  every possible combination. Individual template files handle the single-template
  case; multi-template merging is done client-side using `templates-map.json`. The
  Vite dev plugin fills the gap during local development.
- **`new URL('.', location.href)` for base-path-agnostic API resolution**: using
  `location.origin` breaks on subdirectory deployments (e.g. `user.github.io/repo/`).
  `new URL('.', location.href).href.replace(/\/$/, '')` always resolves relative to
  the current page regardless of path depth.
- **`public/.nojekyll` must be in `public/`** (not the project root) so Vite copies
  it to `dist/`. Without it, Jekyll on GitHub Pages skips extensionless files like
  `dist/api/Go`, making the static API endpoints return 404.
- **Bun 1.2+ uses text-format `bun.lock`** (not the old binary `bun.lockb`). The
  file is human-readable and diff-friendly; commit it normally.
- **GitHub Actions Pages deployment requires split jobs**: `upload-pages-artifact`
  (in the build job) and `deploy-pages` (in the deploy job) must be separate jobs.
  The deploy job needs `environment: github-pages` to expose the deployment URL as
  an output. Enable Pages in the repo settings with source "GitHub Actions" before
  the first push.
- **`git check-ignore -v <path>` exit codes**: 0 = path is ignored, 1 = not ignored.
  Check the exit code, not just the output text.
- **`community/` templates excluded deliberately**: `scripts/generate-templates.mjs`
  filters out paths containing `/community/` to reduce naming ambiguity and stay
  close to the gitignore.io experience. Re-enable by removing the filter line.
- **`git submodule update --init --recursive` required on first clone**: the
  `github/gitignore` submodule is not checked out automatically. Running
  `bun run dev` or `bun run build` without it will fail with a clear error message
  from the generate script.
