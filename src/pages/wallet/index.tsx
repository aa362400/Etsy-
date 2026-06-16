import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  ChevronRight,
  CircleCheck,
  CircleDollarSign,
  Clock,
  CreditCard,
  Headphones,
  RefreshCw,
  ShieldCheck,
  Wallet,
} from 'lucide-react-taro';
import AiMascot from '@/components/AiMascot';
import AiChatWidget from '@/components/ai-chat-widget';
import { Input } from '@/components/ui/input';
import { Network } from '@/network';
import { getToken } from '@/lib/auth';
import { requestPay, pollPayStatus } from '@/utils/payment';
import './index.css';

const PRESET_AMOUNTS = ['10', '50', '100', '200', '500'];

const TRANSACTION_LABELS: Record<string, string> = {
  recharge: '钱包充值',
  withdraw: '提现申请',
  settlement: '佣金结算',
  refund: '订单退款',
  payment: '订单支付',
  deposit: '保证金',
};

const goBack = () => {
  const pages = Taro.getCurrentPages();
  if (pages.length > 1) {
    Taro.navigateBack();
    return;
  }
  Taro.switchTab({ url: '/pages/profile/index' });
};

const getWalletTransactions = (walletData: any): any[] => {
  const raw = walletData?.transactions || walletData?.records || walletData?.items || walletData?.logs || [];
  return Array.isArray(raw) ? raw.filter(Boolean) : [];
};

const getTransactionTitle = (item: any) =>
  item.title || item.description || item.remark || TRANSACTION_LABELS[item.type] || '资金变动';

