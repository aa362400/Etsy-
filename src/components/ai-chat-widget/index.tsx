import { View, Text, ScrollView, Input } from '@tarojs/components';
import { useEffect, useRef, useState } from 'react';
import { requestAiAssist, requestHumanHandoff, type AiAssistContext, type AiAssistIntent } from '@/lib/ai-assist';
import { AI_ASSISTANT_GREETING } from '@/lib/ai-copy';
import './index.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  intent?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  context?: {
    scene?: string;
    title?: string;
    description?: string;
    category?: string;
    budget?: string;
    status?: string;
    orderId?: string;
    taskId?: string;
    imageCount?: number;
  };
  initialIntent?: string;
}

const INTENT_LABELS: Record<string, string> = {
  estimate: '帮我估价',
  category: '帮我选分类',
  compare: '帮我比报价',
  write: '帮我写需求',
  title: '帮我优化标题',
  complete: '帮我补全需求',
  order_followup: '帮我看下一步',
  human_service: '转人工客服',
};

const PUBLISH_WELCOME = '我可以帮你检查这条需求是否清楚、好接单。请说明：做什么、什么时候、在哪里、预算多少。';

const PUBLISH_QUICK = [
  { text: '优化标题', intent: 'title' },
  { text: '补全需求', intent: 'complete' },
  { text: '估算价格', intent: 'estimate' },
  { text: '选择分类', intent: 'category' },
];

const HOME_QUICK = [
  { text: '帮我估价', intent: 'estimate' },
  { text: '写需求', intent: 'write' },
  { text: '选分类', intent: 'category' },
  { text: '比报价', intent: 'compare' },
];

const ORDER_QUICK = [
  { text: '下一步怎么做', intent: 'order_followup' },
  { text: '解释订单状态', intent: 'order_followup' },
  { text: '售后怎么处理', intent: 'human_service' },
  { text: '转人工客服', intent: 'human_service' },
];

const AI_UNAVAILABLE_REPLY = '小应现在暂时连接不上智能服务，先别着急。你可以继续把需求写清楚：做什么、在哪里、什么时候完成、预算多少；如果涉及订单或退款，请以订单详情和平台规则为准。';
const buildAiFallbackReply = (error?: any) => {
  const msg = String(error?.message || '');
  if (/未配置|API Key|密钥/i.test(msg)) {
    return 'AI 服务还没有配置好，请先在后台 API 配置里填写模型 Key。你也可以继续发布需求，或转人工客服处理订单、退款和支付问题。';
  }
  if (/超时|timeout|timed out/i.test(msg)) {
    return '小应这次响应超时了，先别等在这里。你可以稍后再试，或直接转人工客服继续处理。';
  }
  if (/次数|体验|频繁|429/.test(msg)) {
    return msg;
  }
  return AI_UNAVAILABLE_REPLY;
};

