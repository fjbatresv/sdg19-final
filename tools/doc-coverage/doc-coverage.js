const { Project, SyntaxKind } = require('ts-morph');
const { readdirSync } = require('node:fs');
const { join, dirname, relative, sep } = require('node:path');

const ROOT = process.cwd();
const THRESHOLD = Number(process.env.DOC_COVERAGE_THRESHOLD ?? 80);
const EXCLUDE_DIRS = new Set([
  '.git',
  '.nx',
  'cdk.out',
  'dist',
  'docs',
  'node_modules',
  'tmp',
]);

const ENTRYPOINT_FILENAMES = new Set(['index.ts', 'public-api.ts', 'main.ts']);

const TRACKED_KINDS = new Set([
  SyntaxKind.FunctionDeclaration,
  SyntaxKind.ClassDeclaration,
  SyntaxKind.InterfaceDeclaration,
  SyntaxKind.TypeAliasDeclaration,
  SyntaxKind.EnumDeclaration,
]);

function shouldSkipDir(dirName) {
  return EXCLUDE_DIRS.has(dirName);
}

function isEntrypoint(filePath) {
  const normalized = filePath.split(sep).join('/');
  if (
    (normalized.includes('/libs/') || normalized.includes('/packages/')) &&
    (normalized.endsWith('/index.ts') || normalized.endsWith('/public-api.ts'))
  ) {
    return true;
  }
  return normalized.includes('/apps/') && normalized.endsWith('/src/main.ts');
}

function findEntrypoints(currentDir, acc) {
  const entries = readdirSync(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(currentDir, entry.name);
    if (entry.isDirectory()) {
      if (shouldSkipDir(entry.name)) {
        continue;
      }
      findEntrypoints(fullPath, acc);
      continue;
    }
    if (entry.isFile() && ENTRYPOINT_FILENAMES.has(entry.name)) {
      if (isEntrypoint(fullPath)) {
        acc.add(fullPath);
      }
    }
  }
}

function hasJsDocDescription(declaration) {
  const jsDocs = declaration.getJsDocs();
  for (const doc of jsDocs) {
    const description =
      typeof doc.getDescription === 'function' ? doc.getDescription() : '';
    const comment =
      typeof doc.getComment === 'function' ? doc.getComment() : '';
    if ((description || comment || '').trim().length > 0) {
      return true;
    }
  }
  return false;
}

function buildProject() {
  const project = new Project({
    tsConfigFilePath: join(ROOT, 'tsconfig.base.json'),
    skipAddingFilesFromTsConfig: true,
  });

  project.addSourceFilesAtPaths([
    'apps/**/src/**/*.{ts,tsx}',
    'libs/**/src/**/*.{ts,tsx}',
    'packages/**/src/**/*.{ts,tsx}',
    '!**/*.spec.ts',
    '!**/*.test.ts',
    '!**/*.d.ts',
  ]);

  return project;
}

const entrypoints = new Set();
findEntrypoints(ROOT, entrypoints);

const project = buildProject();

const missingDocs = [];
const seenSymbols = new Set();
let totalSymbols = 0;
let documentedSymbols = 0;

for (const entrypoint of entrypoints) {
  const sourceFile = project.getSourceFile(entrypoint);
  if (!sourceFile) {
    continue;
  }
  const exported = sourceFile.getExportedDeclarations();
  for (const [name, declarations] of exported.entries()) {
    const relevantDecls = declarations.filter((decl) =>
      TRACKED_KINDS.has(decl.getKind())
    );
    if (relevantDecls.length === 0) {
      continue;
    }

    const symbolKey = `${name}:${relevantDecls[0].getSourceFile().getFilePath()}`;
    if (seenSymbols.has(symbolKey)) {
      continue;
    }
    seenSymbols.add(symbolKey);
    totalSymbols += 1;

    const hasDoc = relevantDecls.some((decl) => hasJsDocDescription(decl));
    if (hasDoc) {
      documentedSymbols += 1;
    } else {
      const decl = relevantDecls[0];
      const filePath = relative(ROOT, decl.getSourceFile().getFilePath());
      const line = decl.getStartLineNumber();
      missingDocs.push(`${filePath}:${line} - ${name}`);
    }
  }
}

const coverage =
  totalSymbols === 0 ? 100 : (documentedSymbols / totalSymbols) * 100;

console.log(
  `Doc coverage: ${documentedSymbols}/${totalSymbols} (${coverage.toFixed(2)}%)`
);

if (missingDocs.length > 0) {
  console.log('Missing docs:');
  missingDocs.forEach((item) => console.log(`- ${item}`));
}

if (coverage < THRESHOLD) {
  console.error(
    `Documentation coverage ${coverage.toFixed(
      2
    )}% is below required threshold ${THRESHOLD}%.`
  );
  process.exit(1);
}
