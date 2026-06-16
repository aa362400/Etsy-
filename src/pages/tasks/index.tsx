import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow, useReachBottom, useShareAppMessage, useShareTimeline } from '@tarojs/taro';
import { useEffect, useMemo, useState } from 'react';
import { Bot, ClipboardList, Grid2x2, MapPin, MessageCircle, Plus, ScanLine, Search, ShieldCheck, Sparkles, Zap } from 'lucide-react-taro';
import AiMascot from '@/components/AiMascot';
import AiChatWidget from '@/components/ai-chat-widget';
import { Network } from '@/network';
import { extractImages } from '@/lib/api';
import { Input } from '@/components/ui/input';
import TaskCard from '@/components/TaskCard';
import './index.css';

interface CategoryEntry {
  id: string;
  name: string;
}

const FALLBACK_CATEGORIES: CategoryEntry[] = [
  { id: '', name: '全部' },
  { id: 'errand', name: '跑腿代办' },
  { id: 'moving', name: '搬家拉货' },
  { id: 'cleaning', name: '家政保洁' },
  { id: 'repair', name: '维修安装' },
  { id: 'design', name: '设计服务' },
];
const SORTS = ['综合排序', '最新发布', '距离优先', '价格优先'];
const MARKET_TABS = [
  { label: '推荐', type: 'reset' },
  { label: '附近', type: 'nearby' },
  { label: '急单', type: 'keyword', keyword: '急' },
  { label: '技能服务', type: 'category', keyword: '设计' },
  { label: '二手闲置', type: 'category', keyword: '二手' },
  { label: '全部分类', type: 'route' },
] as const;

const TASK_PAGE_LIMIT = 30;

interface TaskItem {
  id: string;
  title: string;
  images: string[];
  description?: string;
  budget_amount: number | string;
  tags: string[];
  region: string;
  publisher_name: string;
  publisher_avatar?: string;
  verified: boolean;
  credit_score?: number;
  application_count?: number;
  created_at?: string;
  status?: string;
}

const mapTask = (raw: any): TaskItem => ({
  id: raw.id,
  title: raw.title || '未命名任务',
  images: extractImages(raw),
  description: raw.description || raw.content || raw.remark || raw.requirement || '',
  budget_amount: raw.budget_amount || raw.budget_min || raw.amount || raw.reward || 0,
  tags: [
    raw.task_categories?.name || raw.category_name || raw.category,
    raw.service_type === 'offline' ? '同城服务' : '线上服务',
  ].filter(Boolean),
  region: raw.region || raw.city || raw.address || (raw.service_type === 'offline' ? '同城' : '线上'),
  publisher_name: raw.users?.nickname || raw.publisher_name || raw.user?.nickname || '用户',
  publisher_avatar: raw.users?.avatar_url || raw.users?.avatar || raw.publisher_avatar || raw.user?.avatar_url || raw.user?.avatar,
  verified: raw.users?.kyc_status === 'verified' || raw.user?.kyc_status === 'verified',
  credit_score: raw.users?.credit_score || raw.user?.credit_score,
  application_count: raw.task_applications?.length || raw.application_count || 0,
  created_at: raw.created_at || raw.createdAt,
  status: raw.status,
});

