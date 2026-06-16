import { View, Text } from '@tarojs/components';

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  pending_payment: { label: '待支付', bg: '#FFF7ED', color: '#F97316' },
  pending_audit: { label: '待审核', bg: '#FFF7ED', color: '#F97316' },
  open: { label: '待接单', bg: '#FFF1E6', color: '#FF6A00' },
  assigned: { label: '已接单', bg: '#ECFDF5', color: '#16A34A' },
  in_progress: { label: '进行中', bg: '#ECFDF5', color: '#16A34A' },
  submitted: { label: '待确认', bg: '#FFF7ED', color: '#FF6A00' },
  revision: { label: '修改中', bg: '#FFF7ED', color: '#FF6A00' },
  completed: { label: '已完成', bg: '#ECFDF5', color: '#16A34A' },
  cancelled: { label: '已取消', bg: '#FFF4EA', color: '#9B6B43' },
  refunding: { label: '退款中', bg: '#FEF2F2', color: '#EF4444' },
  refunded: { label: '已退款', bg: '#FFF4EA', color: '#9B6B43' },
  disputed: { label: '仲裁中', bg: '#FEF2F2', color: '#EF4444' },
  rejected: { label: '已拒绝', bg: '#FEF2F2', color: '#EF4444' },
};

interface StatusTagProps {
  status: string;
  compact?: boolean;
}

export default function StatusTag({ status, compact = false }: StatusTagProps) {
  const config = STATUS_CONFIG[status] || { label: status || '未知', bg: '#FFF4EA', color: '#9B6B43' };
  return (
    <View
      style={{
        height: compact ? '34rpx' : '44rpx',
        padding: compact ? '0 10rpx' : '0 16rpx',
        borderRadius: '999rpx',
        background: config.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: compact ? '19rpx' : '22rpx', color: config.color, fontWeight: 700 }}>{config.label}</Text>
    </View>
  );
}
