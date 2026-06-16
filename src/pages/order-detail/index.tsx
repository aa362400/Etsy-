import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState, useEffect } from 'react';
import { Network } from '@/network';
import { getToken } from '@/lib/auth';
import { Textarea } from '@/components/ui/textarea';
import AiMascot from '@/components/AiMascot';
import AiChatWidget from '@/components/ai-chat-widget';
import EmptyState from '@/components/EmptyState';
import {
  ArrowLeft,
  ChevronRight,
  CircleCheck,
  Copy,
  Clock,
  Download,
  FileText,
  Headphones,
  Link,
  MessageCircle,
  Shield,
  ShieldCheck,
  Upload,
  Wallet,
} from 'lucide-react-taro';
import './index.css';

const STATUS_MAP: Record<string, { label: string; color: string; desc: string }> = {
  pending_payment: { label: '待支付', color: '#FF6A00', desc: '请完成支付，资金将由平台托管。' },
  paid: { label: '已支付', color: '#17B978', desc: '支付已确认，平台正在等待服务流转。' },
  open: { label: '待接单', color: '#FF8A00', desc: '等待服务方接单或报价。' },
  assigned: { label: '已接单', color: '#17B978', desc: '服务方已接单，待开始服务。' },
  in_progress: { label: '服务中', color: '#17B978', desc: '服务方正在为您服务，请保留沟通记录。' },
  submitted: { label: '待验收', color: '#FF6A00', desc: '服务方已提交完成凭证，请验收。' },
  revision: { label: '修改中', color: '#FF8A00', desc: '服务方正在修改，请关注订单进度。' },
  completed: { label: '已完成', color: '#17B978', desc: '订单已完成，资金将按规则结算。' },
  cancelled: { label: '已取消', color: '#6B7280', desc: '订单已取消' },
  closed: { label: '已关闭', color: '#6B7280', desc: '订单已关闭' },
  refunding: { label: '退款中', color: '#FF8A00', desc: '退款处理中，到账时间以微信支付结果为准' },
  refunded: { label: '已退款', color: '#6B7280', desc: '退款已完成' },
  refund_failed: { label: '退款失败', color: '#EF4444', desc: '退款未成功，请联系客服或等待平台处理' },
  disputed: { label: '仲裁中', color: '#EF4444', desc: '平台正在仲裁' },
};

const goBack = () => {
  const pages = Taro.getCurrentPages();
  if (pages.length > 1) {
    Taro.navigateBack();
    return;
  }
  Taro.switchTab({ url: '/pages/orders/index' });
};

