import { Text, View } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  CircleCheck,
  ChevronRight,
  CircleDollarSign,
  Clock,
  Copy,
  CreditCard,
  LockKeyhole,
  ShieldCheck,
  Star,
  Wallet,
} from 'lucide-react-taro';
import { getTaskDetail } from '@/lib/api';
import { requestPay, pollPayStatus } from '@/utils/payment';
import './index.css';

type PayMethod = 'wechat' | 'balance' | 'coupon';

const goBack = () => {
  const pages = Taro.getCurrentPages();
  if (pages.length > 1) {
    Taro.navigateBack();
    return;
  }
  Taro.switchTab({ url: '/pages/orders/index' });
};

const firstText = (...values: any[]) => {
  const found = values.find((value) => typeof value === 'string' && value.trim());
  return found ? String(found).trim() : '';
};

const getTaskAmountYuan = (task: any) => {
  const amountCents = Number(task?.budget_amount || task?.budget_min || task?.amount || 0);
  return Number.isFinite(amountCents) && amountCents > 0 ? amountCents / 100 : 0;
};

const formatAmount = (amount: number) => (amount > 0 ? `¥${amount.toFixed(2)}` : '面议');

export default function PaymentPage() {
  const router = useRouter();
  const [method, setMethod] = useState<PayMethod>('wechat');
  const [agreed, setAgreed] = useState(true);
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [pollingOrderId, setPollingOrderId] = useState<string | null>(null);

  const taskId = router.params?.taskId || router.params?.id || '';

  useEffect(() => {
    loadTask();
  }, [taskId]);

  const loadTask = async () => {
    if (!taskId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await getTaskDetail(taskId);
      setTask(res?.data || null);
    } catch {
      setTask(null);
    } finally {
      setLoading(false);
    }
  };

  const selectPayMethod = (nextMethod: PayMethod) => {
    if (nextMethod !== 'wechat') {
      Taro.showToast({ title: '该支付方式待后端开通后使用', icon: 'none' });
      return;
    }
    setMethod(nextMethod);
  };

  const copyTaskId = () => {
    if (!task?.id) return;
    Taro.setClipboardData({ data: String(task.id) });
    Taro.showToast({ title: '已复制', icon: 'success' });
  };

  const submitPay = async () => {
    if (paying || pollingOrderId) return;
    if (!agreed) {
      Taro.showToast({ title: '请先同意服务协议', icon: 'none' });
      return;
    }
    if (!task?.id) {
      Taro.showToast({ title: '任务不存在，无法支付', icon: 'none' });
      return;
    }
    const amount = getTaskAmountYuan(task);
    if (amount <= 0) {
      Taro.showToast({ title: '该任务未设置明确预算，请先沟通报价', icon: 'none' });
      return;
    }
    if (method !== 'wechat') {
      Taro.showToast({ title: '当前仅支持微信支付实测', icon: 'none' });
      return;
    }

    setPaying(true);
    try {
      const result = await requestPay({
        orderType: 'task',
        businessId: String(task.id),
        amount,
        description: task.title || '有应帮任务支付',
      });
      if (!result.success) {
        Taro.showToast({ title: result.errorMsg || '支付失败', icon: 'none' });
        return;
      }
      if (result.orderId) {
        setPollingOrderId(result.orderId);
        Taro.showLoading({ title: '确认支付结果...' });
        const stopPoll = pollPayStatus(
          result.orderId,
          () => {
            stopPoll();
            Taro.hideLoading();
            setPollingOrderId(null);
            Taro.showToast({ title: '支付成功', icon: 'success' });
            Taro.switchTab({ url: '/pages/orders/index' });
          },
          () => {
            Taro.hideLoading();
            setPollingOrderId(null);
            Taro.showToast({ title: '支付确认超时，请查看订单', icon: 'none' });
          },
        );
      }
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <View className="pay-page pay-center-page">
        <View className="pay-loading-card">
          <View className="pay-loading-icon">
            <LockKeyhole size={44} color="#FF6A00" />
          </View>
          <Text className="pay-loading-text">正在加载支付信息...</Text>
          <Text className="pay-loading-sub">系统会先确认真实任务，再允许发起托管支付</Text>
        </View>
      </View>
    );
  }

  if (!task) {
    return (
      <View className="pay-page">
        <PaymentNav />
        <View className="pay-empty-wrap">
          <View className="pay-empty-card">
            <View className="pay-empty-icon">
              <LockKeyhole size={58} color="#B87920" />
            </View>
            <Text className="pay-empty-title">支付信息暂不可用</Text>
            <Text className="pay-empty-desc">没有找到对应任务，请从需求详情页重新进入支付。平台不会在缺少真实任务和订单时发起扣款。</Text>
            <View className="pay-empty-flow">
              <FlowStep title="选择需求" done />
              <FlowStep title="确认报价" active />
              <FlowStep title="支付托管" />
              <FlowStep title="验收结算" />
            </View>
            <View className="pay-empty-actions">
              <View className="pay-empty-primary" onClick={() => Taro.switchTab({ url: '/pages/tasks/index' })}>
                <Wallet size={22} color="#FFFFFF" />
                <Text className="pay-empty-primary-text">返回任务大厅</Text>
              </View>
              <View className="pay-empty-secondary" onClick={() => Taro.navigateTo({ url: '/pages/ai-assistant/index?scene=pay-empty' })}>
                <ShieldCheck size={22} color="#FF4D19" />
                <Text className="pay-empty-secondary-text">问托管规则</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  }

  const amount = getTaskAmountYuan(task);
  const amountText = formatAmount(amount);
  const category = firstText(task.task_categories?.name, task.category, task.category_name) || '任务服务';
  const providerName = firstText(
    task.worker?.nickname,
    task.provider?.nickname,
    task.provider?.name,
    task.provider_name,
    task.worker_name,
  );
  const publisherName = firstText(task.users?.nickname, task.user?.nickname, task.publisher_name) || '需求方';
  const displayPerson = providerName || publisherName;
  const personRole = providerName ? '服务者' : '需求方';
  const serviceType = task.service_type === 'offline' ? '同城服务' : '线上服务';
  const serviceTime = firstText(task.deadline, task.appointment_time, task.service_time, task.created_at) || '以任务详情为准';
  const orderNo = firstText(task.order_no, task.orderNo, task.pay_order_no, task.id) || String(task.id || '');
  const payLocked = Boolean(paying || pollingOrderId);
  const confirmText = pollingOrderId ? '确认支付中...' : paying ? '拉起微信支付...' : '确认支付并托管';

  return (
    <View className="pay-page">
      <PaymentNav />

      <View className="pay-safe-strip">
        <View className="pay-safe-left">
          <LockKeyhole size={20} color="#FF4D19" />
          <Text className="pay-safe-text">平台资金托管 · 验收满意后服务商才能收款</Text>
        </View>
        <View className="pay-safe-right">
          <ShieldCheck size={20} color="#FF4D19" />
          <Text className="pay-safe-text pay-safe-text-orange">有应帮担保交易</Text>
        </View>
      </View>

      <View className="pay-order-card">
        <View className="pay-service-icon">
          <HomeCleanIcon />
        </View>
        <View className="pay-order-main">
          <View className="pay-order-title-row">
            <Text className="pay-order-title">{task.title || '未命名任务'}</Text>
            <Text className="pay-order-status">待支付</Text>
          </View>
          <View className="pay-tags">
            <Text className="pay-tag">{category}</Text>
            <Text className="pay-tag">{serviceType}</Text>
          </View>
          <View className="pay-provider">
            <View className="pay-provider-avatar">
              <Text className="pay-provider-avatar-text">{displayPerson.slice(0, 1)}</Text>
            </View>
            <Text className="pay-provider-name">{displayPerson}</Text>
            <Text className="pay-provider-badge">{personRole}</Text>
            <Star size={18} color="#FF9F0A" filled />
            <Text className="pay-provider-score">平台托管</Text>
          </View>
          <View className="pay-time">
            <Clock size={20} color="#6B7280" />
            <Text className="pay-time-text">{serviceTime}</Text>
          </View>
        </View>
        <View className="pay-order-price">
          <Text className="pay-price">{amountText}</Text>
          <View className="pay-order-no" onClick={copyTaskId}>
            <Text className="pay-order-no-text">订单号：{orderNo}</Text>
            <Copy size={18} color="#6B7280" />
          </View>
        </View>
      </View>

      <View className="pay-card">
        <View className="pay-card-head">
          <Text className="pay-card-title">费用明细</Text>
          <View className="pay-rule">
            <Text className="pay-rule-text">费用规则</Text>
            <ChevronRight size={20} color="#6B7280" />
          </View>
        </View>
        <FeeLine label="任务预算" value={amountText} />
        <FeeLine label="优惠券抵扣" value="暂无可用优惠券" />
        <FeeLine label="平台服务保障" value="托管验收后结算" tag="后端为准" info />
        <View className="pay-dashed" />
        <View className="pay-total-row">
          <Text className="pay-total-label">实付款（资金托管）</Text>
          <Text className="pay-total-value">{amountText}</Text>
        </View>
      </View>

      <View className="pay-escrow-card">
        <View className="pay-shield-visual">
          <View className="pay-shield-halo" />
          <LockKeyhole size={58} color="#FFFFFF" />
        </View>
        <View className="pay-escrow-main">
          <Text className="pay-escrow-title">资金托管 / 验收后付款</Text>
          <View className="pay-flow">
            <FlowStep title="支付托管" done />
            <FlowStep title="服务进行中" />
            <FlowStep title="验收通过" active />
            <FlowStep title="服务商收款" />
          </View>
          {[
            '您的费用将由平台托管，服务完成并验收通过后才会支付给服务者',
            '若服务不满意，可发起售后，平台将协助您处理',
            '全程保障资金安全，让您放心下单',
          ].map((item) => (
            <View className="pay-escrow-line" key={item}>
              <CircleCheck size={18} color="#FF6A00" />
              <Text className="pay-escrow-line-text">{item}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className="pay-card pay-method-card">
        <View className="pay-card-head">
          <Text className="pay-card-title">支付方式</Text>
          <View className="pay-rule">
            <ShieldCheck size={20} color="#6B7280" />
            <Text className="pay-rule-text">安全加密，保障资金安全</Text>
          </View>
        </View>
        <PayMethodRow icon={Wallet} title="微信支付" note="推荐" active={method === 'wechat'} tone="green" onClick={() => selectPayMethod('wechat')} />
        <PayMethodRow icon={CreditCard} title="余额支付" desc="待钱包支付后端开通" active={method === 'balance'} tone="orange" disabled onClick={() => selectPayMethod('balance')} />
        <PayMethodRow icon={CircleDollarSign} title="优惠券" desc="暂无可用优惠券" active={method === 'coupon'} tone="red" disabled arrow onClick={() => selectPayMethod('coupon')} />
      </View>

      <View className="pay-service-guarantee">
        <Guarantee icon={ShieldCheck} title="资金托管" desc="平台托管资金，验收后才付款" />
        <Guarantee icon={Star} title="双向评价" desc="服务完成可评价，真实透明" />
        <Guarantee icon={BadgeCheck} title="售后保障" desc="不满意可申请售后，平台协助处理" />
      </View>

      <View className="pay-bottom-space" />

      <View className="pay-bottom-bar">
        <View className="pay-bottom-left">
          <Text className="pay-bottom-label">实付款（资金托管）</Text>
          <Text className="pay-bottom-price">{amountText}</Text>
          <View className="pay-bottom-detail">
            <Text className="pay-bottom-detail-text">费用明细</Text>
            <ChevronRight size={18} color="#6B7280" />
          </View>
        </View>
        <View className={`pay-confirm ${!agreed || payLocked ? 'pay-confirm-disabled' : ''}`} onClick={submitPay}>
          <Text className="pay-confirm-text">{confirmText}</Text>
        </View>
        <View className="pay-agree" onClick={() => setAgreed(!agreed)}>
          <View className={`pay-agree-check ${agreed ? 'pay-agree-check-active' : ''}`}>
            {agreed ? <CircleCheck size={16} color="#FFFFFF" /> : null}
          </View>
          <Text className="pay-agree-text">我已阅读并同意《有应帮服务协议》《资金托管服务规则》</Text>
        </View>
      </View>
    </View>
  );
}

function PaymentNav() {
  return (
    <View className="pay-nav">
      <View className="pay-back" onClick={goBack}>
        <ArrowLeft size={30} color="#081A3A" />
      </View>
      <Text className="pay-nav-title">确认支付</Text>
      <View className="pay-menu-pill">
        <Text className="pay-menu-dot">•••</Text>
        <Text className="pay-menu-line">—</Text>
        <Text className="pay-menu-circle">◎</Text>
      </View>
    </View>
  );
}

function HomeCleanIcon() {
  return <ShieldCheck size={56} color="#22C55E" />;
}

function FeeLine({ label, value, green, tag, info }: { label: string; value: string; green?: boolean; tag?: string; info?: boolean }) {
  return (
    <View className="pay-fee-line">
      <View className="pay-fee-label-wrap">
        <Text className="pay-fee-label">{label}</Text>
        {tag ? <Text className="pay-fee-tag">{tag}</Text> : null}
        {info ? <Text className="pay-fee-info">i</Text> : null}
      </View>
      <Text className={`pay-fee-value ${green ? 'pay-fee-value-green' : ''}`}>{value}</Text>
    </View>
  );
}

function FlowStep({ title, done, active }: { title: string; done?: boolean; active?: boolean }) {
  return (
    <View className="pay-flow-step">
      <View className={`pay-flow-dot ${done ? 'pay-flow-dot-done' : ''} ${active ? 'pay-flow-dot-active' : ''}`}>
        {done || active ? <CircleCheck size={20} color="#FFFFFF" /> : null}
      </View>
      <Text className={`pay-flow-title ${active ? 'pay-flow-title-active' : ''}`}>{title}</Text>
    </View>
  );
}

function PayMethodRow({ icon: Icon, title, desc, note, active, arrow, tone = 'green', disabled, onClick }: {
  icon: any;
  title: string;
  desc?: string;
  note?: string;
  active?: boolean;
  arrow?: boolean;
  tone?: 'green' | 'orange' | 'red';
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <View className={`pay-method-row ${disabled ? 'pay-method-row-disabled' : ''}`} onClick={onClick}>
      <View className={`pay-method-icon pay-method-icon-${tone}`}>
        <Icon size={28} color="#FFFFFF" />
      </View>
      <View className="pay-method-main">
        <View className="pay-method-title-row">
          <Text className="pay-method-title">{title}</Text>
          {note ? <Text className="pay-method-note">{note}</Text> : null}
        </View>
        {desc ? <Text className="pay-method-desc">{desc}</Text> : null}
      </View>
      {arrow ? <ChevronRight size={22} color="#6B7280" /> : null}
      <View className={`pay-radio ${active ? 'pay-radio-active' : ''}`}>
        {active ? <View className="pay-radio-inner" /> : null}
      </View>
    </View>
  );
}

function Guarantee({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <View className="pay-guarantee">
      <View className="pay-guarantee-icon">
        <Icon size={34} color="#FF6A00" />
      </View>
      <View className="pay-guarantee-copy">
        <Text className="pay-guarantee-title">{title}</Text>
        <Text className="pay-guarantee-desc">{desc}</Text>
      </View>
    </View>
  );
}
