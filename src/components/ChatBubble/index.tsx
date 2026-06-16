import { View, Text, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';

interface ChatBubbleProps {
  message: {
    id?: string;
    type: 'text' | 'image';
    content?: string;
    imageUrl?: string;
    createdAt?: string;
  };
  isMine: boolean;
  senderName?: string;
  senderAvatar?: string;
  showTime?: boolean;
}

const formatTime = (value?: string) => {
  if (!value) return '';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return '';
  }
};

export default function ChatBubble({
  message,
  isMine,
  senderName,
  senderAvatar,
  showTime = true,
}: ChatBubbleProps) {
  const previewImage = () => {
    if (message.type === 'image' && message.imageUrl) {
      Taro.previewImage({ urls: [message.imageUrl], current: message.imageUrl });
    }
  };

  return (
    <View
      style={{
        display: 'flex',
        flexDirection: isMine ? 'row-reverse' : 'row',
        alignItems: 'flex-start',
        gap: '14rpx',
        padding: '0 28rpx',
        marginBottom: '24rpx',
      }}
    >
      <View
        style={{
          width: '64rpx',
          height: '64rpx',
          borderRadius: '24rpx',
          background: isMine ? '#FFF1E8' : '#F2F0FF',
          border: isMine ? '2rpx solid #FFD7C3' : '2rpx solid #E5E1FF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          overflow: 'hidden',
          boxShadow: '0 8rpx 20rpx rgba(82, 111, 255, 0.08)',
        }}
      >
        {senderAvatar ? (
          <Image src={senderAvatar} mode="aspectFill" style={{ width: '100%', height: '100%' }} />
        ) : (
          <Text style={{ fontSize: '24rpx', color: '#211400', fontWeight: 900 }}>
            {(senderName || '用')[0]}
          </Text>
        )}
      </View>

      <View
        style={{
          maxWidth: '70%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: isMine ? 'flex-end' : 'flex-start',
        }}
      >
        {senderName && !isMine ? (
          <Text style={{ fontSize: '22rpx', color: '#9B8566', marginBottom: '8rpx', paddingLeft: '8rpx' }}>
            {senderName}
          </Text>
        ) : null}

        {message.type === 'text' ? (
          <View
            style={{
              padding: '20rpx 24rpx',
              borderRadius: isMine ? '26rpx 26rpx 8rpx 26rpx' : '26rpx 26rpx 26rpx 8rpx',
              background: isMine ? '#FFF1E8' : '#F2F0FF',
              border: isMine ? '2rpx solid #FFD7C3' : '2rpx solid #E5E1FF',
              wordBreak: 'break-all',
              boxShadow: isMine
                ? '0 12rpx 28rpx rgba(255, 106, 0, 0.1)'
                : '0 12rpx 28rpx rgba(82, 111, 255, 0.1)',
            }}
          >
            <Text style={{ fontSize: '27rpx', lineHeight: 1.55, color: '#2B2116' }}>{message.content || ''}</Text>
          </View>
        ) : (
          <View
            onClick={previewImage}
            style={{
              width: '280rpx',
              height: '280rpx',
              borderRadius: '24rpx',
              overflow: 'hidden',
              background: '#FFF4D8',
              border: '2rpx solid rgba(255, 184, 58, 0.22)',
            }}
          >
            <Image src={message.imageUrl || ''} mode="aspectFill" style={{ width: '100%', height: '100%' }} />
          </View>
        )}

        {showTime && message.createdAt ? (
          <Text style={{ fontSize: '20rpx', color: '#C6AA80', marginTop: '8rpx', padding: '0 8rpx' }}>
            {formatTime(message.createdAt)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
