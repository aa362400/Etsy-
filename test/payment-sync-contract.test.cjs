const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const sourcePath = path.join(__dirname, '..', 'src', 'utils', 'payment.ts');
const publishPath = path.join(__dirname, '..', 'src', 'pages', 'publish', 'index.tsx');

test('queryPayStatus asks backend to sync pending payment status from WeChat', () => {
  const source = fs.readFileSync(sourcePath, 'utf8');
  const queryPayStatus = source.match(/export async function queryPayStatus[\s\S]*?\n}\n/)?.[0] || '';

  assert.match(queryPayStatus, /\/api\/pay\/status/);
  assert.match(
    queryPayStatus,
    /sync\s*:\s*['"]1['"]|sync\s*:\s*true|sync=1/,
    'payment status polling must pass sync=1 so backend can repair delayed or missed WeChat callbacks',
  );
});

test('publish flow waits for backend paid status before treating task as market-visible', () => {
  const source = fs.readFileSync(publishPath, 'utf8');

  assert.match(source, /waitForPayPaid|pollPayStatus|queryPayStatus/);
  assert.match(source, /确认支付结果|支付确认/);
  assert.match(source, /支付确认中|支付确认超时|支付结果确认/);
});
