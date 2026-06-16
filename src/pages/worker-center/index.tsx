import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  ChartColumnIncreasing,
  Briefcase,
  Bell,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Clock,
  FileText,
  FolderPlus,
  Headphones,
  MapPin,
  MessageCircle,
  RefreshCw,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  ToggleRight,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react-taro';
import AiMascot from '@/components/AiMascot';
import { Network } from '@/network';
import { getToken, getUserId } from '@/lib/auth';
import { formatCentsAsYuan } from '@/lib/money';
import { pollPayStatus } from '@/utils/payment';
import './index.css';

const DEPOSIT_STATUS: Record<string, { label: string; color: string; desc: string }> = {
  none: { label: '未缴纳', color: '#FF4D19', desc: '缴纳保证金后可开始接单' },
  active: { label: '正常', color: '#17B978', desc: '保证金已缴纳，可正常接单' },
  frozen: { label: '冻结中', color: '#EF4444', desc: '保证金已冻结，请联系平台处理' },
  deducting: { label: '扣除处理中', color: '#FF8A00', desc: '违规扣除处理中，请关注平台通知' },
  refund_pending: { label: '退还中', color: '#FF8A00', desc: '保证金退还处理中' },
  refunded: { label: '已退还', color: '#6B7280', desc: '保证金已退还' },
};

const RULES = [
  '接单前需完成实名认证并缴纳保证金',
  '保证金用于防止恶意接单、爽约和服务方失联',
  '违规操作会进入平台审核，严重情况可能扣除保证金',
  '没有未完成订单时，可按规则申请退还保证金',
];

const firstText = (...values: any[]) => {
  const found = values.find((value) => typeof value === 'string' && value.trim());
  return found ? String(found).trim() : '';
};

