const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.join(__dirname, '..');

const read = (...parts) => fs.readFileSync(path.join(projectRoot, ...parts), 'utf8');

test('miniapp production env example does not point to localhost', () => {
  const envExample = read('.env.production.example');

  assert.doesNotMatch(envExample, /PROJECT_DOMAIN\s*=\s*https?:\/\/(?:127\.0\.0\.1|localhost|0\.0\.0\.0)(?::\d+)?/);
  assert.match(
    envExample,
    /PROJECT_DOMAIN\s*=\s*https:\/\//,
    'self-hosted miniapp production builds must use an HTTPS PROJECT_DOMAIN example',
  );
});

test('frontend split repo uses Dockerfile instead of legacy deploy.sh pipeline', () => {
  const dockerfile = read('Dockerfile');

  assert.match(dockerfile, /FROM node:20-bookworm-slim AS builder/);
  assert.match(dockerfile, /pnpm install --frozen-lockfile --ignore-scripts/);
  assert.match(dockerfile, /pnpm build:web/);
  assert.match(dockerfile, /COPY --from=builder \/app\/dist-web \.\/dist-web/);
  assert.doesNotMatch(dockerfile, /\.env\.production/);
  assert.doesNotMatch(dockerfile, /pm2 restart|predeploy:check|copy_admin_console/);
});

test('frontend Docker build context keeps secrets and local artifacts out of CloudBase image builds', () => {
  const dockerignore = read('.dockerignore');

  assert.match(dockerignore, /^node_modules$/m);
  assert.match(dockerignore, /^dist-web$/m);
  assert.match(dockerignore, /^\.env\.production$/m);
  assert.match(dockerignore, /^\*\.log$/m);
});

test('compatibility launch entry serves dist-web assets for platforms still using node server/dist/main.js', () => {
  const launchEntry = read('server', 'dist', 'main.js');

  assert.match(launchEntry, /Missing H5 build output/);
  assert.match(launchEntry, /ensureBuildOutput/);
  assert.match(launchEntry, /spawnSync/);
  assert.match(launchEntry, /pnpm/);
  assert.match(launchEntry, /dist-web/);
  assert.match(launchEntry, /index\.html/);
  assert.match(launchEntry, /createServer/);
  assert.match(launchEntry, /process\.env\.PORT/);
});

test('package start scripts support cloud platforms that run Node app commands instead of Dockerfile', () => {
  const pkg = JSON.parse(read('package.json'));

  assert.equal(pkg.scripts.start, 'node server/dist/main.js');
  assert.equal(pkg.scripts.postinstall, 'pnpm build:web');
});

test('admin console cloud build does not execute bare tsc binaries from uploaded node_modules', () => {
  const pkg = JSON.parse(read('cloudrun-source', 'admin-console', 'package.json'));

  assert.equal(
    pkg.scripts.build,
    'node ./node_modules/typescript/bin/tsc --noEmit && node ./node_modules/vite/bin/vite.js build',
  );
  assert.equal(pkg.scripts.tsc, 'node ./node_modules/typescript/bin/tsc --noEmit');
  assert.doesNotMatch(pkg.scripts.build, /(^|\s)tsc(\s|$)/);
});

test('admin console cloud upload source excludes local install and build artifacts', () => {
  const ignoreFile = read('cloudrun-source', 'admin-console', '.cloudbaseignore');

  assert.match(ignoreFile, /^node_modules\/$/m);
  assert.match(ignoreFile, /^dist\/$/m);
  assert.match(ignoreFile, /^\.env$/m);
  assert.match(ignoreFile, /^\*\.log$/m);
});
