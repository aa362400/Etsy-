import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { ArrowLeft, BadgeCheck, FileText, Scale, Shield, ShieldCheck } from 'lucide-react-taro';
import AiMascot from '@/components/AiMascot';
import './index.css';

const SECTIONS = [
  {
    icon: FileText,
    title: '用户协议',
    tone: 'orange',
    items: [
      '本平台为合法任务撮合平台，仅提供信息发布与撮合服务。',
      '用户须遵守国家法律法规，不得发布或接取违法违规任务。',
      '禁止发布任务类型包括但不限于：抢票外挂、绕过验证码、账号代登、刷单、倒卖票券等。',
      '平台采用合规支付方案，不私设资金池，支付担保分账均由合规支付机构处理。',
      '客户确认完成后结算，超时自动验收，可发起仲裁，评价不作为唯一结算条件。',
    ],
  },
  {
    icon: ShieldCheck,
    title: '服务方接单规范',
    tone: 'green',
    items: [
      '服务方须完成实名认证并缴纳保证金后方可接单。',
      '接单后须按任务要求提供合法合规服务。',
      '禁止绕过平台进行线下交易。',
      '不得泄露客户隐私信息。',
      '违规者将面临暂停接单、冻结保证金、仲裁处理等处罚。',
    ],
  },
  {
    icon: FileText,
    title: '退款规则',
    tone: 'blue',
    items: [
      '客户可申请退款，服务方可同意或拒绝。',
      '双方无法达成一致时，可发起平台仲裁。',
      '仲裁结果可裁定全额退款、部分退款或驳回。',
      '退款时按实际完成情况处理平台服务费。',
    ],
  },
  {
    icon: Scale,
    title: '仲裁规则',
    tone: 'purple',
    items: [
      '交易双方无法协商一致时可发起仲裁。',
      '平台管理员将查看任务描述、聊天记录、完成凭证、支付记录等信息。',
      '管理员可裁定：全额退款、部分退款、驳回退款、继续修改、扣除保证金。',
      '所有仲裁操作生成操作日志，确保可追溯。',
    ],
  },
  {
    icon: Shield,
    title: '隐私政策',
    tone: 'gray',
    items: [
      '平台最小化采集用户隐私数据。',
      '身份证号、手机号、支付账号等敏感信息必须加密存储，不得明文保存。',
      '用户数据仅用于平台服务提供和合规要求。',
      '未经用户授权，不得向第三方共享用户数据。',
      '用户有权查询、更正、删除其个人信息。',
    ],
  },
];

const goBack = () => {
  const pages = Taro.getCurrentPages();
  if (pages.length > 1) {
    Taro.navigateBack();
    return;
  }
  Taro.switchTab({ url: '/pages/profile/index' });
};

const AgreementPage = () => {
  return (
    <View className="agreement-page">
      <View className="agreement-nav">
        <View className="agreement-back" onClick={goBack}>
          <ArrowLeft size={30} color="#081A3A" />
        </View>
        <Text className="agreement-nav-title">平台规则</Text>
        <View className="agreement-menu-pill">
          <Text className="agreement-menu-dot">•••</Text>
          <Text className="agreement-menu-line">—</Text>
          <Text className="agreement-menu-circle">◎</Text>
        </View>
      </View>

      <View className="agreement-hero">
        <View className="agreement-copy">
          <Text className="agreement-kicker">有应帮服务协议</Text>
          <Text className="agreement-title">规则清楚，交易才安心</Text>
          <Text className="agreement-desc">围绕任务发布、服务接单、资金托管、退款仲裁和隐私保护，统一平台处理标准。</Text>
        </View>
        <AiMascot size="lg" pose="cheer" />
      </View>

      <View className="agreement-safe-card">
        <BadgeCheck size={28} color="#17B978" />
        <View className="agreement-safe-main">
          <Text className="agreement-safe-title">重点提醒</Text>
          <Text className="agreement-safe-desc">所有价格、退款、佣金和保证金以平台后端订单状态及支付结果为准，禁止私下转账。</Text>
        </View>
      </View>

      {SECTIONS.map((section) => {
        const Icon = section.icon;
        return (
          <View className="agreement-card" key={section.title}>
            <View className="agreement-card-head">
              <View className={`agreement-card-icon agreement-tone-${section.tone}`}>
                <Icon size={28} color="#FF4D19" />
              </View>
              <Text className="agreement-card-title">{section.title}</Text>
            </View>
            <View className="agreement-rule-list">
              {section.items.map((item, index) => (
                <View className="agreement-rule" key={item}>
                  <Text className="agreement-rule-num">{index + 1}</Text>
                  <Text className="agreement-rule-text">{item}</Text>
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
};

export default AgreementPage;
