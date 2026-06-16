import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useState } from 'react';
import { ArrowLeft, Flag, Headphones, ShieldAlert, ShieldCheck, TriangleAlert } from 'lucide-react-taro';
import AiMascot from '@/components/AiMascot';
import { Textarea } from '@/components/ui/textarea';
import { getToken } from '@/lib/auth';
import { Network } from '@/network';
import './index.css';

const REPORT_REASONS = [
  '违法违规任务',
  '抢票/黄牛/刷单',
  '账号代登/绕过验证',
  '虚假信息/欺诈',
  '诱导线下交易',
  '侵犯隐私',
  '其他',
];

const goBack = () => {
  const pages = Taro.getCurrentPages();
  if (pages.length > 1) {
    Taro.navigateBack();
    return;
  }
  Taro.switchTab({ url: '/pages/home/index' });
};

const ReportPage = () => {
  const [reason, setReason] = useState('');
  const [detail, setDetail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [targetType, setTargetType] = useState('task');
  const [targetId, setTargetId] = useState('');

  useEffect(() => {
    const params = Taro.getCurrentInstance().router?.params;
    if (params?.targetType) setTargetType(params.targetType);
    if (params?.targetId) setTargetId(params.targetId);
  }, []);

  const handleSubmit = async () => {
    if (!reason) {
      Taro.showToast({ title: '请选择举报原因', icon: 'none' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await Network.request({
        url: '/api/reports',
        method: 'POST',
        data: { target_type: targetType, target_id: targetId, reason, detail: detail.trim() },
        header: { authorization: `Bearer ${getToken()}` },
      });
      if (res.data?.data) {
        Taro.showToast({ title: '举报已提交', icon: 'success' });
        setTimeout(() => Taro.navigateBack(), 1500);
      }
    } catch {
      Taro.showToast({ title: '提交失败', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="report-page">
      <View className="report-nav">
        <View className="report-back" onClick={goBack}>
          <ArrowLeft size={30} color="#081A3A" />
        </View>
        <Text className="report-nav-title">举报与风控</Text>
        <View className="report-menu-pill">
          <Text className="report-menu-dot">•••</Text>
          <Text className="report-menu-line">—</Text>
          <Text className="report-menu-circle">◎</Text>
        </View>
      </View>

      <View className="report-hero">
        <View className="report-hero-copy">
          <Text className="report-kicker">平台安全中心</Text>
          <Text className="report-title">发现违规，及时举报</Text>
          <Text className="report-desc">举报将在 1-3 个工作日内处理，请尽量提供清晰原因和凭证，帮助平台保护真实用户。</Text>
        </View>
        <AiMascot size="lg" pose="point" />
      </View>

      <View className="report-alert">
        <TriangleAlert size={24} color="#EF4444" />
        <Text className="report-alert-text">禁止抢票外挂、刷单、账号代登、绕过验证、诱导线下交易等高风险任务。</Text>
      </View>

      <View className="report-card">
        <View className="report-card-head">
          <View className="report-title-icon">
            <ShieldAlert size={24} color="#FF4D19" />
            <Text className="report-card-title">举报原因</Text>
          </View>
          <Text className="report-required">必选</Text>
        </View>
        <View className="report-reason-grid">
          {REPORT_REASONS.map((item) => (
            <View
              key={item}
              className={`report-reason ${reason === item ? 'report-reason-active' : ''}`}
              onClick={() => setReason(item)}
            >
              <Text className={`report-reason-text ${reason === item ? 'report-reason-text-active' : ''}`}>{item}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className="report-card">
        <View className="report-card-head">
          <View className="report-title-icon">
            <Flag size={24} color="#FF4D19" />
            <Text className="report-card-title">补充说明</Text>
          </View>
          <Text className="report-counter">{detail.length}/500</Text>
        </View>
        <Textarea
          className="report-textarea"
          placeholder="请说明发生了什么，例如：对方诱导线下付款、发布违法任务、泄露隐私等。"
          value={detail}
          onInput={(e) => setDetail(e.detail.value)}
          maxlength={500}
        />
      </View>

      <View className="report-safe-card">
        <ShieldCheck size={26} color="#17B978" />
        <View className="report-safe-main">
          <Text className="report-safe-title">举报信息会严格保密</Text>
          <Text className="report-safe-desc">平台会结合任务内容、聊天记录、支付状态和风控规则进行审核。</Text>
        </View>
      </View>

      <View className="report-bottom-space" />

      <View className="report-bottom-bar">
        <View className="report-bottom-outline" onClick={() => Taro.navigateTo({ url: '/pages/chat/index?id=staff&name=平台客服' })}>
          <Headphones size={26} color="#FF4D19" />
          <Text className="report-bottom-outline-text">联系客服</Text>
        </View>
        <View className={`report-bottom-fill ${reason && !submitting ? '' : 'report-bottom-disabled'}`} onClick={reason && !submitting ? handleSubmit : undefined}>
          <Flag size={26} color="#FFFFFF" />
          <Text className="report-bottom-fill-text">{submitting ? '提交中...' : '提交举报'}</Text>
        </View>
      </View>
    </View>
  );
};

export default ReportPage;
