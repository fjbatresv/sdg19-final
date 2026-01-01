const { readFileSync, writeFileSync, existsSync } = require('node:fs');
const { join, posix } = require('node:path');

const root = process.cwd();
const outputPath = join(root, 'dist/compodoc/web/index.html');

const escapeHtml = (value) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

const normalizeBasePath = (input) => {
  const raw = String(input ?? '').trim();
  if (!raw) {
    return '/';
  }
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)) {
    return '/';
  }
  if (/[<>"']/.test(raw)) {
    return '/';
  }
  const withLeadingSlash = raw.startsWith('/') ? raw : `/${raw}`;
  const normalized = posix.normalize(withLeadingSlash).replace(/\/{2,}/g, '/');
  const safe = normalized.startsWith('/') ? normalized : `/${normalized}`;
  return safe.endsWith('/') ? safe : `${safe}/`;
};

const basePath = normalizeBasePath(process.env.COMPODOC_BASE_PATH);

if (!existsSync(outputPath)) {
  console.error('Compodoc index.html not found', { outputPath });
  process.exit(1);
}

const html = readFileSync(outputPath, 'utf8');
const baseTag = `<base href="${escapeHtml(basePath)}">`;

let updated = html;
if (html.includes('<base')) {
  updated = html.replace(/<base[^>]*>/i, baseTag);
} else {
  updated = html.replace(/<head([^>]*)>/i, `<head$1>\n  ${baseTag}`);
}

try {
  writeFileSync(outputPath, updated);
  console.log('Patched Compodoc base href', { basePath });
} catch (error) {
  console.error('Failed to write Compodoc base href patch', {
    outputPath,
    basePath,
    error,
  });
  process.exit(1);
}
