import { View, Text, ScrollView, Input } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Sparkles } from 'lucide-react-taro';
import { Network } from '@/network';
import { getToken } from '@/lib/auth';
import { getDeviceId } from '@/lib/device';
import './index.css';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions?: { type: string; label: string }[];
}

const getSafeAreaBottom = () => {
  try {
    const info = Taro.getSystemInfoSync();
    const screenHeight = info.screenHeight || 0;
    const safeBottom = info.safeArea?.bottom || screenHeight;
    return Math.max(screenHeight - safeBottom, 0);
  } catch {
    return 0;
  }
};

const AI_CHAT_REQUEST_TIMEOUT_MS = 25_000;
const AI_CHAT_DEFAULT_ERROR = '小应现在连接不稳定。你可以稍后再试；如果是订单、退款或支付问题，请先查看订单详情并联系人工客服。';

const getAiChatErrorMessage = (err: any) => {
  const msg = String(err?.message || '');
  if (/未配置|API Key|密钥/i.test(msg)) {
    return 'AI 服务还没有配置好，请先到后台 API 配置里填写模型 Key。订单、退款和支付问题建议直接联系人工客服。';
  }
  if (/超时|timeout|timed out/i.test(msg)) {
    return '小应这次响应超时了，你可以稍后再试，或直接转人工客服继续处理。';
  }
  return msg || AI_CHAT_DEFAULT_ERROR;
};

function AiChatDrawer({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        '你好，我是有应帮AI助手。\n可以帮你估价、选分类、写需求，也能说明接单、退款和实名规则。涉及价格、退款、时效时，我会以平台规则和订单状态为准。',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const scrollRef = useRef<any>(null);

  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollIntoView?.();
    }, 100);
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || sending) return;

    if (text.length > 300) {
      Taro.showToast({ title: '问题不能超过 300 字', icon: 'none' });
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        id: `u_${Date.now()}`,
        role: 'user',
        content: text,
      },
    ]);
    setInputValue('');
    setSending(true);

    try {
      const token = getToken();
      const res = await Network.request({
        url: '/api/ai/chat',
        method: 'POST',
        data: {
          message: text,
          scene: 'customer_service',
          conversation_id: conversationId,
          deviceId: getDeviceId(),
        },
        header: token ? { authorization: `Bearer ${token}` } : {},
        timeout: AI_CHAT_REQUEST_TIMEOUT_MS,
      });

      const data = res.data?.data;
      const reply =
        data?.reply ||
        '小应暂时没有拿到完整回复。你可以换个说法，或直接补充任务地点、时间、预算和要求。';
      if (data?.conversation_id) setConversationId(data.conversation_id);

      setMessages((prev) => [
        ...prev,
        {
          id: `a_${Date.now()}`,
          role: 'assistant',
          content: reply,
          actions: data?.actions,
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `e_${Date.now()}`,
          role: 'assistant',
          content: getAiChatErrorMessage(err),
        },
      ]);
    } finally {
      setSending(false);
    }
  }, [inputValue, sending, conversationId]);

  if (!visible) return null;

  return (
    <View className="ai-chat-drawer">
      <View className="ai-chat-drawer-mask" onClick={onClose} />
      <View className="ai-chat-drawer-panel">
        <View className="ai-chat-drawer-handle" />

        <View
          className="ai-chat-drawer-header"
          style={{
            paddingTop: `${(Taro.getSystemInfoSync().statusBarHeight || 20) + 10}px`,
          }}
        >
          <View className="ai-chat-drawer-avatar">
            <Sparkles size={18} color="#211400" />
          </View>
          <View className="ai-chat-drawer-title-wrap">
            <Text className="ai-chat-drawer-title">有应帮AI助手</Text>
            <Text className="ai-chat-drawer-subtitle">先把需求讲清楚，再帮你找到靠谱接单者</Text>
          </View>
          <View className="ai-chat-drawer-close" onClick={onClose}>
            <X size={20} color="#6f4d1c" />
          </View>
        </View>

        <ScrollView scrollY className="ai-chat-drawer-body" scrollWithAnimation>
          <View className="ai-chat-drawer-welcome">
            <Text className="ai-chat-drawer-welcome-title">小应可以帮你做什么？</Text>
            <Text className="ai-chat-drawer-welcome-text">
              估价、选分类、整理需求、说明退款规则。不会替平台乱承诺价格、退款或完成时效。
            </Text>
          </View>

          <View className="ai-chat-drawer-message-list">
            {messages.map((msg) => (
              <View
                key={msg.id}
                className={`ai-chat-drawer-message ai-chat-drawer-message-${msg.role}`}
              >
                <Text className="ai-chat-drawer-message-text">{msg.content}</Text>

                {msg.actions && msg.actions.length > 0 && (
                  <View className="ai-chat-drawer-actions">
                    {msg.actions.map((act, i) => (
                      <View
                        key={`${act.type}-${i}`}
                        className="ai-chat-drawer-action"
                        onClick={() => setInputValue(act.label)}
                      >
                        <Text className="ai-chat-drawer-action-text">{act.label}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
            <View ref={scrollRef} />
          </View>
        </ScrollView>

        <View
          className="ai-chat-drawer-input-bar"
          style={{ paddingBottom: `${Math.max(getSafeAreaBottom(), 16)}px` }}
        >
          <Input
            className="ai-chat-drawer-input"
            placeholder="输入问题，最多 300 字"
            value={inputValue}
            onInput={(e) => setInputValue(e.detail.value)}
            onConfirm={sendMessage}
            maxlength={300}
            confirmType="send"
          />
          <View
            className={`ai-chat-drawer-send ${sending || !inputValue.trim() ? 'ai-chat-drawer-send-disabled' : ''}`}
            onClick={sendMessage}
          >
            <Send size={16} color="#211400" />
          </View>
        </View>
      </View>
    </View>
  );
}

export function AiChatFloatButton() {
  const [open, setOpen] = useState(false);
  const [currentRoute, setCurrentRoute] = useState('');

  const refreshRoute = useCallback(() => {
    const getPages = (globalThis as any).getCurrentPages;
    const pages = typeof getPages === 'function' ? getPages() : [];
    const current = pages[pages.length - 1];
    setCurrentRoute(current?.route || '');
  }, []);

  useEffect(() => {
    refreshRoute();
  }, [refreshRoute]);

  useDidShow(() => {
    refreshRoute();
  });

  if (currentRoute === 'pages/ai-assistant/index') {
    return null;
  }

  return (
    <>
      {!open && (
        <View className="ai-chat-float" onClick={() => setOpen(true)}>
          <View className="ai-chat-float-glow" />
          <View className="ai-chat-float-core">
            <MessageCircle size={23} color="#211400" />
          </View>
          <View className="ai-chat-float-bubble">
            <Text className="ai-chat-float-bubble-text">有问题，小应陪你</Text>
          </View>
        </View>
      )}

      <AiChatDrawer visible={open} onClose={() => setOpen(false)} />
    </>
  );
}
