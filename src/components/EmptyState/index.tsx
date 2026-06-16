/**
 * EmptyState 空状态组件
 */
import { View, Text } from '@tarojs/components';
import { ClipboardList } from 'lucide-react-taro';
import './index.css';

interface EmptyStateProps {
  icon?: string;
  title?: string;
  description?: string;
  actionText?: string;
  compact?: boolean;
  onAction?: () => void;
}

export default function EmptyState({
  title = '暂无数据',
  description = '',
  actionText = '',
  compact = false,
  onAction,
}: EmptyStateProps) {
  return (
    <View className={`empty-state ${compact ? 'empty-state-compact' : ''}`}>
      <View className="empty-state-icon">
        <ClipboardList size={compact ? 36 : 54} color="#B87920" />
      </View>
      <Text className="empty-state-title">{title}</Text>
      {description ? (
        <Text className={`empty-state-desc ${actionText ? 'empty-state-desc-action' : ''}`}>{description}</Text>
      ) : null}
      {actionText && onAction ? (
        <View onClick={onAction} className="empty-state-action">
          <Text className="empty-state-action-text">{actionText}</Text>
        </View>
      ) : null}
    </View>
  );
}
