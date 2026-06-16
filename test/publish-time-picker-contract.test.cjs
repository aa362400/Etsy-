const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const publishPath = path.join(root, 'src', 'pages', 'publish', 'index.tsx');

function readPublishSource() {
  return fs.readFileSync(publishPath, 'utf8');
}

test('publish expected time is selected from picker instead of typed manually', () => {
  const source = readPublishSource();

  assert.match(source, /@tarojs\/components['"];?\s*\n|Picker/);
  assert.match(source, /<Picker[\s\S]+expectedTimeRange[\s\S]+handleExpectedTimeChange/);
  assert.match(source, /请选择期望完成时间/);
  assert.doesNotMatch(source, /onInput=\{\(e\)\s*=>\s*setExpectedTime\(e\.detail\.value\)\}/);
});
