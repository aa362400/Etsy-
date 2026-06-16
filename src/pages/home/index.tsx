/**
 * 首页 - 有应帮任务撮合入口
 */
import { Image, ScrollView, View, Text } from '@tarojs/components';
import Taro, { useDidShow, useShareAppMessage, useShareTimeline } from '@tarojs/taro';
import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Bot,
  MapPin,
  Mic,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Star,
  Wallet,
} from 'lucide-react-taro';
import AiMascot from '@/components/AiMascot';
import EmptyState from '@/components/EmptyState';
import AiChatWidget from '@/components/ai-chat-widget';
import { extractImages, getTaskList } from '@/lib/api';
import { chooseManualLocation, fetchCurrentCity, getCachedCity } from '@/lib/location';
import { centsToYuan } from '@/lib/money';
import { getCopy, getModule, getTheme, isModuleVisible, loadUiConfig, subscribeUiConfig } from '@/lib/ui-config';
import catAi from '@/assets/home-categories/cat-ai.png';
import catDesign from '@/assets/home-categories/cat-design.png';
import catDev from '@/assets/home-categories/cat-dev.png';
import catErrand from '@/assets/home-categories/cat-errand.png';
import catGeneral from '@/assets/home-categories/cat-general.png';
import catWriting from '@/assets/home-categories/cat-writing.png';
import './index.css';

interface HomeTask {
  id: string;
  title: string;
  images: string[];
  budget_amount?: number | string;
  budget_min?: number;
  budget_max?: number;
  tags: string[];
  region?: string;
  city?: string;
  publisher_id?: string;
  publisher_name?: string;
  publisher_avatar?: string;
  verified?: boolean;
  credit_score?: number;
  application_count?: number;
  created_at?: string;
  status?: string;
}

interface ServiceTile {
  name: string;
  desc: string;
  image: string;
  keyword: string;
}

const SERVICE_TILES: ServiceTile[] = [
  { name: '跑腿代办', desc: '取送排队', image: catErrand, keyword: '跑腿代办' },
  { name: '家政保洁', desc: '深度清洁', image: catGeneral, keyword: '家政保洁' },
  { name: '搬家拉货', desc: '同城搬运', image: catErrand, keyword: '搬家拉货' },
  { name: '维修安装', desc: '上门处理', image: catDev, keyword: '维修安装' },
  { name: '二手交易', desc: '闲置流转', image: catGeneral, keyword: '二手交易' },
  { name: '技能服务', desc: '专业帮办', image: catWriting, keyword: '技能服务' },
  { name: '宠物照看', desc: '喂养陪护', image: catGeneral, keyword: '宠物照看' },
  { name: '临时用工', desc: '小时帮手', image: catErrand, keyword: '临时用工' },
  { name: '数码维修', desc: '电脑手机', image: catDesign, keyword: '数码维修' },
  { name: '全部分类', desc: '更多服务', image: catAi, keyword: '更多分类' },
];

const MATCH_CHIPS = ['附近急单', '家庭保洁', '代取快递', '电脑维修', '文案设计'];

const HERO_PROOFS = [
  { label: 'AI智能匹配', icon: Bot },
  { label: '附近响应快', icon: MapPin },
  { label: '信用保障', icon: ShieldCheck },
  { label: '交易托管更安心', icon: Wallet },
];

const normalizeTask = (raw: any): HomeTask => ({
  id: String(raw.id || raw.taskId || ''),
  title: raw.title || '未命名任务',
  images: extractImages(raw),
  budget_amount: raw.budget_amount ?? raw.budgetMin ?? raw.budget_min ?? raw.amount,
  budget_min: raw.budget_min ?? raw.budgetMin,
  budget_max: raw.budget_max ?? raw.budgetMax,
  tags: [
    raw.task_categories?.name || raw.category,
    raw.service_type === 'offline' ? '同城服务' : '',
  ].filter(Boolean),
  region: raw.region || raw.city,
  city: raw.city || raw.region,
  publisher_id: String(raw.publisher_id || raw.user_id || raw.users?.id || raw.user?.id || ''),
  publisher_name: raw.users?.nickname || raw.user?.nickname || raw.publisher_name || '用户',
  publisher_avatar: raw.users?.avatar || raw.user?.avatarUrl || raw.publisher_avatar,
  verified: raw.users?.kyc_status === 'verified' || raw.user?.isCertified || raw.verified,
  credit_score: raw.users?.credit_score || raw.credit_score,
  application_count: raw.task_applications?.length || raw.application_count || raw.applyCount || 0,
  created_at: raw.created_at || raw.createdAt,
  status: raw.status,
});

