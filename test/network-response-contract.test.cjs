const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');
const vm = require('node:vm');

const projectRoot = path.resolve(__dirname, '..');
const helperPath = path.join(projectRoot, 'src', 'lib', 'network-response.ts');

function loadHelper() {
  const source = fs.readFileSync(helperPath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2019,
    },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(output, {
    exports: module.exports,
    module,
    require,
  }, { filename: helperPath });
  return module.exports;
}

test('normalizes CloudBase callContainer JSON string response data', () => {
  const { normalizeNetworkResponseData } = loadHelper();
  const response = {
    statusCode: 200,
    data: JSON.stringify({
      code: 200,
      msg: 'success',
      data: {
        reply: '你好，我是有应帮AI助手。',
        conversation_id: 'aiconv_1',
      },
    }),
  };

  const normalized = normalizeNetworkResponseData(response);

  assert.equal(normalized.data.data.reply, '你好，我是有应帮AI助手。');
  assert.equal(normalized.data.data.conversation_id, 'aiconv_1');
});

test('keeps non-JSON string response data unchanged', () => {
  const { normalizeNetworkResponseData } = loadHelper();
  const response = {
    statusCode: 200,
    data: 'plain text',
  };

  const normalized = normalizeNetworkResponseData(response);

  assert.equal(normalized.data, 'plain text');
});
