const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('location helper supports normalized city cache and manual chooseLocation fallback', () => {
  const source = read('src/lib/location.ts');

  assert.match(source, /export function normalizeCityName/);
  assert.match(source, /export async function chooseManualLocation/);
  assert.match(source, /Taro\.chooseLocation/);
  assert.doesNotMatch(source, /甯\?/);
  assert.doesNotMatch(source, /鍘﹂棬/);
});

test('frontend city displays are not hard-coded to Xiamen and publish sends coordinates when available', () => {
  const search = read('src/pages/search/index.tsx');
  const publish = read('src/pages/publish/index.tsx');
  const api = read('src/lib/api.ts');

  assert.match(search, /getCachedCity|fetchCurrentCity/);
  assert.doesNotMatch(search, /厦门市|鍘﹂棬/);
  assert.match(publish, /chooseManualLocation/);
  assert.match(api, /latitude/);
  assert.match(api, /longitude/);
});
