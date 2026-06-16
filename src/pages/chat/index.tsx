/**
 * 聊天页 - 即时消息
 */
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useEffect, useState } from 'react';
import { ArrowLeft, Bot, CirclePlus, Headphones, Image, Send, ShieldCheck, Smile } from 'lucide-react-taro';
import AiMascot from '@/components/AiMascot';
import ChatBubble from '@/components/ChatBubble';
import EmptyState from '@/components/EmptyState';
import { Input } from '@/components/ui/input';
import { getChatMessages, sendMessage } from '@/lib/api';
import { getToken, getCachedUserInfo } from '@/lib/auth';
import './index.css';

interface ChatMessage {
  id: string;
  type: 'text' | 'image';
  content?: string;
  imageUrl?: string;
  createdAt?: string;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
}

const goBack = () => {
  const pages = Taro.getCurrentPages();
  if (pages.length > 1) {
    Taro.navigateBack();
    return;
  }
  Taro.navigateTo({ url: '/pages/messages/index' });
};

const ChatPage = () => {
  const router = useRouter();
  const conversationId = (router.params?.id as string) || '';
  const conversationName = decodeURIComponent((router.params?.name as string) || '订单沟通');

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState(conversationId);
  const [myId, setMyId] = useState('');
  const [myName, setMyName] = useState('');

  useEffect(() => {
    setActiveConversationId(conversationId);
    const uid = getToken();
    setMyId(uid || '');
    const userInfo = getCachedUserInfo();
    setMyName(userInfo?.nickname || '我');

    if (conversationId) {
      loadMessages();
    }
  }, [conversationId]);

  const loadMessages = async () => {
    try {
      const targetId = activeConversationId || conversationId;
      if (!targetId) return;
      const res = await getChatMessages(targetId);
      const list = res?.data?.items || res?.data || [];
      setMessages(Array.isArray(list) ? list.map(toChatMessage) : []);
    } catch {
      setMessages([]);
    }
  };

  const toChatMessage = (raw: any): ChatMessage => {
    const role = raw.role || raw.senderRole;
    const isMine = role === 'user' || raw.senderId === myId;
    return {
      id: raw.id || `${role || 'msg'}-${raw.created_at || raw.createdAt || Date.now()}`,
      type: raw.message_type === 'image' || raw.type === 'image' || raw.image_url || raw.imageUrl ? 'image' : 'text',
      content: raw.content || raw.message || raw.text || '',
      imageUrl: raw.imageUrl || raw.image_url,
      createdAt: raw.createdAt || raw.created_at,
      senderId: isMine ? myId : (raw.senderId || 'ai-assistant'),
      senderName: isMine ? myName : (raw.senderName || raw.name || '有应AI助手'),
      senderAvatar: raw.senderAvatar || raw.avatar,
    };
  };

  const handleSendText = async () => {
    const text = inputText.trim();
    if (!text || sending) return;
    const targetId = activeConversationId || conversationId;
    setSending(true);

    const tempMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      type: 'text',
      content: text,
      createdAt: new Date().toISOString(),
      senderId: myId,
      senderName: myName,
    };
    setMessages((prev) => [...prev, tempMsg]);
    setInputText('');

    try {
      const res = await sendMessage({ conversationId: targetId, type: 'text', content: text });
      const nextId = res?.data?.conversation_id || targetId;
      if (nextId) setActiveConversationId(nextId);
      await loadMessages();
    } catch {
      Taro.showToast({ title: '发送失败', icon: 'none' });
    } finally {
      setSending(false);
    }
  };

  const handleSendImage = async () => {
    if (sending) return;
    Taro.showToast({ title: '当前 AI 会话先用文字沟通，图片请在发布需求或退款凭证里上传', icon: 'none' });
  };

  return (
    <View className="chat-page">
      <View className="chat-nav">
        <View className="chat-back" onClick={goBack}>
          <ArrowLeft size={30} color="#081A3A" />
        </View>
        <View className="chat-title-wrap">
          <Text className="chat-nav-title">{conversationName}</Text>
          <Text className="chat-nav-subtitle">平台留痕沟通，保护双方权益</Text>
        </View>
        <View className="chat-menu-pill">
          <Text className="chat-menu-dot">•••</Text>
          <Text className="chat-menu-line">—</Text>
          <Text className="chat-menu-circle">◎</Text>
        </View>
      </View>

      <View className="chat-ai-card" onClick={() => Taro.navigateTo({ url: `/pages/ai-assistant/index?scene=chat&q=${encodeURIComponent('帮我整理订单沟通话术')}` })}>
        <AiMascot size="md" pose="point" />
        <View className="chat-ai-main">
          <Text className="chat-ai-title">AI 小应可帮你整理沟通话术</Text>
          <Text className="chat-ai-desc">价格、退款、时效请以平台规则和订单状态为准，不要私下转账。</Text>
        </View>
        <Bot size={26} color="#FF4D19" />
      </View>

      <View className="chat-safe-strip">
        <ShieldCheck size={18} color="#17B978" />
        <Text className="chat-safe-text">建议在平台内确认服务内容、价格和交付结果，便于售后处理。</Text>
      </View>

      <ScrollView scrollY className="chat-scroll" scrollTop={999999} scrollWithAnimation>
        {messages.length === 0 ? (
          <EmptyState
            title="还没有消息"
            description="你可以先说明需求、交付时间、预算和注意事项。"
            actionText="让AI帮我组织话术"
            onAction={() => Taro.navigateTo({ url: '/pages/ai-assistant/index?scene=chat' })}
          />
        ) : (
          messages.map((msg) => (
            <ChatBubble
              key={msg.id}
              message={msg}
              isMine={msg.senderId === myId}
              senderName={msg.senderName}
              senderAvatar={msg.senderAvatar}
            />
          ))
        )}
        <View className="chat-scroll-space" />
      </ScrollView>

      <View className="chat-input-bar">
        <View className="chat-icon-btn" onClick={handleSendImage}>
          <Image size={30} color="#4B5563" />
        </View>
        <View className="chat-input-wrap">
          <Input
            className="chat-input"
            value={inputText}
            placeholder="输入消息，沟通越清楚越安心"
            onInput={(e) => setInputText(e.detail.value)}
            onConfirm={handleSendText}
            confirmType="send"
          />
        </View>
        <Smile size={30} color="#4B5563" />
        <CirclePlus size={30} color="#4B5563" />
        <View className={`chat-send ${inputText.trim() ? 'chat-send-active' : ''}`} onClick={handleSendText}>
          {sending ? <Headphones size={24} color="#FFFFFF" /> : <Send size={24} color={inputText.trim() ? '#FFFFFF' : '#9CA3AF'} />}
        </View>
      </View>
    </View>
  );
};

export default ChatPage;
