# 任务撮合小程序主工程

这是一个面向本地生活服务、跑腿代办、任务发布与接单场景的任务撮合平台。用户可以发布需求，接单者可以浏览、报价或申请接单，平台后续会继续完善微信登录、实名风控、订单管理、支付退款、钱包佣金、邀请奖励、AI 客服和后台数据看板。

当前主工程目录是：

```text
C:\Users\1\Downloads\微信小程序\projects
```

外层 `C:\Users\1\Downloads\微信小程序` 是工作区，不是主要开发目录。平时改代码、安装依赖、运行命令，都优先进入 `projects`。

## 技术栈

| 模块 | 技术 |
| --- | --- |
| 小程序前端 | Taro 4.1.9 + React 18 + TypeScript |
| 微信端产物 | `dist/` |
| H5 预览产物 | `dist-web/` |
| 抖音/字节小程序产物 | `dist-tt/` |
| 后端服务 | NestJS |
| 后台控制台 | Vite + React |
| 包管理 | pnpm |

## 核心目录

```text
projects/
├─ src/                 小程序前端源码
│  ├─ pages/            页面
│  ├─ components/       通用组件
│  ├─ lib/              前端业务工具、接口封装、金额/位置等工具
│  ├─ utils/            支付、分享等工具
│  ├─ app.config.ts     页面路由、tabBar、权限配置
│  ├─ app.tsx           小程序入口
│  └─ network.ts        请求封装
├─ server/              NestJS 后端服务
│  ├─ src/              后端模块代码
│  ├─ sql/              数据库变更脚本
│  ├─ schema.sql        数据库结构
│  └─ test/             后端契约测试
├─ admin-console/       后台管理控制台
├─ cloudfunctions/      微信云函数占位目录
├─ config/              Taro 构建配置
├─ docs/                项目文档
├─ test/                前端/端到端契约测试
└─ project.config.json  微信开发者工具项目配置
```

## 常用命令

请先进入主工程目录：

```powershell
cd C:\Users\1\Downloads\微信小程序\projects
```

安装依赖：

```powershell
pnpm install
```

运行 H5 前端和后端：

```powershell
pnpm dev
```

单独运行：

```powershell
pnpm dev:web
pnpm dev:weapp
pnpm dev:server
```

构建：

```powershell
pnpm build:weapp
pnpm build:web
pnpm build:server
```

检查代码：

```powershell
pnpm tsc
pnpm lint:build
pnpm test:contracts
```

## 微信开发者工具打开方式

微信开发者工具建议打开：

```text
C:\Users\1\Downloads\微信小程序\projects
```

不要直接打开 `dist-tt`，那是抖音/字节小程序产物。微信端产物是：

```text
C:\Users\1\Downloads\微信小程序\projects\dist
```

如果微信开发者工具里报 `tt is not defined`，通常说明误打开了 `dist-tt`。

## 业务目标

平台围绕三类角色设计：

| 角色 | 说明 | 核心操作 |
| --- | --- | --- |
| 需求方 | 发布任务的人 | 发布需求、支付、确认完成、评价 |
| 接单者 | 提供服务的人 | 浏览任务、申请接单、交付、提现 |
| 管理员 | 平台运营人员 | 审核、风控、退款处理、数据看板 |

核心流程：

```text
发布任务 -> 平台审核 -> 任务公开 -> 接单者申请/报价 -> 需求方选择
-> 支付 -> 服务执行 -> 提交交付 -> 确认完成 -> 结算 -> 提现
```

涉及资金、实名、佣金、退款、邀请奖励的计算，原则上都应该放在后端处理，前端只负责展示和发起请求。

## 文档入口

文档已经整理到：

```text
docs/cleanup/文档索引.md
docs/cleanup/项目整理清单.md
PROJECT_STRUCTURE.md
docs/data-context/project-context.md
```

先看 `docs/cleanup/文档索引.md`，再看具体模块文档。
