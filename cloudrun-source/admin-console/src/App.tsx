import { CSSProperties, FormEvent, ReactNode, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { UiDecorView } from './UiDecorView';
import { ApiKeysPage } from './pages/ApiKeysPage';
import { GrowthDashboardPage } from './pages/GrowthDashboardPage';
import { AiConversationsView, SupportTicketsView } from './_from_old_admin_console/AiViews';
import { BUILD_INFO } from './build-info';

const configuredApiBase = import.meta.env.VITE_API_BASE || '/api';
const API_BASE = configuredApiBase;
const TEST_PREFIX = 'ADMIN_TEST_';

type ApiState = 'unknown' | 'live' | 'error' | 'syncing';
type AuditAction = 'approve' | 'reject';
type ViewKey = 'dashboard' | 'orders' | 'reviews' | 'tasks' | 'providers' | 'users' | 'dispatch' | 'finance' | 'disputes' | 'riskWords' | 'cityOps' | 'growth' | 'uiDecor' | 'aiConversations' | 'aiTickets' | 'apiKeys' | 'accounts' | 'opLogs' | 'settings';

const VIEWER_HIDDEN_VIEWS = new Set<ViewKey>(['accounts', 'apiKeys', 'riskWords', 'finance']);
const canAccessView = (role: string | undefined, view: ViewKey) => role === 'viewer' ? !VIEWER_HIDDEN_VIEWS.has(view) : true;

function viewFromLocation(): ViewKey {
  const path = window.location.pathname.replace(/\/+$/, '');
  if (path === '/admin/settings/api-keys') return 'apiKeys';
  if (path === '/admin/growth') return 'growth';
  if (path === '/admin/orders') return 'orders';
  if (path === '/admin/demands') return 'tasks';
  if (path === '/admin/audit') return 'reviews';
  if (path === '/admin/providers') return 'providers';
  if (path === '/admin/users') return 'users';
  if (path === '/admin/dispatch') return 'dispatch';
  if (path === '/admin/finance') return 'finance';
  if (path === '/admin/support') return 'disputes';
  if (path === '/admin/risk') return 'riskWords';
  if (path === '/admin/cities') return 'cityOps';
  return 'dashboard';
}

function pathForView(view: ViewKey) {
  const pathMap: Partial<Record<ViewKey, string>> = {
    dashboard: '/admin/',
    orders: '/admin/orders',
    tasks: '/admin/demands',
    reviews: '/admin/audit',
    providers: '/admin/providers',
    users: '/admin/users',
    dispatch: '/admin/dispatch',
    finance: '/admin/finance',
    disputes: '/admin/support',
    riskWords: '/admin/risk',
    cityOps: '/admin/cities',
    growth: '/admin/growth',
    apiKeys: '/admin/settings/api-keys',
  };
  return pathMap[view] || '/admin/';
}

/* ========= 地区数据 ========= */
interface RegionOption {
  id: string; label: string; type: 'city' | 'district' | 'national'; parent?: string;
}
const HOT_CITIES: RegionOption[] = [
  { id: 'xiamen', label: '厦门', type: 'city' },
  { id: 'fuzhou', label: '福州', type: 'city' },
  { id: 'quanzhou', label: '泉州', type: 'city' },
  { id: 'zhangzhou', label: '漳州', type: 'city' },
  { id: 'beijing', label: '北京', type: 'city' },
  { id: 'shanghai', label: '上海', type: 'city' },
  { id: 'shenzhen', label: '深圳', type: 'city' },
  { id: 'hangzhou', label: '杭州', type: 'city' },
];
const DISTRICTS: Record<string, RegionOption[]> = {
  xiamen: [
    { id: 'siming', label: '思明区', type: 'district', parent: 'xiamen' },
    { id: 'huli', label: '湖里区', type: 'district', parent: 'xiamen' },
    { id: 'jimei', label: '集美区', type: 'district', parent: 'xiamen' },
    { id: 'haicang', label: '海沧区', type: 'district', parent: 'xiamen' },
    { id: 'tongan', label: '同安区', type: 'district', parent: 'xiamen' },
    { id: 'xiangan', label: '翔安区', type: 'district', parent: 'xiamen' },
  ],
};

/* ========= 状态映射 ========= */
const STATUS_LABEL: Record<string, string> = {
  all: '全部', pending: '待审核', approved: '已通过', rejected: '已驳回',
  pending_audit: '待审核', pending_payment: '待支付', open: '开放中', assigned: '已分配', submitted: '待验收', revision: '待修改', disputed: '争议中',
  unpaid: '待支付', paid: '已支付', pay_failed: '支付失败', available: '可接单', in_progress: '进行中', completed: '已完成', cancelled: '已取消', refunding: '退款中', refunded: '已退款',
  active: '活跃', banned: '封禁', frozen: '冻结', deleted: '已注销',
  client: '普通用户', worker: '接单者', provider: '服务者', super_admin: '超级管理员', operator: '审核运营', customer_service: '客服', finance: '财务', viewer: '只读',
  processing: '处理中', resolved: '已解决', blocked: '已拦截',
};
const statusDisplay = (s: string | undefined | null) => (s ? STATUS_LABEL[s] || s : '');

/* ========= 接口类型 ========= */
interface ApiResponse<T> { code: number; msg: string; data: T; }
interface PageResult<T> { items?: T[]; data?: T[]; total?: number; count?: number; }

interface DashboardData {
  today_orders?: number; pending_audit?: number; pending_disputes?: number;
  total_users?: number; anti_abuse_blocked?: number; anti_abuse_review?: number;
  todayOrders?: number; pendingAudit?: number; pendingDisputes?: number;
  antiAbuseBlocked?: number; antiAbuseReview?: number;
}

interface TaskFile { id: string; file_url: string; file_type?: string; created_at?: string; }

interface AdminTask {
  id: string; title: string; description: string; budget_amount: string | number;
  region?: string; city?: string; address?: string; service_type?: string; status?: string; audit_status?: string;
  risk_flag?: string; risk_score?: number;
  anti_abuse?: { score?: number; reasons?: string[]; tags?: string[]; action?: string };
  reject_reason?: string; created_at?: string; updated_at?: string; deadline?: string; publisher_id?: string; worker_id?: string;
  users?: { nickname?: string }; task_categories?: { name?: string }; task_files?: TaskFile[];
}

interface AdminUser { id: string; nickname?: string; phone?: string; role?: string; status?: string; created_at?: string; real_name_status?: string; rating?: number; service_count?: number; completed_orders?: number; city?: string; region?: string; }
interface AdminOrder { id: string; order_no?: string; task_id?: string; status?: string; pay_status?: string; refund_status?: string; amount?: string | number; created_at?: string; paid_at?: string; completed_at?: string; worker_id?: string; publisher_id?: string; tasks?: { title?: string; service_type?: string; region?: string }; }
interface AdminDispute { id: string; order_id?: string; reason?: string; evidence_urls?: string; status?: string; decision?: string; decision_note?: string; created_at?: string; }
interface RiskWord { id: string; word: string; category: string; action: string; status?: string; note?: string; created_at?: string; }
interface AuditLog { id: string; action: string; target_type?: string; target_id?: string; detail?: string; created_at?: string; }
interface AdminAccount { id: string; username: string; display_name?: string; role?: string; status?: string; last_login_at?: string; last_login_ip?: string; created_at?: string; }
interface AdminOpLog { id: string; admin_id?: string; admin_username?: string; action: string; target_type?: string; target_id?: string; detail?: string; ip?: string; created_at?: string; }

interface TaskVisibilityWarning {
  task_id: string; title?: string; status?: string; audit_status?: string;
  order_status?: string; pay_status?: string; reason?: string;
}

interface TaskVisibilityAudit {
  pending_audit?: number; approved_unpaid?: number; market_visible?: number;
  paid_but_hidden?: number; public_statuses?: string[]; release_warnings?: TaskVisibilityWarning[];
}

interface DashboardSummary {
  total_users?: number; today_new_users?: number; total_tasks?: number; today_new_tasks?: number;
  pending_audit_tasks?: number; total_orders?: number; today_new_orders?: number;
  pending_disputes?: number; total_admins?: number; anti_abuse_blocked_today?: number;
  task_visibility?: TaskVisibilityAudit;
  db_connected?: boolean; db_mode?: 'memory' | 'postgres' | 'database'; environment?: string;
}

/* ========= 导航定义 ========= */
const navItems: Array<{ key: ViewKey; icon: string; label: string; desc: string }> = [
  { key: 'dashboard', icon: '总', label: '数据总览', desc: '经营心跳' },
  { key: 'orders', icon: '单', label: '订单管理', desc: '支付交付' },
  { key: 'tasks', icon: '需', label: '需求管理', desc: '任务生命周期' },
  { key: 'reviews', icon: '审', label: '需求审核', desc: '上架与驳回' },
  { key: 'providers', icon: '服', label: '服务者管理', desc: '接单者质量' },
  { key: 'users', icon: '客', label: '用户管理', desc: '注册与实名' },
  { key: 'dispatch', icon: '派', label: '派单中心', desc: '供需撮合' },
  { key: 'finance', icon: '财', label: '财务中心', desc: '成交与退款' },
  { key: 'disputes', icon: '仲', label: '客服仲裁', desc: '纠纷处理' },
  { key: 'riskWords', icon: '风', label: '风控中心', desc: '规则与拦截' },
  { key: 'cityOps', icon: '城', label: '城市运营', desc: '区域看板' },
  { key: 'growth', icon: '增', label: '增长看板', desc: '推广与留存' },
  { key: 'aiConversations', icon: 'AI', label: 'AI 中控', desc: '会话与工单' },
  { key: 'uiDecor', icon: '装', label: '小程序装修', desc: '前端配置' },
  { key: 'settings', icon: '设', label: '系统设置', desc: '安全配置' },
  { key: 'accounts', icon: '权', label: '后台账号', desc: '团队权限' },
  { key: 'opLogs', icon: '志', label: '操作日志', desc: '行为留痕' },
];

/* ========= 菜单切换文案 ========= */
navItems.splice(Math.max(navItems.findIndex((item) => item.key === 'aiConversations'), 0), 0, {
  key: 'apiKeys',
  icon: 'KEY',
  label: 'API 配置',
  desc: '密钥中心',
});

const MENU_TOASTS: Partial<Record<ViewKey, string>> = {
  dashboard: '数据总览已打开，平台状态正在同步。',
  growth: '增长地图已展开，正在查看今天的新脚印。',
  reviews: '需求审核已打开，先把风险挡在上架前。',
  tasks: '需求池正在整理，后台审核后的任务会在这里留下记录。',
  providers: '服务者管理已打开，正在查看接单者质量。',
  users: '用户管理已打开，正在查看平台来客。',
  orders: '订单河流正在加载，每一单都要稳稳接住。',
  dispatch: '派单中心已打开，正在检查哪些需求需要推动接单。',
  finance: '财务中心已打开，金额只展示后端结果，不由前端决定。',
  disputes: '客服仲裁台已开启，正在查看需要判断的纠纷。',
  riskWords: '风控中心已开启，正在守住平台边界。',
  cityOps: '城市运营视角已打开，正在汇总区域业务状态。',
  accounts: '权限中心已打开，管理员身份正在校验。',
  opLogs: '行为痕迹已展开，每一次操作都有记录。',
  aiConversations: 'AI 中控已上线，准备协助处理反馈。',
  aiTickets: '客服工单已打开，用户的问题有人接。',
  settings: '系统设置已打开，请谨慎操作。',
};

/* ========= AI 管家文案 ========= */
MENU_TOASTS.apiKeys = 'API 密钥中心已打开，只展示脱敏状态。';

const AI_MESSAGES: Partial<Record<ViewKey, { main: string; state: string }>> & { dashboard: { main: string; state: string } } = {
  dashboard: { main: '我会帮你盯住审核、订单、风险和用户反馈。', state: 'idle' },
  growth: { main: '我可以帮你分析今天新增用户从哪里来。', state: 'idle' },
  reviews: { main: '我会帮你标记高风险内容，减少漏放。', state: 'idle' },
  tasks: { main: '我可以帮你检查任务描述、预算和风险分。', state: 'idle' },
  providers: { main: '我可以帮你识别高质量服务者和异常接单者。', state: 'idle' },
  users: { main: '我可以帮你识别异常注册和薅羊毛行为。', state: 'idle' },
  orders: { main: '我可以帮你监控订单交付和支付异常。', state: 'idle' },
  dispatch: { main: '我会把待接单、待支付和异常订单排好优先级。', state: 'idle' },
  finance: { main: '我只展示后端金额结果，退款和佣金不能由前端拍板。', state: 'idle' },
  disputes: { main: '我可以帮你整理纠纷原因，减少误判。', state: 'idle' },
  riskWords: { main: '我可以帮你识别敏感词、诈骗词和违规描述。', state: 'idle' },
  cityOps: { main: '我可以帮你比较不同城市的需求、订单和风险压力。', state: 'idle' },
  accounts: { main: '我可以帮你记录管理员操作轨迹。', state: 'idle' },
  opLogs: { main: '我可以帮你分析操作日志，发现异常行为。', state: 'idle' },
  aiConversations: { main: '我正在学习用户与 AI 的对话模式。', state: 'idle' },
  aiTickets: { main: '我可以帮你把用户问题归类，优先处理高风险反馈。', state: 'idle' },
  settings: { main: '我可以帮你检查系统配置安全。', state: 'idle' },
};

/* ========= 辅助函数 ========= */
function unwrapList<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  const page = result as PageResult<T>;
  return page.items || page.data || [];
}

function formatMoney(amount?: string | number) {
  const value = Number(amount || 0) / 100;
  if (!Number.isFinite(value)) return '¥0';
  return value >= 100 ? `¥${value.toFixed(0)}` : `¥${value.toFixed(2)}`;
}

function amountYuan(amount?: string | number) {
  const cents = Number(amount || 0);
  if (!Number.isFinite(cents)) return 0;
  return cents / 100;
}

function isProvider(user: AdminUser) {
  return user.role === 'worker' || Number(user.service_count || user.completed_orders || 0) > 0;
}

function orderNeedsAttention(order: AdminOrder) {
  return ['unpaid', 'paid', 'assigned', 'in_progress', 'disputed', 'refunding'].includes(order.status || '');
}

function taskNeedsDispatch(task: AdminTask) {
  return task.audit_status === 'approved' && ['open', 'pending_payment', 'assigned'].includes(task.status || '');
}

function formatTime(value?: string) {
  if (!value) return '刚刚';
  return new Date(value).toLocaleString('zh-CN', { hour12: false });
}

function riskScore(task?: AdminTask) {
  if (!task) return 0;
  if (typeof task.risk_score === 'number') return task.risk_score;
  if (typeof task.anti_abuse?.score === 'number') return task.anti_abuse.score;
  if (task.risk_flag === 'high') return 92;
  if (task.risk_flag === 'low') return 38;
  const text = `${task.title}${task.description}`;
  if (/票|实名|刷单|导流|联系方式|代办/.test(text)) return 78;
  return 18;
}

function riskTone(score: number) { if (score >= 80) return 'high'; if (score >= 50) return 'medium'; return 'low'; }

function parseEvidence(value?: string) {
  if (!value) return [];
  try { const p = JSON.parse(value); return Array.isArray(p) ? p.filter(Boolean) : []; }
  catch { return value.split(',').map(i => i.trim()).filter(Boolean); }
}

/* ========= CountUp 动画 Hook ========= */
function useCountUp(target: number, duration = 600, shouldAnimate = true) {
  const [value, setValue] = useState(target);
  const frameRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const fromRef = useRef(value);

  useEffect(() => {
    if (!shouldAnimate) { setValue(target); return; }
    fromRef.current = value;
    startRef.current = 0;
    const animate = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(fromRef.current + (target - fromRef.current) * eased));
      if (progress < 1) frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration, shouldAnimate]);

  return value;
}

