import { Image, ScrollView, Text, View } from '@tarojs/components';
import Taro, { useRouter, useShareAppMessage, useShareTimeline } from '@tarojs/taro';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  ChevronRight,
  CircleQuestionMark,
  ClipboardList,
  Clock,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Star,
  UserRoundCheck,
} from 'lucide-react-taro';
import AiMascot from '@/components/AiMascot';
import { isModuleVisible } from '@/lib/ui-config';
import { formatCentsAsYuan } from '@/lib/money';
import './index.css';

interface ProviderProfile {
  id?: string;
  user_id?: string;
  worker_id?: string;
  name?: string;
  nickname?: string;
  avatar?: string;
  bio?: string;
  city?: string;
  region?: string;
  distance?: string | number;
  rating?: string | number;
  score?: string | number;
  credit_score?: string | number;
  order_count?: string | number;
  completed_order_count?: string | number;
  response_time?: string | number;
  response_rate?: string | number;
  praise_rate?: string | number;
  good_rate?: string | number;
  service_radius?: string | number;
  kyc_status?: string;
  verified?: boolean;
  price?: string | number;
  quote_price?: string | number;
  starting_price?: string | number;
  tags?: string[];
  skill_tags?: string[];
  cases?: Array<{ title?: string; image?: string; count?: number }>;
  reviews?: Array<{ id?: string; user?: string; content?: string; rating?: string | number; created_at?: string }>;
  available_times?: string[];
}

const fallbackSkills = ['技能标签待同步', '服务半径待同步', '报价规则待同步', '案例资料待同步'];
const fallbackCases = ['案例图片待同步', '服务现场待同步', '评价凭证待同步', '服务档案待同步'];
const faqSlots = ['服务前需要准备什么？', '是否会额外收费？', '一般多久可以完成？'];
const timeSlots = ['今天', '周四', '周五', '周六', '周日', '周一'];

const goBack = () => {
  const pages = Taro.getCurrentPages();
  if (pages.length > 1) {
    Taro.navigateBack();
    return;
  }
  Taro.switchTab({ url: '/pages/tasks/index' });
};

const goPublish = () => Taro.switchTab({ url: '/pages/publish/index' });
const goAi = () => Taro.navigateTo({ url: '/pages/ai-assistant/index?scene=provider' });