const formatDistance = (task: HomeTask, index: number) => {
  const source = Number((task as any).distance || (task as any).distance_km);
  if (Number.isFinite(source) && source > 0) return `${source.toFixed(source >= 10 ? 0 : 1)}km`;
  return index === 0 ? '附近' : '同城';
};

const formatPrice = (task: HomeTask) => {
  const amount = task.budget_amount ?? task.budget_min;
  const yuan = centsToYuan(amount);
  if (!Number.isFinite(yuan) || yuan <= 0) return '面议';
  return `¥${yuan}`;
};

const HomePage = () => {
  const [city, setCity] = useState('同城');
  const [tasks, setTasks] = useState<HomeTask[]>([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [aiChatVisible, setAiChatVisible] = useState(false);
  const [, setUiConfigVersion] = useState(0);

  const theme = getTheme();
  const aiEntryModule = getModule('home', 'aiEntry');
  const recommendedModule = getModule('home', 'recommended');
  const primary = theme.primary || '#FF6A00';

  useShareAppMessage(() => ({ title: '有应帮 - 发需求，有人应', path: '/pages/home/index' }));
  useShareTimeline(() => ({ title: '有应帮 - 让需求被看见，让技能被回应' }));

  useEffect(() => {
    loadTasks();
    locateCity();
    loadUiConfig().catch(() => {});
    const unsubscribeUiConfig = subscribeUiConfig(() => {
      setUiConfigVersion((version) => version + 1);
    });
    const reload = () => loadTasks();
    Taro.eventCenter.on('privacyAuthorized', reload);
    return () => {
      unsubscribeUiConfig();
      Taro.eventCenter.off('privacyAuthorized', reload);
    };
  }, []);

  useDidShow(() => {
    loadUiConfig().catch(() => {});
    const cached = getCachedCity();
    if (cached) setCity(cached);
  });

  const locateCity = async () => {
    const cached = getCachedCity();
    if (cached) setCity(cached);
    try {
      const current = await fetchCurrentCity();
      if (current) setCity(current);
    } catch {
      // H5 或未授权时保留默认城市
    }
  };

  const loadTasks = async () => {
    setLoading(true);
    try {
      const res = await getTaskList({ page: 1, limit: 12, status: 'open', sort: 'latest' });
      const rawItems = (res?.data as any)?.items || res?.data || [];
      setTasks(Array.isArray(rawItems) ? rawItems.map(normalizeTask).filter((item) => item.id) : []);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredTasks = useMemo(() => {
    if (!activeCategory || activeCategory === '全部分类') return tasks;
    return tasks.filter((task) => task.tags.some((tag) => tag.includes(activeCategory)) || task.title.includes(activeCategory));
  }, [tasks, activeCategory]);

  const recommendedTasks = useMemo(() => filteredTasks.slice(0, 4), [filteredTasks]);

  const nearbyProviders = useMemo(() => {
    const seen = new Set<string>();
    return tasks
      .filter((task) => task.publisher_name && task.publisher_name !== '用户')
      .filter((task) => {
        const key = task.publisher_id || task.publisher_name || task.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 6);
  }, [tasks]);

  const chooseCity = async () => {
    try {
      const loc = await chooseManualLocation();
      setCity(loc.city || city);
      Taro.showToast({ title: '城市已更新', icon: 'success' });
    } catch (error: any) {
      Taro.showToast({ title: error?.message || '可稍后手动选择城市', icon: 'none' });
    }
  };

  const openSearch = (keyword?: string) => {
    const query = keyword ? `?keyword=${encodeURIComponent(keyword)}` : '';
    Taro.navigateTo({ url: `/pages/search/index${query}` });
  };

  const handleScan = () => {
    if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
      Taro.showToast({ title: '请在微信小程序中使用扫一扫', icon: 'none' });
      return;
    }
    Taro.scanCode({ onlyFromCamera: false }).catch(() => {});
  };

  const openService = (item: ServiceTile) => {
    if (item.name === '全部分类') {
      Taro.navigateTo({ url: '/pages/categories/index' });
      return;
    }
    setActiveCategory(activeCategory === item.name ? '' : item.name);
    openSearch(item.keyword);
  };

  const openProvider = (task: HomeTask) => {
    if (!task.publisher_id) {
      Taro.navigateTo({ url: `/pages/task-detail/index?id=${task.id}` });
      return;
    }
    Taro.navigateTo({
      url: `/pages/provider/index?id=${encodeURIComponent(task.publisher_id)}&name=${encodeURIComponent(task.publisher_name || '')}&avatar=${encodeURIComponent(task.publisher_avatar || '')}&verified=${task.verified ? '1' : ''}&creditScore=${encodeURIComponent(String(task.credit_score || ''))}`,
    });
  };

  return (
    <View className="home-page">
      <View className="home-shell">
        <View className="home-brand-row">
          <View className="home-brand" onClick={() => Taro.switchTab({ url: '/pages/home/index' })}>
            <Text className="home-brand-main">有应</Text>
            <Text className="home-brand-accent">帮</Text>
          </View>
          <Text className="home-brand-slogan">让需求被看见，让技能被回应</Text>
          <View className="home-menu-pill">
            <Text className="home-menu-dot">•••</Text>
            <Text className="home-menu-line">—</Text>
            <Text className="home-menu-circle">◎</Text>
          </View>
        </View>

        <View className="home-location-row">
          <View className="home-location" onClick={chooseCity}>
            <MapPin size={31} color="#111827" />
            <Text className="home-location-text">{city}</Text>
            <Text className="home-location-arrow">⌄</Text>
          </View>
          <Text className="home-locating">定位中</Text>
          <View className="home-top-actions">
            <View className="home-top-action" onClick={() => Taro.navigateTo({ url: '/pages/messages/index' })}>
              <Bell size={30} color="#111827" />
              <Text className="home-top-action-text">消息</Text>
            </View>
            <View className="home-action-divider" />
            <View className="home-top-action" onClick={handleScan}>
              <ScanLine size={30} color="#111827" />
              <Text className="home-top-action-text">扫一扫</Text>
            </View>
          </View>
        </View>

        {isModuleVisible('home', 'aiEntry') ? (
          <View className="home-ai-match-card" onClick={() => setAiChatVisible(true)}>
            <View className="home-ai-mascot-wrap">
              <AiMascot size="lg" pose="wave" />
              <View className="home-ai-badge">
                <ShieldCheck size={17} color="#FFFFFF" />
                <Text className="home-ai-badge-text">有应AI助手</Text>
              </View>
            </View>
            <View className="home-ai-match-main">
              <View className="home-ai-input">
                <Text className="home-ai-input-text">
                  {aiEntryModule?.subtitle || '说出你的需求：搬家 / 保洁 / 修图 / 跑腿 / 维修...'}
                </Text>
                <Mic size={30} color="#6B7280" />
              </View>
              <View className="home-ai-chip-row">
                {MATCH_CHIPS.map((item) => (
                  <View key={item} className="home-ai-chip" onClick={(e) => { e.stopPropagation(); openSearch(item); }}>
                    <Sparkles size={18} color="#FF6A00" />
                    <Text className="home-ai-chip-text">{item}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View className="home-ai-match-btn">
              <Text className="home-ai-match-btn-text">{aiEntryModule?.buttonText || 'AI帮我匹配'}</Text>
              <Sparkles size={24} color="#FFFFFF" />
            </View>
          </View>
        ) : null}

        {isModuleVisible('home', 'categories') ? (
          <View className="home-service-grid">
            {SERVICE_TILES.map((item) => (
              <View key={item.name} className="home-service-tile" onClick={() => openService(item)}>
                <Image src={item.image} mode="aspectFill" className="home-service-image" />
                <Text className="home-service-name">{item.name}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {isModuleVisible('home', 'welcome') ? (
          <View className="home-blue-hero" onClick={() => Taro.navigateTo({ url: '/pages/ai-assistant/index?scene=home-banner' })}>
            <View className="home-blue-copy">
              <View className="home-blue-badge">
                <ShieldCheck size={18} color="#7CFFCF" />
                <Text className="home-blue-badge-text">有应AI助手</Text>
              </View>
              <Text className="home-blue-title">让需求被看见，让技能被回应</Text>
              <View className="home-blue-proof-row">
                {HERO_PROOFS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <View key={item.label} className="home-blue-proof">
                      <Icon size={20} color="#FFFFFF" />
                      <Text className="home-blue-proof-text">{item.label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
            <AiMascot size="xl" pose="point" className="home-blue-mascot" />
          </View>
        ) : null}

        {isModuleVisible('home', 'recommended') ? (
          <View className="home-section">
            <View className="home-section-head">
              <View className="home-section-title-wrap">
                <Sparkles size={32} color={primary} />
                <Text className="home-section-title">{recommendedModule?.title || '猜你现在需要'}</Text>
              </View>
              <View className="home-section-link" onClick={() => loadTasks()}>
                <Text className="home-section-link-text">换一换</Text>
                <Text className="home-refresh">↻</Text>
              </View>
            </View>

            {loading ? (
              <View className="home-loading">
                <Text className="home-loading-text">{getCopy('loadingText')}</Text>
              </View>
            ) : recommendedTasks.length === 0 ? (
              <EmptyState
                compact
                title="暂无推荐需求"
                description={getCopy('emptyState')}
                actionText="发布需求"
                onAction={() => Taro.switchTab({ url: '/pages/publish/index' })}
              />
            ) : (
              <ScrollView scrollX showScrollbar={false} className="home-recommend-scroll">
                <View className="home-recommend-row">
                  {recommendedTasks.map((task, index) => (
                    <View
                      key={task.id}
                      className="home-recommend-card"
                      onClick={() => Taro.navigateTo({ url: `/pages/task-detail/index?id=${task.id}` })}
                    >
                      <Text className="home-recommend-tag">{task.tags[0] || '同城服务'}</Text>
                      <Text className="home-recommend-title">{task.title}</Text>
                      <Text className="home-recommend-desc">
                        {task.application_count ? `已有 ${task.application_count} 人想接` : '可沟通细节后报价'}
                      </Text>
                      <View className="home-recommend-meta">
                        <Text className="home-recommend-distance">{formatDistance(task, index)}</Text>
                        <Text className="home-recommend-price">{formatPrice(task)}{formatPrice(task) !== '面议' ? ' 起' : ''}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        ) : null}

        <View className="home-section home-provider-section">
          <View className="home-section-head">
            <View className="home-section-title-wrap">
              <ShieldCheck size={32} color="#2F80ED" />
              <Text className="home-section-title">附近靠谱的人</Text>
            </View>
            <View className="home-section-link" onClick={() => Taro.navigateTo({ url: '/pages/nearby-map/index' })}>
              <Text className="home-section-link-text">更多附近达人</Text>
              <Text className="home-chevron">›</Text>
            </View>
          </View>

          {loading ? (
            <View className="home-loading">
              <Text className="home-loading-text">{getCopy('loadingText')}</Text>
            </View>
          ) : nearbyProviders.length === 0 ? (
            <View className="home-provider-empty">
              <Text className="home-provider-empty-title">暂无真实服务者资料</Text>
              <Text className="home-provider-empty-desc">有真实任务和接单者后，这里会展示附近靠谱的人。</Text>
            </View>
          ) : (
            <ScrollView scrollX showScrollbar={false} className="home-provider-scroll">
              <View className="home-provider-row">
                {nearbyProviders.map((task, index) => (
                  <View key={`${task.publisher_name}-${task.id}`} className="home-provider-card" onClick={() => openProvider(task)}>
                    <View className="home-provider-avatar-wrap">
                      {task.publisher_avatar ? (
                        <Image src={task.publisher_avatar} mode="aspectFill" className="home-provider-avatar" />
                      ) : (
                        <View className="home-provider-avatar-fallback">
                          <Text className="home-provider-avatar-text">{(task.publisher_name || '服').slice(0, 1)}</Text>
                        </View>
                      )}
                      {task.verified ? <Text className="home-provider-badge">优选</Text> : null}
                    </View>
                    <Text className="home-provider-name">{task.publisher_name}</Text>
                    <Text className="home-provider-skill">{task.tags[0] || '同城服务'}</Text>
                    <View className="home-provider-tags">
                      <Text className="home-provider-tag">响应快</Text>
                      {task.credit_score ? <Text className="home-provider-tag">信用{task.credit_score}</Text> : null}
                    </View>
                    <View className="home-provider-score">
                      <Star size={18} color="#FF9F1C" filled />
                      <Text className="home-provider-score-text">{task.credit_score ? '信用良好' : '资料待完善'}</Text>
                      <Text className="home-provider-distance">{formatDistance(task, index)}</Text>
                    </View>
                    <View className="home-provider-btn">
                      <Text className="home-provider-btn-text">立即联系</Text>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </View>

        <View className="home-bottom-safe" />
      </View>

      <AiChatWidget visible={aiChatVisible} onClose={() => setAiChatVisible(false)} context={{ scene: 'home' }} />
    </View>
  );
};

export default HomePage;
