import { ScrollView, Text, View } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  CircleCheck,
  Headphones,
  Package,
  PencilLine,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  Truck,
  UserRoundSearch,
  Wallet,
  Wrench,
} from 'lucide-react-taro';
import AiMascot from '@/components/AiMascot';
import ReplicaTabBar from '@/components/ReplicaTabBar';
import { Input as UiInput } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { getAnonymousId } from '@/lib/anonymous';
import { getToken } from '@/lib/auth';
import { Network } from '@/network';
import './index.css';

type ChatRole = 'user' | 'assistant' | 'system' | 'staff';
type Card =
  | { type: 'task_draft_card'; data: any }
  | { type: 'product_card'; data: any[] }
  | { type: 'price_compare_card'; data: any }
  | { type: 'support_ticket_card'; data: any }
  | { type: 'risk_warning_card'; data: any };
type ChatAction = { type: string; label: string };

interface ChatItem {
  id: string;
  role: ChatRole;
  content: string;
  cards?: Card[];
  actions?: ChatAction[];
}

const QUICK_NEEDS = [
  { label: '搬家', icon: Truck, prompt: '明天下午搬一张沙发到思明区，最好有电梯' },
  { label: '保洁', icon: Sparkles, prompt: '帮我找深度保洁，今天或明天可以上门' },
  { label: '修电脑', icon: Wrench, prompt: '电脑无法开机，帮我估价并找附近维修师傅' },
  { label: '找设计师', icon: PencilLine, prompt: '我想找设计师做一个活动海报' },
  { label: '代取文件', icon: Package, prompt: '帮我找人代取文件并送到公司' },
  { label: '宠物喂养', icon: UserRoundSearch, prompt: '帮我找上门喂猫服务，连续三天' },
];

const WELCOME: ChatItem = {
  id: 'welcome',
  role: 'assistant',
  content: '你好，我是有应帮AI助手。你可以直接描述需求，我会帮你智能拆解、推荐合适的人选和价格区间。',
};

const AI_CHAT_REQUEST_TIMEOUT_MS = 25_000;

const getAiPageErrorMessage = (error: any) => {
  const msg = String(error?.message || '');
  if (/未配置|API Key|密钥/i.test(msg)) {
    return 'AI 服务还没有配置好，请先在后台 API 配置里填写模型 Key；当前不会白屏，你仍可发布需求或转人工客服。';
  }
  if (/超时|timeout|timed out/i.test(msg)) {
    return 'AI助手这次响应超时了，你可以稍后再试，或直接转人工客服继续处理。';
  }
  return msg || 'AI助手暂时连不上，你可以稍后再试，或直接转人工客服。';
};

