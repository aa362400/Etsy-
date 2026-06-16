import { Text, View } from '@tarojs/components';
import Taro, { useReachBottom } from '@tarojs/taro';
import { useEffect, useState } from 'react';
import {
  ChevronRight,
  ClipboardList,
  Clock,
  Headphones,
  LayoutGrid,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
} from 'lucide-react-taro';
import { getToken } from '@/lib/auth';
import AiChatWidget from '@/components/ai-chat-widget';
import { Network } from '@/network';
import './index.css';

const ORDER_STATUSES = [
  { value: '', label: '全部' },
  { value: 'open', label: '待响应' },
  { value: 'assigned', label: '待沟通' },
  { value: 'pending_payment', label: '待支付' },
  { value: 'in_progress', label: '进行中' },
  { value: 'submitted', label: '待验收' },
  { value: 'completed', label: '已完成' },
  { value: 'refunding', label: '售后' },
];

const ORDER_PAGE_LIMIT = 20;

const STATUS_LABELS: Record<string, string> = {
  pending_payment: '待支付',
  pending_audit: '待审核',
  open: '待响应',
  assigned: '待沟通',
  in_progress: '进行中',
  submitted: '待验收',
  revision: '修改中',
  completed: '已完成',
  cancelled: '已取消',
  refunding: '退款中',
  disputed: '仲裁中',
  rejected: '已拒绝',
  refunded: '已退款',
};

const STAGE_LABELS = ['待支付', '待接单', '服务中', '验收/售后'];

const getStageIndex = (status?: string) => {
  if (status === 'pending_payment' || status === 'pending_audit') return 0;
  if (status === 'open' || status === 'assigned') return 1;
  if (status === 'in_progress' || status === 'submitted' || status === 'revision') return 2;
  return 3;
};

const getStatusTone = (status?: string) => {
  if (status === 'completed' || status === 'refunded') return 'success';
  if (status === 'in_progress' || status === 'submitted' || status === 'assigned') return 'blue';
  if (status === 'refunding' || status === 'disputed' || status === 'refund_failed') return 'purple';
  if (status === 'cancelled' || status === 'rejected') return 'gray';
  return 'orange';
};

const formatAmount = (cents: string | number | undefined | null) => {
  const value = Number(cents || 0);
  if (!Number.isFinite(value) || value <= 0) return '面议';
  return `￥${(value / 100).toFixed(2)}`;
};

