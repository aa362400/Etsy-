/**
 * 小程序端 UI 装修配置缓存 / 取值。
 * - 启动时静默拉取 `/api/app/ui-config`
 * - 拉取失败 / 未到达 / 字段缺失：全部 fallback 到默认值
 * - 任何使用方都从 `getUiConfig()` / `getCopy()` 取，永不直读 server 返回
 */
import Taro from '@tarojs/taro';
import { Network } from '@/network';

export type UiPageKey =
  | 'home'
  | 'aiAssistant'
  | 'publish'
  | 'tasks'
  | 'taskDetail'
  | 'orders'
  | 'profile'
  | 'nearbyMap'
  | 'provider'
  | 'workbench';

export interface UiThemeConfig {
  preset: string;
  primary: string;
  accent: string;
  background: string;
  cardBg: string;
  textColor: string;
  subTextColor: string;
  successColor: string;
  warnColor: string;
  errorColor: string;
  radius: number;
  shadow: 'none' | 'soft' | 'medium' | 'strong';
  mode: 'warm' | 'fresh' | 'luxury' | 'cream' | 'tech';
}

export interface UiButtonConfig {
  height: number;
  fontSize: number;
  fontWeight: number;
  radius: number;
  bg: string;
  color: string;
  shadow: 'none' | 'soft' | 'medium';
  pressEffect: 'none' | 'scale' | 'fade';
}

export interface UiCardConfig {
  radius: number;
  padding: number;
  margin: number;
  shadow: 'none' | 'soft' | 'medium' | 'strong';
  titleSize: number;
  contentSize: number;
}

export interface UiBubbleConfig {
  userBg: string;
  aiBg: string;
  fontSize: number;
  radius: number;
  showAvatar: boolean;
  showTime: boolean;
  typing: boolean;
}

export interface UiAnimationConfig {
  pageEnter: 'none' | 'fade' | 'slideUp';
  cardEnter: 'none' | 'fade' | 'lift' | 'scale';
  buttonPress: 'none' | 'scale' | 'fade';
  aiBreath: boolean;
  loadingDots: boolean;
  speed: 'slow' | 'normal' | 'fast';
  intensity: 'soft' | 'normal' | 'strong';
}

export interface UiCopyConfig {
  homeWelcome: string;
  aiEntryTitle: string;
  aiEntrySubtitle: string;
  aiAssistantWelcome: string;
  aiInputPlaceholder: string;
  emptyState: string;
  loadingText: string;
  uploadSuccess: string;
  publishSuccess: string;
  handoffSuccess: string;
  networkError: string;
  unauthorized: string;
  newcomerGuide: string;
  safetyTip: string;
}

export interface UiModuleConfig {
  key: string;
  title: string;
  subtitle?: string;
  visible: boolean;
  buttonText?: string;
  routeTo?: string;
  imageUrl?: string;
  extras?: Record<string, string | number | boolean>;
}

export interface UiPageConfig {
  page: UiPageKey;
  modules: UiModuleConfig[];
}

export interface UiFullConfig {
  theme: UiThemeConfig;
  button: UiButtonConfig;
  card: UiCardConfig;
  bubble: UiBubbleConfig;
  animation: UiAnimationConfig;
  copy: UiCopyConfig;
  pages: Record<UiPageKey, UiPageConfig>;
  version: number;
  updatedAt: string;
}

const DEFAULT_THEME: UiThemeConfig = {
  preset: 'youbangOrange',
  primary: '#FF6A00',
  accent: '#FFA640',
  background: '#FFF8F2',
  cardBg: '#FFFFFF',
  textColor: '#1A1A1A',
  subTextColor: '#8A8F99',
  successColor: '#22C55E',
  warnColor: '#FF9F0A',
  errorColor: '#FF4D4F',
  radius: 24,
  shadow: 'soft',
  mode: 'warm',
};

