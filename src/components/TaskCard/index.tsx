/**
 * TaskCard 任务卡片组件
 * 展示：缩略图、标题、金额、标签、城市、时间、状态
 */
import { View, Text, Image } from '@tarojs/components';
import { ClipboardList, Clock, MapPin, ChevronRight } from 'lucide-react-taro';
import StatusTag from '@/components/StatusTag';
import PriceTag from '@/components/PriceTag';
import UserBadge from '@/components/UserBadge';
import { centsToYuan } from '@/lib/money';

interface TaskCardProps {
  task: {
    id: string;
    title: string;
    images?: string[];
    description?: string;
    budget_amount?: number | string;
    budget_min?: number;
    budget_max?: number;
    price?: string;
    tags?: string[];
    region?: string;
    city?: string;
    created_at?: string;
    status?: string;
    publisher_name?: string;
    publisher_avatar?: string;
    verified?: boolean;
    credit_score?: number;
    application_count?: number;
    view_count?: number;
  };
  onClick?: (id: string) => void;
  showActions?: boolean;
  actionText?: string;
  onAction?: (id: string) => void;
  variant?: 'default' | 'market' | 'manage';
}

const formatDate = (value?: string) => {
  if (!value) return '';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes || 1}分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}小时前`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}天前`;
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  } catch {
    return '';
  }
};

