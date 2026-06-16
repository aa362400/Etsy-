const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const configPath = path.join(root, 'config', 'index.ts');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

test('H5 dev proxy points to the real local backend port', () => {
  const source = read(configPath);

  assert.match(source, /PROJECT_DOMAIN/);
  assert.doesNotMatch(source, /target:\s*['"]http:\/\/localhost:3000['"]/);
  assert.match(source, /127\.0\.0\.1:3001/);
});