export const DEFAULT_COPY: UiCopyConfig = {
  homeWelcome: '让需求被看见，让技能被回应',
  aiEntryTitle: '有应帮AI助手',
  aiEntrySubtitle: '一句话说清需求，AI 帮你匹配合适的人',
  aiAssistantWelcome: '有应帮AI助手\n我在这，帮你把需求说清楚一点。\n\n你可以问我：\n[帮我估价] [帮我选分类] [帮我比报价] [找人工]',
  aiInputPlaceholder: '例如：明天下午帮我搬一张沙发到思明区',
  emptyState: '这里还空空的，先发布一个需求试试',
  loadingText: '正在帮你处理，稍等一下',
  uploadSuccess: '上传成功，已帮你保存',
  publishSuccess: '发布成功，AI 正在帮你匹配合适的服务者',
  handoffSuccess: '已帮你转接人工客服，刚才的对话会一起带过去',
  networkError: '网络有点忙，稍后再试一下，也可以先转人工客服',
  unauthorized: '请先登录，方便我们帮你保留进度',
  newcomerGuide: '第一次来？先看看附近都在发布什么需求',
  safetyTip: '平台保障交易安全：实名、托管、评价、售后',
};

const DEFAULT_MODULES: Record<UiPageKey, UiModuleConfig[]> = {
  home: [
    { key: 'welcome', title: '欢迎来到有应帮', subtitle: '让需求被看见，让技能被回应', visible: true },
    { key: 'aiEntry', title: '有应帮AI助手 · 帮你说清需求', subtitle: '估价、选分类、比报价、找人工', visible: true, buttonText: '去问问', routeTo: '/pages/ai-assistant/index?scene=home' },
    { key: 'quickActions', title: '快捷入口', visible: true },
    { key: 'categories', title: '热门服务分类', visible: true },
    { key: 'aiMatchSearch', title: 'AI智能匹配', subtitle: '说出需求，附近的人来帮你', visible: true },
    { key: 'recommended', title: '猜你现在需要', visible: true },
    { key: 'nearbyProviders', title: '附近靠谱的人', visible: true, routeTo: '/pages/nearby-map/index' },
    { key: 'newcomerGuide', title: '新手引导', subtitle: '第一次来？先看看附近都在发布什么需求', visible: true },
    { key: 'safety', title: '交易安全保障中', subtitle: '实名、托管、评价、售后', visible: true },
    { key: 'support', title: '需要帮助？', subtitle: '客服与人工兜底', visible: true, routeTo: '/pages/ai-assistant/index?scene=support' },
  ],
  aiAssistant: [
    { key: 'hero', title: '有应帮AI助手', subtitle: '帮你想话术、看价格、避坑指南', visible: true },
    { key: 'quickPrompts', title: '快捷指令', visible: true },
    { key: 'chat', title: '对话区', visible: true },
    { key: 'inputBar', title: '输入框', subtitle: '例如：明天下午帮我搬一张沙发到思明区', visible: true },
  ],
  publish: [
    { key: 'aiEntry', title: 'AI 帮你写任务', subtitle: '说一句话，自动生成清楚的任务', visible: true, buttonText: '让 AI 写', routeTo: '/pages/ai-assistant/index?scene=publish' },
    { key: 'taskForm', title: '任务表单', visible: true },
    { key: 'images', title: '图片上传', subtitle: '最多 8 张', visible: true },
    { key: 'submit', title: '发布按钮', visible: true },
  ],
  tasks: [
    { key: 'filter', title: '筛选条', visible: true },
    { key: 'list', title: '任务列表', visible: true },
  ],
  taskDetail: [
    { key: 'header', title: '任务标题区', visible: true },
    { key: 'content', title: '任务内容', visible: true },
    { key: 'apply', title: '申请接单', visible: true },
  ],
  orders: [
    { key: 'filter', title: '状态筛选', visible: true },
    { key: 'aiEntry', title: '订单不清楚？让 AI 帮你', subtitle: '物流、改派、退款都能问', visible: true, routeTo: '/pages/ai-assistant/index?scene=order' },
    { key: 'list', title: '订单列表', visible: true },
  ],
  profile: [
    { key: 'userCard', title: '个人卡片', visible: true },
    { key: 'aiHistory', title: 'AI 对话记录', visible: true, routeTo: '/pages/ai-assistant/index?scene=profile' },
    { key: 'aiSupport', title: 'AI 客服 + 人工兜底', visible: true, routeTo: '/pages/ai-assistant/index?scene=support' },
    { key: 'wallet', title: '钱包', visible: true },
    { key: 'kyc', title: '实名认证', visible: true },
    { key: 'agreement', title: '用户协议与保障', visible: true },
  ],
  nearbyMap: [
    { key: 'mapTabs', title: '附近响应 / 地图派单', visible: true },
    { key: 'providerPins', title: '服务者地图点位', visible: true },
    { key: 'selectedDemand', title: '当前需求卡片', visible: true },
    { key: 'aiDispatch', title: '一键派单', visible: true },
    { key: 'safety', title: '信用保障与资金托管', visible: true },
  ],
  provider: [
    { key: 'hero', title: '服务者头部资料', visible: true },
    { key: 'skills', title: '擅长服务', visible: true },
    { key: 'bio', title: '服务说明', visible: true },
    { key: 'cases', title: '作品案例 / 服务相册', visible: true },
    { key: 'reviews', title: '用户评价', visible: true },
    { key: 'faq', title: '常见问题', visible: true },
    { key: 'workHours', title: '可服务时间', visible: true },
    { key: 'cta', title: '立即沟通 / 邀请报价', visible: true },
  ],
  workbench: [
    { key: 'briefing', title: 'AI每日简报', visible: true },
    { key: 'quickActions', title: '快捷操作', visible: true },
    { key: 'demandTrend', title: '需求趋势', visible: true },
    { key: 'incomeChart', title: '收入趋势', visible: true },
    { key: 'recommended', title: '优先处理 / AI推荐接单', visible: true },
    { key: 'mascotBanner', title: '有应帮AI助手横幅', visible: true },
  ],
};

