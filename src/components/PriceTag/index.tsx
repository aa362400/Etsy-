/**
 * PriceTag 统一金额显示组件
 */
import { View, Text } from '@tarojs/components';

interface PriceTagProps {
  amount: number | string;
  color?: string;
  size?: 'small' | 'medium' | 'large';
}

const SIZE_MAP = {
  small: { value: '28rpx', unit: '20rpx' },
  medium: { value: '32rpx', unit: '22rpx' },
  large: { value: '40rpx', unit: '26rpx' },
};

export default function PriceTag({ amount, color = '#FF6A00', size = 'medium' }: PriceTagProps) {
  const sizeConfig = SIZE_MAP[size];
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return <Text style={{ fontSize: sizeConfig.value, color: '#9CA3AF' }}>面议</Text>;

  const displayValue = value >= 100 ? Math.round(value) : value.toFixed(2);

  return (
    <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline' }}>
      <Text style={{ fontSize: sizeConfig.unit, color, fontWeight: 700 }}>¥</Text>
      <Text style={{ fontSize: sizeConfig.value, color, fontWeight: 800, lineHeight: 1 }}>{displayValue}</Text>
    </View>
  );
}
