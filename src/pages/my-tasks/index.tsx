/**
 * 我的任务页 - 发布/报名任务管理
 */
import { ScrollView, View, Text } from '@tarojs/components';
import Taro, { useReachBottom } from '@tarojs/taro';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Briefcase,
  ClipboardList,
  Clock,
  CircleCheck,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react-taro';
import AiMascot from '@/components/AiMascot';
import EmptyState from '@/components/EmptyState';
import TaskCard from '@/components/TaskCard';
import { getMyTasks, extractImages } from '@/lib/api';
import { getToken } from '@/lib/auth';
import './index.css';

const STATUS_TABS = [
  { key: '', label: '全部' },
  { key: 'pending_audit', label: '待审核' },
  { key: 'pending_payment', label: '待支付' },
  { key: 'open', label: '待接单' },
  { key: 'in_progress', label: '进行中' },
  { key: 'submitted', label: '待确认' },
  { key: 'completed', label: '已完成' },
  { key: 'cancelled', label: '已取消' },
];

const ROLE_TABS = [
  { key: 'publisher' as const, label: '我发布的', desc: '需求进度', icon: ClipboardList },
  { key: 'worker' as const, label: '我报名的', desc: '接单记录', icon: Briefcase },
];

const MY_TASKS_PAGE_LIMIT = 20;

const goBack = () => {
  const pages = Taro.getCurrentPages();
  if (pages.length > 1) {
    Taro.navigateBack();
    return;
  }
  Taro.switchTab({ url: '/pages/profile/index' });
};