export default function TaskCard({
  task,
  onClick,
  showActions = false,
  actionText = '接单',
  onAction,
  variant = 'default',
}: TaskCardProps) {
  const hasImage = task.images && task.images.length > 0;
  const thumbUrl = hasImage ? task.images![0] : '';
  const tags = (task.tags || []).slice(0, 3);
  const budget = centsToYuan(task.budget_amount || task.price);
  const city = task.city || task.region || '附近';
  const primaryTag = tags[0] || (task.verified ? '信用优先' : '同城需求');
  const description = task.description || tags.slice(1).join(' · ');

  if (variant === 'market') {
    return (
      <View
        onClick={() => onClick?.(task.id)}
        style={{
          minHeight: '308rpx',
          padding: '22rpx',
          borderRadius: '30rpx',
          background: '#FFFFFF',
          border: '1rpx solid rgba(8, 26, 58, 0.05)',
          boxShadow: '0 14rpx 38rpx rgba(8, 26, 58, 0.075)',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          overflow: 'hidden',
        }}
      >
        <View>
          <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '10rpx' }}>
            <View
              style={{
                maxWidth: '210rpx',
                height: '42rpx',
                padding: '0 14rpx',
                borderRadius: '999rpx',
                background: '#FFF4EA',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: '21rpx',
                  color: '#F05A1A',
                  fontWeight: 900,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                }}
              >
                {primaryTag}
              </Text>
            </View>
            {task.status ? <StatusTag status={task.status} compact /> : null}
          </View>

          <Text
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              marginTop: '20rpx',
              minHeight: '78rpx',
              fontSize: '31rpx',
              lineHeight: 1.28,
              color: '#0F172A',
              fontWeight: 950,
              letterSpacing: '-0.5rpx',
            }}
          >
            {task.title || '未命名需求'}
          </Text>

          {description ? (
            <Text
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                minHeight: '62rpx',
                marginTop: '12rpx',
                fontSize: '24rpx',
                lineHeight: 1.42,
                color: '#4B5563',
              }}
            >
              {description}
            </Text>
          ) : null}
        </View>

        <View>
          <View style={{ marginTop: '18rpx', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '12rpx' }}>
            <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8rpx', minWidth: 0, flex: 1 }}>
              <View
                style={{
                  width: '42rpx',
                  height: '42rpx',
                  borderRadius: '999rpx',
                  overflow: 'hidden',
                  background: '#EEF2FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {task.publisher_avatar ? (
                  <Image src={task.publisher_avatar} mode="aspectFill" style={{ width: '100%', height: '100%' }} />
                ) : (
                  <Text style={{ fontSize: '20rpx', color: '#1D4ED8', fontWeight: 900 }}>
                    {(task.publisher_name || '用')[0]}
                  </Text>
                )}
              </View>
              <Text style={{ fontSize: '23rpx', color: '#4B5563', maxWidth: '118rpx' }} numberOfLines={1}>
                {task.publisher_name || '用户'}
              </Text>
              <UserBadge verified={task.verified} creditScore={task.credit_score} />
            </View>
            <Text style={{ fontSize: '20rpx', color: '#9CA3AF' }}>{formatDate(task.created_at)}</Text>
          </View>

          <View style={{ marginTop: '16rpx', display: 'flex', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: '10rpx' }}>
            <View style={{ minWidth: 0, flex: 1 }}>
              <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '5rpx' }}>
                <MapPin size={16} color="#697386" />
                <Text style={{ fontSize: '22rpx', color: '#6B7280' }} numberOfLines={1}>{city}</Text>
              </View>
              {task.application_count !== undefined ? (
                <Text style={{ display: 'block', marginTop: '8rpx', fontSize: '22rpx', color: '#8A94A6' }}>{task.application_count}人已响应</Text>
              ) : null}
            </View>
            <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', flexShrink: 0 }}>
              <Text style={{ fontSize: '22rpx', color: '#FF4D19', fontWeight: 900 }}>¥</Text>
              <Text style={{ fontSize: '42rpx', lineHeight: 1, color: '#FF4D19', fontWeight: 950 }}>{budget}</Text>
              <Text style={{ marginLeft: '4rpx', fontSize: '20rpx', color: '#FF4D19', fontWeight: 800 }}>起</Text>
            </View>
          </View>

          {showActions ? (
            <View
              onClick={(e: any) => {
                e.stopPropagation();
                onAction?.(task.id);
              }}
              style={{
                marginTop: '18rpx',
                height: '52rpx',
                borderRadius: '999rpx',
                background: 'var(--brand-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 10rpx 22rpx rgba(255, 106, 0, 0.18)',
              }}
            >
              <Text style={{ fontSize: '23rpx', color: '#FFFFFF', fontWeight: 900 }}>{actionText}</Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  if (variant === 'manage') {
    return (
      <View
        onClick={() => onClick?.(task.id)}
        style={{
          width: '100%',
          padding: '24rpx',
          borderRadius: '32rpx',
          background: '#FFFFFF',
          border: '1rpx solid rgba(8, 26, 58, 0.06)',
          boxShadow: '0 16rpx 44rpx rgba(8, 26, 58, 0.07)',
          boxSizing: 'border-box',
        }}
      >
        <View style={{ display: 'flex', flexDirection: 'row', gap: '22rpx' }}>
          <View style={{ width: '142rpx', flexShrink: 0 }}>
            <View
              style={{
                width: '142rpx',
                height: '142rpx',
                borderRadius: '32rpx',
                overflow: 'hidden',
                background: 'linear-gradient(135deg, #EEF5FF 0%, #FFFFFF 58%, #FFF2E8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'inset 0 0 0 1rpx rgba(8, 26, 58, 0.04)',
              }}
            >
              {hasImage ? (
                <Image src={thumbUrl} mode="aspectFill" style={{ width: '100%', height: '100%' }} />
              ) : (
                <ClipboardList size={42} color="#3568F5" />
              )}
            </View>
            <View
              style={{
                marginTop: '12rpx',
                minHeight: '42rpx',
                padding: '0 10rpx',
                borderRadius: '12rpx',
                background: '#F3F7FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  maxWidth: '116rpx',
                  fontSize: '21rpx',
                  color: '#2952CC',
                  fontWeight: 800,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                }}
              >
                {primaryTag}
              </Text>
            </View>
          </View>

          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '12rpx' }}>
              <Text style={{ fontSize: '23rpx', color: '#667085' }} numberOfLines={1}>
                {task.id ? `任务号：${String(task.id).slice(0, 12)}` : '任务号：待生成'}
              </Text>
              {task.status ? <StatusTag status={task.status} compact /> : null}
            </View>

            <Text
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                marginTop: '14rpx',
                minHeight: '78rpx',
                fontSize: '32rpx',
                lineHeight: 1.24,
                color: '#0F172A',
                fontWeight: 950,
                letterSpacing: '-0.5rpx',
              }}
            >
              {task.title || '未命名需求'}
            </Text>

            <View style={{ marginTop: '14rpx', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10rpx', minWidth: 0 }}>
              <View
                style={{
                  width: '46rpx',
                  height: '46rpx',
                  borderRadius: '999rpx',
                  overflow: 'hidden',
                  background: '#EEF2FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {task.publisher_avatar ? (
                  <Image src={task.publisher_avatar} mode="aspectFill" style={{ width: '100%', height: '100%' }} />
                ) : (
                  <Text style={{ fontSize: '21rpx', color: '#1D4ED8', fontWeight: 900 }}>
                    {(task.publisher_name || '用')[0]}
                  </Text>
                )}
              </View>
              <Text style={{ fontSize: '24rpx', color: '#344054', maxWidth: '150rpx' }} numberOfLines={1}>
                {task.publisher_name || '用户'}
              </Text>
              <UserBadge verified={task.verified} creditScore={task.credit_score} />
            </View>

            <View style={{ marginTop: '12rpx', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10rpx', minWidth: 0 }}>
              <MapPin size={16} color="#667085" />
              <Text style={{ fontSize: '23rpx', color: '#667085', maxWidth: '190rpx' }} numberOfLines={1}>{city}</Text>
              {task.created_at ? (
                <>
                  <Clock size={16} color="#98A2B3" />
                  <Text style={{ fontSize: '23rpx', color: '#667085' }}>{formatDate(task.created_at)}</Text>
                </>
              ) : null}
            </View>
          </View>
        </View>

        <View
          style={{
            marginTop: '20rpx',
            paddingTop: '18rpx',
            borderTop: '1rpx solid #EEF2F7',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '18rpx',
          }}
        >
          <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', flexShrink: 0 }}>
            <Text style={{ fontSize: '23rpx', color: '#FF4D19', fontWeight: 900 }}>¥</Text>
            <Text style={{ fontSize: '42rpx', lineHeight: 1, color: '#FF4D19', fontWeight: 950 }}>{budget}</Text>
          </View>
          <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12rpx', flexShrink: 0 }}>
            {task.application_count !== undefined ? (
              <Text style={{ fontSize: '23rpx', color: '#667085' }}>{task.application_count}人响应</Text>
            ) : null}
            <View
              style={{
                height: '58rpx',
                padding: '0 24rpx',
                borderRadius: '999rpx',
                background: 'var(--brand-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 10rpx 24rpx rgba(255, 106, 0, 0.16)',
              }}
            >
              <Text style={{ fontSize: '24rpx', color: '#FFFFFF', fontWeight: 900 }}>{showActions ? actionText : '查看详情'}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View
      onClick={() => onClick?.(task.id)}
      style={{
        width: '100%',
        marginBottom: '24rpx',
        padding: '22rpx',
        borderRadius: '30rpx',
        background: '#FFFFFF',
        border: '2rpx solid rgba(255, 184, 58, 0.18)',
        boxShadow: '0 18rpx 42rpx rgba(109, 70, 16, 0.08)',
        boxSizing: 'border-box',
      }}
    >
      <View style={{ display: 'flex', flexDirection: 'row', gap: '18rpx' }}>
        <View
          style={{
            width: '160rpx',
            height: '160rpx',
            borderRadius: '24rpx',
            overflow: 'hidden',
            flexShrink: 0,
            background: 'linear-gradient(135deg, #FFF4CC 0%, #FFE1AF 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          {hasImage ? (
            <Image src={thumbUrl} mode="aspectFill" style={{ width: '100%', height: '100%' }} />
          ) : (
            <ClipboardList size={42} color="#B87920" />
          )}
          {task.status ? (
            <View style={{ position: 'absolute', top: '10rpx', left: '10rpx' }}>
              <StatusTag status={task.status} compact />
            </View>
          ) : null}
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '12rpx' }}>
            <Text
              style={{
                flex: 1,
                minWidth: 0,
                fontSize: '30rpx',
                fontWeight: 900,
                color: '#211400',
                lineHeight: 1.35,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {task.title || '未命名需求'}
            </Text>
            <ChevronRight size={18} color="#C6AA80" />
          </View>

          <View style={{ marginTop: '12rpx', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12rpx' }}>
            <PriceTag amount={budget as number} size="medium" />
            {task.application_count !== undefined ? (
              <Text style={{ fontSize: '22rpx', color: '#9B8566' }}>{task.application_count}人想接</Text>
            ) : null}
          </View>

          {tags.length > 0 ? (
            <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '8rpx', marginTop: '14rpx' }}>
              {tags.map((tag, i) => (
                <View
                  key={`${tag}-${i}`}
                  style={{
                    height: '38rpx',
                    padding: '0 14rpx',
                    borderRadius: '999rpx',
                    background: '#FFF7E6',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: '21rpx', color: '#9A5A00', fontWeight: 700 }}>{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </View>

      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '18rpx',
          paddingTop: '18rpx',
          borderTop: '2rpx solid #F6EFE3',
        }}
      >
        <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8rpx', minWidth: 0, flex: 1 }}>
          <View
            style={{
              width: '42rpx',
              height: '42rpx',
              borderRadius: '999rpx',
              background: 'linear-gradient(135deg, #FFE66D, #FF9F1F)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Text style={{ fontSize: '20rpx', color: '#211400', fontWeight: 900 }}>
              {(task.publisher_name || '用')[0]}
            </Text>
          </View>
          <Text style={{ fontSize: '23rpx', color: '#776653' }} numberOfLines={1}>
            {task.publisher_name || '用户'}
          </Text>
          <UserBadge verified={task.verified} creditScore={task.credit_score} />
        </View>

        <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '14rpx', flexShrink: 0 }}>
          <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '4rpx' }}>
            <MapPin size={16} color="#B79A72" />
            <Text style={{ fontSize: '21rpx', color: '#9B8566' }}>{city}</Text>
          </View>
          {task.created_at ? (
            <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '4rpx' }}>
              <Clock size={16} color="#B79A72" />
              <Text style={{ fontSize: '21rpx', color: '#9B8566' }}>{formatDate(task.created_at)}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {showActions ? (
        <View
          onClick={(e: any) => {
            e.stopPropagation();
            onAction?.(task.id);
          }}
          style={{
            marginTop: '18rpx',
            height: '78rpx',
            borderRadius: '999rpx',
            background: 'linear-gradient(135deg, #FFE66D 0%, #FF9F1F 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 14rpx 28rpx rgba(255, 143, 31, 0.22)',
          }}
        >
          <Text style={{ fontSize: '27rpx', color: '#211400', fontWeight: 900 }}>{actionText}</Text>
        </View>
      ) : null}
    </View>
  );
}