const safeDecode = (value?: string) => {
  if (!value) return '';
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const hasRealValue = (value: unknown) => value !== undefined && value !== null && value !== '' && value !== '--';
const firstValue = (...values: unknown[]) => values.find(hasRealValue);
const toDisplay = (value: unknown, fallback = '待同步') => hasRealValue(value) ? String(value) : fallback;

const readCachedProvider = (id?: string): ProviderProfile => {
  for (const key of ['selected_provider_profile', 'provider_profile_cache']) {
    try {
      const value = Taro.getStorageSync(key);
      if (!value || typeof value !== 'object') continue;
      if (!id || value.id === id || value.user_id === id || value.worker_id === id) {
        return value as ProviderProfile;
      }
    } catch {
      // Local cache is optional.
    }
  }
  return {};
};

const compactProfile = (input: ProviderProfile) => {
  const next: ProviderProfile = {};
  Object.entries(input).forEach(([key, value]) => {
    if (hasRealValue(value)) {
      (next as Record<string, unknown>)[key] = value;
    }
  });
  return next;
};

const normalizeProvider = (params: Record<string, string | undefined>): ProviderProfile => {
  const id = safeDecode(params.id || params.workerId || params.userId);
  const cached = readCachedProvider(id);
  const fromParams: ProviderProfile = compactProfile({
    id,
    name: safeDecode(params.name),
    nickname: safeDecode(params.nickname),
    avatar: safeDecode(params.avatar),
    city: safeDecode(params.city),
    region: safeDecode(params.region),
    distance: safeDecode(params.distance),
    rating: safeDecode(params.rating),
    score: safeDecode(params.score),
    credit_score: safeDecode(params.creditScore),
    order_count: safeDecode(params.orderCount),
    price: safeDecode(params.price),
  });
  return { ...cached, ...fromParams };
};

const isVerifiedProvider = (profile: ProviderProfile) => profile.verified || profile.kyc_status === 'verified';
const priceText = (profile: ProviderProfile) => {
  const raw = firstValue(profile.price, profile.quote_price, profile.starting_price);
  if (!hasRealValue(raw)) return '报价待同步';
  return formatCentsAsYuan(raw as any, { fallback: '报价待沟通' });
};

const goChat = (profile: ProviderProfile) => {
  const name = toDisplay(firstValue(profile.name, profile.nickname), '服务者资料待同步');
  Taro.navigateTo({ url: `/pages/chat/index?id=${profile.id || profile.worker_id || 'provider-pending'}&name=${encodeURIComponent(name)}` });
};

export default function ProviderPage() {
  const router = useRouter();
  const provider = useMemo(() => normalizeProvider(router.params || {}), [router.params]);
  const displayName = toDisplay(firstValue(provider.name, provider.nickname), '服务者资料待同步');
  const providerKey = String(firstValue(provider.id, provider.worker_id, provider.user_id, displayName) || 'provider-pending');
  const city = toDisplay(firstValue(provider.city, provider.region), '当前城市待同步');
  const verified = isVerifiedProvider(provider);
  const [followed, setFollowed] = useState(false);
  const skills = (Array.isArray(provider.skill_tags) && provider.skill_tags.length
    ? provider.skill_tags
    : Array.isArray(provider.tags) && provider.tags.length
      ? provider.tags
      : fallbackSkills).slice(0, 6);
  const cases = Array.isArray(provider.cases) && provider.cases.length ? provider.cases.slice(0, 4) : [];
  const reviews = Array.isArray(provider.reviews) ? provider.reviews.slice(0, 2) : [];
  const availableTimes = Array.isArray(provider.available_times) && provider.available_times.length
    ? provider.available_times
    : timeSlots.map(() => '待同步');

  useShareAppMessage(() => ({
    title: `${displayName} - 有应帮服务者`,
    path: `/pages/provider/index?id=${encodeURIComponent(providerKey)}&name=${encodeURIComponent(displayName)}`,
  }));
  useShareTimeline(() => ({ title: `${displayName} - 有应帮服务者` }));

  useEffect(() => {
    try {
      const list = Taro.getStorageSync('local_provider_follows') || [];
      setFollowed(Array.isArray(list) && list.some((item: any) => item.id === providerKey));
    } catch {
      setFollowed(false);
    }
  }, [providerKey]);

  const toggleFollow = () => {
    try {
      const current = Taro.getStorageSync('local_provider_follows') || [];
      const list = Array.isArray(current) ? current : [];
      const exists = list.some((item: any) => item.id === providerKey);
      const next = exists
        ? list.filter((item: any) => item.id !== providerKey)
        : [{ id: providerKey, name: displayName, avatar: provider.avatar || '', updatedAt: Date.now() }, ...list].slice(0, 50);
      Taro.setStorageSync('local_provider_follows', next);
      setFollowed(!exists);
      Taro.showToast({ title: exists ? '已取消本地关注' : '已加入本地关注', icon: 'success' });
    } catch {
      Taro.showToast({ title: '关注状态保存失败', icon: 'none' });
    }
  };

  const handleShareProvider = () => {
    if (Taro.getEnv() === Taro.ENV_TYPE.WEAPP) {
      Taro.showShareMenu({ withShareTicket: true }).catch(() => {});
      Taro.showToast({ title: '请点右上角分享给朋友', icon: 'none' });
      return;
    }
    Taro.setClipboardData({ data: `${displayName} - 有应帮服务者` });
  };

  return (
    <View className="provider-page">
      <View className="provider-nav">
        <View className="provider-back" onClick={goBack}>
          <ArrowLeft size={30} color="#081A3A" />
        </View>
        <Text className="provider-nav-title">服务者主页</Text>
        <View className="provider-capsule" onClick={handleShareProvider}>
          <Text className="provider-capsule-dot">•••</Text>
          <Text className="provider-capsule-line">—</Text>
          <Text className="provider-capsule-circle">◎</Text>
        </View>
      </View>

      <ScrollView scrollY className="provider-scroll" showScrollbar={false}>
        {isModuleVisible('provider', 'hero') ? (
          <View className="provider-hero">
            <View className="provider-hero-top">
              <View className="provider-avatar">
                {provider.avatar ? (
                  <Image className="provider-avatar-img" src={provider.avatar} mode="aspectFill" />
                ) : (
                  <UserRoundCheck size={76} color="#FFFFFF" />
                )}
                <View className="provider-avatar-ribbon">
                  <Text className="provider-avatar-ribbon-text">{verified ? '已实名' : '待同步'}</Text>
                </View>
              </View>

              <View className="provider-profile-main">
                <View className="provider-name-row">
                  <Text className="provider-name">{displayName}</Text>
                  <View className="provider-cert-pill">
                    <BadgeCheck size={20} color="#4B7CFF" />
                    <Text className="provider-cert-text">{verified ? '身份已认证' : '认证状态待同步'}</Text>
                  </View>
                </View>
                <Text className="provider-subtitle">
                  {provider.bio || `${city}服务者资料页。评分、距离、报价和服务记录只展示真实返回字段。`}
                </Text>
                <View className="provider-rating-row">
                  <Star size={22} color="#FF9F0A" filled={hasRealValue(firstValue(provider.rating, provider.score))} />
                  <Text className="provider-rating-text">{toDisplay(firstValue(provider.rating, provider.score), '评分待同步')}</Text>
                  <Text className="provider-rating-sub">{hasRealValue(firstValue(provider.praise_rate, provider.good_rate)) ? `${toDisplay(firstValue(provider.praise_rate, provider.good_rate))} 好评` : '评价来自真实订单'}</Text>
                </View>
                <View className="provider-cert-row">
                  <View className="provider-cert-tag provider-cert-green">
                    <ShieldCheck size={18} color="#17B978" />
                    <Text className="provider-cert-tag-text">{verified ? '实名认证' : '实名认证待同步'}</Text>
                  </View>
                  <View className="provider-cert-tag provider-cert-blue">
                    <BadgeCheck size={18} color="#4B7CFF" />
                    <Text className="provider-cert-tag-text">{skills[0] || '技能认证待同步'}</Text>
                  </View>
                  <View className="provider-cert-tag provider-cert-purple">
                    <ShieldCheck size={18} color="#8B5CF6" />
                    <Text className="provider-cert-tag-text">信用 {toDisplay(provider.credit_score)}</Text>
                  </View>
                </View>
              </View>

              <View className="provider-side">
                <View className="provider-award">
                  <Text className="provider-award-title">{verified ? '有应帮优选' : '有应帮服务者'}</Text>
                  <Text className="provider-award-sub">{verified ? '服务者' : '资料待完善'}</Text>
                </View>
                <View className="provider-follow-btn" onClick={toggleFollow}>
                  <Star size={22} color="#FF4D19" filled={followed} />
                  <Text className="provider-follow-text">{followed ? '已关注' : '关注'}</Text>
                </View>
              </View>
            </View>

            <View className="provider-stats">
              <StatItem value={toDisplay(firstValue(provider.rating, provider.score))} label="综合评分" sub={hasRealValue(firstValue(provider.rating, provider.score)) ? '真实评价字段' : '真实评价待同步'} />
              <StatItem value={toDisplay(firstValue(provider.response_time, provider.response_rate))} label="响应能力" sub={hasRealValue(firstValue(provider.response_time, provider.response_rate)) ? '服务响应记录' : '接单记录待同步'} />
              <StatItem value={toDisplay(firstValue(provider.completed_order_count, provider.order_count))} label="完成订单" sub={hasRealValue(firstValue(provider.completed_order_count, provider.order_count)) ? '后端订单字段' : '订单数据待同步'} />
              <StatItem value={toDisplay(firstValue(provider.service_radius, provider.distance))} label="服务半径" sub={hasRealValue(firstValue(provider.service_radius, provider.distance)) ? city : '定位数据待同步'} />
            </View>

            <View className="provider-skill-row">
              <Text className="provider-skill-title">擅长服务</Text>
              {skills.map((item, index) => (
                <View className={`provider-skill-chip provider-skill-chip-${(index % 4) + 1}`} key={item}>
                  <Text className="provider-skill-chip-text">{item}</Text>
                </View>
              ))}
            </View>
            <Text className="provider-skill-desc">
              参考报价：{priceText(provider)}。平台只展示后端确认过的服务标签、报价范围和接单能力，避免用户被虚假资料误导。
            </Text>
          </View>
        ) : null}

        <View className="provider-ai-card" onClick={goAi}>
          <AiMascot size="md" pose="point" />
          <View className="provider-ai-main">
            <Text className="provider-ai-title">AI 服务摘要</Text>
            <Text className="provider-ai-desc">小应会结合真实订单、评价、报价和位置帮你判断是否适合邀请，不承诺固定价格和时效。</Text>
          </View>
          <View className="provider-ai-btn">
            <Text className="provider-ai-btn-text">帮我判断</Text>
            <ChevronRight size={20} color="#FFFFFF" />
          </View>
        </View>

        {isModuleVisible('provider', 'bio') ? (
          <View className="provider-section">
            <View className="provider-section-head">
              <Text className="provider-section-title">服务说明</Text>
              <Text className="provider-section-link">真实资料</Text>
            </View>
            <View className="provider-quote-box">
              <Text className="provider-quote-mark">“</Text>
              <Text className="provider-bio">
                {provider.bio || '服务者介绍、可接服务、报价规则、服务范围和售后承诺需要从后端服务者资料接口读取；当前不会用固定文案冒充真实服务者。'}
              </Text>
            </View>
            <View className="provider-safe-row">
              {['报价留痕', '隐私保护', '平台担保交易', '不满意可售后'].map((item) => (
                <View className="provider-safe-item" key={item}>
                  <ShieldCheck size={18} color="#6B7280" />
                  <Text className="provider-safe-text">{item}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View className="provider-section">
          <View className="provider-section-head">
            <Text className="provider-section-title">作品案例 / 服务相册</Text>
            <View className="provider-section-more">
              <Text className="provider-section-more-text">全部案例</Text>
              <ChevronRight size={20} color="#8A8F99" />
            </View>
          </View>
          <View className="provider-case-row">
            {(cases.length ? cases : fallbackCases.map((title) => ({ title }))).map((item, index) => (
              <View className="provider-case-card" key={item.title || index}>
                <View className={`provider-case-cover provider-case-cover-${(index % 4) + 1}`}>
                  {item.image ? <Image className="provider-case-img" src={item.image} mode="aspectFill" /> : <ClipboardList size={34} color="#FF6A00" />}
                </View>
                <Text className="provider-case-title">{item.title || '案例资料待同步'}</Text>
                <Text className="provider-case-count">{hasRealValue(item.count) ? `${item.count} 张` : '-- 张'}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className="provider-section">
          <View className="provider-section-head">
            <Text className="provider-section-title">用户评价（{reviews.length || '-'}）</Text>
            <View className="provider-section-more">
              <Text className="provider-section-more-text">全部评价</Text>
              <ChevronRight size={20} color="#8A8F99" />
            </View>
          </View>
          <View className="provider-review-empty">
            <View className="provider-review-avatar">
              <Star size={28} color="#FF9F0A" />
            </View>
            <View className="provider-review-main">
              {reviews.length ? reviews.map((review) => (
                <View className="provider-review-line" key={review.id || review.content}>
                  <Text className="provider-review-title">{review.user || '用户评价'}</Text>
                  <Text className="provider-review-desc">{review.content || '评价内容待同步'}</Text>
                </View>
              )) : (
                <>
                  <Text className="provider-review-title">真实评价待同步</Text>
                  <Text className="provider-review-desc">评价必须来自已完成订单，不能展示模拟好评或固定评分。</Text>
                </>
              )}
              <View className="provider-review-tags">
                <Text className="provider-review-tag">订单完成后生成</Text>
                <Text className="provider-review-tag">双向评价</Text>
              </View>
            </View>
          </View>
        </View>

        <View className="provider-section">
          <View className="provider-section-head">
            <Text className="provider-section-title">常见问题</Text>
            <View className="provider-section-more">
              <Text className="provider-section-more-text">全部问题</Text>
              <ChevronRight size={20} color="#8A8F99" />
            </View>
          </View>
          <View className="provider-faq-row">
            {faqSlots.map((item) => (
              <View className="provider-faq" key={item}>
                <CircleQuestionMark size={22} color="#FF6A00" />
                <Text className="provider-faq-text">{item}</Text>
                <ChevronRight size={18} color="#8A8F99" />
              </View>
            ))}
          </View>
        </View>

        <View className="provider-section">
          <View className="provider-section-head">
            <View className="provider-section-title-row">
              <Text className="provider-section-title">可服务时间</Text>
              <View className="provider-online-dot" />
              <Text className="provider-online-text">状态待同步</Text>
            </View>
          </View>
          <View className="provider-time-row">
            {timeSlots.map((item, index) => (
              <View className={`provider-time-card ${index === 0 ? 'provider-time-card-active' : ''}`} key={item}>
                <CalendarDays size={22} color={index === 0 ? '#FF4D19' : '#8A8F99'} />
                <Text className={`provider-time-day ${index === 0 ? 'provider-time-day-active' : ''}`}>{item}</Text>
                <Text className="provider-time-value">{availableTimes[index] || '待同步'}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className="provider-location-card">
          <MapPin size={22} color="#FF4D19" />
          <Text className="provider-location-text">距离、服务半径、可服务区域需要用户授权定位并由后端返回，当前不展示固定距离。</Text>
        </View>

        <View className="provider-bottom-space" />
      </ScrollView>

      <View className="provider-footer">
        <View className="provider-footer-mini" onClick={toggleFollow}>
          <Star size={24} color="#FF4D19" filled={followed} />
          <Text className="provider-footer-mini-text">{followed ? '已收藏' : '收藏'}</Text>
        </View>
        <View className="provider-footer-btn provider-footer-btn-primary" onClick={() => goChat(provider)}>
          <MessageCircle size={26} color="#FFFFFF" />
          <Text className="provider-footer-btn-primary-text">立即沟通</Text>
        </View>
        <View className="provider-footer-btn provider-footer-btn-orange" onClick={goPublish}>
          <Clock size={26} color="#FFFFFF" />
          <Text className="provider-footer-btn-primary-text">邀请接单</Text>
        </View>
      </View>
    </View>
  );
}

function StatItem({ value, label, sub }: { value: string; label: string; sub: string }) {
  return (
    <View className="provider-stat">
      <Text className="provider-stat-value">{value}</Text>
      <Text className="provider-stat-label">{label}</Text>
      <Text className="provider-stat-sub">{sub}</Text>
    </View>
  );
}
