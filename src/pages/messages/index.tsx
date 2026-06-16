import { Image, ScrollView, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useMemo, useState } from 'react';
import {
  Bot,
  CircleCheck,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  MessageCircle,
  ShieldCheck,
} from 'lucide-react-taro';
import AiMascot from '@/components/AiMascot';
import AiChatWidget from '@/components/ai-chat-widget';
import EmptyState from '@/components/EmptyState';
import ReplicaTabBar from '@/components/ReplicaTabBar';
import { getConversations } from '@/lib/api';
import { getToken } from '@/lib/auth';
import './index.css';

type MessageType = 'order' | 'chat' | 'system' | 'refund' | 'ai';
type ActiveTab = 'all' | MessageType;

interface Conversation {
  id: string;
  name: string;
  title?: string;
  avatar?: string;
  lastMessage?: string;
  last_message?: string;
  lastMessageType?: string;
  lastMessageTime?: string;
  updated_at?: string;
  created_at?: string;
  unreadCount?: number;
  taskTitle?: string;
  messageCategory?: string;
  scene?: string;
  last_intent?: string;
  orderId?: string;
  order_id?: string;
  refundId?: string;
  refund_id?: string;
  taskId?: string;
  task_id?: string;
}

interface DisplayMessage {
  id: string;
  type: MessageType;
  tag: string;
  title: string;
  desc: string;
  time: string;
  action: string;
  unread: number;
  orderId?: string;
  refundId?: string;
  taskId?: string;
  avatar?: string;
  avatarText?: string;
  icon: any;
  tone: 'green' | 'purple' | 'blue' | 'orange' | 'ai';
}

const TABS: Array<{ key: ActiveTab; label: string }> = [
  { key: 'all', label: '全部消息' },
  { key: 'order', label: '订单通知' },
  { key: 'system', label: '系统通知' },
  { key: 'chat', label: '沟通消息' },
  { key: 'ai', label: 'AI助手' },
];

const MESSAGE_TEMPLATES: DisplayMessage[] = [
  {
    id: 'order-template',
    type: 'order',
    tag: '订单通知',
    title: '订单状态有新变化',
    desc: '订单进度更新后会在这里提醒你',
    time: '',
    action: '查看订单详情',
    unread: 0,
    icon: ClipboardList,
    tone: 'green',
  },
  {
    id: 'chat-template',
    type: 'chat',
    tag: '沟通消息',
    title: '服务沟通有新消息',
    desc: '报价、时间、地址等沟通会同步到这里',
    time: '',
    action: '查看消息',
    unread: 0,
    avatarText: '应',
    icon: MessageCircle,
    tone: 'purple',
  },
  {
    id: 'system-template',
    type: 'system',
    tag: '系统通知',
    title: '系统通知',
    desc: '认证、风控、平台规则变化会在这里提醒你',
    time: '',
    action: '查看通知',
    unread: 0,
    icon: ShieldCheck,
    tone: 'blue',
  },
  {
    id: 'refund-template',
    type: 'refund',
    tag: '售后通知',
    title: '售后进度有更新',
    desc: '退款、仲裁和售后处理进度会在这里提醒你',
    time: '',
    action: '查看售后进度',
    unread: 0,
    icon: CircleDollarSign,
    tone: 'orange',
  },
  {
    id: 'ai-template',
    type: 'ai',
    tag: 'AI提醒',
    title: 'AI助手提醒',
    desc: 'AI摘要、估价和匹配建议会在这里展示',
    time: '',
    action: '查看AI助手',
    unread: 0,
    icon: Bot,
    tone: 'ai',
  },
];

const TONE_COLOR: Record<DisplayMessage['tone'], string> = {
  green: '#16B981',
  purple: '#FF6A00',
  blue: '#FF8A00',
  orange: '#FF8A00',
  ai: '#FF6A00',
};

const inferType = (conv: Conversation): MessageType => {
  const raw = `${conv.messageCategory || ''}${conv.lastMessageType || ''}${conv.taskTitle || ''}${conv.lastMessage || ''}${conv.last_message || ''}${conv.scene || ''}${conv.last_intent || ''}`.toLowerCase();
  if (raw.includes('refund') || raw.includes('售后') || raw.includes('退款')) return 'refund';
  if (raw.includes('system') || raw.includes('notice') || raw.includes('认证') || raw.includes('通知')) return 'system';
  if (raw.includes('task') || raw.includes('order') || raw.includes('订单') || raw.includes('任务')) return 'order';
  if (conv.scene || conv.last_intent || raw.includes('ai')) return 'ai';
  return 'chat';
};

