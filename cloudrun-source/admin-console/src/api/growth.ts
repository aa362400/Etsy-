export interface GrowthOverview {
  todayNewUsers: number;
  totalUsers: number;
  activeUsers: number;
  conversionRate: number;
  taskPublishUsers: number;
  taskCompletedUsers: number;
  promotionCost: number;
  acquisitionCost: number;
  dataMode?: string;
  updatedAt?: string;
}

export interface GrowthTrendPoint {
  date: string;
  newUsers: number;
  activeUsers: number;
  taskPublishUsers: number;
  conversionRate: number;
}

export interface GrowthChannel {
  name: string;
  visits: number;
  registers: number;
  taskPublishUsers: number;
  conversionRate: number;
  estimatedCost: number;
  status: '优秀' | '正常' | '待优化';
}

export interface GrowthFunnelStep {
  key: string;
  label: string;
  count: number;
  conversionRate: number;
}

export interface GrowthRiskItem {
  name: string;
  count: number;
  status: '风险平稳' | '需要观察' | '建议拦截' | '高危预警';
  suggestion: string;
}

export interface GrowthDashboardData {
  overview: GrowthOverview;
  trend7: GrowthTrendPoint[];
  trend30: GrowthTrendPoint[];
  channels: GrowthChannel[];
  funnel: GrowthFunnelStep[];
  risks: GrowthRiskItem[];
  apiStatus: string;
  usingFallback: boolean;
}

export type AdminRequest = <T>(path: string, options?: RequestInit) => Promise<T>;

export const fallbackGrowthStats: GrowthOverview = {
  todayNewUsers: 0,
  totalUsers: 0,
  activeUsers: 0,
  conversionRate: 0,
  taskPublishUsers: 0,
  taskCompletedUsers: 0,
  promotionCost: 0,
  acquisitionCost: 0,
};

const channelNames = ['朋友圈', '社群', '物业合作', '驿站合作', '便利店合作', '自然搜索', '扫码进入', '老用户分享'];
const riskNames = ['同设备多账号', '同 IP 多账号', '频繁领取新人奖励', '注册后不发布任务', '异常邀请关系', '地理位置异常'];
const funnelLabels = ['进入小程序', '微信授权登录', '领取新人奖励', '浏览任务', '发布任务', '完成首单'];

function emptyTrend(days: number): GrowthTrendPoint[] {
  return Array.from({ length: days }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - index));
    return { date: `${date.getMonth() + 1}/${date.getDate()}`, newUsers: 0, activeUsers: 0, taskPublishUsers: 0, conversionRate: 0 };
  });
}

function fallbackChannels(): GrowthChannel[] {
  return channelNames.map((name) => ({ name, visits: 0, registers: 0, taskPublishUsers: 0, conversionRate: 0, estimatedCost: 0, status: '正常' }));
}

function fallbackRisks(): GrowthRiskItem[] {
  return riskNames.map((name) => ({ name, count: 0, status: '风险平稳', suggestion: '暂无异常，保持观察。' }));
}

function fallbackFunnel(): GrowthFunnelStep[] {
  return funnelLabels.map((label, index) => ({ key: `step_${index}`, label, count: 0, conversionRate: index === 0 ? 100 : 0 }));
}

export const fallbackGrowthData: GrowthDashboardData = {
  overview: fallbackGrowthStats,
  trend7: emptyTrend(7),
  trend30: emptyTrend(30),
  channels: fallbackChannels(),
  funnel: fallbackFunnel(),
  risks: fallbackRisks(),
  apiStatus: '接口暂未接入，当前展示安全兜底数据',
  usingFallback: true,
};

function toRate(value: unknown) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return 0;
  return num > 1 ? num : num * 100;
}

function normalizeOverview(raw: any): GrowthOverview {
  return {
    todayNewUsers: Number(raw?.todayNewUsers ?? raw?.today_new_users ?? 0),
    totalUsers: Number(raw?.totalUsers ?? raw?.total_users ?? 0),
    activeUsers: Number(raw?.activeUsers ?? raw?.current_online_users ?? raw?.today_wechat_login_users ?? 0),
    conversionRate: toRate(raw?.conversionRate ?? raw?.conversion_rate ?? 0),
    taskPublishUsers: Number(raw?.taskPublishUsers ?? raw?.task_publish_users ?? 0),
    taskCompletedUsers: Number(raw?.taskCompletedUsers ?? raw?.task_completed_users ?? raw?.first_order_count ?? 0),
    promotionCost: Number(raw?.promotionCost ?? raw?.promotion_cost ?? 0),
    acquisitionCost: Number(raw?.acquisitionCost ?? raw?.acquisition_cost ?? 0),
    dataMode: raw?.dataMode ?? raw?.data_mode,
    updatedAt: raw?.updatedAt ?? raw?.updated_at,
  };
}

function normalizeTrend(raw: any, days: number): GrowthTrendPoint[] {
  const list = Array.isArray(raw?.items) ? raw.items : Array.isArray(raw) ? raw : [];
  const normalized = list.map((item: any) => ({
    date: item.date || (item.time ? `${new Date(item.time).getMonth() + 1}/${new Date(item.time).getDate()}` : ''),
    newUsers: Number(item.newUsers ?? item.new_users ?? 0),
    activeUsers: Number(item.activeUsers ?? item.phone_bind_users ?? item.close ?? 0),
    taskPublishUsers: Number(item.taskPublishUsers ?? item.task_publish_users ?? item.invite_new_users ?? 0),
    conversionRate: toRate(item.conversionRate ?? item.conversion_rate ?? 0),
  })).filter((item: GrowthTrendPoint) => item.date);
  return normalized.length ? normalized.slice(-days) : emptyTrend(days);
}

