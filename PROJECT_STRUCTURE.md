# 项目结构说明

本文用于说明当前代码应该从哪里读、从哪里改、哪些目录属于运行产物或历史资料。后续开发时，优先以这里作为结构入口。

## 一、主工程位置

主工程目录：

```text
C:\Users\1\Downloads\微信小程序\projects
```

外层目录：

```text
C:\Users\1\Downloads\微信小程序
```

外层目录主要放阶段文档、临时资料、测试目录和 worktree，不是日常开发主目录。

## 二、目录分层

```text
projects/
├─ src/                   小程序前端源码
├─ server/                后端服务源码
├─ admin-console/         后台管理控制台
├─ cloudfunctions/        微信云函数占位目录
├─ config/                Taro 构建配置
├─ docs/                  项目文档
├─ test/                  前端/跨端契约测试
├─ types/                 全局类型声明
├─ assets/                项目素材
├─ patches/               依赖补丁
├─ dist/                  微信小程序构建产物
├─ dist-web/              H5 构建产物
├─ dist-tt/               抖音/字节小程序构建产物
├─ node_modules/          依赖目录
├─ package.json           主工程脚本和依赖
└─ project.config.json    微信开发者工具配置
```

## 三、前端结构

前端源码目录：

```text
src/
├─ pages/                 页面
├─ components/            通用组件
├─ lib/                   业务工具和前端能力封装
├─ utils/                 支付、分享等工具
├─ presets/               H5/平台适配预设
├─ assets/                前端图片资源
├─ app.tsx                应用入口
├─ app.css                全局样式
├─ app.config.ts          页面路由、tabBar、权限声明
└─ network.ts             请求封装
```

重点页面：

| 页面目录 | 用途 |
| --- | --- |
| `pages/home` | 首页 |
| `pages/tasks` | 任务大厅/需求列表 |
| `pages/publish` | 发布任务 |
| `pages/task-detail` | 任务详情 |
| `pages/orders` | 订单列表 |
| `pages/order-detail` | 订单详情 |
| `pages/payment` | 支付页 |
| `pages/refund` | 退款相关页面 |
| `pages/profile` | 我的 |
| `pages/wallet` | 钱包 |
| `pages/worker-center` | 接单者中心 |
| `pages/kyc` | 实名认证 |
| `pages/messages` | 消息 |
| `pages/chat` | 聊天 |
| `pages/ai-assistant` | AI 助手 |
| `pages/agreement` | 协议 |
| `pages/report` | 举报 |

通用组件：

| 目录 | 用途 |
| --- | --- |
| `components/AiChat` | AI 聊天入口 |
| `components/ai-chat-widget` | AI 悬浮客服组件 |
| `components/ReplicaTabBar` | 自定义底部导航 |
| `components/TaskCard` | 任务卡片 |
| `components/PriceTag` | 价格展示 |
| `components/StatusTag` | 状态标签 |
| `components/UploadImages` | 图片上传 |
| `components/EmptyState` | 空状态 |
| `components/PrivacyAuth` | 隐私授权 |

## 四、后端结构

后端目录：

```text
server/
├─ src/
│  ├─ ai/                 AI 客服和 AI 配置
│  ├─ auth/               用户/管理员鉴权
│  ├─ order/              订单、退款、状态流转
│  ├─ pay/                支付
│  ├─ qrcode/             二维码
│  ├─ security/           安全与风控
│  ├─ secrets/            密钥管理
│  ├─ share/              分享
│  ├─ storage/            数据库连接与结构
│  ├─ subscribe/          订阅消息
│  ├─ ui-config/          前端 UI 配置
│  ├─ withdraw/           提现
│  ├─ app.module.ts       后端根模块
│  ├─ app.controller.ts   后端主控制器
│  └─ main.ts             后端入口
├─ sql/                   数据库变更 SQL
├─ test/                  后端测试
├─ schema.sql             数据库总结构
└─ package.json           后端脚本和依赖
```

资金、支付、退款、佣金、提现、实名风控等敏感逻辑必须优先放在 `server/`，前端不能直接决定最终金额和状态。

## 五、后台控制台

后台控制台目录：

```text
admin-console/
├─ src/
│  ├─ App.tsx
│  ├─ styles.css
│  └─ ...
├─ package.json
└─ vite.config.ts
```

后台主要用于平台运营：数据看板、审核、订单仲裁、风控、客服、后台账号等。

## 六、构建产物和临时目录

这些目录通常不需要手动修改：

| 目录 | 说明 |
| --- | --- |
| `dist/` | 微信小程序构建产物 |
| `dist-web/` | H5 构建产物 |
| `dist-tt/` | 抖音/字节小程序构建产物 |
| `node_modules/` | 依赖目录 |
| `.swc/` | 编译缓存 |
| `.codex-runlogs/` | 自动化运行日志 |
| `locks/` | 本地运行锁文件 |

## 七、外层目录说明

外层 `C:\Users\1\Downloads\微信小程序` 中：

| 路径 | 建议 |
| --- | --- |
| `projects/` | 主工程，优先保留和维护 |
| `worktrees/` | 阶段性工作副本，暂不删除 |
| `minitest/` | 小程序测试目录，暂时保留 |
| `UI对齐-*.md` | 阶段过程文档，建议归档到 `projects/docs/archive/` |
| 外层 `project.config.json` | 疑似旧配置，暂不作为主入口 |

## 八、后续改代码的安全原则

1. 先确认改的是 `projects` 主工程。
2. 先读页面、组件、接口关系，再改代码。
3. 不直接删除 `worktrees`、`dist`、历史备份，除非确认不再需要。
4. 涉及资金、实名、权限、订单状态的逻辑，优先改后端并补测试。
5. 前端页面只做展示、输入校验和调用接口，不承担核心资金计算。
