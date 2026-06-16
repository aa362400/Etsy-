/**
 * 报名详情页 / 接单者详情页
 */
import { View, Text, Image } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  Briefcase,
  CalendarClock,
  CircleCheck,
  Headphones,
  ShieldCheck,
  Star,
  Timer,
  X,
} from 'lucide-react-taro';
import EmptyState from '@/components/EmptyState';
import ImagePreviewList from '@/components/ImagePreviewList';
import PriceTag from '@/components/PriceTag';
import UserBadge from '@/components/UserBadge';
import { getApplicationDetail, acceptApplication, rejectApplication } from '@/lib/api';
import './index.css';

interface ApplicationDetail {
  id: string;
  worker_name?: string;
  worker_avatar?: string;
  is_verified?: boolean;
  is_enterprise?: boolean;
  credit_score?: number;
  rating?: number;
  applied_at?: string;
  bio?: string;
  case_images?: string[];
  quote_price?: number;
  estimated_days?: number;
  delivery_content?: string;
  status?: string;
}

const goBack = () => {
  const pages = Taro.getCurrentPages();
  if (pages.length > 1) {
    Taro.navigateBack();
    return;
  }
  Taro.switchTab({ url: '/pages/tasks/index' });
};

const ApplyDetailPage = () => {
  const router = useRouter();
  const taskId = (router.params?.taskId as string) || '';
  const applicationId = (router.params?.applicationId as string) || '';

  const [detail, setDetail] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (taskId && applicationId) {
      loadDetail();
    } else {
      setLoading(false);
    }
  }, [taskId, applicationId]);

  const loadDetail = async () => {
    setLoading(true);
    try {
      const res = await getApplicationDetail(taskId, applicationId);
      setDetail(res?.data || null);
    } catch {
      setDetail(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (processing) return;
    setProcessing(true);
    try {
      await acceptApplication(taskId, applicationId);
      Taro.showToast({ title: '已接受报名', icon: 'success' });
      setTimeout(() => Taro.navigateBack(), 800);
    } catch (err: any) {
      Taro.showToast({ title: err?.message || '操作失败', icon: 'none' });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (processing) return;
    Taro.showModal({
      title: '确认拒绝',
      content: '确定要拒绝这个报名吗？',
      success: async (res) => {
        if (!res.confirm) return;
        setProcessing(true);
        try {
          await rejectApplication(taskId, applicationId);
          Taro.showToast({ title: '已拒绝', icon: 'success' });
          setTimeout(() => Taro.navigateBack(), 800);
        } catch (err: any) {
          Taro.showToast({ title: err?.message || '操作失败', icon: 'none' });
        } finally {
          setProcessing(false);
        }
      },
    });
  };

  const formatDate = (v?: string) => {
    if (!v) return '刚刚报名';
    try {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) return '刚刚报名';
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch {
      return '刚刚报名';
    }
  };

  if (loading) {
    return (
      <View className="apply-page apply-center-page">
        <Text className="apply-loading-text">正在加载报名详情...</Text>
      </View>
    );
  }

  if (!detail) {
    return (
      <View className="apply-page apply-center-page">
        <EmptyState
          title="报名信息不存在"
          description="该报名可能已撤回、删除，或当前账号没有查看权限。"
          actionText="返回"
          onAction={goBack}
        />
      </View>
    );
  }

  const workerName = detail.worker_name || '服务者';
  const pending = detail.status === 'pending';

  return (
    <View className="apply-page">
      <View className="apply-nav">
        <View className="apply-back" onClick={goBack}>
          <ArrowLeft size={30} color="#081A3A" />
        </View>
        <Text className="apply-nav-title">报名详情</Text>
        <View className="apply-menu-pill">
          <Text className="apply-menu-dot">•••</Text>
          <Text className="apply-menu-line">—</Text>
          <Text className="apply-menu-circle">◎</Text>
        </View>
      </View>

      <View className="apply-hero">
        <View className="apply-avatar">
          {detail.worker_avatar ? (
            <Image className="apply-avatar-img" src={detail.worker_avatar} mode="aspectFill" />
          ) : (
            <Text className="apply-avatar-text">{workerName.slice(0, 1)}</Text>
          )}
        </View>
        <View className="apply-hero-main">
          <View className="apply-name-row">
            <Text className="apply-name">{workerName}</Text>
            <View className="apply-status-pill">
              <Text className="apply-status-text">{pending ? '待选择' : detail.status || '已更新'}</Text>
            </View>
          </View>
          <View className="apply-badge-row">
            <UserBadge
              type={detail.is_enterprise ? 'enterprise' : 'personal'}
              verified={detail.is_verified}
              creditScore={detail.credit_score}
              showLabel
            />
          </View>
          <View className="apply-score-row">
            <Star size={18} color="#FF9F0A" filled />
            <Text className="apply-score-text">{detail.rating !== undefined ? detail.rating.toFixed(1) : '暂无评分'}</Text>
            <Text className="apply-score-sub">平台留痕 · 实名优先</Text>
          </View>
        </View>
        <View className="apply-hero-icon">
          <Briefcase size={34} color="#FFFFFF" />
        </View>
      </View>

      <View className="apply-stats">
        <Stat icon={CalendarClock} label="报名时间" value={formatDate(detail.applied_at)} color="#FF8A00" />
        <Stat icon={Timer} label="预计完成" value={detail.estimated_days !== undefined ? `${detail.estimated_days}天` : '待沟通'} color="#FF8A00" />
        <Stat icon={ShieldCheck} label="平台保障" value="托管交易" color="#17B978" />
      </View>

      <View className="apply-card">
        <View className="apply-card-head">
          <Text className="apply-card-title">报名信息</Text>
          <View className="apply-safe-tag">
            <BadgeCheck size={18} color="#17B978" />
            <Text className="apply-safe-tag-text">服务者报价</Text>
          </View>
        </View>
        {detail.bio ? (
          <View className="apply-info-block">
            <Text className="apply-info-label">个人简介</Text>
            <Text className="apply-info-text">{detail.bio}</Text>
          </View>
        ) : null}
        <View className="apply-fee-row">
          <Text className="apply-fee-label">报价</Text>
          {detail.quote_price !== undefined ? <PriceTag amount={detail.quote_price} size="large" /> : <Text className="apply-fee-empty">待沟通</Text>}
        </View>
        {detail.delivery_content ? (
          <View className="apply-info-block">
            <Text className="apply-info-label">交付说明</Text>
            <Text className="apply-info-text">{detail.delivery_content}</Text>
          </View>
        ) : null}
      </View>

      {detail.case_images && detail.case_images.length > 0 ? (
        <View className="apply-card">
          <ImagePreviewList images={detail.case_images} title="相关案例" size={160} maxShow={5} />
        </View>
      ) : null}

      <View className="apply-ai-card" onClick={() => Taro.navigateTo({ url: '/pages/ai-assistant/index?scene=apply' })}>
        <View className="apply-ai-copy">
          <Text className="apply-ai-title">AI 帮你判断是否合适</Text>
          <Text className="apply-ai-desc">从报价、信用、交付说明和历史评价角度，帮你降低选人风险。</Text>
        </View>
        <Headphones size={28} color="#FF4D19" />
      </View>

      <View className="apply-bottom-space" />

      {pending ? (
        <View className="apply-bottom-bar">
          <View className="apply-bottom-outline" onClick={handleReject}>
            <X size={26} color="#FF4D19" />
            <Text className="apply-bottom-outline-text">拒绝</Text>
          </View>
          <View className="apply-bottom-fill" onClick={handleAccept}>
            <CircleCheck size={26} color="#FFFFFF" />
            <Text className="apply-bottom-fill-text">{processing ? '处理中' : '接受报名'}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
};

function Stat({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <View className="apply-stat">
      <Icon size={24} color={color} />
      <Text className="apply-stat-value">{value}</Text>
      <Text className="apply-stat-label">{label}</Text>
    </View>
  );
}

export default ApplyDetailPage;