const getTransactionTime = (item: any) => {
  const raw = item.created_at || item.createdAt || item.time || item.updated_at;
  if (!raw) return '时间待同步';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return String(raw);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const getTransactionAmountCents = (item: any) => {
  if (item.amount_cents !== undefined) return Number(item.amount_cents);
  if (item.amount !== undefined) return Number(item.amount);
  if (item.value !== undefined) return Number(item.value);
  return 0;
};

const WalletPage = () => {
  const [walletData, setWalletData] = useState<any>(null);
  const [showRecharge, setShowRecharge] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [recharging, setRecharging] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [pollingOrderId, setPollingOrderId] = useState<string | null>(null);
  const [aiChatVisible, setAiChatVisible] = useState(false);

  useEffect(() => {
    loadWallet();
  }, []);

  const loadWallet = async () => {
    try {
      const res = await Network.request({
        url: '/api/wallet',
        header: { authorization: `Bearer ${getToken()}` },
      });
      if (res.data?.data) setWalletData(res.data.data);
    } catch (err) {
      console.error('加载钱包失败', err);
    }
  };

  const handleRecharge = async () => {
    const amount = parseFloat(rechargeAmount);
    if (!amount || amount <= 0) {
      Taro.showToast({ title: '请输入有效金额', icon: 'none' });
      return;
    }
    if (amount > 50000) {
      Taro.showToast({ title: '单次充值不能超过 50000 元', icon: 'none' });
      return;
    }

    setRecharging(true);
    try {
      const result = await requestPay({
        orderType: 'wallet_recharge',
        amount,
        description: `钱包充值 ${amount} 元`,
      });

      if (!result.success) {
        Taro.showToast({ title: result.errorMsg || '支付失败', icon: 'none' });
        setRecharging(false);
        return;
      }

      if (result.orderId) {
        setPollingOrderId(result.orderId);
        Taro.showLoading({ title: '确认支付结果...' });
        const stopPoll = pollPayStatus(
          result.orderId,
          async () => {
            Taro.hideLoading();
            stopPoll();
            setPollingOrderId(null);
            setShowRecharge(false);
            setRechargeAmount('');
            await loadWallet();
            Taro.showToast({ title: '充值成功！', icon: 'success' });
          },
          () => {
            Taro.hideLoading();
            setPollingOrderId(null);
            Taro.showToast({ title: '支付确认超时，请查看订单', icon: 'none' });
          },
          30,
          2000,
        );
      } else {
        Taro.showToast({ title: '请在微信中确认支付', icon: 'none' });
        setShowRecharge(false);
        setRechargeAmount('');
      }
    } catch (e: any) {
      Taro.showToast({ title: e.message || '充值失败', icon: 'none' });
    } finally {
      setRecharging(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      Taro.showToast({ title: '请输入有效提现金额', icon: 'none' });
      return;
    }
    const token = getToken();
    if (!token) {
      Taro.showToast({ title: '请先登录后再提现', icon: 'none' });
      return;
    }

    setWithdrawing(true);
    try {
      const res = await Network.request({
        url: '/api/wallet/withdraw',
        method: 'POST',
        header: { authorization: `Bearer ${token}` },
        data: {
          amount: Math.round(amount * 100),
          method: 'wechat',
        },
      });
      const body = res.data as any;
      if (body?.code !== 200) {
        throw new Error(body?.msg || '提现申请失败');
      }
      setShowWithdraw(false);
      setWithdrawAmount('');
      await loadWallet();
      Taro.showToast({ title: body?.msg?.includes('审核') ? '已提交审核' : '提现申请已提交', icon: 'success' });
    } catch (e: any) {
      Taro.showToast({ title: e?.message || '提现申请失败', icon: 'none' });
    } finally {
      setWithdrawing(false);
    }
  };

  const formatAmount = (cents: number) => `¥${((Number(cents) || 0) / 100).toFixed(2)}`;
  const formatAmountYuan = (yuan: number) => `¥${(yuan || 0).toFixed(2)}`;
  const balance = walletData ? formatAmount(walletData.balance || 0) : '¥0.00';
  const pending = walletData ? formatAmount(walletData.pending_settlement || 0) : '¥0.00';
  const deposit = walletData ? formatAmount(walletData.deposit || 0) : '¥0.00';
  const transactions = getWalletTransactions(walletData);

  return (
    <View className="wallet-page">
      <View className="wallet-nav">
        <View className="wallet-back" onClick={goBack}>
          <ArrowLeft size={30} color="#081A3A" />
        </View>
        <Text className="wallet-nav-title">我的钱包</Text>
        <View className="wallet-menu-pill">
          <Text className="wallet-menu-dot">•••</Text>
          <Text className="wallet-menu-line">—</Text>
          <Text className="wallet-menu-circle">◎</Text>
        </View>
      </View>

      <View className="wallet-hero">
        <View className="wallet-hero-copy">
          <Text className="wallet-kicker">资金托管钱包</Text>
          <Text className="wallet-balance">{balance}</Text>
          <Text className="wallet-desc">可用余额由后端和微信支付回调更新，前端仅展示结果。</Text>
          <View className="wallet-hero-badges">
            <Text className="wallet-hero-badge">微信支付回调入账</Text>
            <Text className="wallet-hero-badge">异常可追溯</Text>
          </View>
        </View>
        <View className="wallet-hero-visual">
          <AiMascot size="lg" pose="point" />
          <View className="wallet-coin-card">
            <Wallet size={30} color="#FFFFFF" />
          </View>
        </View>
      </View>

      <View className="wallet-stats">
        <MoneyStat icon={Clock} label="待结算" value={pending} color="#FF8A00" />
        <MoneyStat icon={ShieldCheck} label="保证金" value={deposit} color="#17B978" />
        <MoneyStat icon={CreditCard} label="支付通道" value="微信" color="#FF8A00" />
      </View>

      <View className="wallet-actions-card">
        <View className="wallet-action wallet-action-primary" onClick={() => setShowRecharge(!showRecharge)}>
          <Wallet size={28} color="#FFFFFF" />
          <Text className="wallet-action-primary-text">{showRecharge ? '收起充值' : '钱包充值'}</Text>
        </View>
        <View
          className="wallet-action wallet-action-outline"
          onClick={() => setShowWithdraw(!showWithdraw)}
        >
          <ArrowUpRight size={28} color="#FF4D19" />
          <Text className="wallet-action-outline-text">{showWithdraw ? '收起提现' : '申请提现'}</Text>
        </View>
      </View>

      {showRecharge ? (
        <View className="wallet-card">
          <View className="wallet-card-head">
            <View>
              <Text className="wallet-card-title">充值金额</Text>
              <Text className="wallet-card-sub">请选择金额或输入自定义金额</Text>
            </View>
            <CircleDollarSign size={28} color="#FF4D19" />
          </View>

          <View className="wallet-amount-grid">
            {PRESET_AMOUNTS.map((amount) => (
              <View
                key={amount}
                className={`wallet-amount-chip ${rechargeAmount === amount ? 'wallet-amount-chip-active' : ''}`}
                onClick={() => setRechargeAmount(amount)}
              >
                <Text className={`wallet-amount-text ${rechargeAmount === amount ? 'wallet-amount-text-active' : ''}`}>¥{amount}</Text>
              </View>
            ))}
            <View
              className={`wallet-amount-chip ${!PRESET_AMOUNTS.includes(rechargeAmount) && rechargeAmount ? 'wallet-amount-chip-active' : ''}`}
              onClick={() => setRechargeAmount('')}
            >
              <Text className="wallet-amount-text">自定义</Text>
            </View>
          </View>

          <View className="wallet-input-wrap">
            <Text className="wallet-yuan">¥</Text>
            <Input
              className="wallet-input"
              type="digit"
              placeholder="输入充值金额（元）"
              value={rechargeAmount}
              onInput={(e) => setRechargeAmount(e.detail.value)}
            />
          </View>

          <View className="wallet-safe-tip">
            <ShieldCheck size={20} color="#17B978" />
            <Text className="wallet-safe-tip-text">支持 0.01 元测试单；余额只能通过后端支付回调入账。</Text>
          </View>

          <View
            className={`wallet-recharge-btn ${(recharging || pollingOrderId) ? 'wallet-recharge-btn-loading' : ''}`}
            onClick={(recharging || pollingOrderId) ? undefined : handleRecharge}
          >
            <RefreshCw size={24} color="#FFFFFF" />
            <Text className="wallet-recharge-btn-text">
              {pollingOrderId ? '确认支付中...' : recharging ? '拉起支付...' : `确认充值 ${rechargeAmount ? formatAmountYuan(parseFloat(rechargeAmount)) : ''}`}
            </Text>
          </View>
        </View>
      ) : null}

      {showWithdraw ? (
        <View className="wallet-card">
          <View className="wallet-card-head">
            <View>
              <Text className="wallet-card-title">提现申请</Text>
              <Text className="wallet-card-sub">提交后进入后端风控和人工审核流程</Text>
            </View>
            <ArrowUpRight size={28} color="#FF4D19" />
          </View>

          <View className="wallet-input-wrap">
            <Text className="wallet-yuan">¥</Text>
            <Input
              className="wallet-input"
              type="digit"
              placeholder="输入提现金额（元）"
              value={withdrawAmount}
              onInput={(e) => setWithdrawAmount(e.detail.value)}
            />
          </View>

          <View className="wallet-safe-tip">
            <ShieldCheck size={20} color="#17B978" />
            <Text className="wallet-safe-tip-text">提现金额、余额校验、频率限制和审核结果全部以后端接口为准。</Text>
          </View>

          <View
            className={`wallet-recharge-btn ${withdrawing ? 'wallet-recharge-btn-loading' : ''}`}
            onClick={withdrawing ? undefined : handleWithdraw}
          >
            <ArrowUpRight size={24} color="#FFFFFF" />
            <Text className="wallet-recharge-btn-text">{withdrawing ? '提交中...' : '提交提现申请'}</Text>
          </View>
        </View>
      ) : null}

      <View className="wallet-ai-card" onClick={() => setAiChatVisible(true)}>
        <View className="wallet-ai-copy">
          <Text className="wallet-ai-title">AI 资金助手</Text>
          <Text className="wallet-ai-desc">充值、提现、保证金和结算规则不清楚？让小应先帮你解释。</Text>
        </View>
        <AiMascot size="md" pose="point" />
      </View>

      <View className="wallet-card">
        <View className="wallet-card-head">
          <Text className="wallet-card-title">收支明细</Text>
          <View className="wallet-refresh" onClick={loadWallet}>
            <RefreshCw size={20} color="#6B7280" />
            <Text className="wallet-refresh-text">刷新</Text>
          </View>
        </View>
        <View className="wallet-empty">
          {transactions.length ? (
            transactions.slice(0, 6).map((item, index) => {
              const amountCents = getTransactionAmountCents(item);
              const isIncome = amountCents >= 0;
              return (
                <View className="wallet-record" key={item.id || `${item.type || 'record'}-${index}`}>
                  <View className={`wallet-record-icon ${isIncome ? 'is-income' : 'is-expense'}`}>
                    {isIncome ? <ArrowUpRight size={22} color="#17B978" /> : <CreditCard size={22} color="#FF4D19" />}
                  </View>
                  <View className="wallet-record-main">
                    <Text className="wallet-record-title">{getTransactionTitle(item)}</Text>
                    <Text className="wallet-record-time">{getTransactionTime(item)}</Text>
                  </View>
                  <Text className={`wallet-record-amount ${isIncome ? 'is-income' : 'is-expense'}`}>
                    {isIncome ? '+' : '-'}{formatAmount(Math.abs(amountCents))}
                  </Text>
                </View>
              );
            })
          ) : (
            <>
              <CircleCheck size={44} color="#D6DCE8" />
              <Text className="wallet-empty-title">暂无收支记录</Text>
              <Text className="wallet-empty-desc">充值、提现、佣金结算和退款记录会出现在这里。</Text>
            </>
          )}
        </View>
      </View>

      <View className="wallet-safe-grid">
        <Guarantee icon={ShieldCheck} title="资金托管" desc="平台托管，验收后结算" />
        <Guarantee icon={BadgeCheck} title="实名保障" desc="关键操作留痕可追溯" />
        <Guarantee icon={Headphones} title="售后协助" desc="异常订单客服介入" />
      </View>
      <AiChatWidget
        visible={aiChatVisible}
        onClose={() => setAiChatVisible(false)}
        context={{
          scene: 'wallet',
          title: '钱包资金助手',
          description: '解释充值、提现、保证金、佣金结算和退款记录，所有资金结果以后端和微信支付回调为准。',
          budget: balance,
          status: showRecharge ? 'recharge' : showWithdraw ? 'withdraw' : 'overview',
        }}
        initialIntent="order_followup"
      />
    </View>
  );
};

function MoneyStat({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <View className="wallet-stat">
      <Icon size={25} color={color} />
      <Text className="wallet-stat-value">{value}</Text>
      <Text className="wallet-stat-label">{label}</Text>
    </View>
  );
}

function Guarantee({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <View className="wallet-guarantee">
      <View className="wallet-guarantee-icon">
        <Icon size={30} color="#FF6A00" />
      </View>
      <View>
        <Text className="wallet-guarantee-title">{title}</Text>
        <Text className="wallet-guarantee-desc">{desc}</Text>
      </View>
      <ChevronRight size={20} color="#CBD1DC" />
    </View>
  );
}

export default WalletPage;
