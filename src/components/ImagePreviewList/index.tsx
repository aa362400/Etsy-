/**
 * ImagePreviewList 图片预览列表组件
 * 横向展示图片缩略图，点击可预览大图
 * 空数组不渲染任何内容
 */
import { View, Text, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';

interface ImagePreviewListProps {
  images: string[];
  /** 单元格尺寸 rpx */
  size?: number;
  /** 最大显示张数 */
  maxShow?: number;
  /** 模块标题，用于区分不同场景（备用） */
  title?: string;
}

export default function ImagePreviewList({
  images,
  size = 160,
  maxShow = 4,
  title,
}: ImagePreviewListProps) {
  if (!images || images.length === 0) return null;

  const displayImages = images.slice(0, maxShow);
  const moreCount = images.length - displayImages.length;

  const preview = (current: string) => {
    Taro.previewImage({ current, urls: images });
  };

  return (
    <View>
      {title ? (
        <View style={{ marginBottom: '16rpx' }}>
          <Text style={{ fontSize: '28rpx', color: '#081A3A', fontWeight: 900 }}>{title}</Text>
        </View>
      ) : null}
      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: '12rpx',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
        }}
      >
        {displayImages.map((url, index) => (
          <View
            key={`${url}-${index}`}
            style={{
              width: `${size}rpx`,
              height: `${size}rpx`,
              borderRadius: '22rpx',
              overflow: 'hidden',
              flexShrink: 0,
              background: 'linear-gradient(135deg, #FFF4E8, #FFF8F2)',
              border: '2rpx solid rgba(255, 77, 25, 0.14)',
              position: 'relative',
              boxSizing: 'border-box',
            }}
            onClick={() => preview(url)}
          >
            <Image
              src={url}
              mode="aspectFill"
              style={{ width: '100%', height: '100%' }}
            />
            {moreCount > 0 && index === displayImages.length - 1 ? (
              <View
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0,0,0,0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: '28rpx', color: '#FFFFFF', fontWeight: 600 }}>+{moreCount}</Text>
              </View>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}