export const DEFAULT_UI_CONFIG: UiFullConfig = {
  theme: DEFAULT_THEME,
  button: {
    height: 48, fontSize: 16, fontWeight: 600, radius: 999,
    bg: '#FF6A00', color: '#FFFFFF', shadow: 'soft', pressEffect: 'scale',
  },
  card: { radius: 24, padding: 18, margin: 12, shadow: 'soft', titleSize: 16, contentSize: 14 },
  bubble: { userBg: '#FFF1E6', aiBg: '#FFFFFF', fontSize: 14, radius: 24, showAvatar: true, showTime: true, typing: true },
  animation: { pageEnter: 'fade', cardEnter: 'fade', buttonPress: 'scale', aiBreath: true, loadingDots: true, speed: 'normal', intensity: 'soft' },
  copy: DEFAULT_COPY,
  pages: {
    home: { page: 'home', modules: DEFAULT_MODULES.home },
    aiAssistant: { page: 'aiAssistant', modules: DEFAULT_MODULES.aiAssistant },
    publish: { page: 'publish', modules: DEFAULT_MODULES.publish },
    tasks: { page: 'tasks', modules: DEFAULT_MODULES.tasks },
    taskDetail: { page: 'taskDetail', modules: DEFAULT_MODULES.taskDetail },
    orders: { page: 'orders', modules: DEFAULT_MODULES.orders },
    profile: { page: 'profile', modules: DEFAULT_MODULES.profile },
    nearbyMap: { page: 'nearbyMap', modules: DEFAULT_MODULES.nearbyMap },
    provider: { page: 'provider', modules: DEFAULT_MODULES.provider },
    workbench: { page: 'workbench', modules: DEFAULT_MODULES.workbench },
  },
  version: 1,
  updatedAt: '',
};

export const UI_CONFIG_SCHEMA_VERSION = 2;
export const UI_CONFIG_CACHE_MAX_AGE_MS = 5 * 60 * 1000;

const STORAGE_KEY = 'ui_config_cache_v1';
let cached: UiFullConfig = DEFAULT_UI_CONFIG;
let loaded = false;
const listeners = new Set<(cfg: UiFullConfig) => void>();

interface UiConfigCacheEnvelope {
  schemaVersion: number;
  cachedAt: number;
  config: UiFullConfig;
}

