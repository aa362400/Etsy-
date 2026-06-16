const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.join(__dirname, '..');

test('deployment script points to the formal admin console directory by default', () => {
  const deployScript = fs.readFileSync(path.join(projectRoot, 'deploy.sh'), 'utf8');

  assert.match(
    deployScript,
    /ADMIN_SRC_DIR="\$\{ADMIN_SRC_DIR:-\$PROJECT_ROOT\/\.\.\/控制台\}"/,
    'deploy.sh must default ADMIN_SRC_DIR to ../控制台, otherwise production can deploy the wrong or missing console',
  );
  assert.doesNotMatch(deployScript, /鎺ュ埗鍙|皚|\?\?\?/, 'deploy.sh contains mojibake in admin console path');
});

test('miniapp production env example does not point to localhost', () => {
  const envExample = fs.readFileSync(path.join(projectRoot, '.env.production.example'), 'utf8');

  assert.doesNotMatch(envExample, /PROJECT_DOMAIN\s*=\s*https?:\/\/(?:127\.0\.0\.1|localhost|0\.0\.0\.0)(?::\d+)?/);
  assert.match(
    envExample,
    /PROJECT_DOMAIN\s*=\s*https:\/\//,
    'self-hosted miniapp production builds must use an HTTPS PROJECT_DOMAIN example',
  );
});

test('deployment script runs frontend contracts and backend predeploy checks before restart', () => {
  const deployScript = fs.readFileSync(path.join(projectRoot, 'deploy.sh'), 'utf8');
  const validateIndex = deployScript.indexOf('pnpm validate');
  const predeployIndex = deployScript.indexOf('npm run predeploy:check');
  const pm2Index = deployScript.indexOf('pm2 restart');

  assert.notEqual(validateIndex, -1, 'deploy.sh must run pnpm validate before building production artifacts');
  assert.notEqual(predeployIndex, -1, 'deploy.sh must run npm run predeploy:check before PM2 restart');
  assert.notEqual(pm2Index, -1, 'deploy.sh must still restart the PM2 service');
  assert.ok(validateIndex < predeployIndex, 'frontend/contracts validation should run before backend production predeploy checks');
  assert.ok(predeployIndex < pm2Index, 'backend predeploy checks must run before PM2 restart');
});

test('deployment script blocks admin static assets that contain local API addresses', () => {
  const deployScript = fs.readFileSync(path.join(projectRoot, 'deploy.sh'), 'utf8');
  const copyIndex = deployScript.indexOf('copy_admin_console');
  const scanIndex = deployScript.indexOf('check_admin_public_no_local_urls');
  const pm2Index = deployScript.indexOf('pm2 restart');

  assert.notEqual(scanIndex, -1, 'deploy.sh must scan built admin assets for localhost/127.0.0.1/3016 before serving them');
  assert.ok(copyIndex < scanIndex, 'admin asset scan must run after the formal console is copied to server/public/admin');
  assert.ok(scanIndex < pm2Index, 'admin asset scan must run before PM2 restart');
  assert.match(deployScript, /127\\.0\\.0\\.1|localhost|0\\.0\\.0\\.0|3016/);
});
