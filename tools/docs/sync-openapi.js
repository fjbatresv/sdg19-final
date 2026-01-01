const {
  copyFileSync,
  mkdirSync,
  existsSync,
  readFileSync,
  writeFileSync,
} = require('node:fs');
const { dirname, join } = require('node:path');

const ROOT = process.cwd();
const SOURCE = join(ROOT, 'apps/backend/openapi.yaml');
const DESTINATION = join(ROOT, 'docs-site/public/openapi.yaml');

try {
  if (!existsSync(SOURCE)) {
    throw new Error(`OpenAPI source not found: ${SOURCE}`);
  }
  mkdirSync(dirname(DESTINATION), { recursive: true });
  copyFileSync(SOURCE, DESTINATION);

  const baseUrl = process.env.OPENAPI_BASE_URL;
  if (baseUrl) {
    const content = readFileSync(DESTINATION, 'utf8');
    let sanitized = baseUrl;
    if (baseUrl.startsWith('http')) {
      try {
        sanitized = new URL(baseUrl).host;
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'unknown';
        console.error('OPENAPI_BASE_URL is not a valid URL.', {
          value: baseUrl,
          reason,
        });
        process.exit(1);
      }
    }
    const updated = content.replace(
      /(baseUrl:\n\s+default:\s*)([^\n]+)/,
      `$1${sanitized}`
    );
    writeFileSync(DESTINATION, updated);
  }

  console.log(`Synced OpenAPI: ${SOURCE} -> ${DESTINATION}`);
} catch (error) {
  const reason = error instanceof Error ? error.message : 'unknown';
  console.error('OpenAPI sync failed', {
    source: SOURCE,
    destination: DESTINATION,
    reason,
  });
  process.exit(1);
}
