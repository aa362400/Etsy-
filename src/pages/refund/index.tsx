import { Image, Text, View } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CircleCheck,
  ChevronRight,
  CircleDollarSign,
  Clock,
  Copy,
  Headphones,
  Image as ImageIcon,
  MessageCircle,
  Phone,
  ShieldCheck,
  Upload,
} from 'lucide-react-taro';
import AiMascot from '@/components/AiMascot';
import { getToken } from '@/lib/auth';
import { Network } from '@/network';
import './index.css';

const goBack = () => {
  const pages = Taro.getCurrentPages();
  if (pages.length > 1) {
    Taro.navigateBack();
    return;
  }
  Taro.switchTab({ url: '/pages/orders/index' });
};

const TONE_COLOR = {
  green: '#12A05C',
  blue: '#FF8A00',
  purple: '#FF6A00',
  orange: '#FF6A00',
};

const formatRefundTime = (value?: string) => {
  if (!value) return '待同步';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const parseEvidenceUrls = (order: any): string[] => {
  const raw =
    order?.refund_evidence_urls ||
    order?.evidence_urls ||
    order?.dispute?.evidence_urls ||
    order?.refund?.evidence_urls ||
    [];
  if (Array.isArray(raw)) return raw.filter(Boolean).map(String);
  if (typeof raw !== 'string' || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
  } catch {
    // 后端历史字段可能是逗号分隔字符串。
  }
  return raw.split(',').map((item) => item.trim()).filter(Boolean);
};

const getNegotiationRecords = (order: any) => {
  const raw =
    order?.refund_logs ||
    order?.negotiation_records ||
    order?.dispute?.logs ||
    order?.refund?.logs ||
    [];
  return Array.isArray(raw) ? raw.filter(Boolean) : [];
};

const firstText = (...values: any[]) => {
  const found = values.find((value) => typeof value === 'string' && value.trim());
  return found ? String(found).trim() : '';
};

const formatAmountYuan = (value: any) => {
  const cents = Number(value || 0);
  return Number.isFinite(cents) && cents > 0 ? `¥${(cents / 100).toFixed(2)}` : '金额待同步';
};

export default function RefundPage() {
  const router = useRouter();
  const orderId = router.params?.orderId || router.params?.id || '';
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await Network.request({
        url: `/api/orders/${orderId}`,
        header: { authorization: `Bearer ${getToken()}` },
      });
      setOrder(res.data?.data || null);
    } catch {
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const copyOrderNo = (value?: string) => {
    if (!value) return;
    Taro.setClipboardData({ data: value });
    Taro.showToast({ title: '订单号已复制', icon: 'success' });
  };

  const previewEvidence = (current: string, urls: string[]) => {
    if (!current || !urls.length) return;
    Taro.previewImage({ current, urls });
  };

  const openEvidenceGuide = () => {
    const q = encodeURIComponent(`我要为订单 ${orderId || '当前订单'} 补充退款凭证，请告诉我需要准备哪些截图、照片和说明。`);
    Taro.navigateTo({ url: `/pages/ai-assistant/index?scene=refund-evidence&q=${q}` });
  };

  if (loading) {
    return (
      <View className="refund-page refund-center-page">
        <Text className="refund-loading-text">正在加载售后信息...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View className="refund-page">
        <View className="refund-nav">
          <View className="refund-back" onClick={goBack}>
            <ArrowLeft size={30} color="#081A3A" />
          </View>
          <Text className="refund-nav-title">售后/退款</Text>
          <View className="refund-menu-pill">
            <Text className="refund-menu-dot">•••</Text>
            <Text className="refund-menu-line">—</Text>
            <Text className="refund-menu-circle">◎</Text>
          </View>
        </View>
        <View className="refund-empty-wrap">
          <View className="refund-empty-card">
            <View className="refund-empty-top">
              <View className="refund-empty-icon">
                <Headphones size={58} color="#B87920" />
              </View>
              <AiMascot size="lg" pose="point" />
            </View>
            <Text className="refund-empty-title">请先选择售后订单</Text>
            <Text className="refund-empty-desc">退款、补偿和仲裁都必须绑定真实订单，避免误处理其他服务。请从订单详情页进入售后流程。</Text>
            <View className="refund-empty-actions">
              <View className="refund-empty-primary" onClick={() => Taro.switchTab({ url: '/pages/orders/index' })}>
                <MessageCircle size={22} color="#FFFFFF" />
                <Text className="refund-empty-primary-text">返回订单中心</Text>
              </View>
              <View className="refund-empty-secondary" onClick={() => Taro.navigateTo({ url: '/pages/ai-assistant/index?scene=refund-empty' })}>
                <ShieldCheck size={22} color="#FF4D19" />
                <Text className="refund-empty-secondary-text">问退款规则</Text>
              </View>
            </View>
            <View className="refund-empty-flow">
              <TimelineItem title="选择订单" time="先绑定订单" done />
              <TimelineItem title="提交原因" time="补充凭证" active />
              <TimelineItem title="平台审核" time="客服介入" />
              <TimelineItem title="处理完成" time="结果同步" />
            </View>
          </View>
        </View>
      </View>
    );
  }

  const taskTitle = firstText(order.tasks?.title, order.task_title, order.title) || '订单服务';
  const providerName = firstText(order.worker?.nickname, order.worker_name, order.provider?.nickname, order.provider_name) || '服务者';
  const providerInitial = providerName.slice(0, 1) || '服';
  const amountText = formatAmountYuan(order.amount || order.total_amount || order.pay_amount);
  const evidenceUrls = parseEvidenceUrls(order);
  const negotiationRecords = getNegotiationRecords(order);
  const refundReason = order.refund_reason || order.dispute?.reason || order.refund?.reason || '请补充真实退款原因，平台不会仅凭前端文案自动退款。';
  const refundRequestedAt = order.refund_requested_at || order.refund?.created_at || order.dispute?.created_at || order.created_at;
  const refundReviewedAt = order.refund_reviewed_at || order.refund?.reviewed_at || order.dispute?.updated_at;
  const refundCompletedAt = order.refunded_at || order.refund?.completed_at;
  const isRefundStarted = ['refunding', 'refunded', 'disputed', 'refund_failed'].includes(order.status);
  const isRefundReviewed = ['refunding', 'refunded', 'disputed', 'refund_failed'].includes(order.status);
  const isRefundCompleted = order.status === 'refunded';
  const orderNo = firstText(order.order_no, order.orderNo, order.pay_order_no, order.id) || String(order.id || '');
  const serviceTime = firstText(
    order.service_time,
    order.appointment_time,
    order.tasks?.deadline,
    order.created_at,
  ) || '以订单详情为准';
  const statusTitle = order.status === 'refunding'
    ? '退款处理中'
    : order.status === 'refunded'
      ? '退款已完成'
      : order.status === 'disputed'
        ? '平台仲裁中'
        : '可申请售后';
  const statusDesc = order.status === 'refunding'
    ? '预计 1-3 个工作日内完成退款'
    : order.status === 'refunded'
      ? '退款结果已由后端和支付回调确认'
      : order.status === 'disputed'
        ? '平台客服正在结合订单和沟通记录处理'
        : '请补充原因和凭证，平台会协助处理。';

  return (
    <View className="refund-page">
      <View className="refund-nav">
        <View className="refund-back" onClick={goBack}>
          <ArrowLeft size={30} color="#081A3A" />
        </View>
        <Text className="refund-nav-title">售后/退款</Text>
        <View className="refund-menu-pill">
          <Text className="refund-menu-dot">•••</Text>
          <Text className="refund-menu-line">—</Text>
          <Text className="refund-menu-circle">◎</Text>
        </View>
      </View>

      <View className="refund-status-card">
        <View className="refund-order-top">
          <View className="refund-order-icon">
            <MessageCircle size={46} color="#FF4D19" />
          </View>
          <View className="refund-order-main">
            <View className="refund-order-no-row">
              <Text className="refund-order-no">订单号：{orderNo}</Text>
              <View className="refund-copy-hit" onClick={() => copyOrderNo(orderNo)}>
                <Copy size={18} color="#6B7280" />
              </View>
            </View>
            <Text className="refund-order-title">{taskTitle}</Text>
            <View className="refund-provider">
              <View className="refund-provider-avatar">
                <Text className="refund-provider-avatar-text">{providerInitial}</Text>
              </View>
              <Text className="refund-provider-name">{providerName}</Text>
              <Text className="refund-provider-badge">服务者</Text>
              <Text className="refund-provider-score">平台托管</Text>
            </View>
            <View className="refund-service-row">
              <Text className="refund-service-time">服务时间：{serviceTime}</Text>
              <Text className="refund-service-amount">订单金额：{amountText}</Text>
            </View>
          </View>
          <View className="refund-status-right">
            <Text className="refund-status-title">{statusTitle}</Text>
            <Text className="refund-status-desc">{statusDesc}</Text>
            <View className="refund-detail-btn">
              <Text className="refund-detail-btn-text">查看详情</Text>
            </View>
          </View>
        </View>

        <View className="refund-timeline">
          <TimelineItem title="提交申请" time={isRefundStarted ? formatRefundTime(refundRequestedAt) : '待提交'} done={isRefundStarted} />
          <TimelineItem title="平台审核" time={isRefundReviewed ? formatRefundTime(refundReviewedAt) : '待审核'} active={isRefundStarted && !isRefundCompleted} done={isRefundCompleted} />
          <TimelineItem title="协商处理中" time={order.status === 'disputed' ? '进行中' : '按需介入'} active={order.status === 'disputed'} />
          <TimelineItem title="退款完成" time={isRefundCompleted ? formatRefundTime(refundCompletedAt) : '待完成'} done={isRefundCompleted} />
        </View>
        <Text className="refund-status-tip">如服务未按约定完成，请补充清晰原因和凭证；平台会结合订单状态、沟通记录和支付结果处理。</Text>
      </View>

      <View className="refund-card">
        <InfoBlock icon={CircleDollarSign} tone="green" title="退款原因" desc={refundReason} />
        <InfoBlock icon={ImageIcon} tone="blue" title="凭证图片">
          <View className="refund-evidence-row">
            {evidenceUrls.length ? evidenceUrls.slice(0, 4).map((item, index) => (
              <View className="refund-evidence-img" key={item} onClick={() => previewEvidence(item, evidenceUrls)}>
                <Image className="refund-evidence-photo" src={item} mode="aspectFill" />
                <Text className="refund-evidence-img-text">凭证{index + 1}</Text>
              </View>
            )) : (
              <Text className="refund-evidence-empty">暂无凭证，请补充聊天截图、时间记录或现场照片。</Text>
            )}
            {evidenceUrls.length > 4 ? (
              <View className="refund-evidence-more">
                <Text className="refund-evidence-more-text">+{evidenceUrls.length - 4}</Text>
              </View>
            ) : null}
          </View>
        </InfoBlock>
        <InfoBlock icon={MessageCircle} tone="purple" title="协商记录">
          <View className="refund-chat-log">
            {negotiationRecords.length ? negotiationRecords.slice(0, 2).map((record: any, index: number) => (
              <View className="refund-chat-line" key={record.id || `${record.created_at || 'record'}-${index}`}>
                <Text className="refund-chat-role">{record.role || record.actor || '协商记录'}</Text>
                <Text className="refund-chat-time">{formatRefundTime(record.created_at || record.time)}</Text>
                <Text className="refund-chat-text">{record.content || record.message || record.note || '处理记录已同步'}</Text>
              </View>
            )) : (
              <View className="refund-chat-line refund-chat-line-empty">
                <Text className="refund-chat-role">协商记录待同步</Text>
                <Text className="refund-chat-time">待处理</Text>
                <Text className="refund-chat-text">提交售后后，平台客服、服务者回复和处理结果会展示在这里。</Text>
              </View>
            )}
            <Text className="refund-chat-more">查看全部协商记录⌄</Text>
          </View>
        </InfoBlock>
        <InfoBlock icon={ShieldCheck} tone="orange" title="平台客服介入" desc="平台会根据订单、支付和沟通记录协助处理，保障您的权益。" right="平台客服" />
      </View>

      <View className="refund-help-row">
        <View className="refund-staff-card">
          <View className="refund-staff-avatar">
            <Text className="refund-staff-avatar-text">帮</Text>
          </View>
          <View className="refund-staff-main">
            <Text className="refund-staff-title">平台客服</Text>
            <Text className="refund-staff-desc">人工客服会按订单记录跟进处理</Text>
            <Text className="refund-staff-time">工作时间：9:00-21:00</Text>
          </View>
          <View className="refund-staff-actions">
            <View className="refund-mini-btn">
              <Phone size={18} color="#FF4D19" />
              <Text className="refund-mini-btn-text">电话联系</Text>
            </View>
            <View className="refund-mini-btn">
              <MessageCircle size={18} color="#FF6A00" />
              <Text className="refund-mini-btn-text">在线沟通</Text>
            </View>
          </View>
        </View>

        <View className="refund-ai-card" onClick={() => Taro.navigateTo({ url: '/pages/ai-assistant/index?q=退款一般多久到账' })}>
          <View className="refund-ai-copy">
            <Text className="refund-ai-title">AI小帮助手</Text>
            <Text className="refund-ai-desc">为您提供退款建议和指引</Text>
            <Text className="refund-ai-link">· 查看退款规则</Text>
            <Text className="refund-ai-link">· 如何补充凭证</Text>
            <Text className="refund-ai-link">· 退款一般多久到账</Text>
          </View>
          <AiMascot size="lg" pose="point" />
        </View>
      </View>

      <View className="refund-bottom-space" />

      <View className="refund-bottom-bar">
        <View className="refund-bottom-btn refund-bottom-outline" onClick={() => Taro.navigateTo({ url: '/pages/chat/index?id=staff&name=平台客服' })}>
          <Headphones size={30} color="#FF4D19" />
          <Text className="refund-bottom-outline-text">联系客服</Text>
        </View>
        <View className="refund-bottom-btn refund-bottom-fill" onClick={openEvidenceGuide}>
          <Upload size={30} color="#FFFFFF" />
          <Text className="refund-bottom-fill-text">补充资料</Text>
        </View>
        <View className="refund-security-note">
          <ShieldCheck size={18} color="#8A8F99" />
          <Text className="refund-security-note-text">我们将严格保护您的信息安全</Text>
        </View>
      </View>
    </View>
  );
}

function TimelineItem({ title, time, done, active }: { title: string; time: string; done?: boolean; active?: boolean }) {
  return (
    <View className="refund-time-item">
      <View className={`refund-time-dot ${done ? 'refund-time-dot-done' : ''} ${active ? 'refund-time-dot-active' : ''}`}>
        {done ? <CircleCheck size={20} color="#FFFFFF" /> : active ? <Clock size={18} color="#FFFFFF" /> : null}
      </View>
      <Text className="refund-time-title">{title}</Text>
      <Text className="refund-time-text">{time}</Text>
    </View>
  );
}

function InfoBlock({ icon: Icon, tone, title, desc, right, children }: {
  icon: any;
  tone: 'green' | 'blue' | 'purple' | 'orange';
  title: string;
  desc?: string;
  right?: string;
  children?: any;
}) {
  return (
    <View className="refund-info-block">
      <View className={`refund-info-icon refund-tone-${tone}`}>
        <Icon size={30} color={TONE_COLOR[tone]} />
      </View>
      <View className="refund-info-main">
        <View className="refund-info-head">
          <Text className="refund-info-title">{title}</Text>
          {right ? <Text className="refund-info-right">{right}</Text> : <ChevronRight size={22} color="#6B7280" />}
        </View>
        {desc ? <Text className="refund-info-desc">{desc}</Text> : null}
        {children}
      </View>
    </View>
  );
}
