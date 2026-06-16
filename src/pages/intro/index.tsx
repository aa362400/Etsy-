/**
 * 有应帮 - 启动介绍页
 */
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { Bot, ChevronRight, ClipboardList, MessageCircle, ShieldCheck, Sparkles, Users } from 'lucide-react-taro';
import AiMascot from '@/components/AiMascot';
import './index.css';

const FEATURES = [
  { icon: ClipboardList, title: '发布需求', desc: '一句话说清需求，AI帮你补全细节', tone: 'orange' },
  { icon: Users, title: '附近响应', desc: '服务者主动接单或报价，进度更透明', tone: 'blue' },
  { icon: ShieldCheck, title: '资金托管', desc: '平台托管，验收满意后再结算', tone: 'green' },
  { icon: MessageCircle, title: '客服协助', desc: '订单、退款、纠纷都能跟进处理', tone: 'purple' },
];

const STEPS = ['发需求', '等报价', '确认服务', '验收付款'];

export default function IntroPage() {
  const handleExperience = () => {
    Taro.switchTab({ url: '/pages/home/index' });
  };

  const handleSkip = () => {
    Taro.switchTab({ url: '/pages/tasks/index' });
  };

  return (
    <View className="intro-page">
      <View className="intro-top">
        <View className="intro-brand">
          <Text className="intro-brand-main">有应</Text>
          <Text className="intro-brand-accent">帮</Text>
        </View>
        <Text className="intro-slogan">让需求被看见，让技能被回应</Text>
        <View className="intro-menu-pill">
          <Text className="intro-menu-dot">•••</Text>
          <Text className="intro-menu-line">—</Text>
          <Text className="intro-menu-circle">◎</Text>
        </View>
      </View>

      <View className="intro-hero">
        <View className="intro-hero-copy">
          <Text className="intro-kicker">任务撮合 · 本地生活 · 安全交易</Text>
          <Text className="intro-title">有需求，马上有人应</Text>
          <Text className="intro-desc">发布跑腿、保洁、维修、设计、代办等需求，附近服务者主动接单或报价，平台托管资金更安心。</Text>
          <View className="intro-ai-pill">
            <Bot size={22} color="#FFFFFF" />
            <Text className="intro-ai-pill-text">AI 小应会帮你估价、补全需求、规避风险</Text>
          </View>
        </View>
        <AiMascot size="xl" pose="cheer" />
      </View>

      <View className="intro-step-card">
        {STEPS.map((step, index) => (
          <View className="intro-step" key={step}>
            <View className={`intro-step-dot ${index === 0 ? 'intro-step-dot-active' : ''}`}>
              <Text className={`intro-step-num ${index === 0 ? 'intro-step-num-active' : ''}`}>{index + 1}</Text>
            </View>
            <Text className={`intro-step-text ${index === 0 ? 'intro-step-text-active' : ''}`}>{step}</Text>
          </View>
        ))}
      </View>

      <View className="intro-feature-grid">
        {FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <View className="intro-feature" key={feature.title}>
              <View className={`intro-feature-icon intro-tone-${feature.tone}`}>
                <Icon size={34} color="#FF4D19" />
              </View>
              <Text className="intro-feature-title">{feature.title}</Text>
              <Text className="intro-feature-desc">{feature.desc}</Text>
            </View>
          );
        })}
      </View>

      <View className="intro-trust-card">
        <View className="intro-trust-copy">
          <Text className="intro-trust-title">先跑通核心功能，再上正式生产</Text>
          <Text className="intro-trust-desc">微信登录、实名风控、订单验收、钱包佣金、AI客服都会围绕真实业务流程逐步完善。</Text>
        </View>
        <Sparkles size={38} color="#FF4D19" />
      </View>

      <View className="intro-bottom">
        <View className="intro-primary-btn" onClick={handleExperience}>
          <Text className="intro-primary-text">立即体验有应帮</Text>
          <ChevronRight size={28} color="#FFFFFF" />
        </View>
        <View className="intro-secondary-btn" onClick={handleSkip}>
          <Text className="intro-secondary-text">先看看需求广场</Text>
        </View>
      </View>
    </View>
  );
}
