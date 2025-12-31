const { copyFileSync, mkdirSync } = require('node:fs');
const { dirname, join } = require('node:path');

const ROOT = process.cwd();
const SOURCE = join(ROOT, 'apps/backend/openapi.yaml');
const DESTINATION = join(ROOT, 'docs/openapi.yaml');

mkdirSync(dirname(DESTINATION), { recursive: true });
copyFileSync(SOURCE, DESTINATION);
console.log(`Synced OpenAPI: ${SOURCE} -> ${DESTINATION}`);
