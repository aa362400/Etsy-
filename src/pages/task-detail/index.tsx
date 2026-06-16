import { Image, ScrollView, Text, View } from '@tarojs/components';
import Taro, { useShareAppMessage, useShareTimeline } from '@tarojs/taro';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  Camera,
  ChevronRight,
  Clock,
  Heart,
  LockKeyhole,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  Users,
  Wallet,
  Wrench,
} from 'lucide-react-taro';
import AiMascot from '@/components/AiMascot';
import AiChatWidget from '@/components/ai-chat-widget';
import { applyTask, extractImages } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { formatCentsAsYuan } from '@/lib/money';
import { Network } from '@/network';
import './index.css';

interface TaskDetail {
  id: string;
  title: string;
  description: string;
  budget_amount: number | string;
  budget_min?: number;
  budget_max?: number;
  deadline?: string;
  region?: string;
  status: string;
  created_at?: string;
  view_count?: number;
  application_count?: number;
  service_type?: string;
  task_categories?: { name: string };
  users?: { nickname: string; avatar?: string; kyc_status?: string; credit_score?: number };
  task_files?: Array<{ file_url: string }>;
  images?: string[];
  recommended_providers?: Array<Record<string, any>>;
}

const goBack = () => {
  const pages = Taro.getCurrentPages();
  if (pages.length > 1) {
    Taro.navigateBack();
    return;
  }
  Taro.switchTab({ url: '/pages/tasks/index' });
};

