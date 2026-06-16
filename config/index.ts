import fs from 'node:fs';
import path from 'node:path';

import tailwindcss from '@tailwindcss/postcss';
import { UnifiedViteWeappTailwindcssPlugin } from 'weapp-tailwindcss/vite';
import { defineConfig, type UserConfigExport } from '@tarojs/cli';
import type { PluginItem } from '@tarojs/taro/types/compile/config/project';
import dotenv from 'dotenv';
import devConfig from './dev';
import prodConfig from './prod';
import pkg from '../package.json';
import { stripWeappUnsupportedCss } from './postcss-strip-weapp-unsupported';

const projectRoot = path.resolve(__dirname, '..');

const loadProjectEnv = () => {
  const explicitEnvFile = process.env.TARO_ENV_FILE?.trim();
  const isWatchBuild = process.argv.includes('--watch');
  const shouldLoadLocalEnv =
    process.env.LOAD_LOCAL_ENV === 'true' ||
    process.env.NODE_ENV === 'development' ||
    isWatchBuild;
  const envFile = explicitEnvFile || (shouldLoadLocalEnv ? '.env.local' : '.env.production');
  const envPath = path.resolve(projectRoot, envFile);

  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
};

loadProjectEnv();

export const assertRequiredWechatCloudConfig = () => {
  const isWeappBuild = process.env.TARO_ENV === 'weapp';
  const isProductionBuild = process.env.NODE_ENV === 'production' || process.env.TARO_BUILD_MODE === 'production';
  const useCloudContainer = process.env.WECHAT_USE_CLOUD_CONTAINER !== 'false';
  if (!isWeappBuild || !isProductionBuild || !useCloudContainer) return;

  const missing = [
    process.env.WECHAT_CLOUD_ENV_ID || process.env.TCB_ENV_ID ? '' : 'WECHAT_CLOUD_ENV_ID',
    process.env.WECHAT_CLOUD_SERVICE_NAME || process.env.TCB_SERVICE_NAME ? '' : 'WECHAT_CLOUD_SERVICE_NAME',
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(`[wechat-cloud] Missing required env vars: ${missing.join(', ')}`);
  }
};

assertRequiredWechatCloudConfig();

const localBackendTarget =
  process.env.PROJECT_DOMAIN ||
  process.env.COZE_PROJECT_DOMAIN_DEFAULT ||
  'http://127.0.0.1:3000';

const generateTTProjectConfig = (outputRoot: string) => {
  const config = {
    miniprogramRoot: './',
    projectname: 'coze-mini-program',
    appid: process.env.TARO_APP_TT_APPID || '',
    setting: {
      urlCheck: false,
      es6: false,
      postcss: false,
      minified: false,
    },
  };
  const outputDir = path.resolve(__dirname, '..', outputRoot);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(
    path.resolve(outputDir, 'project.config.json'),
    JSON.stringify(config, null, 2),
  );
};

const stripCssAtRuleBlock = (css: string, atRulePrefix: string) => {
  let output = '';
  let cursor = 0;

  while (cursor < css.length) {
    const start = css.indexOf(atRulePrefix, cursor);
    if (start === -1) {
      output += css.slice(cursor);
      break;
    }

    output += css.slice(cursor, start);
    const firstBrace = css.indexOf('{', start);
    if (firstBrace === -1) {
      break;
    }

    let depth = 0;
    let end = firstBrace;
    for (; end < css.length; end += 1) {
      const char = css[end];
      if (char === '{') {
        depth += 1;
      } else if (char === '}') {
        depth -= 1;
        if (depth === 0) {
          end += 1;
          break;
        }
      }
    }

    cursor = end;
  }

  return output;
};

const stripCssAtRuleBlockWhen = (
  css: string,
  atRulePrefix: string,
  shouldStripHeader: (header: string) => boolean,
) => {
  let output = '';
  let cursor = 0;

  while (cursor < css.length) {
    const start = css.indexOf(atRulePrefix, cursor);
    if (start === -1) {
      output += css.slice(cursor);
      break;
    }

    const firstBrace = css.indexOf('{', start);
    if (firstBrace === -1) {
      output += css.slice(cursor);
      break;
    }

    let depth = 0;
    let end = firstBrace;
    for (; end < css.length; end += 1) {
      const char = css[end];
      if (char === '{') {
        depth += 1;
      } else if (char === '}') {
        depth -= 1;
        if (depth === 0) {
          end += 1;
          break;
        }
      }
    }

    const header = css.slice(start, firstBrace);
    output += css.slice(cursor, start);
    if (!shouldStripHeader(header)) {
      output += css.slice(start, end);
    }
    cursor = end;
  }

  return output;
};

