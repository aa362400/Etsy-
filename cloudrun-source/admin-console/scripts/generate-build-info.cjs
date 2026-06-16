const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function readCommit() {
  try {
    return execSync('git rev-parse --short HEAD', {
      cwd: path.resolve(__dirname, '..'),
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    }).trim() || 'local';
  } catch {
    return 'local';
  }
}

const buildInfo = {
  version: process.env.BUILD_VERSION || 'admin-v1',
  buildTime: new Date().toISOString(),
  commit: process.env.BUILD_COMMIT || readCommit(),
};

const outFile = path.resolve(__dirname, '..', 'src', 'build-info.ts');
const content = `export const BUILD_INFO = ${JSON.stringify(buildInfo, null, 2)} as const;\n`;
fs.writeFileSync(outFile, content, 'utf8');
console.log(`[build-info] ${buildInfo.version} ${buildInfo.buildTime} ${buildInfo.commit}`);