function tryReadCache(): UiFullConfig | null {
  try {
    const raw = Taro.getStorageSync(STORAGE_KEY);
    const parsed = typeof raw === 'string' && raw ? JSON.parse(raw) : raw;
    if (!parsed || typeof parsed !== 'object') return null;
    const maybeEnvelope = parsed as Partial<UiConfigCacheEnvelope>;
    if ('schemaVersion' in maybeEnvelope || 'cachedAt' in maybeEnvelope || 'config' in maybeEnvelope) {
      if (
        maybeEnvelope.schemaVersion !== UI_CONFIG_SCHEMA_VERSION ||
        typeof maybeEnvelope.cachedAt !== 'number' ||
        Date.now() - maybeEnvelope.cachedAt > UI_CONFIG_CACHE_MAX_AGE_MS ||
        !maybeEnvelope.config
      ) {
        Taro.removeStorageSync(STORAGE_KEY);
        return null;
      }
      return maybeEnvelope.config;
    }
    Taro.removeStorageSync(STORAGE_KEY);
  } catch {/* ignore */}
  return null;
}

function persistCache(cfg: UiFullConfig) {
  try {
    Taro.setStorageSync(STORAGE_KEY, {
      schemaVersion: UI_CONFIG_SCHEMA_VERSION,
      cachedAt: Date.now(),
      config: cfg,
    } satisfies UiConfigCacheEnvelope);
  } catch {/* ignore */}
}

function merge(base: UiFullConfig, incoming: any): UiFullConfig {
  if (!incoming || typeof incoming !== 'object') return base;
  return {
    theme: { ...base.theme, ...(incoming.theme || {}) },
    button: { ...base.button, ...(incoming.button || {}) },
    card: { ...base.card, ...(incoming.card || {}) },
    bubble: { ...base.bubble, ...(incoming.bubble || {}) },
    animation: { ...base.animation, ...(incoming.animation || {}) },
    copy: { ...base.copy, ...(incoming.copy || {}) },
    pages: {
      ...base.pages,
      ...(incoming.pages && typeof incoming.pages === 'object' ? incoming.pages : {}),
    } as UiFullConfig['pages'],
    version: typeof incoming.version === 'number' ? incoming.version : base.version,
    updatedAt: typeof incoming.updatedAt === 'string' ? incoming.updatedAt : base.updatedAt,
  };
}

function emit() {
  listeners.forEach((cb) => {
    try { cb(cached); } catch {/* ignore */}
  });
}

export function getUiConfig(): UiFullConfig {
  return cached;
}

export function getTheme(): UiThemeConfig {
  return cached.theme;
}

export function getCopy<K extends keyof UiCopyConfig>(key: K): string {
  return cached.copy?.[key] || DEFAULT_COPY[key];
}

export function getPageModules(page: UiPageKey): UiModuleConfig[] {
  const fromCfg = cached.pages?.[page]?.modules;
  if (Array.isArray(fromCfg) && fromCfg.length) return fromCfg;
  return DEFAULT_UI_CONFIG.pages[page].modules;
}

export function getModule(page: UiPageKey, key: string): UiModuleConfig | undefined {
  return getPageModules(page).find((m) => m.key === key);
}

export function isModuleVisible(page: UiPageKey, key: string): boolean {
  const m = getModule(page, key);
  return m ? !!m.visible : true;
}

export function subscribeUiConfig(cb: (cfg: UiFullConfig) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export async function loadUiConfig(): Promise<UiFullConfig> {
  // 1. 先尝试本地缓存（保证下次启动即时生效）
  if (!loaded) {
    const fromCache = tryReadCache();
    if (fromCache) {
      cached = merge(DEFAULT_UI_CONFIG, fromCache);
      emit();
    }
  }
  // 2. 再请求最新版
  try {
    const res: any = await Network.request({ url: '/api/app/ui-config', method: 'GET' });
    const payload = res?.data?.data || res?.data;
    if (payload) {
      cached = merge(DEFAULT_UI_CONFIG, payload);
      loaded = true;
      persistCache(cached);
      emit();
    }
  } catch (err) {
    console.warn('[ui-config] fetch failed, using cache/default', err);
  }
  return cached;
}
