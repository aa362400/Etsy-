## 前端拆分说明

来源目录：
`C:\Users\1\Downloads\微信小程序\projects`

当前角色：
- 微信小程序前端
- H5 前端预览壳
- 统一请求后端 API

已保留内容：
- `src/` 前端源码
- `config/` Taro 构建配置
- `assets/` `types/` `patches/` `test/`
- `package.json` `tsconfig.json` `project.config.json` 等运行配置

已调整内容：
- `package.json` 改成前端独立脚本，不再依赖原总工程里的后端脚本
- 默认本地后端地址改成 `http://127.0.0.1:3000`
- 统一使用 `.env.local` / `.env.production` 控制接口地址

需要你自己新建的环境文件：
- 本地调试：把 `.env.local.example` 复制成 `.env.local`
- 生产构建：把 `.env.production.example` 复制成 `.env.production`

推荐命令：
```powershell
pnpm install
pnpm dev:weapp
pnpm dev:web
pnpm build:weapp
pnpm build:web
```

联通规则：
- 如果小程序和 H5 都走同一个后端域名，填 `PROJECT_DOMAIN=https://api.example.com`
- 如果小程序走微信云托管容器，清空 `PROJECT_DOMAIN`，改配 `WECHAT_CLOUD_ENV_ID` 和 `WECHAT_CLOUD_SERVICE_NAME`
- 不管哪种方式，最终都要连到同一套后端和同一套数据库

联调检查：
1. 打开后端健康检查：`https://你的后端域名/api/health`
2. 小程序登录、任务列表、订单列表都能正常请求
3. 控制台里看到的数据和小程序看到的数据一致