/* ========= 主 App ========= */
function App() {
  const [token, setToken] = useState(() => localStorage.getItem('admin_token') || '');
  const [currentAdmin, setCurrentAdmin] = useState<{ id: string; username: string; display_name?: string; role?: string }>(() => {
    try { const r = localStorage.getItem('admin_current'); return r ? JSON.parse(r) : { id: '', username: '' }; }
    catch { return { id: '', username: '' }; }
  });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [activeView, setActiveView] = useState<ViewKey>(() => viewFromLocation());
  const [prevView, setPrevView] = useState<ViewKey>(() => viewFromLocation());
  const [viewTransition, setViewTransition] = useState<'entering' | 'active'>('active');
  const [navSliding, setNavSliding] = useState(false);

  /* 数据 */
  const [dashboard, setDashboard] = useState<DashboardData>({});
  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [disputes, setDisputes] = useState<AdminDispute[]>([]);
  const [riskWords, setRiskWords] = useState<RiskWord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [adminAccounts, setAdminAccounts] = useState<AdminAccount[]>([]);
  const [adminOpLogs, setAdminOpLogs] = useState<AdminOpLog[]>([]);
  const [summary, setSummary] = useState<DashboardSummary>({});

  /* 选择 */
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [selectedDisputeId, setSelectedDisputeId] = useState('');
  const [reason, setReason] = useState('内容涉及平台禁止事项，请修改后重新提交。');
  const [decisionNote, setDecisionNote] = useState('经平台核验，建议继续修改并补充交付说明。');

  /* 风险词 */
  const [newRiskWord, setNewRiskWord] = useState('');
  const [riskCategory, setRiskCategory] = useState('sensitive');
  const [riskAction, setRiskAction] = useState('review');
  const [riskNote, setRiskNote] = useState('');
  const [riskFilterCategory, setRiskFilterCategory] = useState('all');
  const [riskFilterAction, setRiskFilterAction] = useState('all');
  const [riskFilterStatus, setRiskFilterStatus] = useState('all');
  const [riskSearch, setRiskSearch] = useState('');
  const [editingRiskWord, setEditingRiskWord] = useState<RiskWord | null>(null);
  const [riskConfirmDelete, setRiskConfirmDelete] = useState<RiskWord | null>(null);

  /* 筛选 */
  const [globalSearch, setGlobalSearch] = useState('');
  const [taskAuditFilter, setTaskAuditFilter] = useState('all');
  const [taskStatusFilter, setTaskStatusFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [disputeStatusFilter, setDisputeStatusFilter] = useState('all');

  /* 状态 */
  const [toast, setToast] = useState('');
  const [lastError, setLastError] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiState, setApiState] = useState<ApiState>('unknown');
  const [dataVersion, setDataVersion] = useState(0);
  const currentRole = currentAdmin.role || 'super_admin';
  const visibleNavItems = useMemo(() => navItems.filter(item => canAccessView(currentRole, item.key)), [currentRole]);

  /* 地区 */
  const [selectedRegion, setSelectedRegion] = useState<RegionOption>(
    () => { try { const r = localStorage.getItem('admin_region'); return r ? JSON.parse(r) : { id: 'xiamen', label: '厦门', type: 'city' }; } catch { return { id: 'xiamen', label: '厦门', type: 'city' }; } }
  );
  const [showRegionPanel, setShowRegionPanel] = useState(false);
  const [regionSwitching, setRegionSwitching] = useState<'idle' | 'switching' | 'syncing' | 'done'>('idle');
  const [regionSearch, setRegionSearch] = useState('');
  const [regionCache, setRegionCache] = useState<Record<string, { ts: number; data: string }>>({});

  const authHeaders = useMemo(() => ({
    Authorization: `Bearer ${token}`,
    'x-admin-id': currentAdmin.id || '',
    'x-admin-username': currentAdmin.username || '',
  }), [token, currentAdmin]);

  /* 请求函数 */
  async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE}${path}`;
    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...authHeaders, ...(options?.headers || {}) },
      });
    } catch (err) {
      throw new Error(`网络无法连接（${url}），请检查后端是否已启动`);
    }
    let json: ApiResponse<T> | undefined;
    try { json = (await response.json()) as ApiResponse<T>; } catch { json = undefined; }
    if (response.status === 401) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_current');
      setToken('');
      setCurrentAdmin({ id: '', username: '' });
      setApiState('unknown');
      throw new Error(json?.msg || '登录已失效，请重新登录');
    }
    if (response.status === 403) {
      throw new Error(json?.msg || '当前账号权限不足，无法执行该操作');
    }
    if (!response.ok || !json || json.code !== 200) {
      throw new Error(json?.msg || `请求异常（状态码 ${response.status}）`);
    }
    return json.data;
  }

  const selectedTask = useMemo(() => tasks.find(t => t.id === selectedTaskId) || tasks[0], [selectedTaskId, tasks]);
  const selectedDispute = useMemo(() => disputes.find(d => d.id === selectedDisputeId) || disputes[0], [selectedDisputeId, disputes]);
  const keyword = globalSearch.trim().toLowerCase();

  const filteredTasks = useMemo(() => tasks.filter(t => {
    const txt = `${t.title}${t.description}${t.users?.nickname || ''}${t.region || ''}${t.status || ''}${t.audit_status || ''}`.toLowerCase();
    if (keyword && !txt.includes(keyword)) return false;
    if (taskAuditFilter !== 'all' && t.audit_status !== taskAuditFilter) return false;
    if (taskStatusFilter !== 'all' && t.status !== taskStatusFilter) return false;
    return true;
  }), [keyword, taskAuditFilter, taskStatusFilter, tasks]);

  const pendingTasks = filteredTasks.filter(t => t.audit_status === 'pending' || t.status === 'pending_audit');
  const filteredUsers = users.filter(u => {
    const txt = `${u.nickname || ''}${u.phone || ''}${u.role || ''}${u.status || ''}`.toLowerCase();
    if (keyword && !txt.includes(keyword)) return false;
    return userStatusFilter === 'all' || u.status === userStatusFilter;
  });
  const filteredOrders = orders.filter(o => {
    const txt = `${o.order_no || ''}${o.status || ''}${o.tasks?.title || ''}`.toLowerCase();
    if (keyword && !txt.includes(keyword)) return false;
    return orderStatusFilter === 'all' || o.status === orderStatusFilter;
  });
  const filteredDisputes = disputes.filter(d => {
    const txt = `${d.reason || ''}${d.status || ''}${d.decision || ''}`.toLowerCase();
    if (keyword && !txt.includes(keyword)) return false;
    return disputeStatusFilter === 'all' || d.status === disputeStatusFilter;
  });
  const filteredRiskWords = riskWords.filter(w => {
    if (riskSearch) { const q = riskSearch.toLowerCase(); if (!`${w.word}${w.note || ''}`.toLowerCase().includes(q)) return false; }
    if (riskFilterCategory !== 'all' && w.category !== riskFilterCategory) return false;
    if (riskFilterAction !== 'all' && w.action !== riskFilterAction) return false;
    if (riskFilterStatus !== 'all' && (w.status || 'active') !== riskFilterStatus) return false;
    return true;
  });

  const pendingCount = tasks.filter(t => t.audit_status === 'pending' || t.status === 'pending_audit').length;
  const highRiskCount = tasks.filter(t => riskScore(t) >= 80).length;
  const abnormalUsers = users.filter(u => u.status && u.status !== 'active').length;
  const pendingDisputes = disputes.filter(d => d.status === 'pending').length;
  const antiAbuseBlocked = dashboard.anti_abuse_blocked || dashboard.antiAbuseBlocked || 0;
  const antiAbuseReview = dashboard.anti_abuse_review || dashboard.antiAbuseReview || 0;

  /* 菜单切换（带动画） */
  const switchView = useCallback((view: ViewKey) => {
    if (!canAccessView(currentRole, view)) {
      setToast('当前角色无权限访问该菜单');
      return;
    }
    if (view === activeView) return;
    setPrevView(activeView);
    setNavSliding(true);
    setViewTransition('entering');
    setActiveView(view);
    const targetPath = pathForView(view);
    if (window.location.pathname !== targetPath) window.history.pushState(null, '', targetPath);

    /* Toast 反馈 */
    const msg = MENU_TOASTS[view];
    if (msg) setToast(msg);

    setTimeout(() => {
      setViewTransition('active');
      setNavSliding(false);
    }, 220);
  }, [activeView, currentRole]);

  useEffect(() => {
    const onPopState = () => setActiveView(viewFromLocation());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (token && !canAccessView(currentRole, activeView)) {
      setActiveView('dashboard');
      setPrevView('dashboard');
      setToast('当前角色无权限访问该菜单，已返回主控台');
    }
  }, [activeView, currentRole, token]);

  /* 加载数据 */
  function withRegion(path: string, regionOption?: RegionOption) {
    const region = (regionOption || selectedRegion)?.id || '';
    if (!region) return path;
    return `${path}${path.includes('?') ? '&' : '?'}region=${encodeURIComponent(region)}`;
  }

  async function loadAll(successMsg?: string, regionOverride?: RegionOption) {
    setLoading(true);
    setApiState('syncing');
    setLastError('');
    const queryRegion = regionOverride || selectedRegion;
    const failed: string[] = [];
    const results = await Promise.allSettled([
      request<DashboardData>(withRegion('/admin/dashboard', queryRegion)),
      request<PageResult<AdminTask> | AdminTask[]>(withRegion('/admin/tasks?limit=80', queryRegion)),
      request<PageResult<AdminUser> | AdminUser[]>(withRegion('/admin/users?limit=80', queryRegion)),
      request<PageResult<AdminOrder> | AdminOrder[]>(withRegion('/admin/orders?limit=80', queryRegion)),
      request<PageResult<AdminDispute> | AdminDispute[]>(withRegion('/admin/disputes?limit=80', queryRegion)),
      request<RiskWord[]>(withRegion('/admin/risk-words', queryRegion)),
      request<PageResult<AuditLog> | AuditLog[]>(withRegion('/admin/audit-logs?limit=30', queryRegion)),
    ]);
    const labels = ['dashboard', 'tasks', 'users', 'orders', 'disputes', 'risk-words', 'audit-logs'];
    results.forEach((r, i) => { if (r.status === 'rejected') { console.error(`[Admin] ${labels[i]} fail:`, r.reason); failed.push(labels[i]); } });
    if (results[0].status === 'fulfilled') setDashboard(results[0].value); else setDashboard({});
    if (results[1].status === 'fulfilled') { const lt = unwrapList<AdminTask>(results[1].value); setTasks(lt); setSelectedTaskId(p => lt.some(t => t.id === p) ? p : lt[0]?.id || ''); } else setTasks([]);
    if (results[2].status === 'fulfilled') setUsers(unwrapList<AdminUser>(results[2].value)); else setUsers([]);
    if (results[3].status === 'fulfilled') setOrders(unwrapList<AdminOrder>(results[3].value)); else setOrders([]);
    if (results[4].status === 'fulfilled') { const ld = unwrapList<AdminDispute>(results[4].value); setDisputes(ld); setSelectedDisputeId(p => ld.some(d => d.id === p) ? p : ld[0]?.id || ''); } else setDisputes([]);
    if (results[5].status === 'fulfilled') setRiskWords(Array.isArray(results[5].value) ? results[5].value : []); else setRiskWords([]);
    if (results[6].status === 'fulfilled') setAuditLogs(unwrapList<AuditLog>(results[6].value)); else setAuditLogs([]);
    if (failed.length === 7) { setApiState('error'); setLastError('所有接口均请求失败，请检查后端服务'); setToast('接口异常：后端可能未启动'); }
    else if (failed.length > 0) { setApiState('live'); setLastError(`部分接口失败: ${failed.join('; ')}`); setToast(`${failed.length} 个接口加载失败`); }
    else { setApiState('live'); setLastError(''); }
    try { setSummary(await request<DashboardSummary>(withRegion('/admin/dashboard/summary', queryRegion))); } catch { setSummary({}); }
    try { setAdminAccounts(unwrapList<AdminAccount>(await request<PageResult<AdminAccount>>(withRegion('/admin/accounts?limit=100', queryRegion)))); } catch { setAdminAccounts([]); }
    try { setAdminOpLogs(unwrapList<AdminOpLog>(await request<PageResult<AdminOpLog>>(withRegion('/admin/op-logs?limit=50', queryRegion)))); } catch { setAdminOpLogs([]); }
    if (successMsg) setToast(successMsg);
    setDataVersion(v => v + 1);
    setLoading(false);
  }

  /* 地区切换 */
  async function handleRegionSwitch(region: RegionOption) {
    setShowRegionPanel(false);
    if (region.id === selectedRegion.id) return;
    setRegionSwitching('switching');
    setToast(`正在切换到【${region.label}】运营视角…`);

    /* 检查缓存 */
    const cacheKey = region.id;
    const cached = regionCache[cacheKey];
    if (cached && Date.now() - cached.ts < 30000) {
      setTimeout(() => {
        setSelectedRegion(region);
        localStorage.setItem('admin_region', JSON.stringify(region));
        setRegionSwitching('done');
        setToast(`已进入【${region.label}】视角，今天也要稳稳接住每一个需求。`);
        setTimeout(() => setRegionSwitching('idle'), 2000);
      }, 400);
      return;
    }

    setRegionSwitching('syncing');
    setApiState('syncing');
    await new Promise(r => setTimeout(r, 600));
    const prevRegion = selectedRegion;
    setSelectedRegion(region);
    localStorage.setItem('admin_region', JSON.stringify(region));

    /* 带 region 参数重新请求数据 — 如果接口不支持，保留现有数据 */
    try {
      await loadAll(`正在同步该地区任务、订单、用户、审核和风险数据。`, region);
      setRegionCache(prev => ({ ...prev, [cacheKey]: { ts: Date.now(), data: JSON.stringify({ dashboard, tasks: tasks.length }) } }));
      setRegionSwitching('done');
      setToast(`已进入【${region.label}】视角，今天也要稳稳接住每一个需求。`);
    } catch {
      setRegionSwitching('done');
      setToast(`【${region.label}】视角已就位，部分数据可能还在路上。`);
    }
    setTimeout(() => setRegionSwitching('idle'), 2200);
  }

  /* 登录 */
  async function handleLogin(e: FormEvent) {
    e.preventDefault(); setLoading(true); setLastError('');
    try {
      const data = await request<{ token: string; username: string; admin_id?: string; display_name?: string; role?: string }>('/admin/login', { method: 'POST', body: JSON.stringify({ username, password }) });
      localStorage.setItem('admin_token', data.token);
      const ai = { id: data.admin_id || '', username: data.username || username, display_name: data.display_name, role: data.role };
      localStorage.setItem('admin_current', JSON.stringify(ai));
      setToken(data.token); setCurrentAdmin(ai); setApiState('live');
      setToast(`欢迎回来，${data.display_name || data.username || username}`);
    } catch (err) { const m = err instanceof Error ? err.message : '登录失败'; setApiState('error'); setLastError(m); setToast(`登录失败：${m}`); }
    finally { setLoading(false); }
  }

  function logout() { localStorage.removeItem('admin_token'); localStorage.removeItem('admin_current'); setToken(''); setCurrentAdmin({ id: '', username: '' }); setApiState('unknown'); }

  async function createTestData() {
    setLoading(true);
    try { const d = await request<{ review_task_id: string }>('/admin/test-data', { method: 'POST' }); await loadAll('验证测试数据已创建'); setSelectedTaskId(d.review_task_id); }
    catch (err) { const m = err instanceof Error ? err.message : '创建失败'; setApiState('error'); setLastError(m); setToast(m); }
    finally { setLoading(false); }
  }

  async function auditTask(action: AuditAction) {
    if (!selectedTask) return;
    try { await request(`/admin/tasks/${selectedTask.id}/audit`, { method: 'POST', body: JSON.stringify({ action, reason: action === 'reject' ? reason : undefined }) }); await loadAll(action === 'approve' ? '已通过上架' : '已驳回修改'); }
    catch (err) { const m = err instanceof Error ? err.message : '审核失败'; setApiState('error'); setLastError(m); setToast(`审核失败：${m}`); }
  }

  async function decideDispute(decision: string) {
    if (!selectedDispute) return;
    try { await request(`/admin/disputes/${selectedDispute.id}/decision`, { method: 'POST', body: JSON.stringify({ decision, note: decisionNote }) }); await loadAll('仲裁裁决已写入'); }
    catch (err) { const m = err instanceof Error ? err.message : '仲裁失败'; setApiState('error'); setLastError(m); setToast(`仲裁失败：${m}`); }
  }

  async function addRiskWord(e?: FormEvent) {
    if (currentRole === 'viewer') { setToast('只读角色不能修改风险词库'); return; }
    e?.preventDefault(); const w = newRiskWord.trim(); if (!w) return;
    try { await request<RiskWord>('/admin/risk-words', { method: 'POST', body: JSON.stringify({ word: w, category: riskCategory, action: riskAction, note: riskNote || undefined }) }); setNewRiskWord(''); setRiskNote(''); await loadAll('已加入风险词库，系统会帮你盯着它。'); }
    catch (err) { const m = err instanceof Error ? err.message : '添加失败'; setApiState('error'); setLastError(m); setToast(`添加失败：${m}`); }
  }

  async function updateRiskWord(id: string, data: { word?: string; category?: string; action?: string; note?: string }) {
    if (currentRole === 'viewer') { setToast('只读角色不能修改风险词库'); return; }
    try { await request(`/admin/risk-words/${id}`, { method: 'POST', body: JSON.stringify(data) }); setEditingRiskWord(null); await loadAll('风险词已更新。'); }
    catch (err) { const m = err instanceof Error ? err.message : '更新失败'; setToast(`更新失败：${m}`); }
  }

  async function toggleRiskWord(w: RiskWord) {
    if (currentRole === 'viewer') { setToast('只读角色不能修改风险词库'); return; }
    try { await request(`/admin/risk-words/${w.id}/toggle`, { method: 'POST' }); const ns = w.status === 'active' ? 'inactive' : 'active'; await loadAll(ns === 'active' ? '已重新启用' : '已暂时停用'); }
    catch (err) { const m = err instanceof Error ? err.message : '操作失败'; setToast(`操作失败：${m}`); }
  }

  async function deleteRiskWord(id: string) {
    if (currentRole === 'viewer') { setToast('只读角色不能修改风险词库'); return; }
    try { await request(`/admin/risk-words/${id}/delete`, { method: 'POST' }); setRiskConfirmDelete(null); await loadAll('已删除。'); }
    catch (err) { const m = err instanceof Error ? err.message : '删除失败'; setToast(`删除失败：${m}`); }
  }

  async function handleUpdateUserStatus(user: AdminUser, status: 'active' | 'banned' | 'frozen' | 'deleted') {
    if (currentRole === 'viewer') { setToast('Viewer cannot change user status'); return; }
    const reason = window.prompt(`Reason for changing ${user.nickname || user.id} to ${status}`, status === 'active' ? 'admin unlock' : 'admin risk control');
    if (reason === null) return;
    setLoading(true);
    try {
      await request(`/admin/users/${user.id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status, reason: reason || 'admin status update' }),
      });
      await loadAll(status === 'active' ? 'User unlocked' : 'User status updated');
    } catch (err) {
      const m = err instanceof Error ? err.message : 'status update failed';
      setToast(`Status update failed: ${m}`);
    } finally {
      setLoading(false);
    }
  }

  async function refreshAccounts() { try { setAdminAccounts(unwrapList<AdminAccount>(await request<PageResult<AdminAccount>>('/admin/accounts?limit=100'))); } catch {} }
  async function refreshOpLogs() { try { setAdminOpLogs(unwrapList<AdminOpLog>(await request<PageResult<AdminOpLog>>('/admin/op-logs?limit=50'))); } catch {} }

  async function handleCreateAccount(form: { username: string; password: string; display_name: string; role: string }) {
    if (currentRole === 'operator' || currentRole === 'viewer') { setToast('当前角色不能创建后台账号'); return; }
    if (!form.username || !form.password) { setToast('用户名和密码必填'); return; }
    setLoading(true);
    try { await request('/admin/accounts', { method: 'POST', body: JSON.stringify(form) }); await refreshAccounts(); await refreshOpLogs(); setToast(`已创建 ${form.username}`); }
    catch (err) { const m = err instanceof Error ? err.message : '创建失败'; setToast(`创建失败：${m}`); }
    finally { setLoading(false); }
  }

  async function handleToggleAccount(a: AdminAccount) {
    const nxt = a.status === 'active' ? 'disable' : 'enable';
    setLoading(true);
    try { await request(`/admin/accounts/${a.id}/${nxt}`, { method: 'POST' }); await refreshAccounts(); await refreshOpLogs(); setToast(nxt === 'disable' ? `已禁用 ${a.username}` : `已启用 ${a.username}`); }
    catch (err) { const m = err instanceof Error ? err.message : '操作失败'; setToast(`操作失败：${m}`); }
    finally { setLoading(false); }
  }

  async function handleResetPassword(a: AdminAccount) {
    const np = window.prompt(`重置 ${a.username} 的密码（至少 6 位）：`, ''); if (!np) return; if (np.length < 6) { setToast('密码至少 6 位'); return; }
    setLoading(true);
    try { await request(`/admin/accounts/${a.id}/reset-password`, { method: 'POST', body: JSON.stringify({ password: np }) }); await refreshOpLogs(); setToast(`已重置 ${a.username} 密码`); }
    catch (err) { const m = err instanceof Error ? err.message : '重置失败'; setToast(`重置失败：${m}`); }
    finally { setLoading(false); }
  }

  async function handleDeleteAccount(a: AdminAccount) {
    if (currentRole === 'operator' || currentRole === 'viewer') { setToast('当前角色不能删除后台账号'); return; }
    if (!window.confirm(`确认删除后台账号「${a.username}」？`)) return;
    setLoading(true);
    try { await request(`/admin/accounts/${a.id}/delete`, { method: 'POST' }); await refreshAccounts(); await refreshOpLogs(); setToast(`已删除 ${a.username}`); }
    catch (err) { const m = err instanceof Error ? err.message : '删除失败'; setToast(`删除失败：${m}`); }
    finally { setLoading(false); }
  }

  /* ========= AI 管家状态 ========= */
  const aiState = useMemo(() => {
    if (apiState === 'syncing') return 'syncing';
    if (apiState === 'error') return 'error';
    if (highRiskCount > 0 || abnormalUsers > 0) return 'risk';
    return 'idle';
  }, [apiState, highRiskCount, abnormalUsers]);

  const aiStateLabel: Record<string, string> = {
    idle: '我在，随时帮你看住平台。',
    syncing: '我正在读取最新数据。',
    risk: '发现异常，请先看风险模块。',
    error: '后端还没接稳，我先帮你守住安全状态。',
  };

  /* Toast 自动消失 */
  useEffect(() => { if (!toast) return; const t = window.setTimeout(() => setToast(''), 2600); return () => window.clearTimeout(t); }, [toast]);

  /* 初始化加载 */
  useEffect(() => { if (token) void loadAll(); }, [token]);

  /* ========= 登录界面 ========= */
  if (!token) {
    return (
      <main className="login-shell">
        <section className="login-visual">
          <div className="login-orbit" />
          <div className="mascot-card">
            <div className="mascot-head">^_^</div>
            <div><strong>审核助手在线</strong><span>今天也要把风险拦在上架前。</span></div>
          </div>
          <h1>有应帮主控制台</h1>
          <p>把小程序里的任务、上传内容、用户、订单和仲裁统一收进一个电脑端风控工作台。</p>
        </section>
        <form className="login-panel" onSubmit={handleLogin}>
          <span className="eyebrow">管理控制台</span>
          <h2>管理员登录</h2>
          <label>账号<input value={username} onChange={e => setUsername(e.target.value)} /></label>
          <label>密码<input type="password" value={password} onChange={e => setPassword(e.target.value)} /></label>
          <button type="submit" disabled={loading}>{loading ? '登录中...' : '登录'}</button>
          {lastError ? <p className="form-error">接口异常：{lastError}</p> : <p>请输入管理员账号登录</p>}
        </form>
      </main>
    );
  }

  /* AI 管家渲染 */
  const aiMsg = AI_MESSAGES[activeView] || AI_MESSAGES.dashboard;

  return (
    <main className="admin-shell">
      {/* ===== 左侧导航 ===== */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">有</div>
          <div><strong>有应帮</strong><span>中控系统</span></div>
        </div>
        <nav>
          {/* 滑动光标 */}
          <div className={`nav-slider ${navSliding ? 'nav-sliding' : ''}`} style={{ '--nav-idx': visibleNavItems.findIndex(i => i.key === activeView) } as React.CSSProperties} />
          {visibleNavItems.map(item => (
            <button
              key={item.key}
              className={`nav-item ${activeView === item.key ? 'nav-item-active' : ''}`}
              onClick={() => switchView(item.key)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span><strong>{item.label}</strong><small>{item.desc}</small></span>
            </button>
          ))}
        </nav>
        <div className="sidebar-card">
          <span className="pulse-dot" />
          <strong>审核情绪值 96%</strong>
          <p>高风险会自动置顶。接口状态如实显示，不再假装成功。</p>
          <div className="build-info-mini">
            <span>版本：{BUILD_INFO.version}</span>
            <span>构建：{BUILD_INFO.buildTime}</span>
            <span>commit：{BUILD_INFO.commit}</span>
          </div>
        </div>
      </aside>

      {/* ===== 主内容区 ===== */}
      <section className="workspace">
        {/* 顶部栏 */}
        <header className={`topbar ${activeView === 'dashboard' ? 'topbar-welcome' : ''}`}>
          {activeView === 'dashboard' ? (
            <div className="welcome-greeting">
              <h1 className="welcome-headline">
                {new Date().getHours() < 6 ? '夜深了' : new Date().getHours() < 9 ? '早上好' : new Date().getHours() < 12 ? '上午好' : new Date().getHours() < 14 ? '中午好' : new Date().getHours() < 18 ? '下午好' : '晚上好'}，{currentAdmin.display_name || currentAdmin.username || '管理员'} <span className="welcome-wave">👋</span>
              </h1>
              <p className="welcome-subtitle">
                {apiState === 'live' ? '今天平台状态稳定，系统正在帮你盯着订单、审核和风险。' : apiState === 'error' ? '系统正在尝试连接后端，请稍候。' : apiState === 'syncing' ? '正在同步真实数据，系统正在把订单和任务搬进控制台。' : '系统正在启动中，马上就好。'}
              </p>
            </div>
          ) : (
            <div>
              <span className="eyebrow">管理控制台</span>
              <h1>{visibleNavItems.find(i => i.key === activeView)?.label || '主控制台'}</h1>
            </div>
          )}

          <div className="topbar-actions">
            {/* 地区选择器 */}
            <div className="region-selector-wrapper">
              <button
                className="region-trigger"
                onClick={() => setShowRegionPanel(!showRegionPanel)}
                title="切换运营地区视角"
              >
                <span className="region-icon">📍</span>
                <span className="region-label">{selectedRegion.label} · {selectedRegion.type === 'national' ? '总览视角' : selectedRegion.type === 'district' ? '区域视角' : '全城视角'}</span>
                <span className={`region-arrow ${showRegionPanel ? 'region-arrow-up' : ''}`}>▾</span>
              </button>
            </div>

            <input className="global-search" placeholder="搜索任务、用户、订单、风险词" value={globalSearch} onChange={e => setGlobalSearch(e.target.value)} />
            {import.meta.env.DEV ? <button className="ghost-button" onClick={() => void createTestData()} disabled={loading}>生成验证数据</button> : null}
            <button className="ghost-button" onClick={() => void loadAll('真实数据已同步')} disabled={loading}>{loading ? '同步中' : '同步数据'}</button>
            <div className={`api-badge api-${apiState === 'syncing' ? 'unknown' : apiState}`}>
              {apiState === 'live' ? '真实接口正常' : apiState === 'error' ? '接口失败' : apiState === 'syncing' ? '同步中…' : '待验证'}
            </div>
            <button className="avatar-button" onClick={logout} title="退出登录">
              {currentAdmin.display_name || currentAdmin.username || 'Admin'}
            </button>
          </div>

          {/* 地区同步状态条 */}
          {regionSwitching !== 'idle' && (
            <div className="region-sync-bar">
              <span className="region-sync-dot" />
              {regionSwitching === 'switching' && `正在切换到【${selectedRegion.label}】运营视角…`}
              {regionSwitching === 'syncing' && '正在同步该地区任务、订单、用户、审核和风险数据。'}
              {regionSwitching === 'done' && `已进入【${selectedRegion.label}】视角，今天也要稳稳接住每一个需求。`}
            </div>
          )}
        </header>

        {/* 错误横幅 */}
        {lastError ? <div className="error-banner">{lastError}</div> : null}

        {/* ===== 地区选择面板（浮层） ===== */}
        {showRegionPanel && (
          <>
            <div className="region-overlay" onClick={() => setShowRegionPanel(false)} />
            <div className="region-panel">
              <div className="region-panel-header">
                <h3>切换运营地区</h3>
                <button className="region-panel-close" onClick={() => setShowRegionPanel(false)}>✕</button>
              </div>
              <div className="region-panel-body">
                {/* 搜索 */}
                <input className="region-panel-search" placeholder="搜索城市 / 区县…" value={regionSearch} onChange={e => setRegionSearch(e.target.value)} />
                {/* 当前地区 */}
                <div className="region-section">
                  <span className="region-section-label">当前地区</span>
                  <button className={`region-chip region-chip-current`} onClick={() => setShowRegionPanel(false)}>
                    {selectedRegion.label} · {selectedRegion.type === 'national' ? '总览视角' : '全城视角'}
                    <span className="region-chip-check">✓</span>
                  </button>
                </div>
                {/* 全国视角 */}
                <div className="region-section">
                  <span className="region-section-label">全局视角</span>
                  <button className="region-chip" onClick={() => handleRegionSwitch({ id: 'national', label: '全国', type: 'national' })}>
                    🇨🇳 全国 · 总览视角
                  </button>
                </div>
                {/* 热门城市 */}
                <div className="region-section">
                  <span className="region-section-label">热门运营城市</span>
                  <div className="region-chip-grid">
                    {HOT_CITIES.filter(c => !regionSearch || c.label.includes(regionSearch)).map(c => (
                      <button key={c.id} className={`region-chip ${selectedRegion.id === c.id ? 'region-chip-active' : ''}`} onClick={() => handleRegionSwitch(c)}>
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* 区县（如果选了厦门） */}
                {selectedRegion.id === 'xiamen' && DISTRICTS.xiamen && (
                  <div className="region-section">
                    <span className="region-section-label">厦门 · 区域视角</span>
                    <div className="region-chip-grid">
                      {DISTRICTS.xiamen.map(d => (
                        <button key={d.id} className={`region-chip region-chip-sm ${selectedRegion.id === d.id ? 'region-chip-active' : ''}`} onClick={() => handleRegionSwitch(d)}>
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {/* 刷新 */}
                <button className="region-refresh-btn" onClick={() => { void loadAll('正在同步该地区任务、订单、用户、审核和风险数据。'); }}>
                  🔄 刷新当前地区数据
                </button>
              </div>
            </div>
          </>
        )}

        {/* ===== 主内容区（带过渡动画） ===== */}
        <div className={`view-container ${viewTransition === 'entering' ? 'view-entering' : 'view-active'}`} key={activeView}>
          {activeView === 'dashboard' ? (
            <DashboardView
              dashboard={dashboard} summary={summary} tasks={tasks} users={users} orders={orders}
              disputes={disputes} auditLogs={auditLogs} pendingCount={pendingCount}
              highRiskCount={highRiskCount} abnormalUsers={abnormalUsers} pendingDisputes={pendingDisputes}
              antiAbuseBlocked={antiAbuseBlocked} antiAbuseReview={antiAbuseReview}
              onChangeView={switchView} onSelectTask={id => { setSelectedTaskId(id); switchView('reviews'); }}
              loading={loading} dataVersion={dataVersion} apiState={apiState}
              onRetry={() => loadAll()}
              aiState={aiState} aiStateLabel={aiStateLabel[aiState]} aiMsg={aiMsg.main}
              onToast={setToast}
            />
          ) : null}

          {activeView === 'reviews' ? <ReviewsView tasks={pendingTasks} selectedTask={selectedTask} reason={reason} setReason={setReason} onSelectTask={setSelectedTaskId} onAudit={auditTask} onOpenDisputes={() => switchView('disputes')} /> : null}
          {activeView === 'tasks' ? <TasksView tasks={filteredTasks} selectedTask={selectedTask} auditFilter={taskAuditFilter} statusFilter={taskStatusFilter} setAuditFilter={setTaskAuditFilter} setStatusFilter={setTaskStatusFilter} onSelectTask={setSelectedTaskId} /> : null}
          {activeView === 'providers' ? <ProvidersView users={filteredUsers} orders={orders} tasks={tasks} /> : null}
          {activeView === 'users' ? <UsersView users={filteredUsers} statusFilter={userStatusFilter} setStatusFilter={setUserStatusFilter} onUpdateStatus={handleUpdateUserStatus} /> : null}
          {activeView === 'orders' ? <OrdersView orders={filteredOrders} statusFilter={orderStatusFilter} setStatusFilter={setOrderStatusFilter} /> : null}
          {activeView === 'dispatch' ? <DispatchCenterView tasks={tasks} orders={orders} onSelectTask={id => { setSelectedTaskId(id); switchView('tasks'); }} onOpenReviews={() => switchView('reviews')} /> : null}
          {activeView === 'finance' ? <FinanceCenterView orders={orders} disputes={disputes} /> : null}
          {activeView === 'disputes' ? <DisputesView disputes={filteredDisputes} selectedDispute={selectedDispute} statusFilter={disputeStatusFilter} setStatusFilter={setDisputeStatusFilter} onSelectDispute={setSelectedDisputeId} decisionNote={decisionNote} setDecisionNote={setDecisionNote} onDecide={decideDispute} /> : null}
          {activeView === 'riskWords' ? <RiskWordsView riskWords={filteredRiskWords} allRiskWords={riskWords} newRiskWord={newRiskWord} setNewRiskWord={setNewRiskWord} riskCategory={riskCategory} setRiskCategory={setRiskCategory} riskAction={riskAction} setRiskAction={setRiskAction} riskNote={riskNote} setRiskNote={setRiskNote} riskFilterCategory={riskFilterCategory} setRiskFilterCategory={setRiskFilterCategory} riskFilterAction={riskFilterAction} setRiskFilterAction={setRiskFilterAction} riskFilterStatus={riskFilterStatus} setRiskFilterStatus={setRiskFilterStatus} riskSearch={riskSearch} setRiskSearch={setRiskSearch} editingRiskWord={editingRiskWord} setEditingRiskWord={setEditingRiskWord} riskConfirmDelete={riskConfirmDelete} setRiskConfirmDelete={setRiskConfirmDelete} onAdd={addRiskWord} onUpdate={updateRiskWord} onToggle={toggleRiskWord} onDelete={deleteRiskWord} apiState={apiState} onRetry={loadAll} /> : null}
          {activeView === 'cityOps' ? <CityOpsView region={selectedRegion} tasks={tasks} orders={orders} users={users} disputes={disputes} onSwitchCity={() => setShowRegionPanel(true)} /> : null}
          {activeView === 'accounts' ? <AccountsView accounts={adminAccounts} currentAdmin={currentAdmin} role={currentRole} onCreate={handleCreateAccount} onToggle={handleToggleAccount} onResetPassword={handleResetPassword} onDelete={handleDeleteAccount} onRefresh={refreshAccounts} loading={loading} /> : null}
          {activeView === 'opLogs' ? <OpLogsView opLogs={adminOpLogs} onRefresh={refreshOpLogs} loading={loading} /> : null}
          {activeView === 'uiDecor' ? <UiDecorView request={request} onToast={setToast} /> : null}
          {activeView === 'apiKeys' ? <ApiKeysPage request={request} onToast={setToast} /> : null}
          {activeView === 'growth' ? <GrowthDashboardPage request={request} onToast={setToast} /> : null}
          {activeView === 'aiConversations' ? <AiConversationsView request={request} onToast={setToast} /> : null}
          {activeView === 'aiTickets' ? <SupportTicketsView request={request} onToast={setToast} /> : null}
          {activeView === 'settings' ? <SettingsView apiState={apiState} auditLogs={auditLogs} summary={summary} currentAdmin={currentAdmin} /> : null}
        </div>
      </section>

      {/* Toast */}
      {toast ? <div className="toast">{toast}</div> : null}
    </main>
  );
}

/* ==========================================
   DashboardView — 主控台
   ========================================== */
function DashboardView(props: {
  dashboard: DashboardData; summary: DashboardSummary;
  tasks: AdminTask[]; users: AdminUser[]; orders: AdminOrder[]; disputes: AdminDispute[];
  auditLogs: AuditLog[]; pendingCount: number; highRiskCount: number;
  abnormalUsers: number; pendingDisputes: number; antiAbuseBlocked: number; antiAbuseReview: number;
  onChangeView: (v: ViewKey) => void; onSelectTask: (id: string) => void;
  loading: boolean; dataVersion: number; apiState: ApiState; onRetry: () => void;
  aiState: string; aiStateLabel: string; aiMsg: string; onToast: (msg: string) => void;
}) {
  const { dashboard, summary, tasks, users, orders, disputes, auditLogs, pendingCount, highRiskCount, abnormalUsers, pendingDisputes, antiAbuseBlocked, antiAbuseReview, onChangeView, onSelectTask, loading, dataVersion, apiState, onRetry, aiState, aiStateLabel, aiMsg, onToast } = props;
  const visibleTasks = tasks.filter(t => t.audit_status === 'pending' || t.status === 'pending_audit').slice(0, 4);

  /* Count-up values */
  const animPending = useCountUp(dashboard.pending_audit || dashboard.pendingAudit || pendingCount, 700, dataVersion > 0);
  const animHighRisk = useCountUp(highRiskCount, 700, dataVersion > 0);
  const animOrders = useCountUp(dashboard.today_orders || dashboard.todayOrders || orders.length, 700, dataVersion > 0);
  const animDisputes = useCountUp(dashboard.pending_disputes || dashboard.pendingDisputes || pendingDisputes, 700, dataVersion > 0);
  const animAbnormal = useCountUp(abnormalUsers, 700, dataVersion > 0);
  const animBlocked = useCountUp(antiAbuseBlocked, 700, dataVersion > 0);
  const taskVisibility = useMemo<TaskVisibilityAudit>(() => {
    if (summary.task_visibility) return summary.task_visibility;
    const publicStatuses = ['open', 'paid', 'available'];
    const ordersByTask = new Map<string, AdminOrder[]>();
    orders.forEach(order => {
      if (!order.task_id) return;
      const list = ordersByTask.get(order.task_id) || [];
      list.push(order);
      ordersByTask.set(order.task_id, list);
    });
    const fallback: TaskVisibilityAudit = {
      pending_audit: 0,
      approved_unpaid: 0,
      market_visible: 0,
      paid_but_hidden: 0,
      public_statuses: publicStatuses,
      release_warnings: [],
    };
    tasks.forEach(task => {
      const status = task.status || '';
      const auditStatus = task.audit_status || '';
      const taskOrders = ordersByTask.get(task.id) || [];
      const paid = taskOrders.some(order => order.pay_status === 'paid' || publicStatuses.includes(order.status || ''));
      const marketVisible = auditStatus === 'approved' && publicStatuses.includes(status);
      if (auditStatus === 'pending' || status === 'pending_audit') fallback.pending_audit = (fallback.pending_audit || 0) + 1;
      if (marketVisible) {
        fallback.market_visible = (fallback.market_visible || 0) + 1;
        return;
      }
      if (paid) {
        fallback.paid_but_hidden = (fallback.paid_but_hidden || 0) + 1;
        if ((fallback.release_warnings || []).length < 5) {
          fallback.release_warnings = [
            ...(fallback.release_warnings || []),
            {
              task_id: task.id,
              title: task.title,
              status,
              audit_status: auditStatus,
              order_status: taskOrders[0]?.status || '',
              pay_status: taskOrders[0]?.pay_status || '',
              reason: 'paid_task_not_public',
            },
          ];
        }
        return;
      }
      if (auditStatus === 'approved') fallback.approved_unpaid = (fallback.approved_unpaid || 0) + 1;
    });
    if (!tasks.length && pendingCount > 0) fallback.pending_audit = pendingCount;
    return fallback;
  }, [summary.task_visibility, tasks, orders, pendingCount]);

  /* 骨架屏 */
  if (loading && dataVersion === 0) {
    return (
      <div className="skeleton-root">
        <div className="skeleton-grid-6">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton-card" />)}</div>
        <div className="skeleton-grid-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton-card skeleton-tall" />)}</div>
      </div>
    );
  }

  return (
    <>
      {/* 状态卡 */}
      <section className="status-card-grid">
        <StatusCard icon="📋" title="待审核" value={animPending}
          tag={pendingCount === 0 ? '今天很清爽' : '需要处理'} tone="review"
          pulse={pendingCount > 0} />
        <StatusCard icon="🛡️" title="高风险" value={animHighRisk}
          tag={highRiskCount === 0 ? '平台很安全' : '优先处理'} tone="risk"
          pulse={highRiskCount > 0} />
        <StatusCard icon="📦" title="今日订单" value={animOrders}
          tag="实时同步" tone="order"
          extra={orders.length > 0 ? '继续加油' : '等待第一单'} />
        <StatusCard icon="⚖️" title="待仲裁" value={animDisputes}
          tag={pendingDisputes === 0 ? '需要人工确认' : '待确认'} tone="dispute"
          pulse={pendingDisputes > 0} />
        <StatusCard icon="👤" title="异常用户" value={animAbnormal}
          tag={abnormalUsers > 0 ? '有人需要留意' : '风控关注'} tone="user"
          extra={abnormalUsers > 0 ? '有用户需留意' : undefined} pulse={abnormalUsers > 0} />
        <StatusCard icon="🛑" title="羊毛拦截" value={animBlocked}
          tag={antiAbuseReview === 0 ? '系统已守住' : `${antiAbuseReview} 条待复核`} tone="block" />
      </section>

      {/* 三栏 */}
      <section className="dashboard-main">
        {/* 左：待处理 */}
        <div className="work-queue-card">
          <h2 className="dash-section-head"><span className="dash-section-icon">📥</span>今日待处理</h2>
          {visibleTasks.length === 0 && pendingDisputes === 0 && highRiskCount === 0 ? (
            <div className="empty-gentle">
              <span className="empty-gentle-icon">🌿</span>
              <p className="empty-gentle-title">今天很顺，暂时没有新的审核任务</p>
              <p className="empty-gentle-desc">系统会继续帮你盯着风险。</p>
              <button className="empty-gentle-btn" onClick={() => onChangeView('reviews')}>进入审核工作台</button>
            </div>
          ) : (
            <>
              {visibleTasks.length > 0 && (
                <div className="queue-block">
                  <div className="queue-block-head"><span>📋 待审核</span><span className="queue-count">{visibleTasks.length} 条</span></div>
                  <div className="queue-list">
                    {visibleTasks.slice(0, 3).map(t => {
                      const s = riskScore(t);
                      return (
                        <button key={t.id} className="queue-item queue-item-new" onClick={() => onSelectTask(t.id)}>
                          <div className={`risk-pill ${riskTone(s)}`}>{s}分</div>
                          <div className="queue-item-body"><strong>{t.title}</strong><span>{t.users?.nickname || '客户'} · {t.region || '不限'} · {formatMoney(t.budget_amount)}</span></div>
                          <span className="queue-item-status">{t.audit_status || t.status}</span>
                        </button>
                      );
                    })}
                  </div>
                  {pendingCount > 3 && <button className="queue-more" onClick={() => onSelectTask(tasks.find(t => t.audit_status === 'pending' || t.status === 'pending_audit')?.id || '')}>查看全部 {pendingCount} 条待审 →</button>}
                </div>
              )}
              {pendingDisputes > 0 && <div className="queue-block"><div className="queue-block-head"><span>⚖️ 待仲裁</span><span className="queue-count">{pendingDisputes} 条</span></div></div>}
              {highRiskCount > 0 && <div className="queue-block queue-block-risk"><div className="queue-block-head"><span>🛡️ 风控提醒</span><span className="queue-count queue-count-risk">{highRiskCount} 条</span></div></div>}
            </>
          )}
          <div style={{ marginTop: 16 }}>
            <div className="queue-block-head" style={{ marginBottom: 10 }}><span>⏱ 近期业务审计</span></div>
            <AuditLogList logs={auditLogs} />
          </div>
        </div>

        {/* 中：心跳数据 */}
        <div className="heartbeat-card">
          <h2 className="dash-section-head"><span className="dash-section-icon">💓</span>平台心跳数据</h2>
          <div className="heartbeat-grid">
            <HeartbeatItem label="小程序用户总数" value={`${summary.total_users ?? users.length}`} />
            <HeartbeatItem label="今日新增用户" value={`${summary.today_new_users ?? '-'}`} highlight />
            <HeartbeatItem label="任务总数" value={`${summary.total_tasks ?? tasks.length}`} />
            <HeartbeatItem label="今日新增任务" value={`${summary.today_new_tasks ?? '-'}`} highlight />
            <HeartbeatItem label="待审核任务" value={`${summary.pending_audit_tasks ?? pendingCount}`} />
            <HeartbeatItem label="订单总数" value={`${summary.total_orders ?? orders.length}`} />
            <HeartbeatItem label="今日新增订单" value={`${summary.today_new_orders ?? '-'}`} highlight />
            <HeartbeatItem label="后台账号数" value={`${summary.total_admins ?? '-'}`} />
          </div>
          <TaskVisibilityRadar visibility={taskVisibility} onChangeView={onChangeView} />
          {summary.anti_abuse_blocked_today !== undefined && (
            <div className="heartbeat-extra"><span className="heartbeat-extra-label">🛡️ 今日反薅羊毛拦截</span><span className="heartbeat-extra-value">{summary.anti_abuse_blocked_today}</span></div>
          )}
        </div>

        {/* 右：系统状态 + AI 管家 + 快捷入口 */}
        <div className="dash-sidebar">
          {/* 系统状态 */}
          <SystemStatusCard summary={summary} onRetry={onRetry} apiState={apiState} onToast={onToast} />

          {/* AI 管家 */}
          <div className={`ai-helper-card ai-helper-${aiState}`}>
            <div className="ai-helper-face">🤖</div>
            <div className="ai-helper-body">
              <strong>有应帮 AI 管家</strong>
              <p>{aiMsg}</p>
            </div>
            <div className={`ai-helper-status ai-status-${aiState}`}>{aiStateLabel}</div>
            <button className="ai-helper-btn" onClick={() => onChangeView('aiConversations')}>查看 AI 建议</button>
          </div>

          {/* 快捷入口 */}
          <div className="quick-entry-card">
            <h3 className="dash-sidebar-title">快捷入口</h3>
            <div className="quick-entry-tags">
              <span className="capsule-tag" onClick={() => onChangeView('opLogs')}>📝 审核日志</span>
              <span className="capsule-tag" onClick={() => onChangeView('disputes')}>⚖️ 仲裁备注</span>
              <span className="capsule-tag" onClick={() => onChangeView('riskWords')}>⚠️ 风险词库</span>
              <span className="capsule-tag" onClick={() => onChangeView('accounts')}>👥 后台账号</span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/* ========= 系统状态卡 ========= */
function SystemStatusCard({ summary, onRetry, apiState, onToast }: { summary: DashboardSummary; onRetry: () => void; apiState: ApiState; onToast: (msg: string) => void }) {
  if (summary.db_connected) {
    return (
      <div className="reminder-card">
        <h3 className="dash-sidebar-title"><span className="pulse-dot pulse-dot-live" />系统状态</h3>
        {summary.db_mode === 'memory' ? (
          summary.environment === 'production' ? (
            <><p className="reminder-warn">生产环境配置异常</p><p className="reminder-desc">当前错误地进入内存模式，请立即检查数据库配置。</p></>
          ) : (
            <><p className="reminder-ok">开发模式运行中</p><p className="reminder-desc">本地开发环境，数据存储在内存中。部署到云服务器后请配置 DATABASE_URL 连接真实数据库。</p></>
          )
        ) : (
          <><p className="reminder-ok">真实数据库已连接</p><p className="reminder-desc">控制台正在读取线上数据。</p></>
        )}
      </div>
    );
  }

  if (apiState === 'error') {
    return (
      <div className="reminder-card reminder-card-warn">
        <h3 className="dash-sidebar-title"><span className="pulse-dot pulse-dot-off" />数据管道还没接上</h3>
        <p className="reminder-desc">请检查云服务器 DATABASE_URL、后端服务运行状态、数据库白名单和环境变量配置。当前控制台只展示安全空状态，不会执行危险操作。</p>
        <div className="reminder-actions">
          <button className="reminder-btn" onClick={onRetry}>重新同步数据</button>
          <button className="reminder-btn reminder-btn-ghost" onClick={() => onToast('请检查 server/.env 中 DATABASE_URL 配置，确保后端服务正常运行。')}>查看后端检查项</button>
        </div>
      </div>
    );
  }

  return (
    <div className="reminder-card">
      <h3 className="dash-sidebar-title"><span className="pulse-dot pulse-dot-off" />系统状态</h3>
      <p className="reminder-ok">真实接口正常</p>
      <p className="reminder-desc">控制台正在读取线上数据。</p>
    </div>
  );
}

/* ========= 子组件 ========= */
function StatusCard({ icon, title, value, tag, tone, extra, pulse }: {
  icon: string; title: string; value: number | string; tag: string; tone: string; extra?: string; pulse?: boolean;
}) {
  return (
    <article className={`status-card status-card-${tone} ${pulse ? 'status-card-pulse' : ''}`}>
      <div className="status-card-top">
        <span className="status-card-icon">{icon}</span>
        <span className={`status-card-badge status-badge-${tone}`}>{tag}</span>
      </div>
      <strong className="status-card-value count-up">{value}</strong>
      <div className="status-card-bottom">
        <span className="status-card-label">{title}</span>
        {extra ? <span className="status-card-extra">{extra}</span> : null}
      </div>
    </article>
  );
}

function HeartbeatItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`heartbeat-item ${highlight ? 'heartbeat-item-hl' : ''}`}>
      <span className="heartbeat-item-label">{label}</span>
      <strong className="heartbeat-item-value">{value}</strong>
    </div>
  );
}

function TaskVisibilityRadar({ visibility, onChangeView }: { visibility: TaskVisibilityAudit; onChangeView: (v: ViewKey) => void }) {
  const pendingAudit = visibility.pending_audit ?? 0;
  const approvedUnpaid = visibility.approved_unpaid ?? 0;
  const marketVisible = visibility.market_visible ?? 0;
  const paidButHidden = visibility.paid_but_hidden ?? 0;
  const warnings = visibility.release_warnings || [];
  const hasRisk = paidButHidden > 0;

  return (
    <section className={`visibility-radar ${hasRisk ? 'visibility-radar-risk' : ''}`}>
      <div className="visibility-head">
        <div>
          <span className="visibility-kicker">TASK RELEASE AUDIT</span>
          <h3>任务可见性雷达</h3>
        </div>
        <span className={`visibility-state ${hasRisk ? 'visibility-state-risk' : 'visibility-state-ok'}`}>
          {hasRisk ? '发现断点' : '链路正常'}
        </span>
      </div>
      <div className="visibility-flow">
        <VisibilityStep label="待审核" value={pendingAudit} tone={pendingAudit > 0 ? 'warn' : 'muted'} />
        <VisibilityStep label="已审核待支付" value={approvedUnpaid} tone={approvedUnpaid > 0 ? 'wait' : 'muted'} />
        <VisibilityStep label="需求广场可见" value={marketVisible} tone="ok" />
        <VisibilityStep label="支付后未公开" value={paidButHidden} tone={hasRisk ? 'risk' : 'muted'} />
      </div>
      <div className="visibility-foot">
        <p>
          {hasRisk
            ? '有任务已经支付托管，但还没有进入 open/paid/available 公开状态，请优先处理。'
            : '公开口径已和后端需求广场同步：审核通过并完成支付后才展示给接单者。'}
        </p>
        <button type="button" onClick={() => onChangeView(hasRisk ? 'reviews' : 'tasks')}>
          {hasRisk ? '处理异常任务' : '查看需求管理'}
        </button>
      </div>
      {warnings.length > 0 && (
        <div className="visibility-warning-list">
          {warnings.slice(0, 3).map(item => (
            <div className="visibility-warning-row" key={item.task_id}>
              <strong>{item.title || item.task_id}</strong>
              <span>{statusDisplay(item.audit_status)} / {statusDisplay(item.status)} / {statusDisplay(item.pay_status)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function VisibilityStep({ label, value, tone }: { label: string; value: number; tone: 'warn' | 'wait' | 'ok' | 'risk' | 'muted' }) {
  return (
    <div className={`visibility-step visibility-step-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MetricTile({ tone, label, value, hint }: { tone: string; label: string; value: string; hint: string }) {
  return (
    <article className={`metric-tile metric-tile-${tone}`}>
      <span className="metric-dot" />
      <div>
        <span className="metric-label">{label}</span>
        <strong className="metric-value">{value}</strong>
        <em className="metric-hint">{hint}</em>
      </div>
    </article>
  );
}

function ReviewsView(props: {
  tasks: AdminTask[]; selectedTask?: AdminTask; reason: string; setReason: (v: string) => void;
  onSelectTask: (id: string) => void; onAudit: (action: AuditAction) => Promise<void>; onOpenDisputes: () => void;
}) {
  const highRisk = props.tasks.filter((task) => riskScore(task) >= 80).length;
  const withFiles = props.tasks.filter((task) => (task.task_files?.length || 0) > 0).length;
  const avgBudget = props.tasks.length
    ? Math.round(props.tasks.reduce((sum, task) => sum + Number(task.budget_amount || 0), 0) / props.tasks.length)
    : 0;
  return (
    <>
      <section className="demand-hero-grid">
        <MetricTile tone="orange" label="待审核需求" value={`${props.tasks.length}`} hint="来自 /api/admin/tasks" />
        <MetricTile tone="red" label="高风险需求" value={`${highRisk}`} hint="AI 风险分 >= 80" />
        <MetricTile tone="blue" label="带附件需求" value={`${withFiles}`} hint="可辅助人工判断" />
        <MetricTile tone="green" label="平均预算" value={formatMoney(avgBudget)} hint="当前列表视角" />
      </section>
      <section className="content-grid demand-review-grid">
        <div className="review-queue card"><SectionTitle title="需求审核队列" desc="仅展示待审核任务，审核结果会写回真实后端。" right={`${props.tasks.length} 条`} /><TaskQueue tasks={props.tasks} selectedId={props.selectedTask?.id || ''} onSelect={props.onSelectTask} /></div>
        <TaskDetailCard task={props.selectedTask} />
        <aside className="decision-panel card">
          <div className="anime-helper"><div className="helper-face">AI</div><div><strong>审核助手</strong><span>通过、驳回都会写入真实任务状态。</span></div></div>
          <label>驳回原因<textarea value={props.reason} onChange={e => props.setReason(e.target.value)} placeholder="请写清楚驳回原因，用户端会据此修改需求。" /></label>
          <button className="primary-action" onClick={() => void props.onAudit('approve')}>通过上架</button>
          <button className="danger-action" onClick={() => void props.onAudit('reject')}>驳回修改</button>
          <button className="ghost-action" onClick={props.onOpenDisputes}>进入仲裁</button>
        </aside>
      </section>
    </>
  );
}

function TasksView(props: {
  tasks: AdminTask[]; selectedTask?: AdminTask; auditFilter: string; statusFilter: string;
  setAuditFilter: (v: string) => void; setStatusFilter: (v: string) => void; onSelectTask: (id: string) => void;
}) {
  const pendingPayment = props.tasks.filter((task) => task.status === 'pending_payment').length;
  const open = props.tasks.filter((task) => ['open', 'available', 'paid'].includes(task.status || '')).length;
  const assigned = props.tasks.filter((task) => ['assigned', 'in_progress', 'submitted'].includes(task.status || '')).length;
  const completed = props.tasks.filter((task) => task.status === 'completed').length;
  return (
    <>
      <section className="demand-hero-grid">
        <MetricTile tone="orange" label="需求总数" value={`${props.tasks.length}`} hint="当前筛选结果" />
        <MetricTile tone="blue" label="待支付" value={`${pendingPayment}`} hint="审核后需用户支付" />
        <MetricTile tone="green" label="开放接单" value={`${open}`} hint="前端需求广场可见" />
        <MetricTile tone="purple" label="服务流转中" value={`${assigned + completed}`} hint={`${assigned} 进行中 / ${completed} 完成`} />
      </section>
      <section className="management-grid demand-management-grid">
        <div className="card">
          <SectionTitle title="需求管理" desc="按审核状态和生命周期筛选真实任务，确保后台审核后前端可见性一致。" right={`${props.tasks.length} 条`} />
          <div className="filter-row">
            <SelectPill value={props.auditFilter} onChange={props.setAuditFilter} options={['all', 'pending', 'approved', 'rejected']} label="审核" />
            <SelectPill value={props.statusFilter} onChange={props.setStatusFilter} options={['all', 'pending_audit', 'pending_payment', 'open', 'assigned', 'disputed', 'rejected']} label="状态" />
          </div>
          <DataTable rows={props.tasks} empty="暂无任务" render={t => (
            <button key={t.id} className="data-row button-row demand-row" onClick={() => props.onSelectTask(t.id)}>
              <strong>{t.title}</strong><span>{t.users?.nickname || '未知'} · {t.region || '不限'}</span>
              <em>{statusDisplay(t.audit_status) || '-'}</em><em>{statusDisplay(t.status) || '-'}</em><b>{formatMoney(t.budget_amount)}</b>
            </button>
          )} />
        </div>
        <TaskDetailCard task={props.selectedTask} />
      </section>
    </>
  );
}

function UsersView({ users, statusFilter, setStatusFilter, onUpdateStatus }: {
  users: AdminUser[];
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  onUpdateStatus: (user: AdminUser, status: 'active' | 'banned' | 'frozen' | 'deleted') => Promise<void>;
}) {
  const activeUsers = users.filter(u => (u.status || 'active') === 'active');
  const bannedUsers = users.filter(u => ['banned', 'deleted', 'disabled'].includes(u.status || ''));
  const verifiedUsers = users.filter(u => ['verified', 'approved', 'passed', '已实名'].includes(u.real_name_status || ''));
  const selectedUser = users[0];
  const trustScore = selectedUser
    ? Math.max(60, Math.min(99, (selectedUser.status === 'banned' ? 62 : 86) + Number(selectedUser.completed_orders || selectedUser.service_count || 0)))
    : 0;
  return (
    <section className="single-grid ops-user-page">
      <div className="ops-page-head">
        <div>
          <span className="ops-kicker">User Intelligence</span>
          <h2>用户管理</h2>
          <p>查看用户状态、实名进度、异常账号和基础画像。涉及封禁、黑名单、实名结果的动作应继续以后端风控规则为准。</p>
        </div>
        <div className="ops-tabs" role="tablist" aria-label="用户状态筛选">
          {['all', 'active', 'banned', 'deleted'].map(tab => <button key={tab} className={statusFilter === tab ? 'ops-tab-active' : ''} onClick={() => setStatusFilter(tab)}>{statusDisplay(tab)}</button>)}
        </div>
      </div>
      <section className="demand-hero-grid ops-metric-grid">
        <MetricTile tone="orange" label="用户总数" value={`${users.length}`} hint="来自后端真实用户列表" />
        <MetricTile tone="green" label="活跃用户" value={`${activeUsers.length}`} hint="可正常登录/交易" />
        <MetricTile tone="blue" label="实名用户" value={`${verifiedUsers.length}`} hint={`${users.length ? Math.round((verifiedUsers.length / users.length) * 1000) / 10 : 0}% 已认证`} />
        <MetricTile tone="red" label="异常账号" value={`${bannedUsers.length}`} hint="封禁/删除/停用状态" />
      </section>
      <section className="ops-board-grid ops-user-board">
        <aside className="card user-profile-card">
          <SectionTitle title="用户画像" desc="当前展示列表首位用户，后续可接入点击选中。" right={selectedUser ? statusDisplay(selectedUser.status) || '活跃' : '未选择'} />
          {selectedUser ? (
            <>
              <div className="provider-profile-head">
                <div className="provider-avatar user-avatar">{(selectedUser.nickname || '用').slice(0, 1)}</div>
                <div>
                  <strong>{selectedUser.nickname || selectedUser.id}</strong>
                  <span>{selectedUser.phone || '未绑定手机'} · {selectedUser.city || selectedUser.region || '未设置城市'}</span>
                </div>
              </div>
              <div className="user-trust-panel">
                <span>信用分</span>
                <strong>{trustScore * 10}</strong>
                <em>{statusDisplay(selectedUser.real_name_status) || '实名待核对'}</em>
              </div>
              <div className="provider-radar-lite">
                {['资料完整', '交易安全', '服务偏好', '活跃程度'].map((label, index) => <span key={label} style={{ '--bar': `${Math.max(52, trustScore - index * 8)}%` } as CSSProperties}>{label}<b /></span>)}
              </div>
              <div className="provider-tags">
                <span>{statusDisplay(selectedUser.role) || '普通用户'}</span>
                <span>{statusDisplay(selectedUser.status) || '活跃'}</span>
                <span>{selectedUser.created_at ? `注册 ${formatTime(selectedUser.created_at)}` : '注册时间待同步'}</span>
              </div>
            </>
          ) : <EmptyState text="暂无用户画像" />}
        </aside>
        <div className="card ops-table-card">
          <SectionTitle title="用户列表" desc="查看真实用户状态，异常账号会单独标记。" right={`${users.length} 人`} />
          <div className="filter-row"><SelectPill value={statusFilter} onChange={setStatusFilter} options={['all', 'active', 'banned', 'deleted']} label="状态" /></div>
          <DataTable rows={users} empty="暂无用户" render={u => (
            <div key={u.id} className={`data-row ops-user-row ${u.status !== 'active' && u.status ? 'danger-row' : ''}`}>
              <strong>{u.nickname || u.id}</strong>
              <span>{u.phone || '未绑定手机'} · {u.city || u.region || '未设置城市'}</span>
              <em>{statusDisplay(u.role) || '未设置'}</em>
              <em>{statusDisplay(u.real_name_status) || '实名待核对'}</em>
              <em>{statusDisplay(u.status) || '活跃'}</em>
              <b>{formatTime(u.created_at)}</b>
              <div className="row-actions">
                {(u.status || 'active') === 'active' ? (
                  <>
                    <button className="btn-outline-danger btn-sm" onClick={() => void onUpdateStatus(u, 'banned')}>封禁</button>
                    <button className="btn-outline btn-sm" onClick={() => void onUpdateStatus(u, 'frozen')}>冻结</button>
                  </>
                ) : (
                  <button className="btn-outline btn-sm" onClick={() => void onUpdateStatus(u, 'active')}>解封</button>
                )}
              </div>
            </div>
          )} />
        </div>
      </section>
      <section className="user-segment-grid">
        <div><strong>高信任用户</strong><span>{verifiedUsers.length} 人</span><p>实名完成且账号状态正常，可作为优先服务对象。</p></div>
        <div><strong>活跃普通用户</strong><span>{activeUsers.length} 人</span><p>可继续通过首页、消息和优惠券引导发布需求。</p></div>
        <div><strong>需风控观察</strong><span>{bannedUsers.length} 人</span><p>涉及封禁/停用账号，必须由后端权限和审计日志保护。</p></div>
      </section>
    </section>
  );
}

function OrdersView({ orders, statusFilter, setStatusFilter }: { orders: AdminOrder[]; statusFilter: string; setStatusFilter: (v: string) => void }) {
  const attentionOrders = orders.filter(orderNeedsAttention);
  const inProgress = orders.filter(o => ['paid', 'assigned', 'in_progress', 'submitted'].includes(o.status || '')).length;
  const refunds = orders.filter(o => ['refunding', 'refunded'].includes(o.refund_status || '') || ['disputed', 'refunding'].includes(o.status || '')).length;
  const completed = orders.filter(o => o.status === 'completed').length;
  const paid = orders.filter(o => o.pay_status === 'paid' || ['paid', 'assigned', 'in_progress', 'submitted', 'completed'].includes(o.status || '')).length;
  const totalAmount = orders.reduce((sum, item) => sum + amountYuan(item.amount), 0);
  const statusTabs = ['all', 'unpaid', 'paid', 'assigned', 'in_progress', 'completed', 'disputed', 'cancelled'];
  return (
    <section className="single-grid ops-order-page">
      <div className="ops-page-head">
        <div>
          <span className="ops-kicker">Order Command</span>
          <h2>订单管理</h2>
          <p>统一查看支付、交付、退款和争议状态。这里展示后端真实订单，前端不能决定金额、退款和佣金。</p>
        </div>
        <div className="ops-tabs" role="tablist" aria-label="订单状态筛选">
          {statusTabs.slice(0, 5).map(tab => <button key={tab} className={statusFilter === tab ? 'ops-tab-active' : ''} onClick={() => setStatusFilter(tab)}>{statusDisplay(tab)}</button>)}
        </div>
      </div>
      <section className="demand-hero-grid ops-metric-grid">
        <MetricTile tone="orange" label="订单总数" value={`${orders.length}`} hint={`总成交 ${totalAmount.toFixed(2)} 元`} />
        <MetricTile tone="blue" label="进行中订单" value={`${inProgress}`} hint="待履约/交付/确认" />
        <MetricTile tone="purple" label="退款与争议" value={`${refunds}`} hint="需运营优先跟进" />
        <MetricTile tone="green" label="支付成功率" value={`${orders.length ? Math.round((paid / orders.length) * 1000) / 10 : 0}%`} hint={`${paid} 单已支付 / ${completed} 单完成`} />
      </section>
      <section className="ops-board-grid ops-order-board">
        <div className="card ops-table-card">
          <SectionTitle title="订单列表" desc="展示真实订单、支付状态和关联任务。" right={`${orders.length} 单`} />
          <div className="filter-row">
            <SelectPill value={statusFilter} onChange={setStatusFilter} options={statusTabs} label="状态" />
          </div>
          <DataTable rows={orders} empty="暂无订单" render={o => (
            <div key={o.id} className={`data-row ops-order-row ${orderNeedsAttention(o) ? 'ops-row-attention' : ''}`}>
              <strong>{o.order_no || o.id}</strong>
              <span>{o.tasks?.title || '未关联任务'}</span>
              <em>{statusDisplay(o.status) || '-'}</em>
              <em>{statusDisplay(o.pay_status) || '支付待同步'}</em>
              <b>{formatMoney(o.amount)}</b>
              <span>{formatTime(o.created_at)}</span>
            </div>
          )} />
        </div>
        <aside className="ops-side-stack">
          <div className="card ops-warning-card">
            <SectionTitle title="异常订单提醒" desc="优先处理超时、争议、退款和待响应订单。" right={`${attentionOrders.length} 单`} />
            <div className="ops-warning-total"><span>需跟进</span><strong>{attentionOrders.length}</strong></div>
            <DataTable rows={attentionOrders.slice(0, 5)} empty="暂无异常订单" render={o => (
              <div key={o.id} className="ops-warning-line">
                <span>{o.order_no || o.id}</span>
                <b>{statusDisplay(o.status) || '待处理'}</b>
              </div>
            )} />
          </div>
          <div className="card ops-refund-card">
            <SectionTitle title="退款预警" desc="退款金额与状态必须以后端为准。" />
            <strong>{formatMoney(orders.filter(o => ['refunding', 'refunded'].includes(o.refund_status || '')).reduce((sum, item) => sum + Number(item.amount || 0), 0))}</strong>
            <p>当前退款/争议相关订单 {refunds} 单。上线前需继续回归微信支付回调、退款幂等和重复退款拦截。</p>
          </div>
        </aside>
      </section>
    </section>
  );
}

function ProvidersView({ users, orders, tasks }: { users: AdminUser[]; orders: AdminOrder[]; tasks: AdminTask[] }) {
  const providers = users.filter(isProvider);
  const activeProviders = providers.filter(u => (u.status || 'active') === 'active');
  const verifiedProviders = providers.filter(u => ['verified', 'approved', 'passed'].includes(u.real_name_status || '') || u.real_name_status === '已实名');
  const pendingProviders = providers.filter(u => ['pending', 'reviewing', '待审核'].includes(u.real_name_status || '') || !u.real_name_status);
  const assignedTasks = tasks.filter(t => t.worker_id || t.status === 'assigned' || t.status === 'in_progress');
  const completedOrders = orders.filter(o => o.status === 'completed');
  const selectedProvider = providers[0];
  const passRate = providers.length ? Math.round((verifiedProviders.length / providers.length) * 1000) / 10 : 0;
  return (
    <section className="single-grid ops-provider-page">
      <div className="ops-page-head">
        <div>
          <span className="ops-kicker">Provider Operations</span>
          <h2>服务者管理</h2>
          <p>关注接单者实名、接单质量、履约能力和异常状态。后续可在这里接入实名审核、封禁、评级和保证金。</p>
        </div>
        <span className="ops-head-badge">入驻审核视图</span>
      </div>
      <section className="demand-hero-grid ops-metric-grid">
        <MetricTile tone="orange" label="待审核服务者" value={`${pendingProviders.length}`} hint="实名/资料待确认" />
        <MetricTile tone="blue" label="认证通过率" value={`${passRate}%`} hint={`${verifiedProviders.length} / ${providers.length || 0} 人`} />
        <MetricTile tone="green" label="活跃服务者" value={`${activeProviders.length}`} hint="可参与接单" />
        <MetricTile tone="purple" label="履约订单" value={`${completedOrders.length}`} hint={`${assignedTasks.length} 个任务流转中`} />
      </section>
      <section className="ops-board-grid ops-provider-board">
        <div className="card ops-table-card">
          <SectionTitle title="服务者列表" desc="来自后端用户数据；role=worker 或已有履约记录会进入这里。" right={`${providers.length} 人`} />
          <DataTable rows={providers} empty="暂无服务者数据" render={u => (
            <div key={u.id} className={`data-row ops-provider-row ${u.status !== 'active' && u.status ? 'danger-row' : ''}`}>
              <strong>{u.nickname || u.id}</strong>
              <span>{u.phone || '未绑定手机'} · {u.city || u.region || '未设置城市'}</span>
              <em>{statusDisplay(u.real_name_status) || '实名待核对'}</em>
              <em>{statusDisplay(u.status) || '活跃'}</em>
              <b>{Number(u.service_count || u.completed_orders || 0)} 单</b>
            </div>
          )} />
        </div>
        <aside className="card provider-profile-card">
          <SectionTitle title="服务者画像" desc="当前展示列表首位服务者，后续可接入点击选中。" right={selectedProvider ? statusDisplay(selectedProvider.status) || '活跃' : '未选择'} />
          {selectedProvider ? (
            <>
              <div className="provider-profile-head">
                <div className="provider-avatar">{(selectedProvider.nickname || '服').slice(0, 1)}</div>
                <div>
                  <strong>{selectedProvider.nickname || selectedProvider.id}</strong>
                  <span>{selectedProvider.phone || '未绑定手机'} · {selectedProvider.city || selectedProvider.region || '未设置城市'}</span>
                </div>
              </div>
              <div className="provider-credit-score">
                <span>信用分</span>
                <strong>{Math.max(60, Math.min(99, Math.round((Number(selectedProvider.rating || 4.6) / 5) * 100))) * 10}</strong>
                <em>{statusDisplay(selectedProvider.real_name_status) || '实名待核对'}</em>
              </div>
              <div className="provider-radar-lite">
                {['服务态度', '履约能力', '响应速度', '资料完整'].map((label, index) => <span key={label} style={{ '--bar': `${68 + index * 7}%` } as CSSProperties}>{label}<b /></span>)}
              </div>
              <div className="provider-tags">
                <span>订单 {Number(selectedProvider.service_count || selectedProvider.completed_orders || 0)} 单</span>
                <span>评分 {selectedProvider.rating || '待积累'}</span>
                <span>保证金待接入</span>
              </div>
            </>
          ) : <EmptyState text="暂无服务者画像" />}
        </aside>
      </section>
      <div className="ops-note-card">
        <strong>上线前必须补齐</strong>
        <p>服务者实名、接单押金、违规扣分、接单频率限制都应该以后端规则为准，控制台只触发审核动作，不直接修改资金。</p>
      </div>
    </section>
  );
}

function DispatchCenterView({ tasks, orders, onSelectTask, onOpenReviews }: { tasks: AdminTask[]; orders: AdminOrder[]; onSelectTask: (id: string) => void; onOpenReviews: () => void }) {
  const pendingAudit = tasks.filter(t => t.audit_status === 'pending' || t.status === 'pending_audit');
  const dispatchable = tasks.filter(taskNeedsDispatch);
  const noWorkerOrders = orders.filter(o => !o.worker_id && ['paid', 'assigned', 'in_progress'].includes(o.status || ''));
  const blockedByPayment = tasks.filter(t => t.audit_status === 'approved' && t.status === 'pending_payment');
  const timeoutCandidates = dispatchable.filter(t => {
    const time = t.updated_at || t.created_at;
    if (!time) return false;
    return Date.now() - new Date(time).getTime() > 1000 * 60 * 60 * 6;
  });
  const matchedOrders = orders.filter(o => o.worker_id && ['assigned', 'in_progress', 'submitted'].includes(o.status || ''));
  return (
    <section className="single-grid ops-dispatch-page">
      <div className="ops-page-head">
        <div>
          <span className="ops-kicker">Dispatch Board</span>
          <h2>派单中心</h2>
          <p>把“已审核但未形成有效接单”的需求集中起来，避免客户发布后无人响应。这里只做运营提示，真正抢单/接单仍走后端原子校验。</p>
        </div>
        <div className="ops-tabs" role="tablist" aria-label="派单模式">
          {['AI 匹配规则', '人工派单', '地图派单', '超时重派'].map((tab, index) => <button key={tab} className={index === 0 ? 'ops-tab-active' : ''} type="button">{tab}</button>)}
        </div>
      </div>
      <section className="demand-hero-grid ops-metric-grid">
        <MetricTile tone="blue" label="待审核需求" value={`${pendingAudit.length}`} hint="需先进入审核链路" />
        <MetricTile tone="green" label="可推动接单" value={`${dispatchable.length}`} hint="审核通过/可运营跟进" />
        <MetricTile tone="orange" label="待支付阻塞" value={`${blockedByPayment.length}`} hint="不能公开派单" />
        <MetricTile tone="purple" label="已匹配履约中" value={`${matchedOrders.length}`} hint={`${timeoutCandidates.length} 个超时候选`} />
      </section>
      {pendingAudit.length > 0 ? (
        <div className="ops-alert-card dispatch-alert-card">
          <strong>先处理需求审核</strong>
          <p>还有 {pendingAudit.length} 个需求没有审核，通过后客户才能继续支付或进入可接单链路。</p>
          <button className="btn-primary" onClick={onOpenReviews}>去审核</button>
        </div>
      ) : null}
      <section className="ops-board-grid ops-dispatch-board">
        <div className="card ops-table-card">
          <SectionTitle title="待派单需求" desc="审核通过后仍需要运营跟进的任务。" right={`${dispatchable.length} 个`} />
          <DataTable rows={dispatchable} empty="暂无需要派单推动的需求" render={t => (
            <button key={t.id} className={`data-row button-row ops-dispatch-row ${timeoutCandidates.some(item => item.id === t.id) ? 'ops-row-attention' : ''}`} onClick={() => onSelectTask(t.id)}>
              <strong>{t.title}</strong>
              <span>{t.users?.nickname || '客户'} · {t.region || t.city || '不限城市'}</span>
              <em>{statusDisplay(t.audit_status) || '-'}</em>
              <em>{statusDisplay(t.status) || '-'}</em>
              <b>{formatMoney(t.budget_amount)}</b>
              <span>{formatTime(t.updated_at || t.created_at)}</span>
            </button>
          )} />
        </div>
        <aside className="card dispatch-map-card">
          <SectionTitle title="地图派单视图" desc="当前按现有地区字段生成运营视图，正式地图需接入经纬度。" right="只读预览" />
          <div className="dispatch-map-visual">
            <span className="dispatch-pin dispatch-pin-main">需</span>
            <span className="dispatch-pin dispatch-pin-a">服</span>
            <span className="dispatch-pin dispatch-pin-b">服</span>
            <span className="dispatch-pin dispatch-pin-c">服</span>
            <i className="dispatch-radius dispatch-radius-1" />
            <i className="dispatch-radius dispatch-radius-2" />
          </div>
          <div className="dispatch-nearby-list">
            {dispatchable.slice(0, 4).map((task, index) => (
              <div key={task.id}>
                <strong>{task.region || task.city || '未标记地区'}</strong>
                <span>{task.title}</span>
                <b>{index + 2}.{index + 1}km</b>
              </div>
            ))}
            {!dispatchable.length ? <EmptyState text="暂无地图派单数据" /> : null}
          </div>
        </aside>
      </section>
      <section className="ops-board-grid ops-dispatch-board">
        <div className="card">
          <SectionTitle title="待匹配订单" desc="已经形成订单但缺少明确服务者的记录，需排查支付、接单或状态流转。" right={`${noWorkerOrders.length} 单`} />
          <DataTable rows={noWorkerOrders} empty="暂无待匹配订单" render={o => (
            <div key={o.id} className="data-row ops-order-row">
              <strong>{o.order_no || o.id}</strong>
              <span>{o.tasks?.title || '未关联任务'}</span>
              <em>{statusDisplay(o.status) || '-'}</em>
              <em>{statusDisplay(o.pay_status) || '支付状态待核对'}</em>
              <b>{formatMoney(o.amount)}</b>
              <span>{formatTime(o.created_at)}</span>
            </div>
          )} />
        </div>
        <aside className="card dispatch-rules-card">
          <SectionTitle title="匹配权重设置" desc="当前为上线前只读规则说明，避免绕过后端原子接单。" />
          {[
            ['距离权重', 40],
            ['评分权重', 25],
            ['价格权重', 15],
            ['响应速度', 10],
            ['完成率', 10],
          ].map(([label, value]) => (
            <div className="dispatch-weight-line" key={label}>
              <span>{label}</span>
              <i><b style={{ width: `${value}%` }} /></i>
              <strong>{value}%</strong>
            </div>
          ))}
          <div className="dispatch-mode-grid">
            <span>AI 自动推荐</span>
            <span>人工派单复核</span>
            <span>超时提醒</span>
            <span>拒单重派</span>
          </div>
        </aside>
      </section>
    </section>
  );
}

function FinanceCenterView({ orders, disputes }: { orders: AdminOrder[]; disputes: AdminDispute[] }) {
  const paidOrders = orders.filter(o => ['paid', 'assigned', 'in_progress', 'submitted', 'completed'].includes(o.status || '') || o.pay_status === 'paid');
  const completedOrders = orders.filter(o => o.status === 'completed');
  const refundingOrders = orders.filter(o => ['refunding', 'refunded'].includes(o.status || '') || ['refunding', 'refunded'].includes(o.refund_status || ''));
  const escrowOrders = paidOrders.filter(o => !['completed', 'refunding', 'refunded', 'cancelled'].includes(o.status || ''));
  const disputedAmount = orders.filter(o => o.status === 'disputed').reduce((sum, item) => sum + amountYuan(item.amount), 0);
  const grossAmount = paidOrders.reduce((sum, item) => sum + amountYuan(item.amount), 0);
  const escrowAmount = escrowOrders.reduce((sum, item) => sum + amountYuan(item.amount), 0);
  const refundingAmount = refundingOrders.reduce((sum, item) => sum + amountYuan(item.amount), 0);
  const pendingDisputes = disputes.filter(d => d.status === 'pending');
  const healthScore = Math.max(60, Math.min(99, 99 - refundingOrders.length * 3 - pendingDisputes.length * 5));
  return (
    <section className="single-grid ops-finance-page">
      <div className="ops-page-head">
        <div>
          <span className="ops-kicker">Finance Control</span>
          <h2>财务中心</h2>
          <p>展示成交、托管、退款和争议金额。金额计算必须来自后端，控制台只做运营观察和后续审核入口。</p>
        </div>
        <div className="ops-tabs" role="tablist" aria-label="财务模块">
          {['交易流水', '托管资金', '提现审核', '退款审核', '佣金结算'].map((tab, index) => <button key={tab} className={index === 0 ? 'ops-tab-active' : ''} type="button">{tab}</button>)}
        </div>
      </div>
      <section className="demand-hero-grid ops-metric-grid">
        <MetricTile tone="orange" label="GMV / 已支付" value={`¥${grossAmount.toFixed(2)}`} hint={`${paidOrders.length} 单已支付`} />
        <MetricTile tone="blue" label="托管资金余额" value={`¥${escrowAmount.toFixed(2)}`} hint={`${escrowOrders.length} 单待履约/验收`} />
        <MetricTile tone="purple" label="退款相关订单" value={`${refundingOrders.length}`} hint={`涉及 ${refundingAmount.toFixed(2)} 元`} />
        <MetricTile tone="green" label="资金健康度" value={`${healthScore}%`} hint={`${pendingDisputes.length} 条待仲裁`} />
      </section>
      <section className="ops-board-grid ops-finance-board">
        <div className="card ops-table-card">
          <SectionTitle title="交易流水记录" desc="用于快速核对支付、履约、退款风险；正式对账仍以后端和微信支付账单为准。" right={`${orders.length} 单`} />
          <DataTable rows={orders.slice(0, 14)} empty="暂无订单流水" render={o => (
            <div key={o.id} className={`data-row ops-finance-row ${o.status === 'disputed' || o.refund_status ? 'ops-row-attention' : ''}`}>
              <strong>{o.order_no || o.id}</strong>
              <span>{o.tasks?.title || '未关联任务'}</span>
              <em>{o.pay_status === 'paid' ? '平台收款' : '待支付/待同步'}</em>
              <b>{formatMoney(o.amount)}</b>
              <em>{statusDisplay(o.status) || '-'}</em>
              <span>{formatTime(o.created_at)}</span>
            </div>
          )} />
        </div>
        <aside className="ops-side-stack">
          <div className="card finance-health-card">
            <SectionTitle title="资金安全健康度" desc="按订单状态、退款和仲裁压力估算。" />
            <div className="finance-health-ring" style={{ '--score': `${healthScore}%` } as CSSProperties}>
              <strong>{healthScore}%</strong>
              <span>{healthScore >= 90 ? '健康' : healthScore >= 75 ? '需观察' : '高风险'}</span>
            </div>
            <div className="finance-health-list">
              <span>账户安全 <b>{Math.max(90, healthScore)}%</b></span>
              <span>资金流动性 <b>{Math.max(70, healthScore - refundingOrders.length)}%</b></span>
              <span>争议压力 <b>{Math.max(60, 100 - pendingDisputes.length * 8)}%</b></span>
              <span>退款压力 <b>{Math.max(60, 100 - refundingOrders.length * 6)}%</b></span>
            </div>
          </div>
          <div className="card finance-risk-card">
            <SectionTitle title="风险提醒" desc="这些事项上线前必须持续人工复核。" />
            <div className="finance-risk-line"><strong>大额/争议订单</strong><span>{orders.filter(o => o.status === 'disputed').length} 单 · ¥{disputedAmount.toFixed(2)}</span></div>
            <div className="finance-risk-line"><strong>退款申请</strong><span>{refundingOrders.length} 单 · ¥{refundingAmount.toFixed(2)}</span></div>
            <div className="finance-risk-line"><strong>托管未完成</strong><span>{escrowOrders.length} 单 · ¥{escrowAmount.toFixed(2)}</span></div>
          </div>
        </aside>
      </section>
      <section className="finance-bottom-grid">
        <div><strong>资金合规提示</strong><span>控制台只发起审核/查询，实际退款、提现、佣金结算必须由后端校验金额、状态和幂等。</span></div>
        <div><strong>对账状态</strong><span>上线前需要接入微信支付账单、退款单和平台订单三方对账。</span></div>
        <div><strong>结算提醒</strong><span>佣金、分账、提现应使用后端结算表，不从前端临时计算。</span></div>
      </section>
    </section>
  );
}

function CityOpsView({ region, tasks, orders, users, disputes, onSwitchCity }: { region: RegionOption; tasks: AdminTask[]; orders: AdminOrder[]; users: AdminUser[]; disputes: AdminDispute[]; onSwitchCity: () => void }) {
  const regionName = region.label;
  const matchRegion = (value?: string) => region.type === 'national' || (value ? String(value).includes(regionName) : false);
  const regionTasks = tasks.filter(t => matchRegion(t.region) || matchRegion(t.city));
  const regionOrders = orders.filter(o => region.type === 'national' || matchRegion(o.tasks?.region));
  const regionUsers = users.filter(u => matchRegion(u.region) || matchRegion(u.city));
  const regionProviders = regionUsers.filter(isProvider);
  const regionGmv = regionOrders.reduce((sum, item) => sum + amountYuan(item.amount), 0);
  const pressure = regionTasks.filter(t => t.audit_status === 'pending' || riskScore(t) >= 80).length + disputes.filter(d => d.status === 'pending').length;
  const cityRows = HOT_CITIES.map((city, index) => {
    const cityTasks = tasks.filter(t => [t.region, t.city].filter(Boolean).some(v => String(v).includes(city.label)));
    const cityOrders = orders.filter(o => o.tasks?.region?.includes(city.label));
    const cityUsers = users.filter(u => [u.region, u.city].filter(Boolean).some(v => String(v).includes(city.label)));
    return {
      city: city.label,
      tasks: cityTasks.length,
      orders: cityOrders.length,
      users: cityUsers.length,
      providers: cityUsers.filter(isProvider).length,
      gmv: cityOrders.reduce((sum, item) => sum + amountYuan(item.amount), 0),
      heat: Math.min(96, 24 + cityTasks.length * 12 + cityOrders.length * 18 + index * 3),
    };
  }).sort((a, b) => (b.orders + b.tasks) - (a.orders + a.tasks)).map((row, index) => ({ ...row, rank: index + 1 }));
  const serviceTags = Array.from(new Set(regionTasks.map(t => t.task_categories?.name || t.service_type || '同城服务'))).slice(0, 8);
  return (
    <section className="single-grid ops-city-page">
      <div className="ops-page-head">
        <div>
          <span className="ops-kicker">City Operations</span>
          <h2>{regionName}运营看板</h2>
          <p>按当前地区观察需求、订单、用户和风险压力。若后端暂未支持城市字段，页面会展示全局数据并提醒补字段。</p>
        </div>
        <div className="ops-tabs" role="tablist" aria-label="城市运营模块">
          {['城市开通', '区域热力', '城市服务商', '区域规则'].map((tab, index) => <button key={tab} className={index === 0 ? 'ops-tab-active' : ''} type="button">{tab}</button>)}
        </div>
      </div>
      <section className="demand-hero-grid ops-metric-grid">
        <MetricTile tone="blue" label="区域需求" value={`${regionTasks.length}`} hint="当前城市/全国视角" />
        <MetricTile tone="orange" label="区域订单" value={`${regionOrders.length}`} hint={`GMV ¥${regionGmv.toFixed(2)}`} />
        <MetricTile tone="green" label="活跃用户" value={`${regionUsers.length}`} hint={`${regionProviders.length} 位服务者`} />
        <MetricTile tone="purple" label="风险压力" value={`${pressure}`} hint="待审核 + 仲裁压力" />
      </section>
      <div className="ops-alert-card city-alert-card">
        <strong>城市运营提示</strong>
        <p>要做到真正城市化运营，后端 tasks、orders、users 最好统一写入 city/region 字段，并建立索引。当前控制台已按现有字段尽量筛选。</p>
        <button className="btn-primary" onClick={onSwitchCity}>切换运营城市</button>
      </div>
      <section className="city-ops-layout">
        <div className="card city-heat-card">
          <SectionTitle title="全国城市运营热力图" desc="用现有城市字段生成热度预览，正式版可替换为真实地图。" right={regionName} />
          <div className="city-map-shell">
            {cityRows.slice(0, 8).map((row, index) => (
              <span key={row.city} className={`city-hotspot city-hotspot-${index + 1}`} style={{ '--heat': `${row.heat}%` } as CSSProperties}>
                <i />{row.city}
              </span>
            ))}
          </div>
          <div className="city-heat-legend"><span>低</span><i /><span>高</span><b>已开通城市</b></div>
        </div>
        <div className="card city-rank-card">
          <SectionTitle title="城市运营排行榜" desc="按订单和需求热度排序。" right={`${cityRows.length} 城市`} />
          <DataTable rows={cityRows.slice(0, 8)} empty="暂无城市数据" render={(row) => (
            <div key={row.city} className="city-rank-row">
              <strong>{row.rank}</strong>
              <span>{row.city}</span>
              <em>{row.orders} 单</em>
              <b>¥{row.gmv.toFixed(2)}</b>
              <small>{row.users} 用户</small>
              <i>{row.providers} 服务者</i>
            </div>
          )} />
        </div>
        <aside className="card city-partner-card">
          <SectionTitle title="城市服务商" desc="当前地区服务者/接单者概览。" right="真实用户数据" />
          <DataTable rows={regionProviders.slice(0, 7)} empty="当前地区暂无服务者" render={u => (
            <div key={u.id} className="city-partner-row">
              <div className="provider-avatar city-avatar">{(u.nickname || '服').slice(0, 1)}</div>
              <div><strong>{u.nickname || u.id}</strong><span>{u.city || u.region || '未设置城市'}</span></div>
              <em>{statusDisplay(u.status) || '合作中'}</em>
            </div>
          )} />
        </aside>
      </section>
      <section className="city-rule-grid">
        <div className="card city-rule-card">
          <SectionTitle title="服务半径" desc="上线后应写入城市规则表。" />
          <strong>5 公里</strong><span>基础半径</span><strong>20 公里</strong><span>最大半径</span>
        </div>
        <div className="card city-rule-card">
          <SectionTitle title="起步价设置" desc="金额配置必须后端校验。" />
          <p>起步价：¥15.00</p><p>包含里程/时长：5 公里 / 30 分钟</p><p>超出计费：¥3.00 / 公里，¥1.00 / 分钟</p>
        </div>
        <div className="card city-rule-card city-service-tags">
          <SectionTitle title="开通服务类目" desc="来自当前区域任务类目。" />
          <div>{(serviceTags.length ? serviceTags : ['家政保洁', '跑腿代办', '上门安装', '维修服务']).map(tag => <span key={tag}>{tag}</span>)}</div>
        </div>
        <div className="card city-rule-card">
          <SectionTitle title="活动配置" desc="运营活动只展示，不直接影响价格。" />
          <p>活动状态：待接入</p><p>活动名称：城市服务节</p><p>活动类型：平台补贴</p>
        </div>
      </section>
    </section>
  );
}

function DisputesView(props: {
  disputes: AdminDispute[]; selectedDispute?: AdminDispute; statusFilter: string; setStatusFilter: (v: string) => void;
  onSelectDispute: (id: string) => void; decisionNote: string; setDecisionNote: (v: string) => void; onDecide: (d: string) => Promise<void>;
}) {
  const evidence = parseEvidence(props.selectedDispute?.evidence_urls);
  const pending = props.disputes.filter(d => d.status === 'pending').length;
  const processing = props.disputes.filter(d => d.status === 'processing').length;
  const resolved = props.disputes.filter(d => d.status === 'resolved').length;
  const withEvidence = props.disputes.filter(d => parseEvidence(d.evidence_urls).length > 0).length;
  return (
    <section className="single-grid ops-dispute-page">
      <div className="ops-page-head">
        <div>
          <span className="ops-kicker">Service Arbitration</span>
          <h2>客服仲裁</h2>
          <p>集中处理投诉、退款、证据链和服务争议。裁决动作继续写入后端，控制台不直接绕过订单状态机。</p>
        </div>
        <div className="ops-tabs" role="tablist" aria-label="仲裁状态筛选">
          {['all', 'pending', 'processing', 'resolved'].map(tab => <button key={tab} className={props.statusFilter === tab ? 'ops-tab-active' : ''} onClick={() => props.setStatusFilter(tab)}>{statusDisplay(tab)}</button>)}
        </div>
      </div>
      <section className="demand-hero-grid ops-metric-grid">
        <MetricTile tone="orange" label="待处理工单" value={`${pending}`} hint={`${props.disputes.length} 条仲裁总量`} />
        <MetricTile tone="blue" label="处理中" value={`${processing}`} hint="客服正在跟进" />
        <MetricTile tone="green" label="已解决" value={`${resolved}`} hint="有明确裁决结果" />
        <MetricTile tone="purple" label="带证据链" value={`${withEvidence}`} hint="可辅助人工判断" />
      </section>
      <section className="ops-board-grid ops-dispute-board">
        <div className="card ops-table-card">
          <SectionTitle title="工单中心" desc="选择仲裁单并提交真实裁决。" right={`${props.disputes.length} 条`} />
          <div className="filter-row"><SelectPill value={props.statusFilter} onChange={props.setStatusFilter} options={['all', 'pending', 'processing', 'resolved']} label="状态" /></div>
          <DataTable rows={props.disputes} empty="暂无仲裁" render={d => (
            <button key={d.id} className={`data-row button-row ops-dispute-row ${props.selectedDispute?.id === d.id ? 'selected-row' : ''}`} onClick={() => props.onSelectDispute(d.id)}>
              <strong>{d.reason || d.id}</strong>
              <span>{d.order_id || '-'}</span>
              <em>{statusDisplay(d.status) || '-'}</em>
              <em>{parseEvidence(d.evidence_urls).length ? '有证据' : '待补证据'}</em>
              <b>{formatTime(d.created_at)}</b>
            </button>
          )} />
        </div>
        <div className="card dispute-detail-card">
          <SectionTitle title="工单详情" desc="裁决后写入 disputes.decision 与 decision_note。" right={props.selectedDispute ? statusDisplay(props.selectedDispute.status) || '待处理' : '未选择'} />
          {props.selectedDispute ? (
            <>
              <div className="dispute-hero">
                <div>
                  <span className="category-chip">{statusDisplay(props.selectedDispute.status) || '待处理'}</span>
                  <h3>{props.selectedDispute.reason || '未填写原因'}</h3>
                  <p>订单：{props.selectedDispute.order_id || '-'}</p>
                </div>
                <strong>{props.selectedDispute.decision || '待裁决'}</strong>
              </div>
              <div className="dispute-evidence-grid">
                <div><strong>证据附件</strong><span>{evidence.length} 个</span></div>
                <div><strong>创建时间</strong><span>{formatTime(props.selectedDispute.created_at)}</span></div>
                <div><strong>当前裁决</strong><span>{props.selectedDispute.decision || '待裁决'}</span></div>
              </div>
              <div className="attachment-grid">{evidence.length ? evidence.map(url => <div key={url} className="attachment-card"><img src={url} alt="证据" /><span>证据附件</span></div>) : <div className="attachment-card"><div className="empty-file">暂无证据附件</div></div>}</div>
              <div className="dispute-ai-card">
                <strong>AI 客服话术建议</strong>
                <p>先安抚双方情绪，再要求补齐证据。不要承诺退款金额、处理时效或平台赔付，所有裁决以后端规则和人工审核为准。</p>
                <span>建议回复：您好，我们已收到您的反馈，会结合订单记录和双方证据进行核实，请先补充能证明问题的截图或照片。</span>
              </div>
              <label className="decision-note">裁决说明<textarea value={props.decisionNote} onChange={e => props.setDecisionNote(e.target.value)} placeholder="请写清楚裁决依据，方便用户端和审计日志追溯。" /></label>
              <div className="action-row dispute-action-row">
                <button className="primary-action" onClick={() => void props.onDecide('continue_revision')}>继续修改</button>
                <button className="danger-action" onClick={() => void props.onDecide('full_refund')}>全额退款</button>
                <button className="ghost-action" onClick={() => void props.onDecide('reject')}>驳回仲裁</button>
              </div>
            </>
          ) : <EmptyState text="请选择仲裁单" />}
        </div>
      </section>
    </section>
  );
}

/* ========= 风险词= 完整版 ========= */
const CATEGORY_LABEL: Record<string, string> = { sensitive: '敏感提醒', forbidden: '直接拦截', review: '人工复核', log: '仅记录' };
const ACTION_LABEL: Record<string, string> = { notify: '提醒审核', block: '自动拦截', review: '转人工复核', log: '仅做记录', reject: '自动拒绝' };
const CATEGORY_TAG: Record<string, string> = { sensitive: 'rw-tag-yellow', forbidden: 'rw-tag-red', review: 'rw-tag-blue', log: 'rw-tag-gray' };
const cl = (c: string) => CATEGORY_LABEL[c] || c;
const al = (a: string) => ACTION_LABEL[a] || a;
const ctc = (c: string) => CATEGORY_TAG[c] || 'rw-tag-gray';
function isToday(d: string): boolean { const dd = new Date(d); const n = new Date(); return dd.getFullYear() === n.getFullYear() && dd.getMonth() === n.getMonth() && dd.getDate() === n.getDate(); }

function RiskWordsView(props: {
  riskWords: RiskWord[]; allRiskWords: RiskWord[];
  newRiskWord: string; setNewRiskWord: (v: string) => void;
  riskCategory: string; setRiskCategory: (v: string) => void;
  riskAction: string; setRiskAction: (v: string) => void;
  riskNote: string; setRiskNote: (v: string) => void;
  riskFilterCategory: string; setRiskFilterCategory: (v: string) => void;
  riskFilterAction: string; setRiskFilterAction: (v: string) => void;
  riskFilterStatus: string; setRiskFilterStatus: (v: string) => void;
  riskSearch: string; setRiskSearch: (v: string) => void;
  editingRiskWord: RiskWord | null; setEditingRiskWord: (v: RiskWord | null) => void;
  riskConfirmDelete: RiskWord | null; setRiskConfirmDelete: (v: RiskWord | null) => void;
  onAdd: (e?: FormEvent) => Promise<void>;
  onUpdate: (id: string, data: { word?: string; category?: string; action?: string; note?: string }) => Promise<void>;
  onToggle: (w: RiskWord) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  apiState: ApiState; onRetry: (msg?: string) => Promise<void>;
}) {
  const activeCount = props.allRiskWords.filter(w => w.status !== 'inactive').length;
  const blockCount = props.allRiskWords.filter(w => w.category === 'forbidden').length;
  const reviewCount = props.allRiskWords.filter(w => w.category === 'review' || w.action === 'review').length;

  if (props.apiState === 'error' && props.allRiskWords.length === 0) {
    return (
      <section className="rw-root">
        <div className="empty-gentle"><div className="empty-gentle-icon">🔌</div><p className="empty-gentle-title">风险词数据暂时没有回来</p><p className="empty-gentle-desc">请检查后端服务或稍后刷新。</p><button className="btn-primary" onClick={() => void props.onRetry()}>重新加载</button></div>
      </section>
    );
  }

  return (
    <section className="rw-root">
      <div className="rw-header">
        <div className="rw-header-left"><h2 className="rw-title">风险词库</h2><p className="rw-subtitle">提前识别违规沟通和异常交易，让平台安全多一道护栏。</p></div>
        <div className="rw-stat-cards">
          <div className="rw-stat-card"><span className="rw-stat-num">{activeCount}</span><span className="rw-stat-label">当前启用</span></div>
          <div className="rw-stat-card"><span className="rw-stat-num">{blockCount}</span><span className="rw-stat-label">直接拦截</span></div>
          <div className="rw-stat-card"><span className="rw-stat-num">{reviewCount}</span><span className="rw-stat-label">人工复核</span></div>
        </div>
      </div>
      {activeCount > 0 && blockCount > 0 ? (
        <div className="rw-safe-card rw-safe-warn"><span className="rw-safe-icon">⚠️</span><div><strong>发现需要关注的风险词</strong><p>有部分词语会触发拦截或人工复核，请及时检查规则是否准确。</p></div></div>
      ) : (
        <div className="rw-safe-card"><span className="rw-safe-icon">🛡️</span><div><strong>平台安全状态良好</strong><p>系统会自动识别高风险词，发现可疑内容时会提醒审核人员处理。</p></div></div>
      )}
      <div className="rw-card">
        <div className="rw-card-head"><h3 className="rw-card-title">➕ 添加新的风险提醒词</h3></div>
        <form className="rw-add-form" onSubmit={e => { e.preventDefault(); void props.onAdd(e); }}>
          <div className="rw-add-fields">
            <label className="rw-field"><span className="rw-field-label">风险词</span><input className="rw-input" placeholder="例如：票务转让、刷单、私下交易" value={props.newRiskWord} onChange={e => props.setNewRiskWord(e.target.value)} /></label>
            <label className="rw-field"><span className="rw-field-label">风险类型</span><select className="rw-select" value={props.riskCategory} onChange={e => props.setRiskCategory(e.target.value)}><option value="sensitive">敏感提醒</option><option value="forbidden">直接拦截</option><option value="review">人工复核</option><option value="log">仅记录</option></select></label>
            <label className="rw-field"><span className="rw-field-label">处理方式</span><select className="rw-select" value={props.riskAction} onChange={e => props.setRiskAction(e.target.value)}><option value="notify">提醒审核</option><option value="block">自动拦截</option><option value="review">转人工复核</option><option value="log">仅做记录</option></select></label>
            <label className="rw-field"><span className="rw-field-label">备注说明（可选）</span><input className="rw-input" placeholder="例如：用于识别票务转让风险" value={props.riskNote} onChange={e => props.setRiskNote(e.target.value)} /></label>
          </div>
          <button className="btn-primary rw-add-btn" type="submit" disabled={!props.newRiskWord.trim()}>添加风险词</button>
        </form>
      </div>
      <div className="rw-card">
        <div className="rw-card-head"><h3 className="rw-card-title">筛选风险词</h3></div>
        <div className="rw-filter-row">
          <input className="rw-input rw-filter-search" placeholder="搜索风险词" value={props.riskSearch} onChange={e => props.setRiskSearch(e.target.value)} />
          <select className="rw-select" value={props.riskFilterCategory} onChange={e => props.setRiskFilterCategory(e.target.value)}><option value="all">全部类型</option><option value="sensitive">敏感提醒</option><option value="forbidden">直接拦截</option><option value="review">人工复核</option><option value="log">仅记录</option></select>
          <select className="rw-select" value={props.riskFilterAction} onChange={e => props.setRiskFilterAction(e.target.value)}><option value="all">全部方式</option><option value="notify">提醒审核</option><option value="block">自动拦截</option><option value="review">转人工复核</option><option value="log">仅做记录</option></select>
          <select className="rw-select" value={props.riskFilterStatus} onChange={e => props.setRiskFilterStatus(e.target.value)}><option value="all">全部状态</option><option value="active">已启用</option><option value="inactive">已停用</option></select>
          <button className="btn-primary" onClick={() => void props.onRetry()}>查询</button>
          <button className="btn-outline" onClick={() => { props.setRiskSearch(''); props.setRiskFilterCategory('all'); props.setRiskFilterAction('all'); props.setRiskFilterStatus('all'); }}>重置</button>
        </div>
      </div>
      <div className="rw-card">
        <div className="rw-card-head"><h3 className="rw-card-title">风险词列表</h3><span className="rw-card-count">共 {props.riskWords.length} 条</span></div>
        {props.riskWords.length === 0 ? (
          <div className="empty-gentle"><div className="empty-gentle-icon">✨</div><p className="empty-gentle-title">风险词库还很干净</p><p className="empty-gentle-desc">你可以先添加常见风险词，系统会帮你提前提醒。</p><button className="btn-primary" onClick={() => { const inp = document.querySelector('.rw-add-form .rw-input') as HTMLInputElement; if (inp) inp.focus(); }}>添加第一个风险词</button></div>
        ) : (
          <div className="data-table-wrap">
            <table className="table-v2"><thead><tr><th>风险词</th><th>风险类型</th><th>处理方式</th><th>状态</th><th>更新时间</th><th>操作</th></tr></thead>
              <tbody>
                {props.riskWords.map(w => (
                  <tr key={w.id}>
                    <td>{props.editingRiskWord?.id === w.id ? <input className="rw-input rw-inline-edit" value={props.editingRiskWord.word} onChange={e => props.setEditingRiskWord({ ...props.editingRiskWord!, word: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') void props.onUpdate(w.id, { word: props.editingRiskWord!.word }); }} /> : <strong>{w.word}</strong>}{w.note && <div className="rw-word-note">{w.note}</div>}</td>
                    <td>{props.editingRiskWord?.id === w.id ? <select className="rw-select rw-inline-edit" value={props.editingRiskWord.category} onChange={e => props.setEditingRiskWord({ ...props.editingRiskWord!, category: e.target.value })}><option value="sensitive">敏感提醒</option><option value="forbidden">直接拦截</option><option value="review">人工复核</option><option value="log">仅记录</option></select> : <span className={`rw-tag ${ctc(w.category)}`}>{cl(w.category)}</span>}</td>
                    <td>{props.editingRiskWord?.id === w.id ? <select className="rw-select rw-inline-edit" value={props.editingRiskWord.action} onChange={e => props.setEditingRiskWord({ ...props.editingRiskWord!, action: e.target.value })}><option value="notify">提醒审核</option><option value="block">自动拦截</option><option value="review">转人工复核</option><option value="log">仅做记录</option></select> : <span className="text-muted">{al(w.action)}</span>}</td>
                    <td><span className={`rw-tag ${w.status === 'inactive' ? 'rw-tag-gray' : 'rw-tag-green'}`}>{w.status === 'inactive' ? '已停用' : '已启用'}</span></td>
                    <td className="text-muted rw-time">{w.created_at ? new Date(w.created_at).toLocaleString('zh-CN', { hour12: false }) : '-'}{w.created_at && isToday(w.created_at) && <span className="rw-tag rw-tag-mini rw-tag-green">今天更新</span>}</td>
                    <td>
                      {props.editingRiskWord?.id === w.id ? (
                        <div className="row-actions"><button className="btn-primary btn-sm" onClick={() => void props.onUpdate(w.id, { word: props.editingRiskWord!.word, category: props.editingRiskWord!.category, action: props.editingRiskWord!.action })}>保存</button><button className="btn-outline btn-sm" onClick={() => props.setEditingRiskWord(null)}>取消</button></div>
                      ) : (
                        <div className="row-actions"><button className="btn-outline btn-sm" onClick={() => props.setEditingRiskWord({ ...w })}>编辑</button><button className="btn-outline btn-sm" onClick={() => void props.onToggle(w)}>{w.status === 'inactive' ? '启用' : '停用'}</button><button className="btn-outline-danger btn-sm" onClick={() => props.setRiskConfirmDelete(w)}>删除</button></div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="rw-card rw-explain-card">
        <div className="rw-card-head"><h3 className="rw-card-title">💡 这些词会怎么生效？</h3></div>
        <div className="rw-explain-grid">
          <div className="rw-explain-item"><span className="rw-tag rw-tag-yellow">敏感提醒</span><p>命中后提醒审核人员关注，不阻断用户操作。</p></div>
          <div className="rw-explain-item"><span className="rw-tag rw-tag-red">直接拦截</span><p>命中后阻止提交，用户会看到提示。</p></div>
          <div className="rw-explain-item"><span className="rw-tag rw-tag-blue">人工复核</span><p>命中后进入人工审核队列。</p></div>
          <div className="rw-explain-item"><span className="rw-tag rw-tag-gray">仅记录</span><p>不影响用户提交，只留下风险记录。</p></div>
        </div>
      </div>
      {props.riskConfirmDelete && (
        <div className="rw-modal-overlay" onClick={() => props.setRiskConfirmDelete(null)}>
          <div className="rw-modal-card" onClick={e => e.stopPropagation()}>
            <div className="rw-modal-head"><h3>确定删除这个风险词吗？</h3><button className="rw-modal-close" onClick={() => props.setRiskConfirmDelete(null)}>✕</button></div>
            <div className="rw-modal-body"><p className="rw-modal-desc">删除后系统将不再识别这个词：<strong>"{props.riskConfirmDelete.word}"</strong></p><div className="rw-modal-actions"><button className="btn-outline" onClick={() => props.setRiskConfirmDelete(null)}>取消</button><button className="btn-outline-danger" onClick={() => void props.onDelete(props.riskConfirmDelete!.id)}>确认删除</button></div></div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ========= 后台账号 ========= */
function AccountsView(props: {
  accounts: AdminAccount[]; currentAdmin: { id: string; username: string; role?: string };
  role: string;
  onCreate: (f: { username: string; password: string; display_name: string; role: string }) => Promise<void>;
  onToggle: (a: AdminAccount) => Promise<void>; onResetPassword: (a: AdminAccount) => Promise<void>;
  onDelete: (a: AdminAccount) => Promise<void>; onRefresh: () => Promise<void>; loading: boolean;
}) {
  const [form, setForm] = useState({ username: '', password: '', display_name: '', role: 'operator' });
  async function submit(e: FormEvent) { e.preventDefault(); if (!form.username || form.username.length < 3) return; if (!form.password || form.password.length < 6) return; await props.onCreate(form); setForm({ username: '', password: '', display_name: '', role: 'operator' }); }
  const roleLabel = (r?: string) => { const m: Record<string, string> = { super_admin: '超级管理员', operator: '审核运营', customer_service: '客服', finance: '财务', viewer: '只读' }; return m[r || ''] || r || '-'; };
  const canCreateOrDelete = props.role !== 'operator' && props.role !== 'viewer';
  return (
    <section className="page-root">
      <div className="page-header"><div className="page-header-left"><h2 className="page-header-title">后台账号</h2><p className="page-header-desc">管理后台人员账号、角色与启用状态，所有变更都会记录到操作日志。</p></div><button className="ghost-button" onClick={() => void props.onRefresh()} disabled={props.loading}>刷新</button></div>
      {canCreateOrDelete ? <div className="card-v2"><div className="card-v2-head"><h3 className="card-v2-title">新增后台账号</h3></div>
        <form className="account-form-grid" onSubmit={submit}>
          <label className="account-field"><span className="account-field-label">用户名</span><input placeholder="至少 3 个字符" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} /></label>
          <label className="account-field"><span className="account-field-label">初始密码</span><input type="password" placeholder="至少 6 位" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></label>
          <label className="account-field"><span className="account-field-label">显示昵称</span><input placeholder="可填写管理员昵称" value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} /></label>
          <label className="account-field"><span className="account-field-label">角色</span><select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}><option value="operator">审核运营</option><option value="customer_service">客服</option><option value="finance">财务</option><option value="viewer">只读</option><option value="super_admin">超级管理员</option></select></label>
          <div className="account-form-actions"><button className="btn-primary" type="submit" disabled={props.loading}>新增账号</button></div>
        </form>
      </div> : null}
      <div className="card-v2"><div className="card-v2-head"><h3 className="card-v2-title">账号列表</h3><span className="card-v2-count">共 {props.accounts.length} 个账号</span></div>
        {props.accounts.length === 0 ? (
          <div className="empty-gentle"><div className="empty-gentle-icon">👥</div><p className="empty-gentle-title">暂无后台账号</p><p className="empty-gentle-desc">请先新增一个后台账号，用于管理审核、订单和风控。</p></div>
        ) : (
          <div className="data-table-wrap"><table className="table-v2"><thead><tr><th>用户名</th><th>昵称</th><th>角色</th><th>状态</th><th>最后登录</th><th>操作</th></tr></thead>
            <tbody>{props.accounts.map(a => (<tr key={a.id}><td><strong>{a.username}</strong></td><td>{a.display_name || '-'}</td><td>{roleLabel(a.role)}</td><td><span className={`status-tag ${a.status === 'active' ? 'status-tag-green' : 'status-tag-gray'}`}>{a.status === 'active' ? '启用' : a.status === 'disabled' ? '已禁用' : a.status === 'deleted' ? '已注销' : a.status}</span></td><td className="text-muted">{a.last_login_at ? new Date(a.last_login_at).toLocaleString('zh-CN') : '从未登录'}</td><td><div className="row-actions"><button className="btn-outline" onClick={() => void props.onToggle(a)} disabled={props.loading || a.status === 'deleted'}>{a.status === 'active' ? '禁用' : '启用'}</button><button className="btn-outline" onClick={() => void props.onResetPassword(a)} disabled={props.loading || a.status === 'deleted'}>重置密码</button>{canCreateOrDelete ? <button className="btn-outline-danger" onClick={() => void props.onDelete(a)} disabled={props.loading || a.status === 'deleted' || a.id === props.currentAdmin.id}>删除</button> : null}</div></td></tr>))}</tbody></table></div>
        )}
      </div>
    </section>
  );
}

function OpLogsView(props: { opLogs: AdminOpLog[]; onRefresh: () => Promise<void>; loading: boolean }) {
  const [search, setSearch] = useState(''); const [actionFilter, setActionFilter] = useState('all');
  const actionLabelMap: Record<string, string> = { all: '全部操作', admin_login: '登录', admin_account_create: '新增账号', admin_account_update: '修改角色', admin_account_reset_password: '重置密码', admin_account_delete: '删除账号' };
  const actionOptions = ['all', 'admin_login', 'admin_account_create', 'admin_account_update', 'admin_account_reset_password', 'admin_account_delete'];
  const filtered = useMemo(() => {
    let l = props.opLogs;
    if (search) { const q = search.toLowerCase(); l = l.filter(e => (e.admin_username || '').toLowerCase().includes(q)); }
    if (actionFilter !== 'all') l = l.filter(e => e.action === actionFilter);
    return l;
  }, [props.opLogs, search, actionFilter]);
  return (
    <section className="page-root">
      <div className="page-header"><div className="page-header-left"><h2 className="page-header-title">操作日志</h2><p className="page-header-desc">记录后台账号的关键操作，方便后续审计、追踪和排查问题。</p></div><button className="ghost-button" onClick={() => void props.onRefresh()} disabled={props.loading}>刷新</button></div>
      <div className="card-v2"><div className="card-v2-head"><h3 className="card-v2-title">日志筛选</h3></div><div className="oplog-filter-row"><input className="oplog-filter-input" placeholder="搜索管理员账号" value={search} onChange={e => setSearch(e.target.value)} /><select className="oplog-filter-select" value={actionFilter} onChange={e => setActionFilter(e.target.value)}>{actionOptions.map(v => <option key={v} value={v}>{actionLabelMap[v] || v}</option>)}</select><button className="btn-primary" onClick={() => void props.onRefresh()} disabled={props.loading}>查询</button><button className="btn-outline" onClick={() => { setSearch(''); setActionFilter('all'); }}>重置</button></div></div>
      <div className="card-v2"><div className="card-v2-head"><h3 className="card-v2-title">日志列表</h3><span className="card-v2-count">共 {filtered.length} 条记录</span></div>
        {filtered.length === 0 ? (
          <div className="empty-gentle"><div className="empty-gentle-icon">📋</div><p className="empty-gentle-title">暂无操作日志</p><p className="empty-gentle-desc">当前还没有新的后台操作记录。<br />管理员登录、新增账号等行为会自动记录在这里。</p></div>
        ) : (
          <div className="data-table-wrap"><table className="table-v2"><thead><tr><th>操作时间</th><th>操作账号</th><th>操作类型</th><th>操作内容</th><th>结果状态</th></tr></thead><tbody>{filtered.map(l => (<tr key={l.id}><td className="text-muted">{l.created_at ? new Date(l.created_at).toLocaleString('zh-CN') : '-'}</td><td><strong>{l.admin_username || '-'}</strong></td><td>{actionLabelMap[l.action] || l.action}</td><td className="text-muted" style={{ maxWidth: 340 }}>{l.detail || '-'}</td><td><span className="status-tag status-tag-green">成功</span></td></tr>))}</tbody></table></div>
        )}
      </div>
    </section>
  );
}

function PlaceholderView({ title, desc, icon }: { title: string; desc: string; icon: string }) {
  return (
    <div className="empty-gentle" style={{ minHeight: 400 }}>
      <div className="empty-gentle-icon">{icon}</div>
      <p className="empty-gentle-title">{title}</p>
      <p className="empty-gentle-desc">{desc}</p>
    </div>
  );
}

function SettingsView({ apiState, auditLogs, summary, currentAdmin }: { apiState: ApiState; auditLogs: AuditLog[]; summary: DashboardSummary; currentAdmin: { username?: string; role?: string } }) {
  const dbMode = summary.db_mode || (summary.db_connected ? 'database' : 'memory');
  const env = summary.environment || 'unknown';
  const isProduction = env === 'production';
  const isRealDb = dbMode !== 'memory' && (summary.db_connected || dbMode === 'postgres' || dbMode === 'database');
  const apiText = apiState === 'live' ? '真实接口正常' : apiState === 'error' ? '接口失败' : apiState === 'syncing' ? '同步中' : '待验证';
  const dbText = dbMode === 'memory' ? 'JSON/内存兜底' : dbMode === 'postgres' || dbMode === 'database' ? '真实数据库' : dbMode;
  const buildCommitRaw: string = BUILD_INFO.commit;
  const buildCommit = buildCommitRaw && buildCommitRaw !== 'unknown' ? buildCommitRaw : '未写入';
  const readinessItems: Array<{ title: string; desc: string; status: 'pass' | 'warn' | 'fail'; action: string }> = [
    {
      title: '后端 API 连通',
      desc: apiState === 'live' ? '控制台已连到 /api/admin 真实接口。' : apiState === 'error' ? '接口请求失败，需先检查 Node 服务、Nginx 反代和登录 token。' : '当前正在同步或尚未完成接口探测。',
      status: apiState === 'live' ? 'pass' : apiState === 'error' ? 'fail' : 'warn',
      action: '打开 /api/health 和控制台数据页复查',
    },
    {
      title: '数据库持久化',
      desc: isRealDb ? '后端摘要显示正在使用真实数据库。' : isProduction ? '生产环境不能使用内存/JSON 兜底，否则任务、订单和钱包数据可能丢失。' : '开发环境可临时使用兜底存储，正式上线前必须接 DATABASE_URL。',
      status: isRealDb ? 'pass' : isProduction ? 'fail' : 'warn',
      action: '检查 projects/server/.env 的 DATABASE_URL',
    },
    {
      title: '运行环境',
      desc: isProduction ? '后端以 production 模式运行，符合上线要求。' : `当前环境为 ${env}，适合联调但不能视为最终生产。`,
      status: isProduction ? 'pass' : 'warn',
      action: '服务器设置 NODE_ENV=production',
    },
    {
      title: '控制台构建产物',
      desc: `版本 ${BUILD_INFO.version}，构建时间 ${BUILD_INFO.buildTime}，commit ${buildCommit}。`,
      status: 'pass',
      action: '构建后同步到 server/public/admin',
    },
    {
      title: '审计日志',
      desc: auditLogs.length ? `已读取 ${auditLogs.length} 条审计记录，可追踪审核、仲裁和系统操作。` : '当前没有审计记录，需确认关键操作是否会写入 /api/admin/audit-logs。',
      status: auditLogs.length ? 'pass' : 'warn',
      action: '执行一次审核/仲裁后复查日志',
    },
    {
      title: '微信与支付密钥',
      desc: '密钥状态需要进入 API 配置页逐项核对，前端只应展示脱敏状态。',
      status: 'warn',
      action: '进入 API 配置核对 AppID、Secret、商户号和证书',
    },
    {
      title: 'HTTPS 与小程序合法域名',
      desc: '该项必须在服务器和微信公众平台后台人工确认，控制台无法直接读取。',
      status: 'warn',
      action: '确认域名 HTTPS、request 合法域名和 Nginx 443',
    },
  ];
  const passCount = readinessItems.filter((item) => item.status === 'pass').length;
  const failCount = readinessItems.filter((item) => item.status === 'fail').length;
  const readinessScore = Math.round((passCount / readinessItems.length) * 100);
  const readinessTone = failCount > 0 ? 'fail' : readinessScore >= 70 ? 'warn' : 'warn';
  const permissionRows = [
    { role: '超级管理员', scope: '全量配置', guard: '账号、API 密钥、风控、财务、仲裁' },
    { role: '审核运营', scope: '需求审核', guard: '任务上架、驳回、风险备注' },
    { role: '客服', scope: '用户与仲裁', guard: '订单查询、纠纷协助、AI 工单' },
    { role: '财务', scope: '资金核对', guard: '成交额、退款、提现和钱包流水' },
    { role: '只读', scope: '查看数据', guard: '不可编辑密钥、账号、财务配置' },
  ];

  return (
    <section className="settings-readiness">
      <div className={`settings-hero settings-hero-${readinessTone}`}>
        <div>
          <span className="eyebrow">系统设置 / 上线就绪中心</span>
          <h2>把后端、控制台和小程序上线风险放在同一张表里</h2>
          <p>这里不保存业务数据，只集中展示接口、数据库、环境、构建、权限和审计状态。红色项先修，黄色项上线前人工确认。</p>
        </div>
        <div className="readiness-score-card">
          <span>上线就绪度</span>
          <strong>{readinessScore}%</strong>
          <small>{failCount > 0 ? `${failCount} 项阻塞` : `${passCount}/${readinessItems.length} 项已通过`}</small>
        </div>
      </div>

      <div className="settings-grid settings-grid-wide">
        <div className="settings-main-stack">
          <div className="card settings-overview-card">
            <SectionTitle title="当前运行状态" desc="来自后端摘要、控制台登录态和构建指纹。" right={apiText} />
            <div className="settings-cards settings-cards-compact">
              <Info label="接口状态" value={apiText} />
              <Info label="管理员" value={currentAdmin.username || 'admin'} />
              <Info label="当前角色" value={statusDisplay(currentAdmin.role) || '超级管理员'} />
              <Info label="数据库模式" value={dbText} />
              <Info label="运行环境" value={env} />
              <Info label="审计记录" value={`${auditLogs.length} 条`} />
            </div>
          </div>

          <div className="card">
            <SectionTitle title="上线检查清单" desc="按企业部署优先级排列，阻塞项会影响真实用户使用。" />
            <div className="readiness-list">
              {readinessItems.map((item) => (
                <article key={item.title} className={`readiness-item readiness-item-${item.status}`}>
                  <div className="readiness-item-icon">{item.status === 'pass' ? '通过' : item.status === 'fail' ? '阻塞' : '待确认'}</div>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.desc}</p>
                    <span>{item.action}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="card">
            <SectionTitle title="团队权限矩阵" desc="控制台角色要与后端管理员权限保持一致，避免客服或只读账号误碰敏感配置。" />
            <div className="permission-matrix">
              {permissionRows.map((row) => (
                <div key={row.role} className="permission-row">
                  <strong>{row.role}</strong>
                  <span>{row.scope}</span>
                  <em>{row.guard}</em>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="settings-side-stack">
          <div className="card build-fingerprint-card">
            <SectionTitle title="构建指纹" desc="用于判断线上控制台是否部署了最新产物。" />
            <div className="fingerprint-list">
              <div><span>版本</span><strong>{BUILD_INFO.version}</strong></div>
              <div><span>构建时间</span><strong>{BUILD_INFO.buildTime}</strong></div>
              <div><span>commit</span><strong>{buildCommit}</strong></div>
            </div>
          </div>

          <div className="card audit-panel-card">
            <SectionTitle title="审计日志" desc="来自 /api/admin/audit-logs。" right={auditLogs.length ? '已接入' : '暂无记录'} />
            <AuditLogList logs={auditLogs} />
          </div>

          <div className="card safety-note-card">
            <h3>上线前最后确认</h3>
            <p>客户发布任务后，后台审核通过但前端看不见，通常是支付状态、公开市场可见性、数据库环境或构建产物不一致导致。正式上线前必须用真机跑完整链路。</p>
          </div>
        </aside>
      </div>
    </section>
  );
}

/* ========= 基础子组件 ========= */
function TaskQueue({ tasks, selectedId, onSelect }: { tasks: AdminTask[]; selectedId: string; onSelect: (id: string) => void }) {
  if (!tasks.length) return <EmptyState text="暂无待审核任务，可点击生成验证数据。" />;
  return <div className="queue-list">{tasks.map(t => { const s = riskScore(t); return <button key={t.id} className={`queue-item ${selectedId === t.id ? 'queue-item-active' : ''}`} onClick={() => onSelect(t.id)}><div className={`risk-pill ${riskTone(s)}`}>{s}分</div><div><strong>{t.title}</strong><span>{t.users?.nickname || '客户'} · {t.region || '不限'} · {formatMoney(t.budget_amount)}</span></div><small>{t.audit_status || t.status}</small></button>; })}</div>;
}

function TaskDetailCard({ task }: { task?: AdminTask }) {
  if (!task) return <div className="card task-detail-card"><EmptyState text="请选择任务" /></div>;
  const s = riskScore(task); const ar = task.anti_abuse?.reasons?.length ? task.anti_abuse.reasons : []; const at = task.anti_abuse?.tags?.length ? task.anti_abuse.tags : [];
  return (
    <div className="card task-detail-card">
      <SectionTitle title="任务与附件详情" desc="查看真实任务字段和上传附件。" right={task.audit_status || task.status || '未知'} />
      <div className="task-hero"><div><span className="category-chip">{task.task_categories?.name || '未分类'}</span><h3>{task.title}</h3><p>{task.description}</p></div><strong>{formatMoney(task.budget_amount)}</strong></div>
      <div className="meta-grid"><Info label="发布者" value={task.users?.nickname || '未知客户'} /><Info label="地区" value={task.region || '不限'} /><Info label="服务方式" value={task.service_type === 'offline' ? '同城服务' : '线上交付'} /><Info label="提交时间" value={formatTime(task.created_at)} /></div>
      {task.reject_reason ? <div className="reject-note">驳回原因：{task.reject_reason}</div> : null}
      <div className="attachment-grid">{task.task_files?.length ? task.task_files.map(f => <div key={f.id} className="attachment-card"><img src={f.file_url} alt="附件" /><span>{f.file_type || '图片'}</span></div>) : <div className="attachment-card"><div className="empty-file">暂无附件</div></div>}</div>
      <div className="risk-panel"><div className="risk-score"><span>AI 风险辅助</span><strong>{s}</strong></div><div className="risk-tags"><span>反薅羊毛：{ar[0] || (s > 70 ? '疑似异常交易链路' : '未发现明显风险')}</span><span>标签：{at.length ? at.join(' / ') : '标准审核'}</span><span>附件：{task.task_files?.length || 0} 个</span><span>建议：{s > 80 ? '人工复核后谨慎处理' : '可按标准审核'}</span></div></div>
    </div>
  );
}

function AuditLogList({ logs }: { logs: AuditLog[] }) {
  if (!logs.length) return <EmptyState text="暂无审计日志" />;
  return <div className="audit-log-list">{logs.slice(0, 10).map(l => <div key={l.id} className="audit-log-item"><strong>{l.action}</strong><span>{l.target_type || '-'} · {l.detail || l.target_id || '-'}</span><em>{formatTime(l.created_at)}</em></div>)}</div>;
}

function DataTable<T>({ rows, render, empty }: { rows: T[]; render: (r: T) => ReactNode; empty: string }) {
  if (!rows.length) return <EmptyState text={empty} />;
  return <div className="data-table">{rows.map(render)}</div>;
}

function SelectPill({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return <label className="select-pill">{label}<select value={value} onChange={e => onChange(e.target.value)}>{options.map(o => <option key={o} value={o}>{statusDisplay(o)}</option>)}</select></label>;
}

function Info({ label, value }: { label: string; value: string }) { return <div className="info-item"><span>{label}</span><strong>{value}</strong></div>; }
function SectionTitle({ title, desc, right }: { title: string; desc?: string; right?: string }) { return <div className="section-title"><div><h2>{title}</h2>{desc ? <p>{desc}</p> : null}</div>{right ? <span>{right}</span> : null}</div>; }
function EmptyState({ text }: { text: string }) { return <div className="empty-state">{text}</div>; }

export { App };
