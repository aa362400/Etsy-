const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const aiAssistantPath = path.join(root, 'src', 'pages', 'ai-assistant', 'index.tsx');
const aiAssistantStylePath = path.join(root, 'src', 'pages', 'ai-assistant', 'index.css');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

test('AI assistant page does not render the bottom message input bar', () => {
  const source = read(aiAssistantPath);
  const style = read(aiAssistantStylePath);

  assert.doesNotMatch(source, /className="ai-input-bar"/);
  assert.doesNotMatch(source, /继续告诉我你的需求/);
  assert.doesNotMatch(style, /\.ai-input-bar\b/);
  assert.doesNotMatch(style, /\.ai-input-wrap\b/);
});
