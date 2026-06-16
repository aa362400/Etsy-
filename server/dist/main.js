const fs = require('node:fs');
const path = require('node:path');
const { createServer } = require('node:http');
const { spawnSync } = require('node:child_process');

const host = process.env.HOST || '0.0.0.0';
const port = Number(process.env.PORT || 80);
const projectRoot = path.resolve(__dirname, '..', '..');
const webRoot = path.resolve(__dirname, '..', '..', 'dist-web');
const indexHtmlPath = path.join(webRoot, 'index.html');

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const send = (res, statusCode, body, contentType) => {
  res.writeHead(statusCode, { 'Content-Type': contentType });
  res.end(body);
};

const sendFile = (res, filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
};

const resolveRequestPath = (requestUrl = '/') => {
  const pathname = decodeURIComponent(requestUrl.split('?')[0] || '/');
  const normalizedPath = pathname === '/' ? '/index.html' : pathname;
  const safePath = path.normalize(normalizedPath).replace(/^(\.\.[/\\])+/, '');
  return path.join(webRoot, safePath);
};

const ensureBuildOutput = () => {
  if (fs.existsSync(indexHtmlPath)) {
    return;
  }

  console.log('[frontend-static] dist-web not found, running pnpm build:web before startup');
  const result = spawnSync('pnpm', ['build:web'], {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0 || !fs.existsSync(indexHtmlPath)) {
    throw new Error(`Missing H5 build output: ${indexHtmlPath}`);
  }
};

ensureBuildOutput();

createServer((req, res) => {
  const filePath = resolveRequestPath(req.url);

  if (filePath.startsWith(webRoot) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    sendFile(res, filePath);
    return;
  }

  sendFile(res, indexHtmlPath);
}).listen(port, host, () => {
  console.log(`[frontend-static] serving ${webRoot} at http://${host}:${port}`);
});