const formatTime = (value?: string) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

const toDisplayMessage = (conv: Conversation): DisplayMessage => {
  const type = inferType(conv);
  const meta = MESSAGE_TEMPLATES.find((item) => item.type === type) || MESSAGE_TEMPLATES[1];
  const title = conv.taskTitle || conv.title || conv.name || meta.title;
  const lastMessage = conv.lastMessage || conv.last_message || meta.desc;
  const lastTime = conv.lastMessageTime || conv.updated_at || conv.created_at;
  return {
    id: conv.id,
    type,
    tag: meta.tag,
    title: title === '新会话' && type === 'ai' ? '有应AI助手会话' : title,
    desc: conv.lastMessageType === 'image' ? '[图片]' : lastMessage,
    time: formatTime(lastTime) || meta.time,
    action: type === 'order' ? '查看订单详情' : type === 'refund' ? '查看售后进度' : type === 'ai' ? '继续AI对话' : '查看消息',
    unread: conv.unreadCount || 0,
    orderId: conv.orderId || conv.order_id,
    refundId: conv.refundId || conv.refund_id,
    taskId: conv.taskId || conv.task_id,
    avatar: conv.avatar,
    avatarText: (conv.name || conv.title || '用').slice(0, 1),
    icon: meta.icon,
    tone: meta.tone,
  };
};

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('all');
  const [aiChatVisible, setAiChatVisible] = useState(false);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) {
        setConversations([]);
        return;
      }
      const res = await getConversations();
      const items = res?.data?.items || res?.data || [];
      setConversations(Array.isArray(items) ? items : []);
    } catch {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const allMessages = useMemo(() => conversations.map(toDisplayMessage), [conversations]);

  const messages = useMemo(() => {
    if (activeTab === 'all') return allMessages;
    return allMessages.filter((item) => item.type === activeTab);
  }, [activeTab, allMessages]);

  const unreadTotal = useMemo(() => {
    return allMessages.reduce((sum, item) => sum + item.unread, 0);
  }, [allMessages]);

  const tabUnread = useMemo(() => {
    return allMessages.reduce<Record<ActiveTab, number>>((acc, item) => {
      acc.all += item.unread;
      acc[item.type] += item.unread;
      return acc;
    }, { all: 0, order: 0, chat: 0, system: 0, refund: 0, ai: 0 });
  }, [allMessages]);

  const urgentUnread = Math.min(unreadTotal, conversations.filter((item) => inferType(item) === 'order' || inferType(item) === 'refund').length);

  const openMessage = (item: DisplayMessage) => {
    if (item.type === 'order') {
      Taro.navigateTo({ url: item.orderId ? `/pages/order-detail/index?id=${item.orderId}` : '/pages/order-detail/index' });
      return;
    }
    if (item.type === 'refund') {
      Taro.navigateTo({ url: item.orderId ? `/pages/refund/index?orderId=${item.orderId}` : '/pages/refund/index' });
      return;
    }
    if (item.type === 'ai') {
      Taro.navigateTo({ url: `/pages/chat/index?id=${item.id}&name=${encodeURIComponent(item.title)}` });
      return;
    }
    Taro.navigateTo({ url: `/pages/chat/index?id=${item.id}&name=${encodeURIComponent(item.title)}` });
  };

  const markAllReadLocally = () => {
    if (!unreadTotal) {
      Taro.showToast({ title: '暂无未读消息', icon: 'none' });
      return;
    }
    setConversations((prev) => prev.map((item) => ({ ...item, unreadCount: 0 })));
    Taro.showToast({ title: '已清除本地红点', icon: 'success' });
  };

  return (
    <View className="msg-page">
      <View className="msg-header">
        <View className="msg-brand-row">
          <View className="msg-logo" onClick={() => Taro.switchTab({ url: '/pages/home/index' })}>
            <Text className="msg-logo-main">有应</Text>
            <Text className="msg-logo-accent">帮</Text>
          </View>
          <Text className="msg-slogan">让需求被看见，让技能被回应</Text>
          <View className="msg-menu-pill">
            <Text className="msg-menu-dot">•••</Text>
            <Text className="msg-menu-line">—</Text>
            <Text className="msg-menu-circle">◎</Text>
          </View>
        </View>

        <View className="msg-title-row">
          <View className="msg-title-left">
            <Text className="msg-title">消息中心</Text>
            <Text className="msg-subtitle">及时查看消息，不错过重要通知</Text>
          </View>
          <View className="msg-read-all" onClick={markAllReadLocally}>
            <CircleCheck size={22} color="#111827" />
            <Text className="msg-read-all-text">标为已读</Text>
          </View>
        </View>
      </View>

      <ScrollView scrollX showScrollbar={false} className="msg-tab-scroll">
        <View className="msg-tabs">
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <View className="msg-tab" key={tab.key} onClick={() => setActiveTab(tab.key)}>
                <Text className={`msg-tab-text ${active ? 'msg-tab-text-active' : ''}`}>{tab.label}</Text>
                {active ? <View className="msg-tab-line" /> : null}
                {tabUnread[tab.key] > 0 ? (
                  <View className="msg-tab-badge">
                    <Text className="msg-tab-badge-text">{Math.min(tabUnread[tab.key], 99)}</Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View className="msg-ai-card" onClick={() => setAiChatVisible(true)}>
        <View className="msg-ai-content">
          <View className="msg-ai-tag">
            <Text className="msg-ai-tag-text">AI</Text>
          </View>
          <Text className="msg-ai-title">有应AI助手：帮你整理未读重点消息</Text>
          <Text className="msg-ai-desc">
            你有 {unreadTotal} 条未读消息{urgentUnread > 0 ? `，其中 ${urgentUnread} 条建议优先处理` : '，重要提醒会在这里帮你归纳'}
          </Text>
          <View className="msg-ai-action">
            <Text className="msg-ai-action-text">查看未读摘要</Text>
            <ChevronRight size={18} color="#FF4D19" />
          </View>
        </View>
        <AiMascot size="xl" pose="point" />
      </View>

      <View className="msg-list">
        {loading ? (
          <View className="msg-loading">
            <Text className="msg-loading-text">正在加载消息...</Text>
          </View>
        ) : null}
        {!loading && messages.length === 0 ? (
          <EmptyState
            title="暂无消息"
            description="订单通知、报价沟通和售后进度都会出现在这里。"
            actionText="去需求广场看看"
            compact
            onAction={() => Taro.switchTab({ url: '/pages/tasks/index' })}
          />
        ) : null}
        {messages.map((item) => {
          const Icon = item.icon;
          return (
            <View className="msg-card" key={item.id} onClick={() => openMessage(item)}>
              <View className="msg-avatar-wrap">
                {item.avatar ? (
                  <Image className="msg-avatar-img" src={item.avatar} mode="aspectFill" />
                ) : item.avatarText && item.type === 'chat' ? (
                  <View className="msg-avatar-text-wrap">
                    <Text className="msg-avatar-text">{item.avatarText}</Text>
                  </View>
                ) : (
                  <View className={`msg-icon-bg msg-tone-${item.tone}`}>
                    <Icon size={36} color={TONE_COLOR[item.tone]} />
                  </View>
                )}
                {item.unread > 0 ? <View className="msg-dot" /> : null}
              </View>

              <View className="msg-card-main">
                <View className="msg-card-top">
                  <Text className={`msg-type msg-tone-pill-${item.tone}`}>{item.tag}</Text>
                  <Text className="msg-time">{item.time}</Text>
                </View>
                <Text className="msg-card-title">{item.title}</Text>
                <Text className="msg-card-desc">{item.desc}</Text>
                <View className="msg-card-action">
                  <Text className="msg-card-action-text">{item.action}</Text>
                  <ChevronRight size={16} color="#FF4D19" />
                </View>
              </View>

              <View className="msg-card-right">
                {item.unread > 0 ? (
                  <View className="msg-unread">
                    <Text className="msg-unread-text">{item.unread}</Text>
                  </View>
                ) : null}
                <ChevronRight size={24} color="#6B7280" />
              </View>
            </View>
          );
        })}
      </View>

      <View className="msg-bottom-space" />
      <ReplicaTabBar active="messages" variant="messages" messagesBadge={unreadTotal} />
      <AiChatWidget
        visible={aiChatVisible}
        onClose={() => setAiChatVisible(false)}
        context={{
          scene: 'messages',
          title: '消息中心',
          description: `当前共有 ${unreadTotal} 条未读消息，其中 ${urgentUnread} 条建议优先处理。`,
          status: activeTab,
        }}
        initialIntent="order_followup"
      />
    </View>
  );
}