const OrderDetailPage = () => {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [evidenceText, setEvidenceText] = useState('');
  const [virtualDelivery, setVirtualDelivery] = useState<any>(null);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [aiChatVisible, setAiChatVisible] = useState(false);

  useEffect(() => {
    const params = Taro.getCurrentInstance().router?.params;
    if (params?.id) loadOrder(params.id);
  }, []);

  const loadOrder = async (id: string) => {
    try {
      const res = await Network.request({
        url: `/api/orders/${id}`,
        header: { authorization: `Bearer ${getToken()}` },
      });
      if (res.data?.data) {
        setOrder(res.data.data);
        // 如果订单关联虚拟产品且已付款，拉取交付信息
        const o = res.data.data;
        if (o.product_type === 'virtual' && (o.status === 'paid' || o.status === 'completed' || o.status === 'submitted')) {
          loadVirtualDelivery(id);
        }
      }
    } catch (err) {
      console.error('加载订单失败', err);
    } finally {
      setLoading(false);
    }
  };

  const loadVirtualDelivery = async (orderId: string) => {
    setDeliveryLoading(true);
    try {
      const res = await Network.request({
        url: `/api/orders/${orderId}/virtual-delivery`,
        header: { authorization: `Bearer ${getToken()}` },
      });
      if (res.data?.data) setVirtualDelivery(res.data.data);
    } catch (err) {
      console.error('加载交付信息失败', err);
    } finally {
      setDeliveryLoading(false);
    }
  };

  const formatAmount = (cents: string | number | undefined | null) => {
    const value = Number(cents || 0);
    if (!Number.isFinite(value) || value <= 0) return '面议';
    return `¥${(value / 100).toFixed(2)}`;
  };

  const formatTime = (value?: string) => {
    if (!value) return '待同步';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const handleConfirm = async () => {
    if (!order) return;
    try {
      await Network.request({
        url: `/api/orders/${order.id}/confirm`,
        method: 'POST',
        header: { authorization: `Bearer ${getToken()}` },
      });
      Taro.showToast({ title: '确认完成', icon: 'success' });
      loadOrder(order.id);
    } catch (_err) {
      Taro.showToast({ title: '操作失败', icon: 'none' });
    }
  };

  const handleSubmitResult = async () => {
    if (!order) return;
    if (!evidenceText.trim()) {
      Taro.showToast({ title: '请先填写完成说明', icon: 'none' });
      return;
    }
    try {
      const res = await Network.request({
        url: `/api/orders/${order.id}/submit-result`,
        method: 'POST',
        data: { resultNote: evidenceText.trim() },
        header: { authorization: `Bearer ${getToken()}` },
      });
      if (res.data?.code && res.data.code !== 200) {
        Taro.showToast({ title: res.data.msg || '提交失败', icon: 'none' });
        return;
      }
      Taro.showToast({ title: '已提交，等待发布者验收', icon: 'success' });
      setEvidenceText('');
      loadOrder(order.id);
    } catch (err: any) {
      Taro.showToast({ title: err?.msg || err?.message || '提交失败', icon: 'none' });
    }
  };

  const handleCopyContent = (text: string) => {
    Taro.setClipboardData({ data: text });
    Taro.showToast({ title: '已复制', icon: 'success' });
    // 记录复制日志
    if (order?.id) {
      Network.request({
        url: `/api/orders/${order.id}/copy-code-log`,
        method: 'POST',
        header: { authorization: `Bearer ${getToken()}` },
      }).catch(() => {});
    }
  };

  const handleDownload = async () => {
    if (!order?.id) return;
    try {
      const res = await Network.request({
        url: `/api/orders/${order.id}/download`,
        header: { authorization: `Bearer ${getToken()}` },
      });
      const data = (res.data as any)?.data;
      if (data?.download_url) {
        Taro.setClipboardData({ data: data.download_url });
        Taro.showToast({ title: '链接已复制，请在浏览器打开', icon: 'none' });
        loadVirtualDelivery(order.id);
      }
    } catch (err: any) {
      Taro.showToast({ title: err?.msg || '下载失败', icon: 'none' });
    }
  };

  if (loading) {
    return (
      <View className="od-page od-center-page">
        <Text className="od-loading-text">正在加载订单...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View className="od-page od-center-page">
        <EmptyState
          title="订单不存在"
          description="订单可能已取消、关闭，或当前账号没有查看权限。"
          actionText="返回订单中心"
          onAction={() => Taro.switchTab({ url: '/pages/orders/index' })}
        />
      </View>
    );
  }

  const statusInfo = STATUS_MAP[order.status] || { label: order.status, color: '#6B7280', desc: '' };
  const taskTitle = order.tasks?.title || order.task_title || '任务标题';
  const amountText = formatAmount(order.amount);
  const workerName = order.worker?.nickname || order.worker_name || order.provider_name || '待接单';
  const serviceType = order.product_type === 'virtual'
    ? '虚拟交付'
    : order.tasks?.service_type === 'offline' || order.service_type === 'offline'
      ? '同城服务'
      : '线上服务';

  return (
    <View className="od-page">
      <View className="od-nav">
        <View className="od-back" onClick={goBack}>
          <ArrowLeft size={30} color="#081A3A" />
        </View>
        <Text className="od-nav-title">订单详情</Text>
        <View className="od-menu-pill">
          <Text className="od-menu-dot">•••</Text>
          <Text className="od-menu-line">—</Text>
          <Text className="od-menu-circle">◎</Text>
        </View>
      </View>

      <View className="od-status-card">
        <View className="od-status-copy">
          <Text className="od-status-kicker">订单详情 · 平台托管</Text>
          <View className="od-status-title-row">
            <Text className="od-status-label">{statusInfo.label}</Text>
            <Text className="od-status-pill" style={{ color: statusInfo.color, backgroundColor: `${statusInfo.color}16` }}>{serviceType}</Text>
          </View>
          <Text className="od-status-desc">{statusInfo.desc || '订单状态已更新，请按页面提示继续操作。'}</Text>
          <View className="od-status-safe">
            <ShieldCheck size={20} color="#FF4D19" />
            <Text className="od-status-safe-text">平台托管 · 验收后付款</Text>
          </View>
        </View>
        <AiMascot size="lg" pose="point" />
      </View>

      <View className="od-ai-card" onClick={() => setAiChatVisible(true)}>
        <View className="od-ai-icon">
          <MessageCircle size={25} color="#FFFFFF" />
        </View>
        <View className="od-ai-copy">
          <Text className="od-ai-title">问 AI 这笔订单下一步怎么处理</Text>
          <Text className="od-ai-desc">可解释当前状态、售后路径、验收注意点；资金和退款以后台记录为准。</Text>
        </View>
        <Text className="od-ai-action">去问</Text>
      </View>

      <View className="od-flow-card">
        <FlowStep title="支付托管" active={['paid', 'open', 'assigned', 'in_progress', 'submitted', 'completed'].includes(order.status)} />
        <FlowStep title="服务进行" active={['assigned', 'in_progress', 'submitted', 'completed'].includes(order.status)} />
        <FlowStep title="提交验收" active={['submitted', 'completed'].includes(order.status)} />
        <FlowStep title="完成结算" active={order.status === 'completed'} />
      </View>

      <View className="od-summary-card">
        <SummaryItem icon={Wallet} label="订单金额" value={amountText} tone="orange" />
        <SummaryItem icon={ShieldCheck} label="服务者" value={workerName} tone="green" />
        <SummaryItem icon={Clock} label="下单时间" value={formatTime(order.created_at)} tone="blue" />
      </View>

      <View className="od-card">
        <View className="od-card-head">
          <Text className="od-card-title">订单信息</Text>
          <View className="od-copy" onClick={() => handleCopyContent(order.order_no || order.id)}>
            <Copy size={18} color="#6B7280" />
            <Text className="od-copy-text">复制订单号</Text>
          </View>
        </View>
        <Text className="od-order-no">订单号：{order.order_no || order.id}</Text>
        <Text className="od-task-title">{taskTitle}</Text>
        <FeeLine label="订单金额" value={amountText} strong />
        <FeeLine label="平台服务费" value={formatAmount(order.platform_fee || 0)} />
        <FeeLine label="服务方收入" value={formatAmount(order.worker_income || 0)} green />
      </View>

      <View className="od-card od-safe-card">
        <View className="od-card-head">
          <Text className="od-card-title">交易保障</Text>
          <Text className="od-safe-head-text">平台托管</Text>
        </View>
        <View className="od-safe-grid">
          <SafeItem icon={ShieldCheck} title="资金托管" desc="未验收前不直接打款" />
          <SafeItem icon={FileText} title="过程留痕" desc="订单状态和凭证可追溯" />
          <SafeItem icon={Headphones} title="售后协助" desc="异常可申请平台介入" />
        </View>
      </View>

      {order.product_type === 'virtual' ? (
        <View className="od-card od-delivery-card">
          <View className="od-card-head">
            <Text className="od-card-title">{order.products?.title || '虚拟产品交付'}</Text>
            <Text className="od-delivery-status">自动发货</Text>
          </View>
          {(order.status === 'pending_payment' || order.status === 'open') ? (
            <Notice icon={Shield} text="付款后系统将自动发货，请先完成支付。" />
          ) : null}
          {deliveryLoading ? <Text className="od-muted">正在加载交付信息...</Text> : null}
          {virtualDelivery?.status === 'delivered' ? (
            <View className="od-delivery-box">
              <View className="od-delivery-line">
                {virtualDelivery.delivery_type === 'file' ? <FileText size={24} color="#17B978" /> : null}
                {virtualDelivery.delivery_type === 'link' ? <Link size={24} color="#17B978" /> : null}
                {virtualDelivery.delivery_type === 'code' ? <Shield size={24} color="#17B978" /> : null}
                {virtualDelivery.delivery_type === 'text' ? <FileText size={24} color="#17B978" /> : null}
                <View className="od-delivery-main">
                  <Text className="od-delivery-title">{virtualDelivery.delivery_title || '交付内容'}</Text>
                  {virtualDelivery.delivery_type === 'file' ? (
                    <Text className="od-delivery-desc">
                      剩余 {virtualDelivery.download_limit - virtualDelivery.download_count} / {virtualDelivery.download_limit} 次
                      {virtualDelivery.expire_at ? ` · 有效期至 ${new Date(virtualDelivery.expire_at).toLocaleDateString('zh-CN')}` : ''}
                    </Text>
                  ) : (
                    <Text className="od-delivery-desc">{virtualDelivery.delivery_content || virtualDelivery.link_url || '已生成交付内容'}</Text>
                  )}
                </View>
              </View>
              {virtualDelivery.delivery_type === 'file' ? (
                <View className="od-action-fill" onClick={handleDownload}>
                  <Download size={22} color="#FFFFFF" />
                  <Text className="od-action-fill-text">下载文件</Text>
                </View>
              ) : (
                <View className="od-action-outline" onClick={() => handleCopyContent(virtualDelivery.link_url || virtualDelivery.delivery_content || '')}>
                  <Copy size={22} color="#FF4D19" />
                  <Text className="od-action-outline-text">复制内容</Text>
                </View>
              )}
            </View>
          ) : null}
          {virtualDelivery?.status === 'failed' ? <Notice icon={Headphones} text="发货失败，请联系客服处理。" danger /> : null}
          {!virtualDelivery && !deliveryLoading && order.status !== 'pending_payment' && order.status !== 'open' ? (
            <Notice icon={FileText} text="交付处理中，请稍后刷新页面查看。" />
          ) : null}
        </View>
      ) : null}

      {order.status === 'submitted' ? (
        <View className="od-alert">
          <Shield size={20} color="#FF6A00" />
          <Text className="od-alert-text">服务方已提交完成凭证，您可确认完成、要求修改、申请退款或发起仲裁。超时未处理将自动验收。</Text>
        </View>
      ) : null}

      {order.status === 'in_progress' ? (
        <View className="od-card">
          <View className="od-card-head">
            <Text className="od-card-title">提交完成凭证</Text>
            <Upload size={22} color="#FF4D19" />
          </View>
          <Notice icon={FileText} text="请填写真实完成情况，提交后订单进入待验收，资金仍由平台托管。" />
          <Textarea
            className="od-textarea"
            placeholder="描述完成情况，例如：已完成上门服务，附带沟通截图或交付说明。"
            value={evidenceText}
            onInput={(e) => setEvidenceText(e.detail.value)}
            maxlength={500}
          />
          <View className="od-action-fill" onClick={handleSubmitResult}>
            <Upload size={22} color="#FFFFFF" />
            <Text className="od-action-fill-text">提交完成凭证</Text>
          </View>
        </View>
      ) : null}

      <View className="od-bottom-space" />

      <View className="od-bottom-bar">
        <View className="od-bottom-outline" onClick={() => Taro.navigateTo({ url: `/pages/refund/index?orderId=${order.id}` })}>
          <Headphones size={26} color="#FF4D19" />
          <Text className="od-bottom-outline-text">售后/客服</Text>
        </View>
        {order.status === 'submitted' ? (
          <View className="od-bottom-fill" onClick={handleConfirm}>
            <CircleCheck size={26} color="#FFFFFF" />
            <Text className="od-bottom-fill-text">确认完成</Text>
          </View>
        ) : (
          <View className="od-bottom-fill" onClick={() => Taro.navigateTo({ url: `/pages/chat/index?id=${order.id}&name=${encodeURIComponent(order.tasks?.title || '订单沟通')}` })}>
            <ChevronRight size={26} color="#FFFFFF" />
            <Text className="od-bottom-fill-text">订单沟通</Text>
          </View>
        )}
      </View>

      <AiChatWidget
        visible={aiChatVisible}
        onClose={() => setAiChatVisible(false)}
        context={{
          scene: 'order_detail',
          title: taskTitle,
          status: order.status,
          orderId: order.id,
          taskId: order.task_id || order.tasks?.id,
          budget: amountText,
        }}
        initialIntent="order_followup"
      />
    </View>
  );
};

function FeeLine({ label, value, strong, green }: { label: string; value: string; strong?: boolean; green?: boolean }) {
  return (
    <View className="od-fee-line">
      <Text className="od-fee-label">{label}</Text>
      <Text className={`od-fee-value ${strong ? 'od-fee-value-strong' : ''} ${green ? 'od-fee-value-green' : ''}`}>{value}</Text>
    </View>
  );
}

function FlowStep({ title, active }: { title: string; active?: boolean }) {
  return (
    <View className="od-flow-step">
      <View className={`od-flow-dot ${active ? 'od-flow-dot-active' : ''}`}>
        {active ? <CircleCheck size={18} color="#FFFFFF" /> : null}
      </View>
      <Text className={`od-flow-title ${active ? 'od-flow-title-active' : ''}`}>{title}</Text>
    </View>
  );
}

function SummaryItem({ icon: Icon, label, value, tone }: {
  icon: any;
  label: string;
  value: string;
  tone: 'orange' | 'green' | 'blue';
}) {
  return (
    <View className="od-summary-item">
      <View className={`od-summary-icon is-${tone}`}>
        <Icon size={26} color={tone === 'green' ? '#17B978' : tone === 'blue' ? '#FF8A00' : '#FF4D19'} />
      </View>
      <Text className="od-summary-label">{label}</Text>
      <Text className="od-summary-value">{value}</Text>
    </View>
  );
}

function Notice({ icon: Icon, text, danger }: { icon: any; text: string; danger?: boolean }) {
  return (
    <View className={`od-notice ${danger ? 'od-notice-danger' : ''}`}>
      <Icon size={20} color={danger ? '#EF4444' : '#FF6A00'} />
      <Text className={`od-notice-text ${danger ? 'od-notice-text-danger' : ''}`}>{text}</Text>
    </View>
  );
}

function SafeItem({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <View className="od-safe-item">
      <View className="od-safe-icon">
        <Icon size={30} color="#FF6A00" />
      </View>
      <View className="od-safe-copy">
        <Text className="od-safe-title">{title}</Text>
        <Text className="od-safe-desc">{desc}</Text>
      </View>
    </View>
  );
}

export default OrderDetailPage;
