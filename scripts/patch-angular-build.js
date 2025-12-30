const fs = require('node:fs');
const path = require('node:path');

const targetPath = path.join(
  __dirname,
  '..',
  'node_modules',
  '@angular',
  'build',
  'src',
  'tools',
  'angular',
  'compilation',
  'angular-compilation.js'
);

if (!fs.existsSync(targetPath)) {
  process.exit(0);
}

const patches = [
  {
    file: targetPath,
    replacements: [
      {
        from: "Promise.resolve().then(() => __importStar(require('@angular/compiler-cli')))",
        to: "import('@angular/compiler-cli')",
      },
    ],
  },
  {
    file: path.join(
      __dirname,
      '..',
      'node_modules',
      '@angular-devkit',
      'build-angular',
      'src',
      'utils',
      'spinner.js'
    ),
    replacements: [
      {
        from: 'const ora_1 = __importDefault(require("ora"));',
        to: 'const ora_1 = require("ora");',
      },
      {
        from: 'this.spinner = (0, ora_1.default)({',
        to: 'this.spinner = (0, (ora_1.default ?? ora_1))({',
      },
    ],
  },
  {
    file: path.join(
      __dirname,
      '..',
      'node_modules',
      '@angular',
      'build',
      'src',
      'builders',
      'unit-test',
      'runners',
      'vitest',
      'executor.js'
    ),
    replacements: [
      {
        from: "Promise.resolve().then(() => __importStar(require('vite')))",
        to: "import('vite')",
      },
      {
        from: "Promise.resolve().then(() => __importStar(require('vitest/node')))",
        to: "import('vitest/node')",
      },
    ],
  },
  {
    file: path.join(
      __dirname,
      '..',
      'node_modules',
      '@angular',
      'build',
      'src',
      'tools',
      'vite',
      'plugins',
      'angular-memory-plugin.js'
    ),
    replacements: [
      {
        from: "Promise.resolve().then(() => __importStar(require('vite')))",
        to: "import('vite')",
      },
    ],
  },
  {
    file: path.join(
      __dirname,
      '..',
      'node_modules',
      '@angular',
      'build',
      'src',
      'tools',
      'vite',
      'plugins',
      'ssr-transform-plugin.js'
    ),
    replacements: [
      {
        from: "Promise.resolve().then(() => __importStar(require('vite')))",
        to: "import('vite')",
      },
    ],
  },
  {
    file: path.join(
      __dirname,
      '..',
      'node_modules',
      '@angular',
      'build',
      'src',
      'builders',
      'dev-server',
      'vite',
      'index.js'
    ),
    replacements: [
      {
        from: "Promise.resolve().then(() => __importStar(require('vite')))",
        to: "import('vite')",
      },
    ],
  },
  {
    file: path.join(
      __dirname,
      '..',
      'node_modules',
      '@angular',
      'build',
      'src',
      'builders',
      'dev-server',
      'vite',
      'server.js'
    ),
    replacements: [
      {
        from: "Promise.resolve().then(() => __importStar(require('vite')))",
        to: "import('vite')",
      },
    ],
  },
];

for (const patch of patches) {
  if (!fs.existsSync(patch.file)) {
    continue;
  }
  let source = fs.readFileSync(patch.file, 'utf8');
  let updated = source;
  for (const replacement of patch.replacements) {
    updated = updated.replace(replacement.from, replacement.to);
  }
  if (updated !== source) {
    fs.writeFileSync(patch.file, updated, 'utf8');
  }
}
