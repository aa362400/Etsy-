const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');

test('frontend network wrapper retries transient cloud/container failures and handles account status locks', () => {
  const source = read('src', 'network.ts');

  assert.match(source, /DEFAULT_REQUEST_TIMEOUT_MS\s*=\s*12000/);
  assert.match(source, /MAX_TRANSIENT_RETRIES\s*=\s*2/);
  assert.match(source, /isTransientNetworkError/);
  assert.match(source, /USER_BANNED|USER_FROZEN|USER_DELETED/);
  assert.match(source, /handleAccountLocked/);
});

test('backend user auth blocks inactive users and exposes admin user status mutation', () => {
  const service = read('server', 'src', 'app.service.ts');
  const controller = read('server', 'src', 'app.controller.ts');

  assert.match(service, /assertUserActive/);
  assert.match(service, /buildInactiveUserPayload/);
  assert.match(service, /adminUpdateUserStatus/);
  assert.match(controller, /adminUserStatus/);
  assert.match(controller, /admin\/users\/:id\/status|@Post\('admin\/users\/:id\/status'\)/);
});

test('core paginated list contracts include hasMore and limit clamping', () => {
  const service = read('server', 'src', 'app.service.ts');
  const tasksPage = read('src', 'pages', 'tasks', 'index.tsx');
  const ordersPage = read('src', 'pages', 'orders', 'index.tsx');
  const myTasksPage = read('src', 'pages', 'my-tasks', 'index.tsx');

  assert.match(service, /normalizePagination/);
  assert.match(service, /hasMore/);
  assert.match(tasksPage, /hasMore/);
  assert.match(tasksPage, /onScrollToLower|useReachBottom/);
  assert.match(ordersPage, /hasMore/);
  assert.match(myTasksPage, /hasMore/);
});

test('cloud deployment build validates env and builds admin console inside Docker image', () => {
  const config = read('config', 'index.ts');
  const dockerfile = read('Dockerfile');
  const main = read('server', 'src', 'main.ts');

  assert.match(config, /assertRequiredWechatCloudConfig/);
  assert.doesNotMatch(config, /TCB_SERVICE_NAME\s*\|\|\s*['"]express-q5bl['"]/);
  assert.match(dockerfile, /AS admin-build/);
  assert.match(dockerfile, /pnpm --filter admin-console build/);
  assert.match(main, /x-anonymous-id/);
});

test('ui cache and payment hardening contracts are present', () => {
  const uiConfig = read('src', 'lib', 'ui-config.ts');
  const publishPage = read('src', 'pages', 'publish', 'index.tsx');
  const workerCenter = read('src', 'pages', 'worker-center', 'index.tsx');

  assert.match(uiConfig, /UI_CONFIG_SCHEMA_VERSION/);
  assert.match(uiConfig, /UI_CONFIG_CACHE_MAX_AGE_MS/);
  assert.match(publishPage, /isProductionRuntime/);
  assert.match(workerCenter, /deposit_\$\{getUserId\(\)\}/);
});
