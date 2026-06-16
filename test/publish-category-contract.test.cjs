const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const publishPath = path.join(root, 'src', 'pages', 'publish', 'index.tsx');
const publishStylePath = path.join(root, 'src', 'pages', 'publish', 'index.css');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

test('publish page exposes richer manual categories and an expanded category state', () => {
  const source = read(publishPath);
  const style = read(publishStylePath);

  assert.match(source, /FALLBACK_CATEGORIES[\s\S]*快递代取[\s\S]*取送服务[\s\S]*排队代办/);
  assert.match(source, /FALLBACK_CATEGORIES[\s\S]*安装服务[\s\S]*家教培训[\s\S]*宠物照看/);
  assert.match(source, /categoryExpanded/);
  assert.match(source, /setCategoryExpanded/);
  assert.match(style, /\.publish-category-chips-expanded/);
  assert.match(style, /flex-wrap:\s*wrap/);
});

test('AI draft category resolver accepts service names and infers express errands from text', () => {
  const source = read(publishPath);

  assert.match(source, /resolveCategoryIdFromDraft/);
  assert.match(source, /categoryId/);
  assert.match(source, /category_name/);
  assert.match(source, /service_type/);
  assert.match(source, /快递|取件|取包裹/);
  assert.match(source, /setCategory\(resolvedCategory\)/);
  assert.doesNotMatch(source, /if\s*\(draft\.category_id\)\s*setCategory\(String\(draft\.category_id\)\)/);
});
