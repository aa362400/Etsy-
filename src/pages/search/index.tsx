import { Image, ScrollView, Text, View } from '@tarojs/components';
import Taro, { useDidShow, useRouter } from '@tarojs/taro';
import { useEffect, useState } from 'react';
import {
  BadgeCheck,
  ChevronDown,
  CircleCheck,
  Clock,
  MapPin,
  MessageCircle,
  Navigation,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  X,
  Zap,
} from 'lucide-react-taro';
import AiMascot from '@/components/AiMascot';
import EmptyState from '@/components/EmptyState';
import ReplicaTabBar from '@/components/ReplicaTabBar';
import { Input } from '@/components/ui/input';
import { extractImages, getTaskList } from '@/lib/api';
import { DEFAULT_CITY_LABEL, fetchCurrentCity, getCachedCity } from '@/lib/location';
import { formatCentsAsYuan } from '@/lib/money';
import './index.css';

type Tone = 'blue' | 'green' | 'orange' | 'purple';

interface ResultItem {
  id: string;
  category: string;
  title: string;
  desc: string;
  publisher: string;
  price: number;
  credit: string;
  responses: string;
  location: string;
  responseTime: string;
  tone: Tone;
  serviceType: string;
  badges: string[];
  cta: string;
  images: string[];
}

const FILTERS = [
  { label: '全部', icon: CircleCheck },
  { label: '附近', icon: Navigation },
  { label: '可议价', icon: SlidersHorizontal },
  { label: '即时响应', icon: Zap },
  { label: '信用优先', icon: ShieldCheck },
  { label: '价格', icon: ChevronDown },
  { label: '评分', icon: ChevronDown },
  { label: '距离', icon: ChevronDown },
];

const TONES: Tone[] = ['orange', 'blue', 'green', 'purple'];

const pickTone = (seed: string): Tone => {
  const total = seed.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return TONES[total % TONES.length];
};

const formatPrice = (value: number) => formatCentsAsYuan(value, { spaced: true, fallback: '面议' });

const normalizeResult = (raw: any): ResultItem => {
  const category = raw.task_categories?.name || raw.category_name || raw.category || '任务服务';
  const publisher = raw.users?.nickname || raw.publisher_name || raw.user?.nickname || '需求方';
  const creditScore = raw.users?.credit_score || raw.user?.credit_score || raw.credit_score;
  const applicationCount = raw.task_applications?.length || raw.application_count || raw.applyCount || 0;
  const price = Number(raw.budget_amount || raw.budget_min || raw.price || 0);
  const serviceType = raw.service_type === 'online' ? '可远程' : '可上门';
  const verified = raw.users?.kyc_status === 'verified' || raw.user?.kyc_status === 'verified';
  const badges = [
    verified ? '已认证' : '',
    raw.status === 'open' ? '可接单' : '',
    raw.service_type === 'online' ? '线上服务' : '同城服务',
  ].filter(Boolean);

  return {
    id: String(raw.id || raw.taskId || ''),
    category,
    title: raw.title || '未命名需求',
    desc: raw.description || '需求方暂未补充详细描述，可进入详情后沟通确认。',
    publisher,
    price: Number.isFinite(price) ? price : 0,
    credit: creditScore ? String(creditScore) : '信用待积累',
    responses: applicationCount > 0 ? `${applicationCount} 人响应` : '等待响应',
    location: raw.distance || raw.region || raw.city || (raw.service_type === 'online' ? '线上' : '同城'),
    responseTime: raw.deadline ? `期望 ${raw.deadline}` : '响应时间待沟通',
    tone: pickTone(`${raw.id || ''}${category}`),
    serviceType,
    badges,
    cta: applicationCount > 0 ? '邀请报价' : '立即联系',
    images: extractImages(raw),
  };
};

const goDetail = (id: string) => {
  Taro.navigateTo({ url: `/pages/task-detail/index?id=${id}` });
};

