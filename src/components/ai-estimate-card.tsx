import { View, Text } from '@tarojs/components';
import { Sparkles, Lightbulb, ShieldAlert, Zap, ArrowRight, Check } from 'lucide-react-taro';
import type { EstimateResult, ReviewResult, SensitiveResult } from '@/lib/ai-pricing';
import { AI_DISCLAIMER } from '@/lib/ai-pricing';

interface Props {
  estimate: EstimateResult | null;
  review: ReviewResult | null;
  sensitive: SensitiveResult | null;
  loading: boolean;
  onAdoptRecommend: () => void;
  onAdoptUrgent: () => void;
  onAppendTips: () => void;
}

const fmt = (n: number) => (n >= 100 ? n.toFixed(0) : n.toString());

const AiEstimateCard = ({
  estimate, review, sensitive, loading,
  onAdoptRecommend, onAdoptUrgent, onAppendTips,
}: Props) => {
  if (loading) {
    return (
      <View
        style={{
          background: '#FFFAEB', borderRadius: '20rpx',
          padding: '24rpx', marginBottom: '20rpx',
          border: '1rpx solid #FCE9B0',
        }}
      >
        <View style={{ display: 'flex', alignItems: 'center', gap: '12rpx' }}>
          <Sparkles size={16} color="#D97706" />
          <Text style={{ display: 'block', fontSize: '24rpx', color: '#92400E' }}>
            AI 正在帮你看一下...
          </Text>
        </View>
      </View>
    );
  }

  if (!estimate) return null;

  // 没足够数据 → 兜底
  if (!estimate.hasEnoughData) {
    return (
      <View
        style={{
          background: 'linear-gradient(135deg, #FFFFFF 0%, #FFF4E8 100%)', borderRadius: '24rpx',
          padding: '24rpx', marginBottom: '20rpx',
          border: '2rpx solid rgba(255, 77, 25, 0.16)',
        }}
      >
        <View style={{ display: 'flex', alignItems: 'center', gap: '12rpx' }}>
          <Sparkles size={16} color="#FF4D19" />
          <Text style={{ display: 'block', fontSize: '24rpx', color: '#6B4B34' }}>
            AI 帮你看了一下：暂无足够内容判断，先按平台基础规则参考。
          </Text>
        </View>
      </View>
    );
  }

  const budgetTone =
    estimate.budgetHint === 'too-low' ? { bg: '#FEF2F2', border: '#FECACA', color: '#B91C1C' } :
    estimate.budgetHint === 'too-high' ? { bg: '#ECFDF5', border: '#A7F3D0', color: '#047857' } :
    estimate.budgetHint === 'fair' ? { bg: '#FFF7ED', border: '#FED7AA', color: '#B45309' } :
    null;

  return (
    <View style={{ marginBottom: '20rpx' }}>
      {/* —— 分类识别 + 价格主卡 —— */}
      <View
        style={{
          background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
          borderRadius: '24rpx', padding: '28rpx',
          border: '1rpx solid #FDE68A',
        }}
      >
        <View style={{ display: 'flex', alignItems: 'center', gap: '12rpx', marginBottom: '16rpx' }}>
          <View
            style={{
              width: '52rpx', height: '52rpx', borderRadius: '50%',
              background: 'linear-gradient(135deg, #FBBF24, #F59E0B)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Sparkles size={18} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ display: 'block', fontSize: '28rpx', fontWeight: 700, color: '#78350F' }}>
              AI 帮你看了一下
            </Text>
            <Text style={{ display: 'block', fontSize: '22rpx', color: '#92400E', marginTop: '4rpx' }}>
              已识别为「{estimate.detectedCategoryName}」 · 仅供参考
            </Text>
          </View>
          {estimate.urgency !== 'normal' ? (
            <View style={{ display: 'flex', alignItems: 'center', gap: '6rpx', padding: '6rpx 14rpx', borderRadius: '999rpx', background: '#FEE2E2' }}>
              <Zap size={12} color="#DC2626" />
              <Text style={{ fontSize: '20rpx', color: '#B91C1C' }}>加急任务</Text>
            </View>
          ) : null}
        </View>

        {/* 价格区间 */}
        <View style={{ display: 'flex', flexDirection: 'column', gap: '8rpx', padding: '20rpx 24rpx', background: 'rgba(255,255,255,0.7)', borderRadius: '16rpx' }}>
          <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: '24rpx', color: '#78350F' }}>普通完成</Text>
            <Text style={{ fontSize: '26rpx', fontWeight: 600, color: '#92400E' }}>
              ¥{fmt(estimate.minPrice)} – ¥{fmt(estimate.maxPrice)}
            </Text>
          </View>
          <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: '24rpx', color: '#78350F' }}>加急完成</Text>
            <Text style={{ fontSize: '26rpx', fontWeight: 600, color: '#B45309' }}>
              ¥{fmt(estimate.urgentMinPrice)} – ¥{fmt(estimate.urgentMaxPrice)}
            </Text>
          </View>
          <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12rpx', marginTop: '8rpx', borderTop: '1rpx solid rgba(180,131,9,0.2)' }}>
            <Text style={{ fontSize: '24rpx', color: '#78350F' }}>推荐出价</Text>
            <Text style={{ fontSize: '34rpx', fontWeight: 800, color: '#B91C1C' }}>
              ¥{fmt(estimate.recommendPrice)}
            </Text>
          </View>
        </View>

        <Text style={{ display: 'block', fontSize: '22rpx', color: '#92400E', marginTop: '14rpx', lineHeight: 1.6 }}>
          {estimate.reason}
        </Text>

        {/* 三按钮 */}
        <View style={{ display: 'flex', flexDirection: 'row', gap: '12rpx', marginTop: '20rpx' }}>
          <View
            onClick={onAdoptRecommend}
            style={{
              flex: 1, padding: '16rpx 0', borderRadius: '14rpx',
              background: '#F59E0B', display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: '6rpx',
            }}
          >
            <Check size={14} color="#FFFFFF" />
            <Text style={{ fontSize: '22rpx', color: '#FFFFFF', fontWeight: 600 }}>采用推荐价</Text>
          </View>
          <View
            onClick={onAdoptUrgent}
            style={{
              flex: 1, padding: '16rpx 0', borderRadius: '14rpx',
              background: '#FFFFFF', border: '1rpx solid #F59E0B',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6rpx',
            }}
          >
            <Zap size={14} color="#B45309" />
            <Text style={{ fontSize: '22rpx', color: '#B45309', fontWeight: 600 }}>加急完成</Text>
          </View>
          <View
            style={{
              flex: 1, padding: '16rpx 0', borderRadius: '14rpx',
              background: '#FFFDF8', border: '1rpx solid #FFE1CC',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: '22rpx', color: '#9A5A00' }}>自己填</Text>
          </View>
        </View>
      </View>

      {/* —— 价格反馈 —— */}
      {budgetTone ? (
        <View
          style={{
            marginTop: '14rpx', padding: '20rpx 24rpx', borderRadius: '16rpx',
            background: budgetTone.bg, border: `1rpx solid ${budgetTone.border}`,
            display: 'flex', alignItems: 'flex-start', gap: '12rpx',
          }}
        >
          <Lightbulb size={16} color={budgetTone.color} />
          <Text style={{ flex: 1, fontSize: '22rpx', color: budgetTone.color, lineHeight: 1.6 }}>
            {estimate.budgetHintText}
          </Text>
        </View>
      ) : null}

      {/* —— 需求优化助手 —— */}
      {review && review.missingFields.length > 0 ? (
        <View
          style={{
            marginTop: '14rpx', padding: '20rpx 24rpx', borderRadius: '16rpx',
            background: '#FFF7ED', border: '1rpx solid #FED7AA',
          }}
        >
          <View style={{ display: 'flex', alignItems: 'center', gap: '10rpx', marginBottom: '10rpx' }}>
            <Lightbulb size={15} color="#B45309" />
            <Text style={{ fontSize: '24rpx', fontWeight: 700, color: '#9A3412' }}>
              AI 帮你看了一下，还差几个关键点
            </Text>
            <Text style={{ marginLeft: 'auto', fontSize: '22rpx', color: '#B45309' }}>
              完整度 {review.completeness}%
            </Text>
          </View>
          {review.tips.slice(0, 4).map((tip, idx) => (
            <View key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8rpx', marginTop: '6rpx' }}>
              <Text style={{ fontSize: '22rpx', color: '#B45309' }}>·</Text>
              <Text style={{ flex: 1, fontSize: '22rpx', color: '#8A4C24', lineHeight: 1.6 }}>{tip}</Text>
            </View>
          ))}
          <View
            onClick={onAppendTips}
            style={{
              marginTop: '14rpx', padding: '12rpx 0', borderRadius: '10rpx',
              background: '#FFFFFF', border: '1rpx solid #FED7AA',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6rpx',
            }}
          >
            <Text style={{ fontSize: '22rpx', color: '#B45309', fontWeight: 700 }}>一键补充提示</Text>
            <ArrowRight size={12} color="#B45309" />
          </View>
        </View>
      ) : null}

      {/* —— 敏感信息提醒 —— */}
      {sensitive && sensitive.hit ? (
        <View
          style={{
            marginTop: '14rpx', padding: '20rpx 24rpx', borderRadius: '16rpx',
            background: '#FEF2F2', border: '1rpx solid #FECACA',
            display: 'flex', alignItems: 'flex-start', gap: '12rpx',
          }}
        >
          <ShieldAlert size={16} color="#B91C1C" />
          <Text style={{ flex: 1, fontSize: '22rpx', color: '#B91C1C', lineHeight: 1.6 }}>
            {sensitive.message}
          </Text>
        </View>
      ) : null}

      {/* —— 免责声明 —— */}
      <Text style={{ display: 'block', fontSize: '20rpx', color: '#9CA3AF', marginTop: '12rpx', textAlign: 'center' }}>
        {AI_DISCLAIMER}
      </Text>
    </View>
  );
};

export default AiEstimateCard;
