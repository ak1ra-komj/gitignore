# AGENTS.md

## One-liner

Static site + Cloudflare Pages Functions that serves gitignore templates from `github/gitignore`.

## Essential commands

```bash
git submodule update --init --recursive   # first time only
bun install
bun run dev                               # generates templates, then starts Vite dev server
bun run build                             # generate:templates → tsc -b → vite build
```

Full quality check (order matters — templates must exist before typecheck):

```bash
bun run format:check && bun run lint && bun run build
```

Single steps:

```bash
bun run generate:templates   # writes public/data/templates-index.json + templates-map.json
tsc --noEmit                 # type-check only (composite project, no emit)
bun run lint                 # ESLint flat config with typed rules for src/ + shared/
bun run format               # Prettier write; bun run format:check for CI
```

## Build pipeline (order matters)

`generate:templates` must run **before** `tsc` and `vite build` because it produces
`public/data/templates-map.json` which the Pages Function reads at runtime.

## Architecture

| Directory                        | Role                                                                           |
| -------------------------------- | ------------------------------------------------------------------------------ |
| `github/gitignore/`              | Git submodule — upstream template source                                       |
| `scripts/generate-templates.mjs` | Scans submodule, outputs JSON to `public/data/`                                |
| `src/` + `shared/`               | React SPA (TypeScript)                                                         |
| `functions/api/[[path]].ts`      | Cloudflare Pages Function — handles `/api/*` including `Go,Node` concatenation |
| `public/data/`                   | Build-generated JSON (gitignored)                                              |
| `public/favicon.svg`             | Favicon                                                                        |

All templates under `github/gitignore/` are included, including `community/`.

## Pages Function

- Lives at `functions/api/[[path]].ts`.
- On first request, fetches `/data/templates-map.json` from the static site and caches
  in memory.
- Supports `/api/list`, `/api/Go`, `/api/Go,Node,Global/macOS`.
- Mirrors `vite.config.ts` `apiDevPlugin` middleware (local dev only).

## Frontend data loading

1. `templates-index.json` — loaded on mount (lightweight, metadata only).
2. `templates-map.json` — lazily loaded when first template is selected (contains all bodies).
3. Web UI merges selections client-side. Pages Function handles curl/API use case.

## TypeScript

- Composite project: `tsconfig.json` → `tsconfig.app.json` (src + shared), `tsconfig.node.json` (vite.config.ts).
- Strict mode + `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`.
- Both configs use `moduleResolution: "Bundler"`, `noEmit`.

## ESLint

Flat config (`eslint.config.mjs`). Typed linting (projectService) only applies to `src/**` and `shared/**`.
Script files (`scripts/**/*.mjs`, `vite.config.ts`) use Node globals.

## Lint-staged (pre-commit)

`husky` + `lint-staged` auto-runs on commit. TS/JS/MJS files get `prettier --write` + `eslint --fix`.
JSON/MD/CSS/HTML/YML get `prettier --write` only.

## Deployment

Cloudflare Pages via GitHub Actions (`cloudflare/wrangler-action@v3`).
Push to `master` → quality gate (typecheck + lint) → deploy.
Requires secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.

## Gotchas

- **No `public/api/` anymore.** Static API files were removed. The Pages Function handles all `/api/*`.
- `vite.config.ts` sets `base: './'` for relative asset paths.
- `node_modules`, `dist`, `public/data` are gitignored. `bun.lock` is committed (text format).
- Bun is the package manager (`packageManager` field set). `bun.lock`, not `bun.lockb`.
