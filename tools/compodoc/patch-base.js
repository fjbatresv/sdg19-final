const { readFileSync, writeFileSync, existsSync } = require('node:fs');
const { join } = require('node:path');

const root = process.cwd();
const outputPath = join(root, 'dist/compodoc/web/index.html');
const basePath = process.env.COMPODOC_BASE_PATH ?? '/';

if (!existsSync(outputPath)) {
  console.error('Compodoc index.html not found', { outputPath });
  process.exit(1);
}

const html = readFileSync(outputPath, 'utf8');
const baseTag = `<base href="${basePath}">`;

let updated = html;
if (html.includes('<base')) {
  updated = html.replace(/<base[^>]*>/i, baseTag);
} else {
  updated = html.replace(/<head([^>]*)>/i, `<head$1>\n  ${baseTag}`);
}

writeFileSync(outputPath, updated);
console.log('Patched Compodoc base href', { basePath });