const AiChatWidget = ({ visible, onClose, context, initialIntent }: Props) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [showQuickButtons, setShowQuickButtons] = useState(true);
  const [conversationId, setConversationId] = useState<string>('');
  const [handoffLoading, setHandoffLoading] = useState(false);
  const initialIntentSent = useRef('');

  const isPublishScene = context?.scene === 'publish';
  const isOrderScene = context?.scene === 'orders' || context?.scene === 'order_detail';
  const quickButtons = isPublishScene ? PUBLISH_QUICK : (isOrderScene ? ORDER_QUICK : HOME_QUICK);

  useEffect(() => {
    if (!visible) return;

    const welcome = isPublishScene ? PUBLISH_WELCOME : AI_ASSISTANT_GREETING;
    setMessages([{ id: 'welcome', role: 'assistant', content: welcome }]);
    setInputValue('');
    setLoading(false);
    setShowQuickButtons(true);
    setConversationId('');
    setHandoffLoading(false);
    initialIntentSent.current = '';
  }, [visible, isPublishScene]);

  useEffect(() => {
    if (visible && initialIntent && initialIntentSent.current !== initialIntent) {
      initialIntentSent.current = initialIntent;
      setTimeout(() => {
        handleQuickAction(initialIntent);
      }, 400);
    }
  }, [visible, initialIntent]);

  const addMessage = (role: 'user' | 'assistant', content: string, intent?: string) => {
    setMessages((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, role, content, intent }]);
  };

  const normalizeContext = (): AiAssistContext => ({
    scene: context?.scene || 'miniapp',
    title: context?.title,
    description: context?.description,
    category: context?.category,
    budget: context?.budget,
    status: context?.status,
    orderId: context?.orderId,
    taskId: context?.taskId,
    imageCount: context?.imageCount,
  });

  const callAiApi = async (message: string, intent: AiAssistIntent = 'write'): Promise<{ content: string; intent?: string }> => {
    try {
      const result = await requestAiAssist({
        intent,
        context: normalizeContext(),
        message,
        conversationId: conversationId || undefined,
      });
      if (result.conversationId) setConversationId(result.conversationId);
      if (result.reply) {
        return { content: result.reply, intent: result.intent };
      }
      throw new Error('empty reply');
    } catch (error: any) {
      return { content: buildAiFallbackReply(error), intent: 'service_unavailable' };
    }
  };

  const handleQuickAction = async (intent: string) => {
    const label = INTENT_LABELS[intent] || intent;
    addMessage('user', label, intent);
    setShowQuickButtons(false);
    setLoading(true);

    const result = await callAiApi(label, intent as AiAssistIntent);
    addMessage('assistant', result.content, result.intent);
    setLoading(false);
  };

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text) return;
    addMessage('user', text);
    setInputValue('');
    setShowQuickButtons(false);
    setLoading(true);

    const result = await callAiApi(text, isOrderScene ? 'order_followup' : 'write');
    addMessage('assistant', result.content, result.intent);
    setLoading(false);
  };

  const handleHumanHandoff = async () => {
    if (handoffLoading) return;
    if (!conversationId) {
      addMessage('assistant', '先把你的问题发给我一句，我会带着上下文帮你转人工客服。', 'human_service');
      return;
    }
    setHandoffLoading(true);
    try {
      await requestHumanHandoff(conversationId, `来自${context?.scene || 'miniapp'}页面的用户主动转人工`);
      addMessage('assistant', '已帮你转人工客服，客服可以看到刚才的对话内容。订单、退款和支付结果仍以后端记录为准。', 'human_service');
    } catch (error: any) {
      addMessage('assistant', error?.message || '转人工暂时失败，请稍后再试。', 'human_service');
    } finally {
      setHandoffLoading(false);
    }
  };

  const handleBackdrop = () => {
    if (visible) onClose();
  };

  if (!visible) return null;

  return (
    <View className="ai-chat-overlay ai-chat-overlay-open" onClick={handleBackdrop}>
      <View className="ai-chat-panel" onClick={(e) => e.stopPropagation()}>
        <View className="ai-chat-handle" />

        <View className="ai-chat-header">
          <View className="ai-chat-avatar-wrap">
            <Text className="ai-chat-avatar-text">应</Text>
          </View>
          <View className="ai-chat-header-info">
            <Text className="ai-chat-header-name">有应帮AI助手</Text>
            <Text className="ai-chat-header-sub">帮你填表、估价、追问订单、转人工</Text>
          </View>
          <View className="ai-chat-handoff" onClick={handleHumanHandoff}>
            <Text className="ai-chat-handoff-text">{handoffLoading ? '转接中' : '人工'}</Text>
          </View>
          <View className="ai-chat-close" onClick={onClose}>
            <Text className="ai-chat-close-text">×</Text>
          </View>
        </View>

        <ScrollView className="ai-chat-messages" scrollY scrollWithAnimation scrollTop={99999}>
          {messages.map((msg) => (
            <View key={msg.id} className={`ai-chat-bubble ai-chat-bubble-${msg.role}`}>
              <Text>{msg.content}</Text>
            </View>
          ))}

          {loading && (
            <View className="ai-chat-loading">
              <View className="ai-chat-loading-dot" />
              <View className="ai-chat-loading-dot" />
              <View className="ai-chat-loading-dot" />
              <Text className="ai-chat-loading-text">小应正在帮你整理...</Text>
            </View>
          )}

          {showQuickButtons && messages.length === 1 && (
            <View className="ai-chat-quick-row">
              {quickButtons.map((btn) => (
                <View key={btn.intent} className="ai-chat-quick-btn" onClick={() => handleQuickAction(btn.intent)}>
                  <Text className="ai-chat-quick-btn-text">{btn.text}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        <View className="ai-chat-input-area">
          <Input
            className="ai-chat-input"
            placeholder="说说你想做什么..."
            value={inputValue}
            confirmType="send"
            onInput={(e) => setInputValue(String(e.detail.value || ''))}
            onConfirm={handleSend}
          />
          <View className="ai-chat-send" onClick={handleSend}>
            <Text className="ai-chat-send-text">发送</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default AiChatWidget;
