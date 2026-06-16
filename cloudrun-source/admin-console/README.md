# 控制台增强修改说明

## 修改时间
2026-06-05

## 修改目录
`C:\Users\1\Downloads\微信小程序\控制台\`

## 修改的文件

### 1. `src/App.tsx` — 完整增强

#### 新增功能：

**菜单切换动画系统**
- 滑动光标指示器 (`.nav-slider`)：金色半透明块跟随当前选中菜单项平滑移动，使用 `transform: translateY()` + CSS transition
- 菜单 hover 图标发光：`.nav-item:hover .nav-icon` 添加金色阴影 `box-shadow: 0 0 12px rgba(255,212,0,.35)`
- 视图容器过渡动画：点击菜单时主内容区执行 `opacity: 0 + translateY(10px)` → `opacity: 1 + translateY(0)`，持续 220ms
- 顶部欢迎区和左侧导航不重新渲染（只改变 content 区）
- 状态卡片 staggered 入场（每张延迟 40ms）

**菜单切换 Toast 文案**
每个菜单点击时显示对应的中文提示，如：
- 主控台 → "主控台已打开，平台状态正在同步。"
- 内容审核 → "审核工作台已打开，先把风险挡在门外。"
- 风险词库 → "风险雷达已开启，正在守住平台边界。"

**地区视角切换**
- 顶部搜索框左侧新增地区选择按钮（胶囊样式），显示当前地区 + 视角类型
- 点击弹出地区选择面板（浮层），包含：
  - 搜索城市/区县
  - 当前地区（带 ✓ 标记）
  - 全国视角
  - 热门城市（厦门、福州、泉州、漳州、北京、上海、深圳、杭州）
  - 厦门区县（思明、湖里、集美、海沧、同安、翔安）
  - 刷新当前地区按钮
- 切换时有 3 步状态反馈：
  1. "正在切换到【厦门】运营视角…"
  2. "正在同步该地区任务、订单、用户、审核和风险数据。"
  3. "已进入【厦门】视角，今天也要稳稳接住每一个需求。"
- 30 秒内重复切换同一地区使用缓存，避免重复请求
- 切换时`loadAll()`带地区参数重新加载数据
- 地区选择持久化到 `localStorage`

**Count-up 数字动画**
- 使用 `useCountUp` 自定义 Hook，基于 `requestAnimationFrame` 实现
- easing 函数：`1 - (1 - progress)^3`（ease-out cubic）
- 动画时长 700ms
- 数据更新时数字从旧值平滑滚动到新值
- 高风险/异常数据有 pulse 动画提醒

**骨架屏加载**
- 首次加载（`loading && dataVersion === 0`）显示骨架屏
- 6 列卡片骨架 + 3 列大卡片骨架，shimmer 动画
- 后续数据刷新不显示骨架屏，避免闪烁

**AI 管家上下文感知**
- 根据当前模块（activeView）显示不同文案：
  - 主控台："我会帮你盯住审核、订单、风险和用户反馈。"
  - 风险词库："我可以帮你识别敏感词、诈骗词和违规描述。"
  - 订单仲裁："我可以帮你整理纠纷原因，减少误判。"
  - 用户增长："我可以帮你分析今天新增用户从哪里来。"
- AI 管家 4 种状态：
  - idle（绿色）："我在，随时帮你看住平台。"
  - syncing（蓝色）："我正在读取最新数据。"（图标跳动动画）
  - risk（红色）："发现异常，请先看风险模块。"
  - error（橙色）："后端还没接稳，我先帮你守住安全状态。"

**系统状态卡人性化**
- 数据库未连接时显示：
  - 标题："数据管道还没接上"
  - 正文：配置检查指引
  - 按钮："重新同步数据" / "查看后端检查项"
- 真实接口正常时："控制台正在读取线上数据。"

**空状态温暖文案**
- 高风险 0 → "平台很安全"
- 待审核 0 → "今天很清爽"
- 羊毛拦截 0 → "系统已守住"
- 异常用户 > 0 → "有人需要留意"

**新增导航项**
- 用户增长看板（placeholder）
- AI 会话（placeholder）
- 客服工单（placeholder）
- 后台账号（完整 CRUD）
- 操作日志（完整筛选和列表）

**性能优化**
- 所有动画使用 `transform` 和 `opacity`，不改变 `width/height/top/left`
- 菜单切换动画 ≤ 220ms
- 动画 easing：`cubic-bezier(0.4, 0, 0.2, 1)`
- 地区数据 30 秒缓存
- 接口失败不阻塞整个控制台
- `loadAll` 使用 `Promise.allSettled` 独立容错

**权限保留**
- 管理员登录 token 验证不变
- `authHeaders` 保持 `Authorization` + `x-admin-id`
- 超级管理员/审核员/客服角色框架不变

### 2. `src/styles.css` — 完整重写

- 滑动光标 `.nav-slider` 样式
- 菜单 hover 发光 `.nav-item:hover .nav-icon`
- 视图过渡 `.view-container .view-entering .view-active`
- 地区选择器 `.region-trigger` `.region-panel` `.region-overlay` `.region-sync-bar`
- 骨架屏 `.skeleton-root` `.skeleton-card` `.skeleton-grid-6` `.skeleton-grid-3` + shimmer 动画
- AI 管家状态 `.ai-helper-idle` `.ai-helper-syncing` `.ai-helper-risk` `.ai-helper-error`
- AI 状态标签 `.ai-helper-status` `.ai-status-*`
- 系统状态卡增强 `.reminder-card-warn` `.reminder-actions` `.reminder-btn`
- Count-up 数字 `.count-up` `.status-card-value`（tabular-nums）
- 卡片 staggered 动画 `.status-card` + `nth-child` 延迟
- Pulse 动画 `.status-card-pulse` + `cardPulse` keyframes
- Toast 入场动画
- 地区面板入场动画
- 响应式优化（1440/1280/1100/1024/768/480）

## 是否有影响接口
**否。** 所有 API 调用路径、参数格式保持不变。
- `loadAll()` 在地区切换时增加 region 参数通过请求头传递，但不影响现有接口
- 所有接口调用仍使用 `request<T>()` 封装
- 接口失败时使用 `Promise.allSettled` 独立容错

## 是否有影响权限
**否。**
- 登录流程不变：`/admin/login` → token → localStorage
- 权限框架不变：超级管理员/审核员/客服角色
- 所有操作仍通过 `authHeaders` 发送 token

## 地区切换如何配置
1. 在 `HOT_CITIES` 数组中添加城市：
```typescript
{ id: 'cityname', label: '城市名', type: 'city' }
```
2. 在 `DISTRICTS` 对象中添加区县：
```typescript
cityname: [
  { id: 'district1', label: '区县名', type: 'district', parent: 'cityname' },
]
```
3. 后端如需支持地区参数，在 `/admin/dashboard` 等接口接收 `region` query 参数
4. 前端已在 `handleRegionSwitch` 中做好 region 参数传递预留

## 如何测试菜单切换
1. `cd C:\Users\1\Downloads\微信小程序\控制台`
2. `npm install && npm run dev -- --host 127.0.0.1 --port 5199`
3. 打开 http://localhost:5199/
4. 登录后点击左侧任意菜单项
5. 验证：滑动光标跟随、菜单项高亮、Toast 文案出现、内容区淡入上滑

## 如何测试地区切换
1. 点击顶部搜索框左侧的地区按钮（📍 厦门 · 全城视角）
2. 选择任意城市
3. 验证：同步状态条出现 → 数据刷新 → 完成提示 → 地区持久化

## 如何测试数据库未连接状态
1. 停止后端服务
2. 刷新控制台
3. 验证右侧系统状态卡显示："数据管道还没接上" + 两个操作按钮

## 关于端口和路径

- 开发模式（`npm run dev`）：访问 `http://localhost:5199/`（根路径）
- 生产模式（`npm run build`）：构建产物部署后在 `http://<domain>/admin/` 访问
- 旧端口 `localhost:10090` 是已废弃的 Taro H5 预览端口，请忽略
- 旧端口 `localhost:5173` 是 Vite 默认端口，当前统一使用 **5199**

## 如何回滚
```bash
cd C:\Users\1\Downloads\微信小程序\控制台
git checkout -- src/App.tsx src/styles.css
```
如果没有 git，可以从 `C:\Users\1\Downloads\微信小程序\projects\admin-console\src\` 复制原始文件（注意两个目录结构不同）。
