/**
 * 我的页面 - 有应帮个人中心
 */
import { View, Text, Image } from '@tarojs/components';
import Taro, { useShareAppMessage, useShareTimeline } from '@tarojs/taro';
import { useEffect, useState } from 'react';
import { login, logout, isLoggedIn, getCachedUserInfo, updateProfile } from '@/lib/auth';
import { getUserProfile } from '@/lib/api';
import { Input } from '@/components/ui/input';
import UserBadge from '@/components/UserBadge';
import AiMascot from '@/components/AiMascot';
import {
  User, Wallet, Settings, Receipt,
  ClipboardList, Briefcase, ChevronRight,
  Bot, Headphones, ShieldCheck, Bell, Gift, Clock, Star, BadgeCheck, MessageCircle, Users,
} from 'lucide-react-taro';
import './index.css';

const TAB_PATHS = new Set([
  'pages/home/index',
  'pages/tasks/index',
  'pages/publish/index',
  'pages/orders/index',
  'pages/profile/index',
]);

const openProfilePage = (url: string) => {
  const path = url.split('?')[0].replace(/^\/+/, '');
  if (TAB_PATHS.has(path)) {
    Taro.switchTab({ url: `/${path}` });
    return;
  }
  Taro.navigateTo({ url });
};

interface UserInfo {
  nickname?: string;
  avatar?: string;
  avatarUrl?: string;
  phone?: string;
  kyc_status?: string;
  role?: string;
  company_name?: string;
  balance?: number | string;
  frozen_amount?: number | string;
  [key: string]: any;
}