export default function SearchPage() {
  const router = useRouter();
  const initial = decodeURIComponent(router.params?.q || router.params?.keyword || '电脑维修');
  const [keyword, setKeyword] = useState(initial || '');
  const [activeFilter, setActiveFilter] = useState(0);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [city, setCity] = useState(getCachedCity() || DEFAULT_CITY_LABEL);

  const loadResults = async (nextKeyword = keyword) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const searchKeyword = nextKeyword.trim();
      const res = await getTaskList({
        page: 1,
        limit: 20,
        status: 'open',
        keyword: searchKeyword,
        sort: 'latest',
        cityName: city !== DEFAULT_CITY_LABEL ? city : undefined,
      });
      if (res?.code !== 200) throw new Error(res?.msg || '搜索接口返回异常');
      const data: any = res?.data || {};
      const rawItems = Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : [];
      setResults(rawItems.map(normalizeResult).filter((item: ResultItem) => item.id));
    } catch (error: any) {
      setResults([]);
      setErrorMsg(error?.message || '搜索结果加载失败，请检查后端服务。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResults(initial);
    fetchCurrentCity().then((current) => {
      if (current) setCity(current);
    }).catch(() => {});
  }, []);

  useDidShow(() => {
    const cached = getCachedCity();
    if (cached) setCity(cached);
  });

  return (
    <View className="search-page">
      <View className="search-header">
        <View className="search-brand-row">
          <View className="search-logo" onClick={() => Taro.switchTab({ url: '/pages/home/index' })}>
            <Text className="search-logo-main">有应</Text>
            <Text className="search-logo-accent">帮</Text>
          </View>
          <Text className="search-slogan">让需求被看见，让技能被回应</Text>
          <View className="search-menu-pill">
            <Text className="search-menu-dot">•••</Text>
            <Text className="search-menu-line">|</Text>
            <Text className="search-menu-circle">○</Text>
          </View>
        </View>

        <View className="search-row">
          <View className="search-city">
            <MapPin size={24} color="#081A3A" />
            <Text className="search-city-text">{city}</Text>
          </View>
          <View className="search-input-wrap">
            <Search size={24} color="#111827" />
            <Input
              className="search-input"
              value={keyword}
              confirmType="search"
              placeholder="搜索服务、技能或商品"
              onInput={(event) => setKeyword(event.detail.value)}
              onConfirm={() => loadResults(keyword)}
            />
            {keyword ? (
              <View className="search-clear" onClick={() => setKeyword('')}>
                <X size={18} color="#FFFFFF" />
              </View>
            ) : null}
            <View className="search-submit" onClick={() => loadResults(keyword)}>
              <Text className="search-submit-text">搜索</Text>
            </View>
          </View>
        </View>

        <ScrollView scrollX showScrollbar={false} className="search-filter-scroll">
          <View className="search-filters">
            {FILTERS.map((item, index) => {
              const Icon = item.icon;
              const active = activeFilter === index;
              return (
                <View
                  key={item.label}
                  className={`search-filter ${active ? 'search-filter-active' : ''}`}
                  onClick={() => setActiveFilter(index)}
                >
                  <Icon size={18} color={active ? '#FF4D19' : '#4B5563'} />
                  <Text className={`search-filter-text ${active ? 'search-filter-text-active' : ''}`}>
                    {item.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <View className="search-ai-card">
        <View className="search-ai-left">
          <AiMascot size="md" pose="point" />
          <View className="search-ai-copy">
            <Text className="search-ai-title">
              <Text className="search-ai-title-highlight">AI</Text>
              已为你筛选更匹配的结果
            </Text>
            <Text className="search-ai-desc">综合需求内容、响应速度、信用记录，为你优先展示真实可沟通的需求。</Text>
          </View>
        </View>
        <AiMascot size="lg" pose="wave" breath={false} />
      </View>

      <View className="search-results">
        {loading ? (
          <View className="search-loading">
            <Text className="search-loading-text">正在搜索真实需求...</Text>
          </View>
        ) : results.length === 0 ? (
          <EmptyState
            title={errorMsg ? '搜索加载失败' : '暂无匹配结果'}
            description={errorMsg || '当前暂时没有匹配需求。可以换个关键词，或先发布一个新需求。'}
            actionText={errorMsg ? '重新搜索' : '发布需求'}
            onAction={errorMsg ? () => loadResults(keyword) : () => Taro.switchTab({ url: '/pages/publish/index' })}
          />
        ) : (
          results.map((item) => (
            <View className="search-result-card" key={item.id} onClick={() => goDetail(item.id)}>
              <View className="search-thumb-wrap">
                {item.images[0] ? (
                  <Image className="search-thumb-image" src={item.images[0]} mode="aspectFill" />
                ) : (
                  <View className={`search-thumb-visual search-thumb-${item.tone}`}>
                    <Sparkles size={58} color="#FFFFFF" />
                  </View>
                )}
                <Text className="search-thumb-label">{item.category}</Text>
                <Text className="search-thumb-online">{item.serviceType}</Text>
              </View>
              <View className="search-result-main">
                <Text className="search-result-tag">{item.category}</Text>
                <Text className="search-result-title">{item.title}</Text>
                <Text className="search-result-desc">{item.desc}</Text>
                <View className="search-seller-row">
                  <View className="search-avatar">
                    <Text className="search-avatar-text">{item.publisher.slice(0, 1)}</Text>
                  </View>
                  <Text className="search-seller-name">{item.publisher}</Text>
                  {item.badges.slice(0, 2).map((badge) => (
                    <View className="search-badge" key={badge}>
                      <BadgeCheck size={14} color="#FF6A00" />
                      <Text className="search-badge-text">{badge}</Text>
                    </View>
                  ))}
                </View>
                <View className="search-meta-row">
                  <Star size={17} color="#FF9F0A" />
                  <Text className="search-meta-text">{item.credit}</Text>
                  <Text className="search-meta-text">{item.responses}</Text>
                  <Text className="search-meta-text">{item.location}</Text>
                  <Clock size={16} color="#6B7280" />
                  <Text className="search-meta-text">{item.responseTime}</Text>
                </View>
              </View>
              <View className="search-price-box">
                <Text className="search-price">{formatPrice(item.price)}</Text>
                <Text className="search-price-unit">{item.price > 0 ? '起' : ''}</Text>
                <Text className="search-price-note">价格可议</Text>
                <View
                  className={`search-contact ${item.cta === '邀请报价' ? 'search-contact-ghost' : ''}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    Taro.navigateTo({ url: `/pages/task-detail/index?id=${item.id}` });
                  }}
                >
                  <MessageCircle size={18} color={item.cta === '邀请报价' ? '#FF4D19' : '#FFFFFF'} />
                  <Text className={`search-contact-text ${item.cta === '邀请报价' ? 'search-contact-text-ghost' : ''}`}>{item.cta}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      <View className="search-publish-tip">
        <Sparkles size={18} color="#FF4D19" />
        <Text className="search-publish-text">没找到合适的服务？告诉我们更详细的需求，帮你精准匹配</Text>
        <View className="search-publish-btn" onClick={() => Taro.switchTab({ url: '/pages/publish/index' })}>
          <Text className="search-publish-btn-text">发布需求</Text>
        </View>
      </View>

      <View className="search-bottom-space" />
      <ReplicaTabBar active="search" variant="search" />
    </View>
  );
}