const formatTime = (value?: string) => {
  if (!value) return '时间待同步';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const getOrderTitle = (order: any) =>
  order.tasks?.title || order.task_title || order.title || '未命名需求';

const getOrderCategory = (order: any) =>
  order.tasks?.task_categories?.name || order.tasks?.category || order.category || '任务服务';

const getOrderWorker = (order: any) =>
  order.worker?.nickname || order.worker_name || order.provider_name || '服务者待确认';

const getTaskId = (order: any) => order.task_id || order.taskId || order.tasks?.id || order.business_id;

const openOrderDetail = (order: any) => {
  Taro.navigateTo({ url: `/pages/order-detail/index?id=${order.id}` });
};

const openPayment = (order: any) => {
  const taskId = getTaskId(order);
  if (!taskId) {
    openOrderDetail(order);
    return;
  }
  Taro.navigateTo({ url: `/pages/payment/index?taskId=${taskId}` });
};

const openRefund = (order: any) => {
  Taro.navigateTo({ url: `/pages/refund/index?orderId=${order.id}` });
};

const stopAndRun = (event: any, action: () => void) => {
  event?.stopPropagation?.();
  action();
};

const getPrimaryAction = (order: any) => {
  if (order.status === 'pending_payment') {
    return { label: '去支付', action: () => openPayment(order) };
  }
  if (order.status === 'submitted') {
    return { label: '确认验收', action: () => openOrderDetail(order) };
  }
  if (order.status === 'refunding' || order.status === 'disputed' || order.status === 'refund_failed') {
    return { label: '查看售后', action: () => openRefund(order) };
  }
  if (order.status === 'completed') {
    return { label: '再次下单', action: () => Taro.switchTab({ url: '/pages/publish/index' }) };
  }
  return { label: '查看详情', action: () => openOrderDetail(order) };
};

const OrdersPage = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState('');
  const [aiChatVisible, setAiChatVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    loadOrders(1, false);
  }, [activeStatus]);

  const loadOrders = async (nextPage = 1, append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setErrorMsg('');
    try {
      const query = [
        `page=${nextPage}`,
        `limit=${ORDER_PAGE_LIMIT}`,
        activeStatus ? `status=${encodeURIComponent(activeStatus)}` : '',
      ].filter(Boolean).join('&');
      const res = await Network.request({
        url: `/api/orders?${query}`,
        header: { authorization: `Bearer ${getToken()}` },
      });
      const pageData = res.data?.data || {};
      const items = pageData.items || pageData.list || res.data?.items || [];
      const nextItems = Array.isArray(items) ? items : [];
      setOrders((prev) => append ? [...prev, ...nextItems] : nextItems);
      setPage(Number(pageData.page || nextPage));
      setHasMore(typeof pageData.hasMore === 'boolean' ? pageData.hasMore : nextItems.length >= ORDER_PAGE_LIMIT);
    } catch (err: any) {
      console.error('加载订单失败', err);
      if (!append) setOrders([]);
      setErrorMsg(err?.message || '订单加载失败，请稍后重试');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useReachBottom(() => {
    if (loading || loadingMore || !hasMore || errorMsg) return;
    loadOrders(page + 1, true);
  });

  return (
    <View className="orders-page">
      <View className="orders-top">
        <View className="orders-brand" onClick={() => Taro.switchTab({ url: '/pages/home/index' })}>
          <Text className="orders-brand-main">有应</Text>
          <Text className="orders-brand-accent">帮</Text>
        </View>
        <Text className="orders-slogan">让需求被看见，让技能被响应</Text>
        <View className="orders-menu-pill">
          <Text className="orders-menu-dot">•••</Text>
          <Text className="orders-menu-line">—</Text>
          <Text className="orders-menu-circle">◉</Text>
        </View>
      </View>

      <View className="orders-title-row">
        <View className="orders-title-copy">
          <Text className="orders-title-main">订单中心</Text>
          <Text className="orders-title-desc">管理您的所有需求与服务</Text>
        </View>
        <View className="orders-title-actions">
          <View className="orders-title-action" onClick={() => Taro.switchTab({ url: '/pages/publish/index' })}>
            <Search size={22} color="#111827" />
            <Text className="orders-title-action-text">我的发布</Text>
          </View>
          <View className="orders-title-action" onClick={() => Taro.navigateTo({ url: '/pages/worker-center/index' })}>
            <LayoutGrid size={22} color="#111827" />
            <Text className="orders-title-action-text">服务管理</Text>
          </View>
        </View>
      </View>

      <View className="orders-ai-row">
        <View className="orders-ai-btn" onClick={() => setAiChatVisible(true)}>
          <MessageCircle size={20} color="#FFFFFF" />
          <Text className="orders-ai-btn-text">问 AI 下一步怎么做</Text>
        </View>
        <View className="orders-ai-outline" onClick={() => Taro.navigateTo({ url: '/pages/ai-assistant/index?scene=orders' })}>
          <Text className="orders-ai-outline-text">智能追问</Text>
        </View>
      </View>

      <View className="orders-filter-wrap">
        {ORDER_STATUSES.map((s) => (
          <View
            key={s.value}
            className={`orders-filter ${activeStatus === s.value ? 'orders-filter-active' : ''}`}
            onClick={() => setActiveStatus(s.value)}
          >
            <Text className={`orders-filter-text ${activeStatus === s.value ? 'orders-filter-text-active' : ''}`}>{s.label}</Text>
          </View>
        ))}
      </View>

      <View className="orders-list">
        {loading ? (
          <View className="orders-loading">
            <Text className="orders-loading-text">正在加载订单...</Text>
          </View>
        ) : orders.length === 0 ? (
          <View className="orders-empty-card">
            <View className="orders-empty-icon">
              <ClipboardList size={58} color="#FF6A00" />
            </View>
            <Text className="orders-empty-title">{errorMsg ? '订单加载失败' : '暂无订单'}</Text>
            <Text className="orders-empty-desc">{errorMsg || '下单、接单、验收和售后记录会出现在这里。先发布一个真实需求，让平台托管资金并记录完整流程。'}</Text>
            <View className="orders-empty-actions">
              <View className="orders-empty-primary" onClick={errorMsg ? () => loadOrders(1, false) : () => Taro.switchTab({ url: '/pages/publish/index' })}>
                <ClipboardList size={22} color="#FFFFFF" />
                <Text className="orders-empty-primary-text">{errorMsg ? '重新加载' : '发布需求'}</Text>
              </View>
              <View className="orders-empty-secondary" onClick={() => Taro.navigateTo({ url: '/pages/ai-assistant/index?scene=order-empty' })}>
                <MessageCircle size={22} color="#FF4D19" />
                <Text className="orders-empty-secondary-text">问 AI 客服</Text>
              </View>
            </View>
            <View className="orders-empty-flow">
              {STAGE_LABELS.map((item, index) => (
                <View className="orders-empty-flow-step" key={item}>
                  <View className={`orders-empty-flow-dot ${index === 0 ? 'orders-empty-flow-dot-active' : ''}`}>
                    <Text className="orders-empty-flow-num">{index + 1}</Text>
                  </View>
                  <Text className="orders-empty-flow-text">{item}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          orders.map((order) => {
            const stageIndex = getStageIndex(order.status);
            const primaryAction = getPrimaryAction(order);
            const workerName = getOrderWorker(order);
            const category = getOrderCategory(order);
            const statusTone = getStatusTone(order.status);
            return (
              <View key={order.id} className="orders-card" onClick={() => openOrderDetail(order)}>
                <View className="orders-card-top">
                  <View className="orders-order-mark">
                    <ClipboardList size={24} color="#FF4D19" />
                  </View>
                  <View className="orders-card-head-main">
                    <Text className="orders-no">订单号：{order.order_no || order.id}</Text>
                    <Text className="orders-time">{formatTime(order.created_at || order.updated_at)}</Text>
                  </View>
                  <View className={`orders-status-pill orders-status-${statusTone}`}>
                    <Text className="orders-status-text">{STATUS_LABELS[order.status] || order.status}</Text>
                  </View>
                </View>

                <View className="orders-body">
                  <View className="orders-thumb">
                    <Sparkles size={34} color="#FF6A00" />
                    <Text className="orders-thumb-label">{category}</Text>
                  </View>
                  <View className="orders-main">
                    <Text className="orders-card-title">{getOrderTitle(order)}</Text>
                    <View className="orders-card-meta">
                      <Star size={17} color="#FF9F0A" />
                      <Text className="orders-meta-chip">{category}</Text>
                      <Text className="orders-meta-chip">服务者：{workerName}</Text>
                      <Text className="orders-meta-chip">资金托管</Text>
                    </View>
                    <View className="orders-time-row">
                      <Clock size={18} color="#6B7280" />
                      <Text className="orders-time-row-text">预约时间：{formatTime(order.service_time || order.appointment_time || order.created_at)}</Text>
                    </View>
                  </View>
                  <View className="orders-price-wrap">
                    <Text className="orders-amount">{formatAmount(order.amount)}</Text>
                  </View>
                </View>

                <View className="orders-flow">
                  {STAGE_LABELS.map((item, index) => (
                    <View className="orders-flow-step" key={item}>
                      <View className={`orders-flow-dot ${index <= stageIndex ? 'orders-flow-dot-active' : ''}`}>
                        <Text className={`orders-flow-num ${index <= stageIndex ? 'orders-flow-num-active' : ''}`}>{index + 1}</Text>
                      </View>
                      <Text className={`orders-flow-label ${index <= stageIndex ? 'orders-flow-label-active' : ''}`}>{item}</Text>
                    </View>
                  ))}
                </View>

                <View className="orders-card-bottom">
                  <View className="orders-card-tip">
                    <ShieldCheck size={18} color="#17B978" />
                    <Text className="orders-card-tip-text">订单状态以后端记录为准，资金不由前端计算</Text>
                  </View>
                  <View className="orders-actions">
                    <View
                      className="orders-action-secondary"
                      onClick={(event) => stopAndRun(event, () => Taro.navigateTo({ url: '/pages/chat/index?id=staff&name=平台客服' }))}
                    >
                      <Headphones size={20} color="#111827" />
                      <Text className="orders-action-secondary-text">联系对方</Text>
                    </View>
                    <View
                      className="orders-action-primary"
                      onClick={(event) => stopAndRun(event, primaryAction.action)}
                    >
                      <Text className="orders-action-primary-text">{primaryAction.label}</Text>
                      <ChevronRight size={20} color="#FFFFFF" />
                    </View>
                  </View>
                </View>
              </View>
            );
          })
        )}
        {!loading && orders.length > 0 ? (
          <View className="orders-loading">
            <Text className="orders-loading-text">{loadingMore ? '加载更多...' : hasMore ? '上拉加载更多' : '没有更多了'}</Text>
          </View>
        ) : null}
      </View>

      <AiChatWidget
        visible={aiChatVisible}
        onClose={() => setAiChatVisible(false)}
        context={{
          scene: 'orders',
          title: '订单中心',
          status: activeStatus || 'all',
        }}
      />
    </View>
  );
};

export default OrdersPage;