const ProfilePage = () => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editNickname, setEditNickname] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const loggedIn = isLoggedIn();
  const cachedUserInfo = getCachedUserInfo() as UserInfo | null;

  useShareAppMessage(() => ({ title: '我在用有应帮——发需求，有人应', path: '/pages/home/index' }));
  useShareTimeline(() => ({ title: '有应帮 - 让需求被看见，让技能被回应' }));

  useEffect(() => {
    if (loggedIn) loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    try {
      const res = await getUserProfile();
      if (res?.data) setUserInfo(res.data);
    } catch {
      const cached = getCachedUserInfo();
      if (cached) setUserInfo(cached as UserInfo);
    }
  };

  const handleLogin = async () => {
    if (loginLoading) return;
    setLoginLoading(true);
    try {
      await login();
      Taro.showToast({ title: '登录成功', icon: 'success' });
      setTimeout(() => loadUserInfo(), 300);
    } catch (err: any) {
      Taro.showToast({ title: err.message || '登录失败', icon: 'none' });
    } finally { setLoginLoading(false); }
  };

  const handleLogout = () => {
    Taro.showModal({
      title: '退出登录',
      content: '确定退出当前账号吗？',
      success: (res) => { if (res.confirm) { logout(); setUserInfo(null); Taro.showToast({ title: '已退出', icon: 'success' }); } },
    });
  };

  const handleOpenEdit = () => {
    const cached = getCachedUserInfo();
    setEditNickname(cached?.nickname || '');
    setEditAvatarUrl(cached?.avatarUrl || '');
    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    if (!editNickname.trim()) { Taro.showToast({ title: '请输入昵称', icon: 'none' }); return; }
    setSaving(true);
    try {
      await updateProfile(editNickname.trim(), editAvatarUrl.trim());
      Taro.showToast({ title: '已保存', icon: 'success' });
      setShowEditModal(false);
      loadUserInfo();
    } catch (err: any) { Taro.showToast({ title: err.message || '保存失败', icon: 'none' }); }
    finally { setSaving(false); }
  };

  const displayName = loggedIn ? (userInfo?.nickname || cachedUserInfo?.nickname || '微信用户') : '点击登录';
  const avatarUrl = userInfo?.avatar || userInfo?.avatarUrl || cachedUserInfo?.avatar || cachedUserInfo?.avatarUrl || '';
  const isVerified = userInfo?.kyc_status === 'verified';
  const isEnterprise = userInfo?.role === 'enterprise';
  const getRawMetric = (keys: string[]) => {
    if (!loggedIn) return undefined;
    const source = { ...(cachedUserInfo || {}), ...(userInfo || {}) };
    return keys.map((key) => source[key]).find((item) => item !== undefined && item !== null && item !== '');
  };
  const formatMoney = (value?: number | string) => {
    if (!loggedIn || value === undefined || value === null || value === '') return '--';
    const amount = Number(value);
    if (!Number.isFinite(amount)) return '--';
    return `¥${(amount / 100).toFixed(2)}`;
  };
  const getMetric = (keys: string[], suffix = '') => {
    if (!loggedIn) return '--';
    const value = getRawMetric(keys);
    if (value === undefined || value === null || value === '') return '--';
    return `${value}${suffix}`;
  };
  const rawLevel = getRawMetric(['level', 'member_level', 'user_level', 'service_level', 'growth_level']);
  const profileLevel = rawLevel ? `Lv.${rawLevel}` : '';
  const creditScore = getRawMetric(['credit_score', 'creditScore']);
  const creditStatus = (() => {
    if (!loggedIn) return '登录查看';
    const score = Number(creditScore);
    if (!Number.isFinite(score)) return '待评估';
    if (score >= 90) return '优秀';
    if (score >= 70) return '良好';
    return '需提升';
  })();
  const providerId = getRawMetric(['provider_id', 'providerId', 'service_provider_id', 'serviceProviderId', 'worker_id', 'workerId']);
  const handleOpenHomepage = (event?: any) => {
    event?.stopPropagation?.();
    if (!loggedIn) {
      handleLogin();
      return;
    }
    if (!providerId) {
      Taro.showToast({ title: '先完善服务者档案', icon: 'none' });
      Taro.navigateTo({ url: '/pages/worker-center/index' });
      return;
    }
    Taro.navigateTo({ url: `/pages/provider/index?id=${encodeURIComponent(String(providerId))}` });
  };

  const handleInviteFriends = () => {
    if (Taro.getEnv() === Taro.ENV_TYPE.WEAPP) {
      Taro.showShareMenu({ withShareTicket: true }).catch(() => {});
      Taro.showToast({ title: '请点右上角分享给朋友', icon: 'none' });
      return;
    }
    Taro.setClipboardData({ data: '有应帮 - 发需求，有人应' });
  };

  const walletItems = [
    {
      icon: <Wallet size={26} color="#FF5A1F" />,
      label: '钱包余额',
      value: loggedIn ? formatMoney(userInfo?.balance) : '--',
      action: '去提现',
      url: '/pages/wallet/index',
    },
    {
      icon: <Gift size={26} color="#FF9F1C" />,
      label: '优惠券',
      value: getMetric(['coupon_count', 'coupons_count', 'couponCount'], '张'),
      action: '问客服',
      url: `/pages/ai-assistant/index?scene=coupons&q=${encodeURIComponent('帮我说明有应帮优惠券和下单省钱规则')}`,
    },
    {
      icon: <Star size={26} color="#FFB020" />,
      label: '我的收藏',
      value: getMetric(['favorite_count', 'favorites_count', 'favoriteCount'], '个'),
      action: '找需求',
      url: '/pages/tasks/index',
    },
    {
      icon: <Clock size={26} color="#20C997" />,
      label: '浏览足迹',
      value: getMetric(['history_count', 'browse_count', 'view_count'], '条'),
      action: '去广场',
      url: '/pages/tasks/index',
    },
  ];

  const orderItems = [
    {
      icon: <ClipboardList size={34} color="#3B82F6" />,
      label: '我发布的需求',
      desc: getMetric(['published_count', 'my_task_count', 'task_count'], '个进行中'),
      url: '/pages/my-tasks/index',
    },
    {
      icon: <Briefcase size={34} color="#FF9F1C" />,
      label: '我收到的订单',
      desc: getMetric(['received_order_count', 'order_count'], '个进行中'),
      url: '/pages/orders/index',
    },
    {
      icon: <MessageCircle size={34} color="#22C55E" />,
      label: '评价与口碑',
      desc: getMetric(['review_count', 'rating_count'], '条评价'),
      url: `/pages/ai-assistant/index?scene=reviews&q=${encodeURIComponent('帮我整理服务评价和口碑提升建议')}`,
    },
    {
      icon: <Receipt size={34} color="#8B5CF6" />,
      label: '退款/售后',
      desc: getMetric(['refund_count', 'after_sale_count'], '个处理中'),
      url: '/pages/refund/index',
    },
  ];

  const toolItems = [
    { icon: <Users size={32} color="#081A3A" />, label: '邀请好友', badge: '得优惠券', url: '' },
    { icon: <Headphones size={32} color="#081A3A" />, label: '帮助中心', badge: '', url: '/pages/ai-assistant/index?scene=help' },
    { icon: <Bot size={32} color="#081A3A" />, label: '客服与反馈', badge: '', url: '/pages/ai-assistant/index?scene=profile' },
    { icon: <ShieldCheck size={32} color="#081A3A" />, label: '安全中心', badge: '', url: '/pages/kyc/index' },
  ];

  return (
    <View className="profile-page">
      <View className="profile-top">
        <View className="profile-brand-wrap">
          <View className="profile-brand">
            <Text className="profile-brand-main">有应</Text>
            <Text className="profile-brand-accent">帮</Text>
          </View>
          <Text className="profile-top-slogan">让需求被看见，让技能被回应</Text>
        </View>
        <View className="profile-menu-pill">
          <Text className="profile-menu-dot">•••</Text>
          <Text className="profile-menu-line">—</Text>
          <Text className="profile-menu-circle">◎</Text>
        </View>
      </View>
      <View className="profile-top-actions">
        <View className="profile-action-icon" onClick={() => Taro.navigateTo({ url: '/pages/messages/index' })}>
          <Bell size={30} color="#081A3A" />
        </View>
        <View className="profile-action-icon" onClick={() => { if (loggedIn) handleOpenEdit(); else handleLogin(); }}>
          <Settings size={30} color="#081A3A" />
        </View>
      </View>

      <View className="profile-hero">
        <View className="profile-user-row" onClick={() => { if (loggedIn) handleOpenEdit(); else handleLogin(); }}>
          <View className="profile-avatar-wrap">
            <View className="profile-avatar">
              {loggedIn && avatarUrl ? (
                <Image src={avatarUrl} mode="aspectFill" className="profile-avatar-img" />
              ) : (
                <User size={48} color="#FFFFFF" />
              )}
            </View>
            <View className={`profile-verified-badge ${isVerified ? 'is-verified' : ''}`}>
              <BadgeCheck size={20} color="#FFFFFF" />
              <Text className="profile-verified-text">{isVerified ? '已认证' : '去认证'}</Text>
            </View>
          </View>

          <View className="profile-user-main">
            <View className="profile-name-line">
              <Text className="profile-nickname">{loginLoading ? '登录中...' : displayName}</Text>
              {profileLevel ? <Text className="profile-level-pill">{profileLevel}</Text> : null}
            </View>
            <Text className="profile-user-desc">
              {loggedIn ? (isVerified ? '乐于助人 · 认真靠谱 · 快速响应' : '完成实名后，可获得更多信任') : '登录后管理需求、订单、钱包和接单服务'}
            </Text>
            <View className="profile-badge-row">
              {loggedIn ? (
                <UserBadge type={isEnterprise ? 'enterprise' : 'personal'} verified={isVerified} showLabel />
              ) : (
                <View className="profile-login-pill">
                  <Text className="profile-login-pill-text">微信授权登录</Text>
                </View>
              )}
              <View className="profile-credit-pill">
                <Text className="profile-credit-label">信用分</Text>
                <Text className="profile-credit-score">{getMetric(['credit_score', 'creditScore'])}</Text>
                <Text className="profile-credit-status">{creditStatus}</Text>
                <ChevronRight size={18} color="#17B978" />
              </View>
            </View>
            {userInfo?.company_name ? <Text className="profile-company">{userInfo.company_name}</Text> : null}
          </View>

          <View className="profile-home-btn" onClick={handleOpenHomepage}>
            <Text className="profile-home-btn-text">{loggedIn ? '个人主页' : '去登录'}</Text>
            <ChevronRight size={22} color="#FFFFFF" />
          </View>
        </View>

        <View className="profile-wallet-grid">
          {walletItems.map((item) => (
            <View
              className="profile-wallet-item"
              key={item.label}
              onClick={() => {
                openProfilePage(item.url);
              }}
            >
              <View className="profile-wallet-icon">{item.icon}</View>
              <Text className="profile-wallet-label">{item.label}</Text>
              <Text className="profile-wallet-amount">{item.value}</Text>
              <Text className="profile-wallet-action">{item.action} 〉</Text>
            </View>
          ))}
        </View>
      </View>

      <View className="profile-ai-card" onClick={() => Taro.navigateTo({ url: '/pages/ai-assistant/index?scene=profile' })}>
        <AiMascot size="lg" pose="point" className="profile-ai-mascot" />
        <View className="profile-ai-copy">
          <Text className="profile-ai-title">AI小帮手 · 你的贴心服务搭子</Text>
          <Text className="profile-ai-desc">需要我帮你找人、写需求或优化发布吗？</Text>
        </View>
        <View className="profile-ai-btn">
          <Text className="profile-ai-btn-text">去聊聊</Text>
          <ChevronRight size={22} color="#FFFFFF" />
        </View>
      </View>

      <View className="profile-card">
        <View className="profile-section-head">
          <Text className="profile-section-title">我的服务与订单</Text>
          <View className="profile-section-link" onClick={() => Taro.switchTab({ url: '/pages/orders/index' })}>
            <Text className="profile-section-link-text">全部订单</Text>
            <ChevronRight size={22} color="#8A8F99" />
          </View>
        </View>
        <View className="profile-order-grid">
          {orderItems.map((item) => (
            <View
              key={item.label}
              className="profile-order-item"
              onClick={() => {
                openProfilePage(item.url);
              }}
            >
              <View className="profile-order-icon">{item.icon}</View>
              <Text className="profile-order-label">{item.label}</Text>
              <Text className="profile-order-desc">{item.desc}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className="profile-provider-card" onClick={() => Taro.navigateTo({ url: '/pages/worker-center/index' })}>
        <View className="profile-provider-copy">
          <Text className="profile-provider-title">成为服务者</Text>
          <Text className="profile-provider-highlight">认证技能，接单赚钱</Text>
          <Text className="profile-provider-desc">展示你的专业，获得更多信任</Text>
        </View>
        <View className="profile-provider-figure">
          <Briefcase size={50} color="#FF9F1C" />
        </View>
        <View className="profile-provider-btn">
          <Text className="profile-provider-btn-text">去认证/入驻</Text>
          <ChevronRight size={22} color="#FFFFFF" />
        </View>
      </View>

      <View className="profile-card">
        <Text className="profile-section-title">平台工具</Text>
        <View className="profile-tool-grid">
          {toolItems.map((item) => (
            <View
              className="profile-tool-item"
              key={item.label}
              onClick={() => {
                if (item.url) Taro.navigateTo({ url: item.url });
                else if (item.label === '邀请好友') handleInviteFriends();
                else Taro.navigateTo({ url: '/pages/ai-assistant/index?scene=profile-tool' });
              }}
            >
              <View className="profile-tool-icon-wrap">
                {item.icon}
                {item.badge ? <Text className="profile-tool-badge">{item.badge}</Text> : null}
              </View>
              <Text className="profile-tool-label">{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className="profile-safe-card" onClick={() => Taro.navigateTo({ url: '/pages/kyc/index' })}>
        <View className="profile-safe-left">
          <ShieldCheck size={32} color="#FF9F1C" />
          <Text className="profile-safe-title">交易安全保障中</Text>
          <Text className="profile-safe-desc">身份认证 · 资金托管 · 双向评价</Text>
        </View>
        <View className="profile-safe-right">
          <Text className="profile-safe-link">了解保障</Text>
          <ChevronRight size={22} color="#9A6A2D" />
        </View>
      </View>

      {loggedIn ? (
        <View className="profile-logout-wrap">
          <View className="profile-logout-btn" onClick={handleLogout}>
            <Text className="profile-logout-text">退出登录</Text>
          </View>
        </View>
      ) : null}

      {/* 资料编辑弹窗 */}
      {showEditModal && (
        <View className="profile-modal-mask" onClick={() => setShowEditModal(false)}>
          <View className="profile-modal" onClick={(e) => e.stopPropagation()}>
            <Text className="profile-modal-title">编辑资料</Text>
            <View className="profile-modal-inputs">
              <View className="profile-modal-input-wrap">
                <Input
                  style={{ width: '100%', fontSize: '28rpx', color: '#111827', background: '#F9FAFB', borderRadius: '12rpx', padding: '16rpx 20rpx' }}
                  value={editNickname}
                  placeholder="请输入昵称"
                  onInput={(e) => setEditNickname(e.detail.value)}
                />
              </View>
            </View>
            <View className="profile-modal-actions">
              <View className="profile-modal-cancel" onClick={() => setShowEditModal(false)}>
                <Text className="profile-modal-cancel-text">取消</Text>
              </View>
              <View className="profile-modal-confirm" onClick={handleSaveProfile}>
                <Text className="profile-modal-confirm-text">{saving ? '保存中' : '保存'}</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default ProfilePage;