const formatShortTime = (value?: string) => {
  if (!value) return '时间待同步';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const goBack = () => {
  const pages = Taro.getCurrentPages();
  if (pages.length > 1) {
    Taro.navigateBack();
    return;
  }
  Taro.switchTab({ url: '/pages/profile/index' });
};

const WorkerCenterPage = () => {
  const [workerInfo, setWorkerInfo] = useState<any>(null);
  const [depositStatus, setDepositStatus] = useState<string>('none');
  const [depositPaying, setDepositPaying] = useState(false);
  const [nearbyTasks, setNearbyTasks] = useState<any[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);

  useEffect(() => {
    loadWorkerInfo();
    loadNearbyTasks();
  }, []);

  const loadWorkerInfo = async () => {
    try {
      const res = await Network.request({
        url: '/api/user/me',
        header: { authorization: `Bearer ${getToken()}` },
      });
      if (res.data?.data) {
        setWorkerInfo(res.data.data);
        setDepositStatus(res.data.data.deposit_status || 'none');
      }
    } catch (err) {
      console.error('加载接单者信息失败', err);
    }
  };

  const loadNearbyTasks = async () => {
    setTasksLoading(true);
    try {
      const res = await Network.request({
        url: '/api/tasks?status=open&limit=3&sort=latest',
        header: { authorization: `Bearer ${getToken()}` },
      });
      const items = res.data?.data?.items || res.data?.data?.list || res.data?.items || [];
      setNearbyTasks(Array.isArray(items) ? items : []);
    } catch {
      setNearbyTasks([]);
    } finally {
      setTasksLoading(false);
    }
  };

  const handleDepositPay = async () => {
    if (depositPaying) return;
    const token = getToken();
    if (!token) {
      Taro.showToast({ title: '请先登录后再缴纳保证金', icon: 'none' });
      return;
    }

    setDepositPaying(true);
    try {
      Taro.showLoading({ title: '创建支付单...' });
      const res = await Network.request({
        url: '/api/pay/create',
        method: 'POST',
        header: { authorization: `Bearer ${token}` },
        data: {
          orderType: 'wallet_recharge',
          businessId: `deposit_${getUserId()}`,
          amount: 100,
          description: '接单者保证金缴纳',
        },
      });
      const body = res.data as any;
      if (body?.code !== 200 || !body?.data?.payment || !body?.data?.orderId) {
        throw new Error(body?.msg || '保证金支付单创建失败');
      }

      if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
        throw new Error('请在微信小程序中完成真实支付');
      }

      Taro.showLoading({ title: '拉起支付...' });
      await Taro.requestPayment(body.data.payment);

      Taro.showLoading({ title: '确认支付结果...' });
      const stopPoll = pollPayStatus(
        body.data.orderId,
        async () => {
          stopPoll();
          Taro.hideLoading();
          setDepositPaying(false);
          await loadWorkerInfo();
          Taro.showToast({ title: '保证金支付成功', icon: 'success' });
        },
        () => {
          Taro.hideLoading();
          setDepositPaying(false);
          Taro.showToast({ title: '支付确认超时，请稍后查看状态', icon: 'none' });
        },
        30,
        2000,
      );
    } catch (err: any) {
      Taro.hideLoading();
      setDepositPaying(false);
      const message = String(err?.errMsg || err?.message || '');
      Taro.showToast({
        title: message.includes('cancel') ? '已取消支付' : (message || '保证金支付发起失败'),
        icon: 'none',
      });
    }
  };

  const depositInfo = DEPOSIT_STATUS[depositStatus] || DEPOSIT_STATUS.none;
  const skills = Array.isArray(workerInfo?.skill_tags) && workerInfo.skill_tags.length
    ? workerInfo.skill_tags
    : [];

  const readMetric = (keys: string[]) => keys
    .map((key) => workerInfo?.[key])
    .find((item) => item !== undefined && item !== null && item !== '');

  const metricText = (keys: string[], suffix = '') => {
    const value = readMetric(keys);
    if (value === undefined || value === null || value === '') return '--';
    return `${value}${suffix}`;
  };

  const moneyText = (keys: string[]) => {
    const value = readMetric(keys);
    if (value === undefined || value === null || value === '') return '--';
    return formatCentsAsYuan(Number(value));
  };

  const syncText = workerInfo ? '真实接口已同步' : '等待后端同步';
  const demandTrend = Array.isArray(workerInfo?.demand_trend) ? workerInfo.demand_trend.slice(0, 7) : [];
  const incomeTrend = Array.isArray(workerInfo?.income_trend) ? workerInfo.income_trend.slice(0, 7) : [];
  const maxDemand = Math.max(1, ...demandTrend.map((item: any) => Number(item?.value || item || 0)));
  const maxIncome = Math.max(1, ...incomeTrend.map((item: any) => Number(item?.value || item || 0)));
  const briefUpdatedAt = firstText(workerInfo?.brief_updated_at, workerInfo?.stats_updated_at, workerInfo?.updated_at);

  const briefStats = [
    { label: '今日待回复', value: metricText(['today_pending_reply', 'pending_reply_count']), sub: syncText },
    { label: '潜在高意向客户', value: metricText(['high_intent_customer_count', 'high_intent_count']), sub: syncText },
    { label: '预计收入', value: moneyText(['estimated_income', 'today_estimated_income', 'pending_amount']), sub: syncText },
    { label: '趋势洞察', value: metricText(['trend_keyword', 'hot_area']) || '--', sub: workerInfo ? '按真实数据生成' : '暂无趋势数据' },
  ];

  const quickActions = [
    { icon: MessageCircle, title: '一键回复询盘', desc: 'AI 帮你高效回复', color: '#FF5A1F', onClick: () => Taro.navigateTo({ url: '/pages/messages/index' }) },
    { icon: ToggleRight, title: '打开接单状态', desc: depositStatus === 'active' ? '当前具备接单资格' : '先完成保证金/实名', color: '#22C55E', onClick: () => Taro.navigateTo({ url: '/pages/kyc/index' }) },
    {
      icon: SlidersHorizontal,
      title: '调整服务价格',
      desc: 'AI 先帮你估价',
      color: '#EF4444',
      onClick: () => Taro.navigateTo({
        url: `/pages/ai-assistant/index?scene=worker-pricing&q=${encodeURIComponent('帮我根据我的技能和同城任务，整理一份服务报价建议。价格只作为参考，最终以平台订单报价为准。')}`,
      }),
    },
    { icon: FolderPlus, title: '发布服务档案', desc: '完善信息提升曝光', color: '#3B82F6', onClick: () => Taro.navigateTo({ url: '/pages/kyc/index' }) },
  ];

  const stats = [
    { label: '累计接单', value: metricText(['order_count', 'completed_order_count']), icon: Briefcase, color: '#FF4D19' },
    { label: '好评率', value: metricText(['rating', 'positive_rate'], '%'), icon: Star, color: '#FF8A00' },
    { label: '待结算', value: moneyText(['pending_amount', 'settlement_amount']), icon: Wallet, color: '#17B978' },
    { label: '响应力', value: metricText(['response_rate'], '%'), icon: TrendingUp, color: '#FF8A00' },
  ];
  const apiAdvice = Array.isArray(workerInfo?.ai_suggestions) ? workerInfo.ai_suggestions.filter(Boolean).slice(0, 3) : [];
  const adviceItems = apiAdvice.length ? apiAdvice.map((item: any, index: number) => ({
    title: firstText(item.title, item.content, item) || `AI建议 ${index + 1}`,
    desc: firstText(item.desc, item.description, item.reason) || '来自后端 AI 建议字段',
    tone: ['is-blue', 'is-orange', 'is-green'][index % 3],
  })) : [
    { title: '优先回复预算清晰、位置明确的需求', desc: '可减少沟通成本，提高成交确定性。', tone: 'is-blue' },
    { title: '完善技能标签后，系统更容易匹配你', desc: '继续补充服务范围、案例和可服务时间。', tone: 'is-orange' },
    { title: '开启附近接单提醒，别错过同城需求', desc: '小应会优先提醒与你技能匹配的任务。', tone: 'is-green' },
  ];

  return (
    <View className="worker-page">
      <View className="worker-nav">
        <View className="worker-nav-left">
          <View className="worker-back" onClick={goBack}>
            <ArrowLeft size={30} color="#081A3A" />
          </View>
          <View className="worker-brand-block">
            <View className="worker-brand-line">
              <Text className="worker-brand-main">有应</Text>
              <Text className="worker-brand-accent">帮</Text>
              <Text className="worker-brand-dot">·</Text>
              <Text className="worker-brand-title">接单台</Text>
            </View>
            <View className="worker-site-row">
              <MapPin size={18} color="#081A3A" />
              <Text className="worker-site-text">{workerInfo?.city || '当前站点'}</Text>
              <ChevronRight size={16} color="#081A3A" />
            </View>
          </View>
        </View>
        <View className="worker-nav-actions">
          <View className="worker-message-btn" onClick={() => Taro.navigateTo({ url: '/pages/messages/index' })}>
            <Bell size={28} color="#081A3A" />
            {metricText(['unread_count', 'message_unread_count']) !== '--' ? (
              <Text className="worker-message-badge">{metricText(['unread_count', 'message_unread_count'])}</Text>
            ) : null}
          </View>
          <View className="worker-menu-pill">
            <Text className="worker-menu-dot">•••</Text>
            <Text className="worker-menu-line">—</Text>
            <Text className="worker-menu-circle">◎</Text>
          </View>
        </View>
      </View>

      <View className="worker-brief-card">
        <AiMascot size="xl" pose="point" className="worker-brief-mascot" />
        <View className="worker-brief-main">
          <View className="worker-brief-title-row">
            <Sparkles size={28} color="#FF4D19" />
            <Text className="worker-brief-title">AI每日简报</Text>
            <Text className="worker-brief-meta">基于近7天真实数据</Text>
          </View>
          <Text className="worker-brief-update">{briefUpdatedAt ? `${formatShortTime(briefUpdatedAt)} 更新` : '等待后端同步更新时间'}</Text>
          <View className="worker-brief-grid">
            {briefStats.map((item) => (
              <View className="worker-brief-stat" key={item.label}>
                <Text className="worker-brief-label">{item.label}</Text>
                <Text className="worker-brief-value">{item.value}</Text>
                <Text className="worker-brief-sub">{item.sub}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View className="worker-quick-grid">
        {quickActions.map((item) => {
          const Icon = item.icon;
          return (
            <View className="worker-quick-card" key={item.title} onClick={item.onClick}>
              <Text className="worker-quick-title">{item.title}</Text>
              <Text className="worker-quick-desc">{item.desc}</Text>
              <View className="worker-quick-icon" style={{ backgroundColor: `${item.color}16` }}>
                <Icon size={42} color={item.color} />
              </View>
            </View>
          );
        })}
      </View>

      <View className="worker-deposit-card">
        <View className="worker-deposit-top">
          <View className="worker-deposit-icon">
            <Shield size={34} color="#FFFFFF" />
          </View>
          <View className="worker-deposit-main">
            <Text className="worker-deposit-label">接单资格</Text>
            <Text className="worker-deposit-desc">{depositInfo.desc}</Text>
          </View>
          <View className="worker-deposit-pill" style={{ backgroundColor: `${depositInfo.color}18` }}>
            <Text className="worker-deposit-pill-text" style={{ color: depositInfo.color }}>{depositInfo.label}</Text>
          </View>
        </View>

        {depositStatus === 'none' ? (
          <View className="worker-deposit-action" onClick={handleDepositPay}>
            <ShieldCheck size={26} color="#FFFFFF" />
            <Text className="worker-deposit-action-text">{depositPaying ? '支付处理中...' : '缴纳保证金 ¥100.00'}</Text>
          </View>
        ) : null}

        {depositStatus === 'active' ? (
          <View className="worker-safe-line">
            <CircleCheck size={22} color="#17B978" />
            <Text className="worker-safe-line-text">已满足接单资格，可正常抢单和报价。</Text>
          </View>
        ) : null}

        {depositStatus === 'frozen' ? (
          <View className="worker-warn-line">
            <CircleAlert size={22} color="#EF4444" />
            <Text className="worker-warn-line-text">当前保证金冻结，请先联系平台客服。</Text>
          </View>
        ) : null}
      </View>

      <View className="worker-stats">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <View className="worker-stat" key={item.label}>
              <Icon size={24} color={item.color} />
              <Text className="worker-stat-value">{item.value}</Text>
              <Text className="worker-stat-label">{item.label}</Text>
            </View>
          );
        })}
      </View>

      <View className="worker-trend-grid">
        <View className="worker-trend-card">
          <View className="worker-trend-head">
            <View className="worker-title-icon">
              <ChartColumnIncreasing size={24} color="#FF4D19" />
              <Text className="worker-card-title">需求趋势</Text>
            </View>
            <Text className="worker-card-soft">近7天</Text>
          </View>
          {demandTrend.length ? (
            <View className="worker-line-chart">
              {demandTrend.map((item: any, index: number) => {
                const value = Number(item?.value || item || 0);
                return <View className="worker-line-dot" key={`${index}-${value}`} style={{ height: `${34 + Math.round((value / maxDemand) * 82)}rpx` }} />;
              })}
            </View>
          ) : (
            <View className="worker-chart-empty">
              <Text className="worker-chart-empty-text">暂无趋势数据</Text>
            </View>
          )}
        </View>

        <View className="worker-trend-card">
          <View className="worker-trend-head">
            <View className="worker-title-icon">
              <TrendingUp size={24} color="#17B978" />
              <Text className="worker-card-title">收入趋势</Text>
            </View>
            <Text className="worker-card-soft">近7天</Text>
          </View>
          <Text className="worker-income-main">{moneyText(['weekly_income', 'month_income', 'pending_amount'])}</Text>
          {incomeTrend.length ? (
            <View className="worker-bar-chart">
              {incomeTrend.map((item: any, index: number) => {
                const value = Number(item?.value || item || 0);
                return <View className="worker-bar" key={`${index}-${value}`} style={{ height: `${36 + Math.round((value / maxIncome) * 88)}rpx` }} />;
              })}
            </View>
          ) : (
            <View className="worker-chart-empty is-small">
              <Text className="worker-chart-empty-text">等待收入数据</Text>
            </View>
          )}
        </View>
      </View>

      <View className="worker-card">
        <View className="worker-card-head">
          <Text className="worker-card-title">优先处理（{tasksLoading ? '--' : nearbyTasks.length}）</Text>
          <View className="worker-card-link" onClick={loadNearbyTasks}>
            <RefreshCw size={20} color="#6B7280" />
            <Text className="worker-card-link-text">刷新</Text>
          </View>
        </View>
        {tasksLoading ? (
          <View className="worker-task-empty">
            <Text className="worker-task-empty-text">正在加载真实可接订单...</Text>
          </View>
        ) : nearbyTasks.length === 0 ? (
          <View className="worker-task-empty">
            <Text className="worker-task-empty-title">暂无可接订单</Text>
            <Text className="worker-task-empty-text">当前没有开放任务，稍后刷新或去需求广场看看。</Text>
          </View>
        ) : (
          nearbyTasks.map((task) => (
            <View className="worker-task" key={task.id} onClick={() => Taro.navigateTo({ url: `/pages/task-detail/index?id=${task.id}` })}>
              <View className="worker-task-icon">
                <Zap size={24} color="#FF4D19" />
              </View>
              <View className="worker-task-main">
                <Text className="worker-task-title">{task.title || '未命名需求'}</Text>
                <Text className="worker-task-tag">{task.task_categories?.name || task.category || '任务服务'} · 平台托管</Text>
                <View className="worker-task-meta-row">
                  <MapPin size={16} color="#8A8F99" />
                  <Text className="worker-task-meta">{firstText(task.address, task.location_name, task.city) || '位置待同步'}</Text>
                  <Clock size={16} color="#8A8F99" />
                  <Text className="worker-task-meta">{formatShortTime(firstText(task.created_at, task.updated_at))}</Text>
                </View>
              </View>
              <View className="worker-task-action">
                <Text className="worker-task-price">{formatCentsAsYuan(task.budget_amount || task.budget_min)}</Text>
                <Text className="worker-task-reply">回复</Text>
              </View>
            </View>
          ))
        )}
      </View>

      <View className="worker-ai-card" onClick={() => Taro.navigateTo({ url: '/pages/ai-assistant/index?scene=worker' })}>
        <View className="worker-card-head">
          <Text className="worker-card-title">AI智能建议</Text>
          <Sparkles size={26} color="#FF4D19" />
        </View>
        <View className="worker-advice-list">
          {adviceItems.map((item) => (
            <View className={`worker-advice-item ${item.tone}`} key={item.title}>
              <Text className="worker-advice-title">{item.title}</Text>
              <Text className="worker-advice-desc">{item.desc}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className="worker-ai-banner" onClick={() => Taro.navigateTo({ url: '/pages/ai-assistant/index?scene=worker-banner' })}>
        <View className="worker-ai-banner-copy">
          <Text className="worker-ai-banner-kicker">有应AI助手</Text>
          <Text className="worker-ai-banner-title">让需求被看见，让技能被回应</Text>
          <Text className="worker-ai-banner-desc">AI智能匹配 · 附近响应快 · 信用保障 · 交易托管更安心</Text>
        </View>
        <AiMascot size="lg" pose="cheer" className="worker-ai-banner-mascot" />
      </View>

      <View className="worker-card">
        <View className="worker-card-head">
          <Text className="worker-card-title">技能标签</Text>
          <View className="worker-card-link" onClick={() => Taro.navigateTo({ url: '/pages/kyc/index' })}>
            <Text className="worker-card-link-text">去完善</Text>
            <ChevronRight size={20} color="#6B7280" />
          </View>
        </View>
        {skills.length ? (
          <View className="worker-skill-wrap">
            {skills.map((tag: string) => (
              <View className="worker-skill" key={tag}>
                <BadgeCheck size={18} color="#FF4D19" />
                <Text className="worker-skill-text">{tag}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View className="worker-skill-empty">
            <Text className="worker-skill-empty-title">暂无真实技能标签</Text>
            <Text className="worker-skill-empty-text">完成资料后，平台会按你的真实技能做推荐。</Text>
          </View>
        )}
      </View>

      <View className="worker-card">
        <View className="worker-card-head">
          <View className="worker-title-icon">
            <FileText size={22} color="#FF4D19" />
            <Text className="worker-card-title">保证金规则</Text>
          </View>
          <Text className="worker-card-soft">安全接单</Text>
        </View>
        {RULES.map((rule, index) => (
          <View className="worker-rule" key={rule}>
            <Text className="worker-rule-num">{index + 1}</Text>
            <Text className="worker-rule-text">{rule}</Text>
          </View>
        ))}
      </View>

      <View className="worker-bottom-space" />

      <View className="worker-bottom-bar">
        <View className="worker-bottom-outline" onClick={() => Taro.navigateTo({ url: '/pages/chat/index?id=staff&name=平台客服' })}>
          <Headphones size={26} color="#FF4D19" />
          <Text className="worker-bottom-outline-text">联系客服</Text>
        </View>
        <View className="worker-bottom-fill" onClick={() => Taro.switchTab({ url: '/pages/tasks/index' })}>
          <Briefcase size={26} color="#FFFFFF" />
          <Text className="worker-bottom-fill-text">去接单大厅</Text>
        </View>
      </View>
    </View>
  );
};

export default WorkerCenterPage;