export default function AiAssistantPage() {
  const router = useRouter();
  const initialMessage = decodeURIComponent(router.params?.q || '');
  const initialScene = router.params?.scene || 'miniapp';
  const [messages, setMessages] = useState<ChatItem[]>([WELCOME]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [conversationId, setConversationId] = useState('');
  const [scrollKey, setScrollKey] = useState(0);
  const [quotaExhausted, setQuotaExhausted] = useState(false);
  const draftEditing = useRef<Record<string, any>>({});

  const token = useMemo(() => {
    try {
      return getToken();
    } catch {
      return '';
    }
  }, []);
  const anonymousId = useMemo(() => getAnonymousId(), []);
  const hasAiOutput = messages.some((message) => message.id !== 'welcome' && message.role === 'assistant');

  const append = (item: ChatItem) => {
    setMessages((prev) => [...prev, item]);
    setScrollKey((key) => key + 1);
  };

  const sendMessage = async (text: string) => {
    const message = text.trim();
    if (!message || loading) return;
    if (quotaExhausted) {
      setErrMsg('今天的免费体验次数已用完，登录后可以继续使用有应AI助手。');
      return;
    }
    setErrMsg('');
    append({ id: `u_${Date.now()}`, role: 'user', content: message });
    setLoading(true);

    try {
      const header: Record<string, string> = {};
      const data: Record<string, any> = {
        message,
        scene: initialScene,
        conversation_id: conversationId || undefined,
      };
      if (token) {
        header.Authorization = `Bearer ${token}`;
      } else {
        data.anonymous_id = anonymousId;
      }

      const res: any = await Network.request({
        url: '/api/ai/chat',
        method: 'POST',
        header,
        data,
        timeout: AI_CHAT_REQUEST_TIMEOUT_MS,
      });
      const body = res?.data || res;
      const replyData = body?.data;
      if (!replyData) {
        const msg = body?.msg || 'AI助手暂时开小差了，请稍后再试。';
        if (msg.includes('次数') || msg.includes('体验')) setQuotaExhausted(true);
        setErrMsg(msg);
        return;
      }
      if (replyData.conversation_id) setConversationId(replyData.conversation_id);
      append({
        id: `a_${Date.now()}`,
        role: 'assistant',
        content: replyData.reply || '我已收到，会继续帮你拆解需求。',
        cards: replyData.cards || [],
        actions: replyData.actions || [],
      });
    } catch (error: any) {
      const msg = getAiPageErrorMessage(error);
      if (msg.includes('次数') || msg.includes('体验')) setQuotaExhausted(true);
      setErrMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialMessage) {
      sendMessage(initialMessage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessage]);

  const openDraftInPublish = (draft: any) => {
    const merged = { ...draft, ...(draftEditing.current.draft || {}) };
    Taro.setStorageSync('ai_publish_draft', merged);
    Taro.switchTab({ url: '/pages/publish/index' });
  };

  const handleAction = (action: ChatAction, card?: Card) => {
    if (action.type === 'human_service') {
      Taro.navigateTo({ url: '/pages/chat/index?id=staff&name=人工客服' });
      return;
    }
    if (action.type === 'open_publish_with_draft' && card?.type === 'task_draft_card') {
      openDraftInPublish(card.data);
      return;
    }
    if (action.type === 'task_estimate') {
      sendMessage('帮我估价');
      return;
    }
    sendMessage(action.label);
  };

  const handleQuickAction = (type: 'publish' | 'more' | 'hourly' | 'tasks') => {
    if (type === 'publish') {
      Taro.switchTab({ url: '/pages/publish/index' });
      return;
    }
    if (type === 'more') {
      sendMessage('我想继续补充需求细节，请引导我完善。');
      return;
    }
    if (type === 'hourly') {
      sendMessage('帮我把这个需求改成按小时计费，并说明适合的预算范围。');
      return;
    }
    Taro.switchTab({ url: '/pages/tasks/index' });
  };

  const renderCard = (card: Card, messageId: string, index: number) => {
    if (card.type === 'task_draft_card') {
      const data = card.data || {};
      const stash = (key: string, value: any) => {
        draftEditing.current.draft = { ...(draftEditing.current.draft || {}), [key]: value };
      };
      return (
        <View className="ai-dynamic-card" key={`${messageId}-${index}`}>
          <Text className="ai-dynamic-card-title">AI已生成需求草稿</Text>
          <UiInput className="ai-dynamic-input" value={data.title || ''} placeholder="需求标题" onInput={(event) => stash('title', event.detail.value)} />
          <Textarea className="ai-dynamic-textarea" value={data.description || ''} placeholder="补充需求描述" onInput={(event) => stash('description', event.detail.value)} />
          <UiInput className="ai-dynamic-input" value={data.budget_amount || ''} placeholder="参考预算" type="digit" onInput={(event) => stash('budget_amount', event.detail.value)} />
          <View className="ai-dynamic-btn" onClick={() => openDraftInPublish(data)}>
            <Text className="ai-dynamic-btn-text">去发布页完善</Text>
          </View>
        </View>
      );
    }

    if (card.type === 'product_card') {
      const list = Array.isArray(card.data) ? card.data.slice(0, 3) : [];
      return (
        <View className="ai-dynamic-card" key={`${messageId}-${index}`}>
          <Text className="ai-dynamic-card-title">参考服务推荐</Text>
          {list.map((item: any) => (
            <View className="ai-product-line" key={item.id || item.title}>
              <Text className="ai-product-title">{item.title || '服务方案'}</Text>
              <Text className="ai-product-price">¥{item.price || '--'}</Text>
            </View>
          ))}
        </View>
      );
    }

    if (card.type === 'price_compare_card') {
      const data = card.data || {};
      return (
        <View className="ai-dynamic-card" key={`${messageId}-${index}`}>
          <Text className="ai-dynamic-card-title">价格分析</Text>
          <Text className="ai-dynamic-desc">参考均价 ¥{data.average_price || '--'}，建议以服务者最终报价和平台托管订单为准。</Text>
        </View>
      );
    }

    if (card.type === 'support_ticket_card') {
      const data = card.data || {};
      return (
        <View className="ai-dynamic-card" key={`${messageId}-${index}`}>
          <Text className="ai-dynamic-card-title">已转人工客服</Text>
          <Text className="ai-dynamic-desc">工单号：{data.ticket_id || '处理中'}，客服会查看刚才的对话。</Text>
        </View>
      );
    }

    if (card.type === 'risk_warning_card') {
      return (
        <View className="ai-dynamic-card ai-dynamic-card-warning" key={`${messageId}-${index}`}>
          <Text className="ai-dynamic-card-title">风险提示</Text>
          <Text className="ai-dynamic-desc">{card.data?.suggestion || '这类需求可能存在风险，请补充更清晰的信息后再发布。'}</Text>
        </View>
      );
    }

    return null;
  };

  return (
    <View className="ai-page">
      <View className="ai-header">
        <View className="ai-header-top">
          <View className="ai-logo" onClick={() => Taro.switchTab({ url: '/pages/home/index' })}>
            <Text className="ai-logo-main">有应</Text>
            <Text className="ai-logo-accent">帮</Text>
          </View>
          <Text className="ai-mini-tag">AI助手</Text>
          <Text className="ai-header-title">智能帮我找人</Text>
          <View className="ai-menu-pill">
            <Text className="ai-menu-dot">•••</Text>
            <Text className="ai-menu-line">—</Text>
            <Text className="ai-menu-circle">◎</Text>
          </View>
        </View>
        <View className="ai-header-sub-row">
          <Text className="ai-header-sub">让需求被看见，让技能被回应</Text>
          <View className="ai-history" onClick={() => Taro.navigateTo({ url: '/pages/messages/index' })}>
            <MessageIcon />
            <Text className="ai-history-text">对话记录</Text>
          </View>
        </View>
      </View>

      <View className="ai-hero-card">
        <View className="ai-hero-copy">
          <Text className="ai-hero-title">告诉我你想解决什么，</Text>
          <Text className="ai-hero-title">
            我帮你<Text className="ai-hero-highlight">找人、补全需求、推荐价格</Text>
          </Text>
          <View className="ai-quick-grid">
            {QUICK_NEEDS.map((item) => {
              const Icon = item.icon;
              return (
                <View className="ai-quick-chip" key={item.label} onClick={() => sendMessage(item.prompt)}>
                  <Icon size={19} color="#FF6A00" />
                  <Text className="ai-quick-chip-text">{item.label}</Text>
                </View>
              );
            })}
          </View>
        </View>
        <AiMascot size="xl" pose="point" />
      </View>

      <ScrollView className="ai-chat-scroll" scrollY scrollIntoView={`ai-msg-${scrollKey}`}>
        {messages.map((message) => (
          <View key={message.id}>
            <View className={`ai-chat-row ${message.role === 'user' ? 'ai-chat-row-user' : ''}`}>
              <View className="ai-chat-avatar">
                {message.role === 'user' ? <Text className="ai-chat-avatar-text">我</Text> : <AiMascot size="sm" breath={false} />}
              </View>
              <View className={`ai-bubble ${message.role === 'user' ? 'ai-bubble-user' : 'ai-bubble-ai'}`}>
                <Text className="ai-bubble-text">{message.content}</Text>
              </View>
            </View>
            {message.cards?.length ? (
              <View className="ai-dynamic-card-wrap">
                {message.cards.map((card, index) => renderCard(card, message.id, index))}
              </View>
            ) : null}
            {message.actions?.length ? (
              <View className="ai-action-row">
                {message.actions.map((action) => (
                  <View className="ai-action" key={`${message.id}-${action.type}-${action.label}`} onClick={() => handleAction(action)}>
                    <Text className="ai-action-text">{action.label}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ))}
        {loading ? (
          <View className="ai-thinking">
            <Bot size={20} color="#FF4D19" />
            <Text className="ai-thinking-text">正在帮你分析需求...</Text>
          </View>
        ) : null}
        {errMsg ? <Text className="ai-error">{errMsg}</Text> : null}
        <View id={`ai-msg-${scrollKey}`} className="ai-scroll-anchor" />
      </ScrollView>

      <View className="ai-understanding">
        <View className="ai-section-head">
          <View className="ai-section-title-row">
            <CircleCheck size={22} color="#16B981" />
            <Text className="ai-section-title">需求理解</Text>
            <Text className="ai-section-soft">{hasAiOutput ? '结果见上方对话' : '等待你发送需求'}</Text>
          </View>
          <Text className="ai-section-link">{hasAiOutput ? '可继续补充细节›' : '先描述你要解决的问题›'}</Text>
        </View>
        <View className="ai-understanding-note">
          <Text className="ai-understanding-note-title">
            {hasAiOutput ? 'AI 已返回结果，不在这里伪造固定数据' : '发送需求后，小应会从真实对话中提取关键信息'}
          </Text>
          <Text className="ai-understanding-note-desc">
            可识别服务类型、时间地点、预算范围、风险点和发布建议；价格、退款、时效以平台规则和订单状态为准。
          </Text>
        </View>
      </View>

      <View className="ai-recommend">
        <View className="ai-recommend-head">
          <View className="ai-section-title-row">
            <Sparkles size={23} color="#FF6A00" />
            <Text className="ai-section-title">AI智能推荐</Text>
          </View>
          <Text className="ai-section-link">基于历史成交与实时数据生成</Text>
        </View>

        <View className="ai-rec-grid">
          <View className="ai-rec-card ai-price-card">
            <Text className="ai-rec-title">智能出价建议</Text>
            <Text className="ai-rec-desc">由后端 AI 根据真实需求内容返回，不使用固定价格。</Text>
            <View className="ai-price-box">
              <Text className="ai-price-label">等待真实估价</Text>
              <Text className="ai-price-value">AI</Text>
              <Text className="ai-price-badge">按规则展示</Text>
            </View>
            <Text className="ai-rec-foot">不会乱承诺最终成交价</Text>
          </View>

          <View className="ai-rec-card">
            <View className="ai-rec-title-row">
              <Text className="ai-rec-title">推荐服务者</Text>
              <Text className="ai-rec-more">真实匹配后展示›</Text>
            </View>
            <Text className="ai-rec-desc">服务者列表需要基于真实订单、位置、评分和认证状态返回。</Text>
            <CheckLine text="优先展示实名和信用良好的服务者" />
            <CheckLine text="距离、报价、响应速度以后端为准" />
          </View>

          <View className="ai-rec-card">
            <Text className="ai-rec-title">风险提示</Text>
            <RiskLine icon={ShieldAlert} title="合规边界" desc="涉及账号代登、刷单、绕过验证等需求会被拦截。" />
            <RiskLine icon={Truck} title="履约变量" desc="时间、距离、天气、交通需由后端或服务者确认后展示。" />
            <RiskLine icon={Package} title="凭证建议" desc="贵重物品、维修和交付类任务建议上传图片或说明。" />
          </View>

          <View className="ai-rec-card">
            <Text className="ai-rec-title">发布前优化建议</Text>
            <CheckLine text="补充物品信息，如重量、尺寸等" />
            <CheckLine text="添加图片和地址范围，方便服务者判断是否能接" />
            <CheckLine text="明确楼层情况，是否需要搬运上下楼" />
          </View>
        </View>
      </View>

      <View className="ai-quick-actions">
        <Text className="ai-section-title">AI为你生成的快捷操作</Text>
        <View className="ai-quick-actions-grid">
          <ActionButton icon={Send} title="去发布页" desc="完善后再发布" hot onClick={() => handleQuickAction('publish')} />
          <ActionButton icon={PencilLine} title="继续补充" desc="完善需求细节" onClick={() => handleQuickAction('more')} />
          <ActionButton icon={Wallet} title="按时计费" desc="让AI重算方案" onClick={() => handleQuickAction('hourly')} />
          <ActionButton icon={Search} title="需求广场" desc="查看真实任务" onClick={() => handleQuickAction('tasks')} />
        </View>
      </View>

      <View className="ai-bottom-space" />
      <ReplicaTabBar active="ai" variant="ai" />
    </View>
  );
}

function MessageIcon() {
  return <Headphones size={21} color="#111827" />;
}

function RiskLine({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <View className="ai-risk-line">
      <Icon size={18} color="#FF6A00" />
      <View>
        <Text className="ai-risk-title">{title}</Text>
        <Text className="ai-risk-desc">{desc}</Text>
      </View>
    </View>
  );
}

function CheckLine({ text }: { text: string }) {
  return (
    <View className="ai-check-line">
      <CircleCheck size={18} color="#16B981" />
      <Text className="ai-check-text">{text}</Text>
    </View>
  );
}

function ActionButton({ icon: Icon, title, desc, hot, onClick }: { icon: any; title: string; desc: string; hot?: boolean; onClick: () => void }) {
  return (
    <View className={`ai-action-button ${hot ? 'ai-action-button-hot' : ''}`} onClick={onClick}>
      <Icon size={24} color={hot ? '#FF4D19' : '#FF6A00'} />
      <View>
        <Text className={`ai-action-button-title ${hot ? 'ai-action-button-title-hot' : ''}`}>{title}</Text>
        <Text className="ai-action-button-desc">{desc}</Text>
      </View>
    </View>
  );
}