const sanitizeWxssContent = (css: string) => {
  let next = css;

  next = stripCssAtRuleBlock(next, '@supports');
  next = stripCssAtRuleBlockWhen(next, '@media', (header) => header.includes('color-gamut'));
  next = next.replace(
    /[^{}]*(?:::selection|::-moz-selection|::-webkit-backdrop|::backdrop)[^{]*\{[^{}]*\}/g,
    '',
  );
  next = next
    .replace(/[\w-]+:color\(display-p3[^;{}]*\);?/g, '')
    .replace(/[\w-]+:lab\([^;{}]*\);?/g, '')
    .replace(/\bcontent-visibility\s*,?/g, '')
    .replace(/\boverlay\s*,?/g, '');

  return next;
};

const sanitizeWeappWxssOutput = (outputRoot: string) => ({
  name: 'sanitize-weapp-wxss-output',
  closeBundle() {
    const outputDir = path.resolve(__dirname, '..', outputRoot);
    if (!fs.existsSync(outputDir)) {
      return;
    }

    const visit = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const filePath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          visit(filePath);
          continue;
        }
        if (!entry.isFile() || !filePath.endsWith('.wxss')) {
          continue;
        }

        const original = fs.readFileSync(filePath, 'utf8');
        const cleaned = sanitizeWxssContent(original);
        if (cleaned !== original) {
          fs.writeFileSync(filePath, cleaned, 'utf8');
        }
      }
    };

    visit(outputDir);
  },
});

