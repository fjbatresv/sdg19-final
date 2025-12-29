# Security Policy

## Reporting

If you discover a security issue, do not open a public issue. Send a report to the
project owner with:
- A clear description of the issue and impact
- Steps to reproduce
- Any suggested remediation

## Architecture Security Notes

- **Identity**: Authentication uses Amazon Cognito User Pools with JWT tokens.
- **Network**: API is exposed through API Gateway with CloudFront and WAF in front.
- **Data**: Primary data is stored in DynamoDB (single-table design). S3 buckets
  are encrypted using S3-managed keys (SSE-S3) for now.
- **Replication**: The emails bucket is replicated to the replica region.
- **Logging & Monitoring**: CloudTrail and CloudWatch are enabled for audit and
  operational visibility.

## Operational Security

- **Least privilege**: IAM roles are scoped to the minimum required actions.
- **Secrets**: Runtime secrets should be stored in AWS-native services (e.g.,
  Secrets Manager or SSM) and not committed to the repository.
- **CI/CD**: GitHub Actions uses OIDC to assume AWS roles; credentials are not
  stored in the repo.
- **Tagging**: All stacks include required tags for cost allocation and audit.

## Supported Versions

This project targets the current mainline code in the repository. Older builds
may not receive security fixes.
