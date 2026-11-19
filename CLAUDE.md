# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

The imported `AGENTS.md` holds the repo-wide rules (layout, docs-sync obligations, Sonar/coverage policy, Nx usage). This file adds commands and cross-file architecture details. Project docs and commit hooks are written in Spanish.

## Commands

Node 24 (`.nvmrc`). Project names: `web`, `@org/backend`, `@org/infra`, `shared-types` (`backend`/`infra` short names also resolve, e.g. in `npm run test:ci`).

```bash
npx nx run web:serve                          # Angular dev server (API fallback http://localhost:3000)
npx nx run @org/backend:build:production      # esbuild bundle -> apps/backend/dist (Lambda asset)
npx nx run @org/infra:build:production        # compiles CDK app -> apps/infra/dist (cdk.json runs dist/main.js)
npx nx run web:build:production
npx nx run-many -t lint test build typecheck  # what CI runs
npm run test:ci                               # tests with coverage (80% thresholds enforced)
npx nx affected -t lint test build docs:check # what the pre-commit hook runs
npm run docs:check                            # sync OpenAPI into docs-site + validate docs
```

Single test (Vitest, configs in each app's `vitest.config.ts`):

```bash
npx vitest run --config apps/backend/vitest.config.ts apps/backend/src/handlers/orders.spec.ts
npx vitest run --config apps/infra/vitest.config.ts -t "test name"
npx nx run web:test -- --include apps/web/src/app/auth.guard.spec.ts   # web uses @angular/build:unit-test
```

CDK synth requires `AWS_ACCOUNT_ID` (or `CDK_DEFAULT_ACCOUNT`) and domain/SES context; build infra and backend first. The pre-push hook (`scripts/git-hooks/pre-push`) shows a working synth invocation with dummy values. Install hooks with `scripts/install-git-hooks.sh`.

## Architecture notes

- **Single backend bundle, many Lambdas.** `apps/backend/src/main.ts` re-exports every handler; esbuild bundles it into one `main.js`. `apps/infra/src/stacks/primary-stack.ts` creates each Lambda from the same asset (`Code.fromAsset(apps/backend/dist)`) with `handler: 'main.<exportName>'`. Adding a handler means: export it from `main.ts`, wire a `Function` + route/event source in `PrimaryStack`, update `apps/backend/openapi.yaml` if it's an HTTP route, then `npm run docs:sync-openapi`.
- **Backend dist path** is resolved from context `backendDistPath` → env `BACKEND_DIST_PATH` → `apps/backend/dist`. Infra tests use `apps/infra/src/test-assets/backend-dist` so they don't need a real backend build.
- **Two stacks** (`apps/infra/src/main.ts`): `Sdg19ReplicaStack` in us-east-2 (emails replica bucket + KMS) deployed first; `Sdg19PrimaryStack` in us-east-1 consumes it via `crossRegionReferences`. Nearly everything lives in `PrimaryStack` (~1400 lines).
- **Config resolution** in stacks: CDK context first, then env vars (`ROOT_DOMAIN_NAME`, `API_DOMAIN_NAME`, `WEB_DOMAIN_NAME`, `SES_FROM_ADDRESS`, `SES_MAIL_FROM_DOMAIN`, `ENABLE_LAMBDA_VPC`, …). `enableLambdaVpc` toggles VPC placement (cost tradeoffs in `VPC-COST.md` / `NO-VPC-COST.md`).
- **API**: API Gateway HTTP API behind CloudFront, with a Cognito JWT authorizer. Handlers read the user from JWT claims (`claims.sub`).
- **DynamoDB single-table keys**: orders use `PK=USER#<sub>`, `SK=ORDER#<orderId>`, `GSI1PK=USER#<sub>`, `GSI1SK=ORDER#<createdAt>`; list-orders paginates by querying GSI1 and validates the client-provided cursor against exactly those four key fields.
- **Products** are a static catalog in `apps/backend/src/lib/products.ts` (no table).
- **Shared types**: `libs/shared-types` (`@org/shared-types`) is consumed by both web and backend (implicit dependency in their project configs).
- **Docs pipeline**: `tools/docs/sync-openapi.js` copies the OpenAPI contract into `docs-site/`; web has Compodoc (`web:docs`, with a doc-coverage gate) and backend has TypeDoc. `CDK-SANITIZATION.md` / `sanitize-cdk-out.sh` cover scrubbing `cdk.out` before committing it.
- **Site layout on Pages**: the portfolio landing is the site root — standalone Astro pages (no Starlight layout) at `docs-site/src/pages/index.astro` (EN, `/`) and `pages/es/` (ES, `/es/`). Starlight docs live under `/docs/` (content in `src/content/docs/docs/`, so sidebar slugs are `docs/...`); Compodoc/TypeDoc stay at `/compodoc/` and `/api-typedoc/`. Old URLs are kept via `redirects` in `astro.config.mjs` (destinations must include `base`). `docs-pages.yml` switches between `/sdg19-final/` on github.io and the custom domain root via repo variable `PAGES_CUSTOM_DOMAIN`. All copy for both languages lives in `docs-site/src/data/portfolio.ts`; architecture facts there must stay in sync with `ARCHITECTURE.md`/`*-COST.md`. The diagram is a hand-laid SVG in `components/portfolio/ArchitectureDiagram.astro`. Links must go through `import.meta.env.BASE_URL` (Pages serves under a sub-path; `ASTRO_BASE` sets it at build).
- **Dependency overrides**: `package.json` `overrides` force patched `minimatch`/`glob`; `typedoc` is pinned back to `minimatch@10` because it uses an API removed in v11. Accepted residual advisories are listed in `SECURITY.md`.