const MyTasksPage = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState('');
  const [activeRole, setActiveRole] = useState<'publisher' | 'worker'>('publisher');
  const [errorMsg, setErrorMsg] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    loadTasks(1, false);
  }, [activeStatus, activeRole]);

  const loadTasks = async (nextPage = 1, append = false) => {
    const token = getToken();
    if (!token) {
      setTasks([]);
      setLoading(false);
      setErrorMsg('请先登录');
      return;
    }
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setErrorMsg('');
    try {
      const res = await getMyTasks({
        status: activeStatus || undefined,
        role: activeRole,
        page: nextPage,
        limit: MY_TASKS_PAGE_LIMIT,
      });
      const items = res?.data?.items || [];
      const nextItems = Array.isArray(items) ? items : [];
      setTasks((prev) => append ? [...prev, ...nextItems] : nextItems);
      setPage(Number(res?.data?.page || nextPage));
      setHasMore(typeof res?.data?.hasMore === 'boolean' ? res.data.hasMore : nextItems.length >= MY_TASKS_PAGE_LIMIT);
    } catch (err: any) {
      if (!append) setTasks([]);
      setErrorMsg(err?.message || '任务加载失败，请稍后重试');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useReachBottom(() => {
    if (loading || loadingMore || !hasMore || errorMsg) return;
    loadTasks(page + 1, true);
  });

  const mappedTasks = useMemo(
    () =>
      tasks.map((task: any) => ({
        id: task.id,
        title: task.title || task.tasks?.title || '未命名任务',
        images: extractImages(task),
        budget_amount: task.budget_amount || task.budget_min,
        tags: [task.service_type === 'offline' ? '同城服务' : '线上', task.task_categories?.name].filter(Boolean),
        region: task.region,
        status: task.status,
        publisher_name: task.users?.nickname || task.publisher_name,
        created_at: task.created_at,
        application_count: task.task_applications?.length || task.application_count,
        verified: task.users?.kyc_status === 'verified',
      })),
    [tasks],
  );

  const stats = useMemo(() => {
    const active = tasks.filter((task) => ['pending_audit', 'pending_payment', 'open', 'assigned', 'in_progress', 'submitted'].includes(task.status)).length;
    const done = tasks.filter((task) => task.status === 'completed').length;
    return { total: tasks.length, active, done };
  }, [tasks]);

  const goDetail = (id: string) => {
    Taro.navigateTo({ url: `/pages/task-detail/index?id=${id}` });
  };

  const goAction = () => {
    if (activeRole === 'publisher') {
      Taro.switchTab({ url: '/pages/publish/index' });
      return;
    }
    Taro.switchTab({ url: '/pages/tasks/index' });
  };

  return (
    <View className="mytasks-page">
      <View className="mytasks-nav">
        <View className="mytasks-brand-wrap">
          <View className="mytasks-back" onClick={goBack}>
            <ArrowLeft size={28} color="#081A3A" />
          </View>
          <View className="mytasks-brand">
            <Text className="mytasks-brand-main">有应</Text>
            <Text className="mytasks-brand-accent">帮</Text>
            <Text className="mytasks-brand-sub">· 任务夹</Text>
          </View>
        </View>
        <View className="mytasks-menu-pill">
          <Text className="mytasks-menu-dot">•••</Text>
          <Text className="mytasks-menu-line">—</Text>
          <Text className="mytasks-menu-circle">◎</Text>
        </View>
      </View>

      <View className="mytasks-title-row">
        <View className="mytasks-title-copy">
          <Text className="mytasks-title">我的任务</Text>
          <Text className="mytasks-desc">发布、报名、验收和售后进度集中管理</Text>
        </View>
        <View className="mytasks-title-action" onClick={goAction}>
          <Search size={22} color="#081A3A" />
          <Text className="mytasks-title-action-text">{activeRole === 'publisher' ? '发需求' : '接单'}</Text>
        </View>
      </View>

      <View className="mytasks-hero">
        <View className="mytasks-hero-bot">
          <AiMascot size="md" pose="point" />
        </View>
        <View className="mytasks-hero-copy">
          <Text className="mytasks-kicker">AI 任务管家</Text>
          <Text className="mytasks-hero-title">先看状态，再处理下一步</Text>
          <Text className="mytasks-hero-desc">小应会帮你提醒待确认、进行中和售后相关任务。</Text>
        </View>
      </View>

      <View className="mytasks-stats">
        <Stat icon={ClipboardList} label="全部任务" value={stats.total} color="#3568F5" />
        <Stat icon={Clock} label="进行中" value={stats.active} color="#FF6A00" />
        <Stat icon={CircleCheck} label="已完成" value={stats.done} color="#17B978" />
      </View>

      <View className="mytasks-role-card">
        {ROLE_TABS.map((item) => {
          const Icon = item.icon;
          const active = activeRole === item.key;
          return (
            <View
              key={item.key}
              className={`mytasks-role ${active ? 'mytasks-role-active' : ''}`}
              onClick={() => setActiveRole(item.key)}
            >
              <View className={`mytasks-role-icon ${active ? 'mytasks-role-icon-active' : ''}`}>
                <Icon size={26} color={active ? '#FFFFFF' : '#3568F5'} />
              </View>
              <View>
                <Text className={`mytasks-role-title ${active ? 'mytasks-role-title-active' : ''}`}>{item.label}</Text>
                <Text className={`mytasks-role-desc ${active ? 'mytasks-role-desc-active' : ''}`}>{item.desc}</Text>
              </View>
            </View>
          );
        })}
      </View>

      <ScrollView scrollX showScrollbar={false} className="mytasks-filter-scroll">
        <View className="mytasks-filter-row">
          {STATUS_TABS.map((tab) => (
            <View
              key={tab.key}
              className={`mytasks-filter ${activeStatus === tab.key ? 'mytasks-filter-active' : ''}`}
              onClick={() => setActiveStatus(tab.key)}
            >
              <Text className={`mytasks-filter-text ${activeStatus === tab.key ? 'mytasks-filter-text-active' : ''}`}>
                {tab.label}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View className="mytasks-ai-card" onClick={() => Taro.navigateTo({ url: '/pages/ai-assistant/index?scene=mytasks' })}>
        <View className="mytasks-ai-copy">
          <Text className="mytasks-ai-title">AI 帮你梳理任务</Text>
          <Text className="mytasks-ai-desc">不知道下一步该确认、催单还是申请售后？让小应先帮你判断。</Text>
        </View>
        <View className="mytasks-ai-icon">
          <Sparkles size={28} color="#FFFFFF" />
        </View>
      </View>

      <View className="mytasks-list">
        {loading ? (
          <View className="mytasks-loading">
            <Text className="mytasks-loading-text">正在加载任务...</Text>
          </View>
        ) : mappedTasks.length === 0 ? (
          <EmptyState
            title={errorMsg ? '任务加载失败' : activeStatus ? `暂无${STATUS_TABS.find((t) => t.key === activeStatus)?.label}的任务` : '暂无任务'}
            description={errorMsg || (activeRole === 'publisher' ? '你发布的需求会出现在这里。' : '你报名或接下的任务会出现在这里。')}
            actionText={errorMsg ? '重新加载' : activeRole === 'publisher' ? '发布需求' : '去接单大厅'}
            onAction={errorMsg ? () => loadTasks(1, false) : goAction}
          />
        ) : (
          mappedTasks.map((task) => <TaskCard key={task.id} task={task} onClick={goDetail} variant="manage" />)
        )}
        {!loading && mappedTasks.length > 0 ? (
          <View className="mytasks-loading">
            <Text className="mytasks-loading-text">{loadingMore ? '加载更多...' : hasMore ? '上拉加载更多' : '没有更多了'}</Text>
          </View>
        ) : null}
      </View>

      <View className="mytasks-bottom-tip">
        <ShieldCheck size={18} color="#17B978" />
        <Text className="mytasks-bottom-tip-text">平台托管资金，关键状态变更会同步到订单中心。</Text>
        <Search size={18} color="#8A8F99" />
      </View>
    </View>
  );
};

function Stat({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <View className="mytasks-stat">
      <Icon size={24} color={color} />
      <Text className="mytasks-stat-value">{value}</Text>
      <Text className="mytasks-stat-label">{label}</Text>
    </View>
  );
}

export default MyTasksPage;