const formatDate = (value?: string) => {
  if (!value) return '刚刚发布';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export default function TaskDetailPage() {
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [liked, setLiked] = useState(false);
  const [providerOffset, setProviderOffset] = useState(0);
  const [aiChatVisible, setAiChatVisible] = useState(false);

  useEffect(() => {
    const params = Taro.getCurrentInstance().router?.params;
    const id = params?.id;
    if (!id) {
      setTask(null);
      setLoading(false);
      return;
    }
    loadTask(id);
  }, []);

  const loadTask = async (id: string) => {
    setLoading(true);
    try {
      const res = await Network.request({ url: `/api/tasks/${id}` });
      setTask(res.data?.data || null);
    } catch {
      setTask(null);
    } finally {
      setLoading(false);
    }
  };

  useShareAppMessage(() => ({
    title: task?.title?.slice(0, 24) || '需求详情',
    path: `/pages/task-detail/index?id=${task?.id || ''}`,
  }));

  useShareTimeline(() => ({ title: task?.title?.slice(0, 24) || '需求详情' }));

  const images = useMemo(() => {
    if (!task) return [];
    return extractImages(task);
  }, [task]);

  const category = task?.task_categories?.name || '任务服务';
  const budgetMin = task?.budget_min || task?.budget_amount;
  const budgetMax = task?.budget_max || task?.budget_amount;
  const budgetText = budgetMin || budgetMax
    ? `${formatCentsAsYuan(budgetMin || budgetMax)}${budgetMax && budgetMax !== budgetMin ? ` - ${formatCentsAsYuan(budgetMax)}` : ''}`
    : '面议';
  const publisherName = task?.users?.nickname || '匿名用户';
  const providers = useMemo(() => {
    const rawProviders = Array.isArray(task?.recommended_providers) ? task.recommended_providers : [];
    return rawProviders.map((item) => ({
      id: String(item.id || item.user_id || item.name || ''),
      name: item.nickname || item.name || '服务者',
      nickname: item.nickname || item.name || '',
      avatar: item.avatar || item.avatar_url || '',
      bio: item.bio || item.description || item.service_desc || '',
      city: item.city || item.region || '',
      score: item.rating || item.score || item.credit_score || '待评价',
      rating: item.rating || item.score || '',
      credit_score: item.credit_score || '',
      orders: item.order_count ? `${item.order_count}单` : '订单待积累',
      order_count: item.order_count || item.completed_order_count || '',
      praise: item.praise_rate || item.good_rate || '好评待积累',
      praise_rate: item.praise_rate || item.good_rate || '',
      distance: item.distance || item.region || '距离待确认',
      price: Number(item.price || item.quote_price || item.starting_price || 0),
      tags: Array.isArray(item.tags) ? item.tags : [category].filter(Boolean),
      raw: item,
    })).filter((item) => item.id || item.name);
  }, [category, task?.recommended_providers]);
  const visibleProviders = useMemo(() => {
    if (providers.length <= 1) return providers;
    return providers.map((_, index) => providers[(index + providerOffset) % providers.length]);
  }, [providerOffset, providers]);

  const openProvider = (provider: any) => {
    const profile = {
      ...provider.raw,
      id: provider.id,
      name: provider.name,
      nickname: provider.nickname,
      avatar: provider.avatar,
      bio: provider.bio,
      city: provider.city,
      rating: provider.rating,
      score: provider.score,
      credit_score: provider.credit_score,
      order_count: provider.order_count,
      praise_rate: provider.praise_rate,
      distance: provider.distance,
      price: provider.price,
      tags: provider.tags,
    };
    Taro.setStorageSync('selected_provider_profile', profile);
    Taro.navigateTo({
      url: `/pages/provider/index?id=${encodeURIComponent(provider.id || provider.name)}&name=${encodeURIComponent(provider.name)}`,
    });
  };

  const contactProvider = (provider: any) => {
    Taro.navigateTo({
      url: `/pages/chat/index?id=${encodeURIComponent(provider.id || provider.name)}&name=${encodeURIComponent(provider.name)}`,
    });
  };

  const refreshProviders = () => {
    if (providers.length <= 1) {
      Taro.showToast({ title: providers.length ? '暂无更多真实推荐' : '暂无真实服务者推荐', icon: 'none' });
      return;
    }
    setProviderOffset((offset) => (offset + 1) % providers.length);
  };

  const handleApply = async () => {
    if (!task || applying) return;
    const token = getToken();
    if (!token) {
      Taro.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    setApplying(true);
    try {
      const res = await applyTask(task.id);
      if (res.code === 200 || res.data) {
        Taro.showToast({ title: '报名成功', icon: 'success' });
        loadTask(task.id);
      } else {
        Taro.showToast({ title: res.msg || '报名失败', icon: 'none' });
      }
    } catch (error: any) {
      Taro.showToast({ title: error?.msg || error?.message || '报名失败', icon: 'none' });
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <View className="td-loading-page">
        <Text className="td-loading-text">正在加载需求...</Text>
      </View>
    );
  }

  if (!task) {
    return (
      <View className="td-page">
        <View className="td-nav">
          <View className="td-back" onClick={goBack}>
            <ArrowLeft size={30} color="#081A3A" />
          </View>
          <Text className="td-nav-title">需求详情</Text>
          <View className="td-menu-pill">
            <Text className="td-menu-dot">•••</Text>
            <Text className="td-menu-line">—</Text>
            <Text className="td-menu-circle">◎</Text>
          </View>
        </View>
        <View className="td-empty-wrap">
          <View className="td-empty-card">
            <View className="td-empty-top">
              <View className="td-empty-icon">
                <Package size={58} color="#B87920" />
              </View>
              <AiMascot size="lg" pose="point" />
            </View>
            <Text className="td-empty-title">需求暂时不可查看</Text>
            <Text className="td-empty-desc">该需求可能已下架、删除，或当前链接缺少任务 ID。你可以回到需求广场找真实订单，或重新发布一个需求。</Text>
            <View className="td-empty-actions">
              <View className="td-empty-primary" onClick={() => Taro.switchTab({ url: '/pages/tasks/index' })}>
                <SearchIcon />
                <Text className="td-empty-primary-text">去需求广场</Text>
              </View>
              <View className="td-empty-secondary" onClick={() => Taro.switchTab({ url: '/pages/publish/index' })}>
                <Package size={22} color="#FF4D19" />
                <Text className="td-empty-secondary-text">发布需求</Text>
              </View>
            </View>
            <View className="td-empty-flow">
              {['发布需求', '平台审核', '服务者响应', '托管下单'].map((item, index) => (
                <View className="td-empty-flow-item" key={item}>
                  <View className={`td-empty-flow-dot ${index === 0 ? 'td-empty-flow-dot-active' : ''}`}>
                    <Text className="td-empty-flow-num">{index + 1}</Text>
                  </View>
                  <Text className="td-empty-flow-text">{item}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="td-page">
      <View className="td-nav">
        <View className="td-back" onClick={goBack}>
          <ArrowLeft size={30} color="#081A3A" />
        </View>
        <Text className="td-nav-title">需求详情</Text>
        <View className="td-menu-pill">
          <Text className="td-menu-dot">•••</Text>
          <Text className="td-menu-line">—</Text>
          <Text className="td-menu-circle">◎</Text>
        </View>
      </View>

      <ScrollView scrollY className="td-scroll">
        <View className="td-main-card">
          <View className="td-main-left">
            <Text className="td-category">{category}</Text>
            <Text className="td-title">{task.title}</Text>
            <Text className="td-desc">{task.description}</Text>
            <View className="td-main-metrics">
              <View className="td-main-metric">
                <Text className="td-main-metric-value">{task.view_count || 0}</Text>
                <Text className="td-main-metric-label">浏览</Text>
              </View>
              <View className="td-main-metric">
                <Text className="td-main-metric-value">{task.application_count || 0}</Text>
                <Text className="td-main-metric-label">响应</Text>
              </View>
              <View className="td-main-metric">
                <Text className="td-main-metric-value">{task.status || 'open'}</Text>
                <Text className="td-main-metric-label">状态</Text>
              </View>
            </View>
            <View className="td-images">
              {images.length > 0 ? (
                images.slice(0, 3).map((image, index) => (
                  <Image
                    className="td-image"
                    src={image}
                    mode="aspectFill"
                    key={`${image}-${index}`}
                    onClick={() => Taro.previewImage({ urls: images, current: image })}
                  />
                ))
              ) : (
                <View className="td-image-visual">
                  <Camera size={28} color="#FF6A00" />
                  <Text className="td-image-visual-text">暂无图片</Text>
                </View>
              )}
              {images.length > 0 ? (
              <View className="td-image-more">
                <Camera size={30} color="#8A8F99" />
                <Text className="td-image-more-text">{images.length}</Text>
              </View>
              ) : null}
            </View>
          </View>

          <View className="td-main-right">
            <View className="td-user">
              <View className="td-user-avatar">
                {task.users?.avatar ? (
                  <Image className="td-user-avatar-img" src={task.users.avatar} mode="aspectFill" />
                ) : (
                  <Text className="td-user-avatar-text">{publisherName.slice(0, 1)}</Text>
                )}
              </View>
              <View>
                <View className="td-user-name-row">
                  <Text className="td-user-name">{publisherName}</Text>
                  <View className="td-user-badge">
                    <BadgeCheck size={14} color="#FF6A00" />
                    <Text className="td-user-badge-text">已实名</Text>
                  </View>
                </View>
                <Text className="td-user-time">发布于 {formatDate(task.created_at)}</Text>
              </View>
            </View>
            <View className="td-protect-card">
              <ShieldCheck size={36} color="#FF6A00" />
              <View>
                <Text className="td-protect-title">有应帮保障中</Text>
                <Text className="td-protect-desc">平台托管 · 安心交易</Text>
              </View>
            </View>
          </View>
        </View>

        <View className="td-info-card">
          <InfoRow icon={MapPin} title="服务地址" value={task.region || '请与需求方确认'} />
          <InfoRow icon={Package} title="服务类型" value={category} />
          <InfoRow icon={Clock} title="期望时间" value={task.deadline || '请与需求方确认'} />
          <InfoRow icon={BellIcon} title="紧急程度" value="按沟通确认" hot />
          <InfoRow icon={Wallet} title="预算范围" value={budgetText} price />
          <InfoRow icon={Wrench} title="服务内容" value={task.description || '请查看需求描述'} />
          <InfoRow icon={MessageCircle} title="服务方式" value={task.service_type === 'online' ? '远程协助' : '上门服务'} />
          <InfoRow icon={Camera} title="附件信息" value={images.length ? `共 ${images.length} 张图片` : '暂无图片'} arrow />
          <View className="td-guarantees">
            {['实名认证', '信用良好', '资金托管', '平台保障', '售后无忧'].map((item) => (
              <View className="td-guarantee" key={item}>
                <ShieldCheck size={18} color="#34C759" />
                <Text className="td-guarantee-text">{item}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className="td-ai-card" onClick={() => setAiChatVisible(true)}>
          <AiMascot size="xl" pose="point" />
          <View className="td-ai-main">
            <View className="td-ai-title-row">
              <Text className="td-ai-title">AI建议</Text>
              <Text className="td-ai-chip">基于相似需求智能估价</Text>
            </View>
            <Text className="td-ai-desc">根据当前需求内容和预算信息，建议先邀请多位服务者报价；最终价格以平台托管订单为准。</Text>
            <Text className="td-ai-price">{budgetText}</Text>
            <View className="td-ai-stat">
              <Users size={22} color="#FF4D19" />
              <Text className="td-ai-stat-text">{task.application_count ? `${task.application_count} 人已响应` : '暂无真实响应数据，建议补充图片和时间提高匹配率'}</Text>
            </View>
          </View>
          <View className="td-ai-score">
            <Text className="td-ai-score-label">匹配置信度</Text>
            <Text className="td-ai-score-value">AI</Text>
            <Text className="td-ai-score-desc">待模型返回</Text>
          </View>
        </View>

        <View className="td-provider-section">
          <View className="td-section-head">
            <View className="td-section-title-row">
              <Text className="td-section-title">附近推荐服务者</Text>
              <Text className="td-section-sub">{providers.length ? '真实服务者可对比报价' : '接入服务者接口后展示'}</Text>
            </View>
            <View className="td-refresh" onClick={refreshProviders}>
              <Text className="td-refresh-text">换一换</Text>
              <RefreshCw size={18} color="#6B7280" />
            </View>
          </View>

          <ScrollView scrollX showScrollbar={false} className="td-provider-scroll">
            <View className="td-provider-row">
              {visibleProviders.length > 0 ? visibleProviders.map((provider) => (
                <View className="td-provider-card" key={provider.id || provider.name} onClick={() => openProvider(provider)}>
                  <View className="td-provider-avatar">
                    {provider.avatar ? (
                      <Image className="td-provider-avatar-img" src={provider.avatar} mode="aspectFill" />
                    ) : (
                      <Text className="td-provider-avatar-text">{provider.name.slice(0, 1)}</Text>
                    )}
                  </View>
                  <View className="td-provider-name-row">
                    <Text className="td-provider-name">{provider.name}</Text>
                    <Text className="td-provider-hot">优选</Text>
                  </View>
                  <View className="td-provider-score">
                    <Star size={16} color="#FF9F0A" filled />
                    <Text className="td-provider-score-text">{provider.score} ★★★★★</Text>
                  </View>
                  <Text className="td-provider-meta">{provider.orders} · {provider.praise}</Text>
                  <Text className="td-provider-distance">{provider.distance}</Text>
                  <View className="td-provider-tags">
                    {provider.tags.map((tag) => (
                      <Text className="td-provider-tag" key={tag}>{tag}</Text>
                    ))}
                  </View>
                  <Text className="td-provider-price">{provider.price > 0 ? `报价 ${formatCentsAsYuan(provider.price)} 起` : '报价待沟通'}</Text>
                  <View className="td-provider-actions">
                    <View
                      className="td-provider-phone"
                      onClick={(event: any) => {
                        event.stopPropagation();
                        contactProvider(provider);
                      }}
                    >
                      <Phone size={15} color="#FF4D19" />
                      <Text className="td-provider-phone-text">联系TA</Text>
                    </View>
                    <View
                      className="td-provider-quote"
                      onClick={(event: any) => {
                        event.stopPropagation();
                        handleApply();
                      }}
                    >
                      <Text className="td-provider-quote-text">邀请报价</Text>
                    </View>
                  </View>
                </View>
              )) : (
                <View className="td-provider-empty">
                  <Sparkles size={38} color="#FF6A00" />
                  <Text className="td-provider-empty-title">暂无真实服务者推荐</Text>
                  <Text className="td-provider-empty-desc">暂时没有匹配到可推荐的服务者，可以补充时间、地址或图片后再试。</Text>
                </View>
              )}
            </View>
          </ScrollView>
          <View className="td-more-provider" onClick={() => Taro.navigateTo({ url: '/pages/nearby-map/index' })}>
            <Text className="td-more-provider-text">查看更多服务者</Text>
            <ChevronRight size={18} color="#6B7280" />
          </View>
        </View>

        <View className="td-content-bottom" />
      </ScrollView>

      <View className="td-bottom-bar">
        <View className="td-fav" onClick={() => setLiked(!liked)}>
          <Heart size={28} color={liked ? '#FF4D19' : '#111827'} filled={liked} />
          <Text className={`td-fav-text ${liked ? 'td-fav-text-active' : ''}`}>收藏</Text>
        </View>
        <View
          className="td-bottom-btn td-bottom-btn-outline"
          onClick={() => Taro.navigateTo({ url: `/pages/chat/index?id=${task.id}&name=${encodeURIComponent(task.title)}` })}
        >
          <Phone size={24} color="#FF4D19" />
          <View>
            <Text className="td-bottom-btn-title td-bottom-btn-title-outline">联系对方</Text>
            <Text className="td-bottom-btn-sub">推荐</Text>
          </View>
        </View>
        <View className="td-bottom-btn td-bottom-btn-quote" onClick={handleApply}>
          <Wallet size={24} color="#FFFFFF" />
          <View>
            <Text className="td-bottom-btn-title">{applying ? '提交中' : '邀请报价'}</Text>
            <Text className="td-bottom-btn-sub td-bottom-btn-sub-light">多位师傅报价对比</Text>
          </View>
        </View>
        <View
          className="td-bottom-btn td-bottom-btn-pay"
          onClick={() => Taro.navigateTo({ url: `/pages/payment/index?taskId=${task.id}` })}
        >
          <ShoppingCart size={25} color="#FFFFFF" />
          <View>
            <Text className="td-bottom-btn-title">立即下单</Text>
            <Text className="td-bottom-btn-sub td-bottom-btn-sub-light">平台托管更安心</Text>
          </View>
        </View>
      </View>
      <AiChatWidget
        visible={aiChatVisible}
        onClose={() => setAiChatVisible(false)}
        context={{
          scene: 'task_detail',
          title: task.title,
          description: task.description,
          category,
          budget: budgetText,
          status: task.status,
          taskId: task.id,
          imageCount: images.length,
        }}
        initialIntent="estimate"
      />
    </View>
  );
}

function BellIcon(props: any) {
  return <LockKeyhole {...props} />;
}

function SearchIcon() {
  return <MessageCircle size={22} color="#FFFFFF" />;
}

function InfoRow({ icon: Icon, title, value, hot, price, arrow }: {
  icon: any;
  title: string;
  value: string;
  hot?: boolean;
  price?: boolean;
  arrow?: boolean;
}) {
  return (
    <View className="td-info-row">
      <View className={`td-info-icon ${hot ? 'td-info-icon-hot' : ''}`}>
        <Icon size={22} color="#FFFFFF" />
      </View>
      <View className="td-info-main">
        <Text className="td-info-title">{title}</Text>
        <Text className={`td-info-value ${price ? 'td-info-value-price' : ''}`}>{value}</Text>
      </View>
      {arrow ? <ChevronRight size={22} color="#6B7280" /> : null}
    </View>
  );
}
