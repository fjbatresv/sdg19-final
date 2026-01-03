
# Repository context for AI agents

## Monorepo layout

- `apps/web`: Angular 21 frontend.
- `apps/backend`: Node.js Lambdas + OpenAPI contract.
- `apps/infra`: AWS CDK stacks (primary + replica).
- `docs-site/`: Astro Starlight documentation (keep synced with core docs).

## Runtime + tooling

- Node version: `24` (see `.nvmrc`).
- Prefer `npx nx run ...` for tasks. CI disables Nx Cloud via `NX_CLOUD=false` but keeps `NX_DAEMON` as configured in workflows.
- Use the Nx MCP tools for project structure and configuration questions.

## Configuration + deployment

- Domains and SES settings are environment- or context-driven. Avoid hardcoding account IDs, hosted zone IDs, or domain names in code.
- GitHub Actions deploy/destroy use a single `config_json` input and a local composite action (`.github/actions/parse-config/`). If you add or change config keys, update the action and docs.
- Web API base URL comes from `apps/web/src/assets/env.js` (`window.__env.apiBaseUrl`) with a localhost fallback for dev.

## Architecture highlights (keep in sync with `ARCHITECTURE.md`)

- Edge: CloudFront (web + API) + Route53 + WAF.
- Auth: Cognito User Pool + JWT.
- Orders: DynamoDB single-table + stream -> SNS -> SQS.
- Email flow: SQS -> Lambda order-email -> S3 EmailsBucket (pending/sent) -> SES template. Email copies should avoid PII.
- Data lake: SNS -> SQS -> Lambda order-lake -> Kinesis -> Firehose -> S3 DataBucket (Parquet, partitioned by hour).
- Observability: X-Ray enabled for Lambdas.

## Data retention + security

- EmailsBucket: transition to Glacier at 1 year; expiration at 10 years (see `ARCHITECTURE.md`).
- LogsBucket: 30-day retention.
- Use KMS keys where defined and keep encryption/policies consistent across stacks.

## Documentation

- Keep `README.md`, `ARCHITECTURE.md`, `FLOWS.md`, `SECURITY.md`, `DEPLOY.md`, and relevant `docs-site/` pages aligned.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- You have access to the Nx MCP server and its tools, use them to help the user
- When answering questions about the repository, use the `nx_workspace` tool first to gain an understanding of the workspace architecture where applicable.
- When working in individual projects, use the `nx_project_details` MCP tool to analyze and understand the specific project structure and dependencies
- For questions around nx configuration, best practices or if you're unsure, use the `nx_docs` tool to get relevant, up-to-date docs. Always use this instead of assuming things about nx configuration
- If the user needs help with an Nx configuration or project graph error, use the `nx_workspace` tool to get any errors
- When updating architecture or flows, keep `docs-site/` Starlight pages in sync with README/ARCHITECTURE/FLOWS.

<!-- nx configuration end-->