const TasksPage = () => {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [categories, setCategories] = useState<CategoryEntry[]>(FALLBACK_CATEGORIES);
  const [activeCategoryId, setActiveCategoryId] = useState('');
  const [activeSort, setActiveSort] = useState(0);
  const [activeMarketTab, setActiveMarketTab] = useState('推荐');
  const [aiChatVisible, setAiChatVisible] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useShareAppMessage(() => ({ title: '任务大厅 - 找到你需要的帮办', path: '/pages/tasks/index' }));
  useShareTimeline(() => ({ title: '任务大厅 - 找到你需要的帮办' }));

  const loadCategories = async () => {
    try {
      const res = await Network.request({ url: '/api/categories' });
      const items = Array.isArray(res.data?.data) ? res.data.data : [];
      const realCategories = items
        .map((item: any) => ({
          id: String(item.id || item.category_id || ''),
          name: String(item.name || item.title || '其他服务'),
        }))
        .filter((item: CategoryEntry) => item.id && item.name);
      setCategories(realCategories.length ? [{ id: '', name: '全部' }, ...realCategories] : FALLBACK_CATEGORIES);
    } catch {
      setCategories(FALLBACK_CATEGORIES);
    }
  };

  const loadTasks = async (categoryId = activeCategoryId, nextPage = 1, append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setErrorMsg('');
    try {
      const query = [
        'status=open',
        `page=${nextPage}`,
        `limit=${TASK_PAGE_LIMIT}`,
        activeSort === 3 ? 'sort=budget_high' : 'sort=latest',
        categoryId ? `category_id=${encodeURIComponent(categoryId)}` : '',
      ].filter(Boolean).join('&');
      const res = await Network.request({ url: `/api/tasks?${query}` });
      if (res.data?.code !== 200) {
        throw new Error(res.data?.msg || '任务列表接口返回异常');
      }
      const pageData = res.data?.data || {};
      const items = pageData.items || pageData.list || res.data?.items || [];
      const nextItems = Array.isArray(items) ? items.map(mapTask) : [];
      setTasks((prev) => append ? [...prev, ...nextItems] : nextItems);
      setPage(Number(pageData.page || nextPage));
      setHasMore(typeof pageData.hasMore === 'boolean' ? pageData.hasMore : nextItems.length >= TASK_PAGE_LIMIT);
    } catch (error: any) {
      if (!append) setTasks([]);
      setErrorMsg(error?.message || '任务列表加载失败，请检查网络或后端服务');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadTasks(activeCategoryId, 1, false);
    const reload = () => loadTasks(activeCategoryId, 1, false);
    Taro.eventCenter.on('privacyAuthorized', reload);
    return () => {
      Taro.eventCenter.off('privacyAuthorized', reload);
    };
  }, [activeCategoryId, activeSort]);

  useDidShow(() => {
    loadTasks(activeCategoryId, 1, false);
  });

  useReachBottom(() => {
    if (loading || loadingMore || !hasMore || errorMsg) return;
    loadTasks(activeCategoryId, page + 1, true);
  });

  const filteredTasks = useMemo(() => {
    let list = tasks;
    const kw = searchInput.trim().toLowerCase();
    if (kw) list = list.filter((t) => t.title.toLowerCase().includes(kw));
    if (activeSort === 3) {
      list = [...list].sort((a, b) => Number(b.budget_amount || 0) - Number(a.budget_amount || 0));
    }
    return list;
  }, [tasks, searchInput, activeSort]);

  const goDetail = (id: string) => Taro.navigateTo({ url: `/pages/task-detail/index?id=${id}` });
  const handleApply = (id: string) => Taro.navigateTo({ url: `/pages/task-detail/index?id=${id}` });
  const handleMarketTab = (tab: typeof MARKET_TABS[number]) => {
    setActiveMarketTab(tab.label);
    if (tab.type === 'route') {
      Taro.navigateTo({ url: '/pages/categories/index' });
      return;
    }
    if (tab.type === 'reset') {
      setSearchInput('');
      setActiveSort(0);
      setActiveCategoryId('');
      return;
    }
    if (tab.type === 'nearby') {
      setSearchInput('');
      setActiveSort(2);
      return;
    }
    if (tab.type === 'keyword') {
      setSearchInput(tab.keyword);
      setActiveCategoryId('');
      return;
    }
    const matched = categories.find((cat) => cat.name.includes(tab.keyword));
    setSearchInput('');
    setActiveCategoryId(matched?.id || '');
  };
  const handleScan = () => {
    if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
      Taro.showToast({ title: '请在微信小程序中使用扫一扫', icon: 'none' });
      return;
    }
    Taro.scanCode({ onlyFromCamera: false }).catch(() => {});
  };

  return (
    <View className="tasks-page">
      <View className="tasks-top">
        <View className="tasks-brand-row">
          <View className="tasks-logo" onClick={() => Taro.switchTab({ url: '/pages/home/index' })}>
            <Text className="tasks-logo-main">有应</Text>
            <Text className="tasks-logo-accent">帮</Text>
          </View>
          <Text className="tasks-slogan">让需求被看见，让技能被回应</Text>
          <View className="tasks-header-action" onClick={() => Taro.navigateTo({ url: '/pages/messages/index' })}>
            <MessageCircle size={21} color="#111827" />
            <Text className="tasks-header-action-text">消息</Text>
          </View>
          <View className="tasks-header-action" onClick={handleScan}>
            <ScanLine size={21} color="#111827" />
            <Text className="tasks-header-action-text">扫一扫</Text>
          </View>
        </View>

        <View className="tasks-title-row">
          <View className="tasks-city-pill">
            <MapPin size={20} color="#111827" />
            <Text className="tasks-city-text">同城</Text>
          </View>
          <View className="tasks-search-wrap">
            <View className="tasks-search-bar">
              <Search size={22} color="#9CA3AF" />
              <Input
                className="tasks-search-input"
                value={searchInput}
                placeholder="搜索你需要的服务或技能，如“电脑维修”"
                onInput={(e) => setSearchInput(e.detail.value)}
                confirmType="search"
              />
            </View>
          </View>
          <View className="tasks-publish-mini" onClick={() => Taro.switchTab({ url: '/pages/publish/index' })}>
            <Text className="tasks-publish-mini-text">发布需求</Text>
            <Plus size={20} color="#FFFFFF" />
          </View>
        </View>

        <View className="tasks-market-tabs">
          {MARKET_TABS.map((tab) => (
            <View
              key={tab.label}
              className={`tasks-market-tab ${activeMarketTab === tab.label ? 'tasks-market-tab-active' : ''}`}
              onClick={() => handleMarketTab(tab)}
            >
              {tab.type === 'route' ? <Grid2x2 size={22} color="#4F5B6F" /> : null}
              <Text className={`tasks-market-tab-text ${activeMarketTab === tab.label ? 'tasks-market-tab-text-active' : ''}`}>{tab.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className="tasks-cats-wrap">
        <ScrollView scrollX showScrollbar={false}>
          <View className="tasks-cats-row">
            {categories.map((cat) => (
              <View
                key={cat.id || 'all'}
                className={`tasks-cat-item ${activeCategoryId === cat.id ? 'tasks-cat-active' : ''}`}
                onClick={() => setActiveCategoryId(cat.id)}
              >
                <Text className={`tasks-cat-text ${activeCategoryId === cat.id ? 'tasks-cat-text-active' : ''}`}>{cat.name}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      <View className="tasks-sort-wrap">
        <View className="tasks-sort-quick">
          <Zap size={18} color="#FF6A00" />
          <Text className="tasks-sort-quick-text">30分钟内</Text>
        </View>
        {SORTS.map((sort, i) => (
          <View
            key={sort}
            className={`tasks-sort-item ${activeSort === i ? 'tasks-sort-active' : ''}`}
            onClick={() => setActiveSort(i)}
          >
          <Text className={`tasks-sort-text ${activeSort === i ? 'tasks-sort-text-active' : ''}`}>{sort}</Text>
          </View>
        ))}
      </View>

      <View className="tasks-ai-card" onClick={() => Taro.navigateTo({ url: '/pages/ai-assistant/index?scene=tasks' })}>
        <View className="tasks-ai-badge">
          <Text className="tasks-ai-badge-text">AI</Text>
        </View>
        <View className="tasks-ai-copy">
          <View className="tasks-ai-kicker">
            <Bot size={18} color="#DDE6FF" />
            <Text className="tasks-ai-kicker-text">AI 智能推荐</Text>
          </View>
          <Text className="tasks-ai-title">AI 为你精选附近更适合的需求</Text>
          <View className="tasks-ai-tags">
            <View className="tasks-ai-tag">
              <Sparkles size={16} color="#FFFFFF" />
              <Text className="tasks-ai-tag-text">价格匹配</Text>
            </View>
            <View className="tasks-ai-tag">
              <ShieldCheck size={16} color="#FFFFFF" />
              <Text className="tasks-ai-tag-text">实名优先</Text>
            </View>
          </View>
        </View>
        <AiMascot size="lg" pose="point" />
      </View>

      <View className="tasks-ai-follow-row">
        <View className="tasks-ai-follow-btn" onClick={() => setAiChatVisible(true)}>
          <Bot size={20} color="#FFFFFF" />
          <Text className="tasks-ai-follow-btn-text">问 AI 怎么接单</Text>
        </View>
        <View className="tasks-ai-follow-outline" onClick={() => Taro.navigateTo({ url: '/pages/ai-assistant/index?scene=tasks' })}>
          <Text className="tasks-ai-follow-outline-text">智能筛单</Text>
        </View>
      </View>

      <View className="tasks-list">
        {loading ? (
          <View className="tasks-loading">
            <Text className="tasks-loading-text">加载中...</Text>
          </View>
        ) : filteredTasks.length === 0 ? (
          <View className="tasks-empty-card">
            <View className="tasks-empty-icon">
              <ClipboardList size={58} color="#B87920" />
            </View>
            <Text className="tasks-empty-title">{errorMsg ? '任务加载失败' : '暂无可接任务'}</Text>
            <Text className="tasks-empty-desc">
              {errorMsg || '当前没有已支付并通过审核的真实任务，先去发布一个需求，或让 AI 帮你估价和拆解任务。'}
            </Text>
            <View className="tasks-empty-actions">
              <View
                className="tasks-empty-primary"
                onClick={errorMsg ? () => loadTasks(activeCategoryId, 1, false) : () => Taro.switchTab({ url: '/pages/publish/index' })}
              >
                <Plus size={22} color="#FFFFFF" />
                <Text className="tasks-empty-primary-text">{errorMsg ? '重新加载' : '发布需求'}</Text>
              </View>
              <View className="tasks-empty-secondary" onClick={() => Taro.navigateTo({ url: '/pages/ai-assistant/index?scene=tasks-empty' })}>
                <Bot size={22} color="#FF4D19" />
                <Text className="tasks-empty-secondary-text">AI估价</Text>
              </View>
            </View>
            <View className="tasks-empty-guide">
              <View className="tasks-empty-guide-item">
                <ShieldCheck size={18} color="#17B978" />
                <Text className="tasks-empty-guide-text">只展示真实审核通过的需求</Text>
              </View>
              <View className="tasks-empty-guide-item">
                <MapPin size={18} color="#FF6A00" />
                <Text className="tasks-empty-guide-text">发布后附近服务者可主动响应</Text>
              </View>
            </View>
          </View>
        ) : (
          filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={goDetail}
              showActions
              actionText="接单"
              onAction={handleApply}
              variant="market"
            />
          ))
        )}
        {!loading && filteredTasks.length > 0 ? (
          <View className="tasks-loading">
            <Text className="tasks-loading-text">{loadingMore ? '加载更多...' : hasMore ? '上拉加载更多' : '没有更多了'}</Text>
          </View>
        ) : null}
      </View>

      <View className="tasks-publish-strip">
        <Sparkles size={18} color="#FF4D19" />
        <Text className="tasks-publish-strip-text">没有看到合适的人手？把需求发出来，让服务者主动响应</Text>
        <View className="tasks-publish-strip-btn" onClick={() => Taro.switchTab({ url: '/pages/publish/index' })}>
          <Text className="tasks-publish-strip-btn-text">发布需求</Text>
        </View>
      </View>

      <AiChatWidget
        visible={aiChatVisible}
        onClose={() => setAiChatVisible(false)}
        context={{
          scene: 'tasks',
          title: searchInput || activeCategoryId || '任务大厅',
          category: categories.find((cat) => cat.id === activeCategoryId)?.name || '',
        }}
      />
    </View>
  );
};

export default TasksPage;