function channelStatus(rate: number): GrowthChannel['status'] {
  if (rate >= 35) return '优秀';
  if (rate >= 12) return '正常';
  return '待优化';
}

function normalizeChannels(raw: any): GrowthChannel[] {
  const list = Array.isArray(raw?.items) ? raw.items : Array.isArray(raw) ? raw : [];
  const normalized: GrowthChannel[] = list.map((item: any) => {
    const visits = Number(item.visits ?? item.visit_count ?? 0);
    const registers = Number(item.registers ?? item.register_count ?? 0);
    const taskPublishUsers = Number(item.taskPublishUsers ?? item.task_publish_users ?? item.valid_user_count ?? 0);
    const conversionRate = visits ? (registers / visits) * 100 : toRate(item.conversionRate ?? item.conversion_rate ?? 0);
    return {
      name: item.name || item.source_channel || item.source_type || '自然搜索',
      visits,
      registers,
      taskPublishUsers,
      conversionRate,
      estimatedCost: Number(item.estimatedCost ?? item.estimated_cost ?? item.reward_cost ?? 0),
      status: (item.status || channelStatus(conversionRate)) as GrowthChannel['status'],
    };
  });
  const byName = new Map(normalized.map((item: GrowthChannel) => [item.name, item]));
  return channelNames.map((name) => byName.get(name) || { name, visits: 0, registers: 0, taskPublishUsers: 0, conversionRate: 0, estimatedCost: 0, status: '正常' });
}

function normalizeFunnel(raw: any): GrowthFunnelStep[] {
  const list = Array.isArray(raw?.items) ? raw.items : Array.isArray(raw) ? raw : [];
  const normalized = list.slice(0, 6).map((item: any, index: number) => ({
    key: item.key || `step_${index}`,
    label: funnelLabels[index] || item.label || `步骤 ${index + 1}`,
    count: Number(item.count ?? 0),
    conversionRate: toRate(item.conversionRate ?? item.conversion_rate ?? 0),
  }));
  return normalized.length ? normalized : fallbackFunnel();
}

function riskStatus(count: number): GrowthRiskItem['status'] {
  if (count >= 20) return '高危预警';
  if (count >= 8) return '建议拦截';
  if (count >= 1) return '需要观察';
  return '风险平稳';
}

function normalizeRisks(raw: any): GrowthRiskItem[] {
  const list = Array.isArray(raw?.items) ? raw.items : Array.isArray(raw) ? raw : [];
  const normalized: GrowthRiskItem[] = list.map((item: any) => {
    const count = Number(item.count ?? 0);
    return {
      name: item.name || item.label || '未知风险',
      count,
      status: (item.status || riskStatus(count)) as GrowthRiskItem['status'],
      suggestion: item.suggestion || (count > 0 ? '建议运营复核近期注册和奖励领取记录。' : '暂无异常，保持观察。'),
    };
  });
  const byName = new Map(normalized.map((item: GrowthRiskItem) => [item.name, item]));
  return riskNames.map((name) => byName.get(name) || { name, count: 0, status: '风险平稳', suggestion: '暂无异常，保持观察。' });
}

async function optional<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export async function fetchGrowthDashboard(request: AdminRequest): Promise<GrowthDashboardData> {
  let usedFallback = false;
  const overviewRaw = await optional(() => request<any>('/admin/growth/overview'), null);
  const legacyOverviewRaw = overviewRaw || await optional(() => request<any>('/admin/growth/realtime'), null);
  if (!legacyOverviewRaw) usedFallback = true;

  const trend7Raw = await optional(() => request<any>('/admin/growth/trend?granularity=day'), null);
  if (!trend7Raw) usedFallback = true;

  const channelsRaw = await optional(() => request<any>('/admin/growth/channels'), null) || await optional(() => request<any>('/admin/growth/source-rank'), null);
  if (!channelsRaw) usedFallback = true;

  const funnelRaw = await optional(() => request<any>('/admin/growth/funnel'), null);
  if (!funnelRaw) usedFallback = true;

  const riskRaw = await optional(() => request<any>('/admin/growth/risk'), null);
  if (!riskRaw) usedFallback = true;

  return {
    overview: legacyOverviewRaw ? normalizeOverview(legacyOverviewRaw) : fallbackGrowthStats,
    trend7: trend7Raw ? normalizeTrend(trend7Raw, 7) : emptyTrend(7),
    trend30: trend7Raw ? normalizeTrend(trend7Raw, 30) : emptyTrend(30),
    channels: channelsRaw ? normalizeChannels(channelsRaw) : fallbackChannels(),
    funnel: funnelRaw ? normalizeFunnel(funnelRaw) : fallbackFunnel(),
    risks: riskRaw ? normalizeRisks(riskRaw) : fallbackRisks(),
    apiStatus: usedFallback ? '部分增长接口暂未接入，当前已自动展示安全兜底数据。' : '增长接口已接入，当前展示真实数据。',
    usingFallback: usedFallback,
  };
}
