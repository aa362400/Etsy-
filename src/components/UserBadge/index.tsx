import { View, Text } from '@tarojs/components';
import { Shield, Building2, Star } from 'lucide-react-taro';

interface UserBadgeProps {
  type?: 'personal' | 'enterprise';
  verified?: boolean;
  creditScore?: number;
  showLabel?: boolean;
}

export default function UserBadge({ type, verified = false, creditScore, showLabel = false }: UserBadgeProps) {
  if (!type && !verified && creditScore === undefined) return null;

  return (
    <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8rpx' }}>
      {verified ? (
        <View
          style={{
            height: '36rpx',
            padding: '0 12rpx',
            borderRadius: '999rpx',
            background: '#FFF1E6',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '4rpx',
          }}
        >
          <Shield size={14} color="#FF6A00" />
          {showLabel ? (
            <Text style={{ fontSize: '20rpx', color: '#FF6A00', fontWeight: 600 }}>
              {type === 'enterprise' ? '企业认证' : '个人认证'}
            </Text>
          ) : null}
        </View>
      ) : null}
      {type === 'enterprise' && !verified ? (
        <View
          style={{
            height: '36rpx',
            padding: '0 12rpx',
            borderRadius: '999rpx',
            background: '#ECFDF5',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '4rpx',
          }}
        >
          <Building2 size={14} color="#22C55E" />
          {showLabel ? <Text style={{ fontSize: '20rpx', color: '#22C55E', fontWeight: 600 }}>企业</Text> : null}
        </View>
      ) : null}
      {creditScore !== undefined ? (
        <View
          style={{
            height: '36rpx',
            padding: '0 12rpx',
            borderRadius: '999rpx',
            background: '#FFF7ED',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '4rpx',
          }}
        >
          <Star size={14} color="#FF6A00" />
          <Text style={{ fontSize: '20rpx', color: '#FF6A00', fontWeight: 600 }}>{creditScore}</Text>
        </View>
      ) : null}
    </View>
  );
}
