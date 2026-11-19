# Security Policy

## Reporting

If you discover a security issue, do not open a public issue. Report it
privately through GitHub's **Report a vulnerability** button (Security tab →
Advisories), including:

- A clear description of the issue and impact
- Steps to reproduce
- Any suggested remediation

## Architecture Security Notes

- **Identity**: Authentication uses Amazon Cognito User Pools with JWT tokens.
- **Network**: API is exposed through API Gateway with CloudFront and WAF in front.
- **Data**: Primary data is stored in DynamoDB (single-table design). Email
  objects are encrypted with SSE-KMS, store only non-PII metadata (status
  `pending`/`sent`), and bucket policies deny unencrypted writes.
- **Data Lake**: Orders are streamed to Kinesis (KMS-encrypted) and delivered
  to S3 via Firehose.
- **Replication**: The emails bucket is replicated to the replica region with
  KMS encryption and a 10-years retention policy.
- **Logging & Monitoring**: CloudTrail and CloudWatch are enabled for audit and
  operational visibility. SQS uses DLQs for failed messages. X-Ray is enabled
  for Lambda traces.

## Operational Security

- **Least privilege**: IAM roles are scoped to the minimum required actions.
- **Secrets**: Runtime secrets should be stored in AWS-native services (e.g.,
  Secrets Manager or SSM) and not committed to the repository.
- **CI/CD**: GitHub Actions uses OIDC to assume AWS roles; credentials are not
  stored in the repo. Only jobs running in the protected `aws` environment can
  assume the deploy role (trust policy pinned to
  `repo:<owner>/<repo>:environment:aws`). The OIDC provider definition plus
  trust/permission policies live in `oidc_role/` to bootstrap roles in other
  accounts. See `DEPLOY.md` for the setup sequence and placeholder replacement.
- **Workflow hardening**: every third-party action is pinned to a full commit
  SHA, workflows default to `permissions: {}` with per-job least privilege,
  checkouts use `persist-credentials: false`, runners use
  `step-security/harden-runner` (egress audit), and `workflow_dispatch` config
  is format-validated before reaching `GITHUB_ENV`.
- **Documentation**: Docs are published from `docs/` and `docs/api-typedoc/`,
  which must not include secrets or internal credentials.
- **Tagging**: All stacks include required tags for cost allocation and audit.

## Supply Chain & Scanning

| Control                                                           | Where                                     |
| ----------------------------------------------------------------- | ----------------------------------------- |
| Dependabot security + grouped version updates (3–7 day cooldown)  | `.github/dependabot.yml`                  |
| `npm audit --audit-level=high` blocks CI                          | `.github/workflows/ci.yml`                |
| Dependency review on PRs (fails on high, denies GPL-3.0/AGPL-3.0) | `.github/workflows/dependency-review.yml` |
| CodeQL default setup for TypeScript/JavaScript and workflows      | Repository settings (Code scanning)       |
| SonarCloud quality gate, coverage ≥ 80% per app                   | `.github/workflows/sonar.yml`             |
| Secret scanning + push protection                                 | Repository settings                       |
| `engine-strict`, pinned registry                                  | `.npmrc`                                  |

### Accepted risks

- **`minimatch` bundled inside `aws-cdk-lib`** (moderate, ReDoS). The CDK
  library ships its own copy, so npm `overrides` cannot replace it. It only runs
  at synth time on trusted, repository-controlled glob patterns, never in the
  Lambda runtime. Re-evaluate when `aws-cdk-lib` bumps its bundled version.
- **`minimatch@10` kept for `typedoc`** (moderate). TypeDoc relies on
  `Minimatch#matchOne`, removed in v11; it runs only in the docs build over
  repository files. The rest of the workspace is forced to `minimatch@^11.0.9`
  and `glob@^14.0.6` via `overrides` in `package.json`.

## Supported Versions

This project targets the current mainline code in the repository. Older builds
may not receive security fixes.