const isH5MiniRoutePath = (pathname: string) =>
  /^\/pages\/[^?#]+\/index$/.test(pathname);

const isLocalProjectDomain = (domain?: string) => {
  if (!domain) return false;
  try {
    const { hostname } = new URL(domain);
    return hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '0.0.0.0';
  } catch {
    return false;
  }
};

const sendH5MiniRouteFallback = (res: any, pathname: string) => {
  const target = `/index.html#${pathname}`;
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>有应帮</title>
  <meta http-equiv="refresh" content="0;url=${target}" />
</head>
<body>
  <script>location.replace(${JSON.stringify(target)});</script>
  <p>正在打开有应帮...</p>
</body>
</html>`);
};

const redirectH5MiniRouteRequests = () => ({
  name: 'redirect-h5-mini-route-requests',
  apply: 'serve',
  enforce: 'pre',
  configureServer(server: any) {
    server.middlewares.use((req: any, res: any, next: any) => {
      const rawUrl = req.url || '';
      const pathname = rawUrl.split('?')[0];

      if (typeof pathname === 'string' && isH5MiniRoutePath(pathname)) {
        sendH5MiniRouteFallback(res, pathname);
        return;
      }

      next();
    });
  },
  configurePreviewServer(server: any) {
    server.middlewares.use((req: any, res: any, next: any) => {
      const rawUrl = req.url || '';
      const pathname = rawUrl.split('?')[0];

      if (typeof pathname === 'string' && isH5MiniRoutePath(pathname)) {
        sendH5MiniRouteFallback(res, pathname);
        return;
      }

      next();
    });
  },
});

// https://taro-docs.jd.com/docs/next/config#defineconfig-辅助函数
export default defineConfig<'vite'>(async (merge, _env) => {
  const outputRootMap: Record<string, string> = {
    weapp: 'dist',
    tt: 'dist-tt',
    h5: 'dist-web',
  };
  const defaultOutputRoot = outputRootMap[process.env.TARO_ENV || ''] || 'dist';
  const outputRoot = process.env.OUTPUT_ROOT?.trim() || defaultOutputRoot;
  const isH5 = process.env.TARO_ENV === 'h5';

  const buildMiniCIPluginConfig = () => {
    const hasWeappConfig = !!process.env.TARO_APP_WEAPP_APPID;
    const hasTTConfig = !!process.env.TARO_APP_TT_EMAIL;
    if (!hasWeappConfig && !hasTTConfig) {
      return [];
    }
    const miniCIConfig: Record<string, any> = {
      version: pkg.version,
      desc: pkg.description,
    };
    if (hasWeappConfig) {
      miniCIConfig.weapp = {
        appid: process.env.TARO_APP_WEAPP_APPID,
        privateKeyPath: 'key/private.appid.key',
      };
    }
    if (hasTTConfig) {
      miniCIConfig.tt = {
        email: process.env.TARO_APP_TT_EMAIL,
        password: process.env.TARO_APP_TT_PASSWORD,
        setting: {
          skipDomainCheck: true,
        },
      };
    }
    return [['@tarojs/plugin-mini-ci', miniCIConfig]] as PluginItem[];
  };

  const baseConfig: UserConfigExport<'vite'> = {
    projectName: 'coze-mini-program',
    date: '2026-1-13',
    alias: {
      '@': path.resolve(__dirname, '..', 'src'),
    },
    designWidth: 750,
    deviceRatio: {
      640: 2.34 / 2,
      750: 1,
      375: 2,
      828: 1.81 / 2,
    },
    sourceRoot: 'src',
    outputRoot,
    plugins: ['@tarojs/plugin-generator', ...buildMiniCIPluginConfig()],
    defineConstants: {
      PROJECT_DOMAIN: JSON.stringify(
        process.env.PROJECT_DOMAIN ||
          process.env.COZE_PROJECT_DOMAIN_DEFAULT ||
          '',
      ),
      WECHAT_CLOUD_ENV_ID: JSON.stringify(
        process.env.WECHAT_CLOUD_ENV_ID ||
          process.env.TCB_ENV_ID ||
          '',
      ),
      WECHAT_CLOUD_SERVICE_NAME: JSON.stringify(
        process.env.WECHAT_CLOUD_SERVICE_NAME ||
          process.env.TCB_SERVICE_NAME ||
          '',
      ),
      WECHAT_USE_CLOUD_CONTAINER: JSON.stringify(
        process.env.WECHAT_USE_CLOUD_CONTAINER !== 'false',
      ),
      WECHAT_CLOUD_STORAGE_PREFIX: JSON.stringify(
        process.env.WECHAT_CLOUD_STORAGE_PREFIX ||
          'task-images',
      ),
      TARO_ENV: JSON.stringify(process.env.TARO_ENV),
    },
    copy: {
      patterns: [],
      options: {},
    },
    ...(process.env.TARO_ENV === 'tt' && {
      tt: {
        appid: process.env.TARO_APP_TT_APPID,
        projectName: 'coze-mini-program',
      },
    }),
    jsMinimizer: 'esbuild',
    framework: 'react',
    compiler: {
      type: 'vite',
      vitePlugins: [
        {
          name: 'postcss-config-loader-plugin',
          config(config) {
            // 通过 postcss 配置注册 tailwindcss 插件和 WXSS 兼容性插件
            if (typeof config.css?.postcss === 'object') {
              config.css?.postcss.plugins?.unshift(tailwindcss());
              config.css?.postcss.plugins?.push(stripWeappUnsupportedCss());
            }
          },
        },
        {
          name: 'hmr-config-plugin',
          config() {
            if (!process.env.PROJECT_DOMAIN || isLocalProjectDomain(process.env.PROJECT_DOMAIN)) {
              return;
            }
            return {
              server: {
                hmr: {
                  overlay: true,
                  path: '/hot/vite-hmr',
                  port: 6000,
                  clientPort: 443,
                  timeout: 30000,
                },
              },
            };
          },
        },
        {
          name: 'react-singleton-plugin',
          config() {
            const root = path.resolve(__dirname, '..');
            return {
              resolve: {
                dedupe: ['react', 'react-dom'],
                alias: {
                  react: path.resolve(root, 'node_modules/react'),
                  'react-dom': path.resolve(root, 'node_modules/react-dom'),
                },
              },
              optimizeDeps: {
                include: ['react', 'react-dom'],
                exclude: ['@tarojs/react'],
              },
            };
          },
        },
        ...(isH5 ? [redirectH5MiniRouteRequests()] : []),
        ...(isH5
          ? []
          : [
              UnifiedViteWeappTailwindcssPlugin({
                rem2rpx: true,
                cssEntries: [path.resolve(__dirname, '../src/app.css')],
              }),
              sanitizeWeappWxssOutput(outputRoot),
            ]),
        ...(process.env.TARO_ENV === 'tt'
          ? [
              {
                name: 'generate-tt-project-config',
                closeBundle() {
                  generateTTProjectConfig(outputRoot);
                },
              },
            ]
          : []),
      ],
    },
    mini: {
      postcss: {
        pxtransform: {
          enable: true,
          config: {},
        },
        cssModules: {
          enable: false, // 默认为 false，如需使用 css modules 功能，则设为 true
          config: {
            namingPattern: 'module', // 转换模式，取值为 global/module
            generateScopedName: '[name]__[local]___[hash:base64:5]',
          },
        },
      },
    },
    h5: {
      publicPath: './',
      staticDirectory: 'static',
      router: {
        mode: 'hash',
      },
      devServer: {
        port: 5000,
        host: '0.0.0.0',
        open: false,
        proxy: {
          '/api': {
            target: localBackendTarget,
            changeOrigin: true,
          },
        },
      },
      miniCssExtractPluginOption: {
        ignoreOrder: true,
        filename: 'css/[name].[hash].css',
        chunkFilename: 'css/[name].[chunkhash].css',
      },
      postcss: {
        autoprefixer: {
          enable: true,
          config: {},
        },
        pxtransform: {
          enable: true,
          config: {
            platform: 'h5',
          },
        },
        cssModules: {
          enable: false, // 默认为 false，如需使用 css modules 功能，则设为 true
          config: {
            namingPattern: 'module', // 转换模式，取值为 global/module
            generateScopedName: '[name]__[local]___[hash:base64:5]',
          },
        },
      },
    },
    rn: {
      appName: 'coze-mini-program',
      postcss: {
        cssModules: {
          enable: false, // 默认为 false，如需使用 css modules 功能，则设为 true
        },
      },
    },
  };

  process.env.BROWSERSLIST_ENV = process.env.NODE_ENV;

  if (process.env.NODE_ENV === 'development') {
    // 本地开发构建配置（不混淆压缩）
    return merge({}, baseConfig, devConfig);
  }
  // 生产构建配置（默认开启压缩混淆等）
  return merge({}, baseConfig, prodConfig);
});
