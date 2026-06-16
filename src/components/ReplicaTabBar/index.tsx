import { Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import {
  Bot,
  ClipboardList,
  CirclePlus,
  Grid2x2,
  House,
  MessageSquare,
  Search,
  User,
} from 'lucide-react-taro';
import './index.css';

type TabKey = 'home' | 'tasks' | 'publish' | 'search' | 'orders' | 'messages' | 'ai' | 'profile';
type TabVariant = 'main' | 'search' | 'messages' | 'ai';

interface ReplicaTabBarProps {
  active: TabKey;
  variant?: TabVariant;
  messagesBadge?: number;
}

const TAB_META: Record<TabKey, { label: string; url: string; icon: any; tab?: boolean }> = {
  home: { label: '首页', url: '/pages/home/index', icon: House, tab: true },
  tasks: { label: '需求广场', url: '/pages/tasks/index', icon: Grid2x2, tab: true },
  publish: { label: '发布', url: '/pages/publish/index', icon: CirclePlus, tab: true },
  search: { label: '搜索', url: '/pages/search/index', icon: Search },
  orders: { label: '订单', url: '/pages/orders/index', icon: ClipboardList, tab: true },
  messages: { label: '消息', url: '/pages/messages/index', icon: MessageSquare },
  ai: { label: 'AI助手', url: '/pages/ai-assistant/index', icon: Bot },
  profile: { label: '我的', url: '/pages/profile/index', icon: User, tab: true },
};

const VARIANT_ITEMS: Record<TabVariant, TabKey[]> = {
  main: ['home', 'tasks', 'publish', 'orders', 'profile'],
  search: ['home', 'tasks', 'search', 'publish', 'profile'],
  messages: ['home', 'tasks', 'orders', 'messages', 'profile'],
  ai: ['home', 'tasks', 'ai', 'orders', 'profile'],
};

export default function ReplicaTabBar({ active, variant = 'main', messagesBadge = 0 }: ReplicaTabBarProps) {
  const items = VARIANT_ITEMS[variant];

  const go = (key: TabKey) => {
    if (key === active) return;
    const item = TAB_META[key];
    if (item.tab) {
      Taro.switchTab({ url: item.url });
      return;
    }
    Taro.navigateTo({ url: item.url });
  };

  return (
    <View className="replica-tabbar">
      {items.map((key) => {
        const item = TAB_META[key];
        const Icon = item.icon;
        const selected = key === active;
        const iconColor = key === 'publish' ? '#FFFFFF' : selected ? '#FF4D19' : '#111827';
        const badge = key === 'messages' && messagesBadge > 0 ? String(Math.min(messagesBadge, 99)) : '';
        return (
          <View
            className={`replica-tabbar-item ${key === 'publish' ? 'replica-tabbar-item-publish' : ''}`}
            key={key}
            onClick={() => go(key)}
          >
            <View className="replica-tabbar-icon-wrap">
              <Icon size={key === 'publish' ? 28 : 26} color={iconColor} strokeWidth={selected ? 2.5 : 2} />
              {badge ? (
                <View className="replica-tabbar-badge">
                  <Text className="replica-tabbar-badge-text">{badge}</Text>
                </View>
              ) : null}
            </View>
            <Text className={`replica-tabbar-text ${selected ? 'replica-tabbar-text-active' : ''}`}>
              {item.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
