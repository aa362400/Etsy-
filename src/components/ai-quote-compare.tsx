import { View, Text } from '@tarojs/components';
import { Sparkles, ShieldAlert, TrendingUp, Award } from 'lucide-react-taro';
import type { CompareResult, QuoteScored } from '@/lib/ai-pricing';
import { AI_DISCLAIMER } from '@/lib/ai-pricing';

interface Props {
  compare: CompareResult | null;
}

const TAG_STYLES: Record<string, { bg: string; color: string }> = {
  '性价比最高': { bg: '#FEF3C7', color: '#B45309' },
  '价格最低': { bg: '#FFF1E8', color: '#FF4D19' },
  '响应最快': { bg: '#DCFCE7', color: '#15803D' },
  '经验更稳': { bg: '#F1EAFE', color: '#7C3AED' },
  '距离最近': { bg: '#FFF1E6', color: '#FF6A00' },
  '新人低价': { bg: '#FFF7ED', color: '#B45309' },
  '谨慎选择': { bg: '#FEE2E2', color: '#B91C1C' },
  '低价风险': { bg: '#FEE2E2', color: '#B91C1C' },
};

const fmtMoney = (n: number) => (n >= 100 ? `¥${n.toFixed(0)}` : `¥${n.toFixed(2)}`);

const AiQuoteCompare = ({ compare }: Props) => {
  if (!compare) return null;

  if (compare.isEmpty) {
    return (
      <View
        style={{
          background: 'linear-gradient(135deg, #FFFFFF 0%, #FFF4E8 100%)', borderRadius: '24rpx',
          padding: '24rpx', marginBottom: '20rpx',
          border: '2rpx solid rgba(255, 77, 25, 0.16)',
          display: 'flex', alignItems: 'center', gap: '12rpx',
        }}
      >
        <Sparkles size={16} color="#FF4D19" />
        <Text style={{ flex: 1, fontSize: '24rpx', color: '#6B4B34' }}>
          {compare.emptyMessage}
        </Text>
      </View>
    );
  }

  const top = compare.quoteList.find((q) => q.workerId === compare.recommendedWorkerId);

  return (
    <View style={{ marginBottom: '20rpx' }}>
      {/* 推荐主卡 */}
      {top ? (
        <View
          style={{
            background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
            borderRadius: '24rpx', padding: '28rpx',
            border: '1rpx solid #FDE68A',
          }}
        >
          <View style={{ display: 'flex', alignItems: 'center', gap: '12rpx', marginBottom: '14rpx' }}>
            <View
              style={{
                width: '52rpx', height: '52rpx', borderRadius: '50%',
                background: 'linear-gradient(135deg, #FBBF24, #F59E0B)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Award size={18} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ display: 'block', fontSize: '28rpx', fontWeight: 700, color: '#78350F' }}>
                AI 推荐：{top.workerName || '这位接单者'}
              </Text>
              <Text style={{ display: 'block', fontSize: '22rpx', color: '#92400E', marginTop: '4rpx' }}>
                综合评分 {top.aiScore} 分 · 仅供参考
              </Text>
            </View>
          </View>
          <Text style={{ display: 'block', fontSize: '24rpx', color: '#78350F', lineHeight: 1.6 }}>
            {compare.recommendReason}
          </Text>
        </View>
      ) : null}

      {/* 报价排行卡片列表 */}
      <View style={{ marginTop: '14rpx', display: 'flex', flexDirection: 'column', gap: '12rpx' }}>
        {[...compare.quoteList].sort((a, b) => b.aiScore - a.aiScore).map((q) => (
          <QuoteRow key={q.workerId} q={q} isTop={q.workerId === compare.recommendedWorkerId} />
        ))}
      </View>

      <Text style={{ display: 'block', fontSize: '20rpx', color: '#9CA3AF', marginTop: '14rpx', textAlign: 'center' }}>
        {AI_DISCLAIMER}
      </Text>
    </View>
  );
};

const QuoteRow = ({ q, isTop }: { q: QuoteScored; isTop: boolean }) => {
  const tagStyle = q.aiTag ? TAG_STYLES[q.aiTag] : null;
  return (
    <View
      style={{
        padding: '20rpx 24rpx', borderRadius: '18rpx',
        background: '#FFFFFF',
        border: isTop ? '2rpx solid #F59E0B' : '1rpx solid #E5E7EB',
      }}
    >
      <View style={{ display: 'flex', alignItems: 'center', gap: '12rpx', marginBottom: '10rpx' }}>
        <Text style={{ flex: 1, fontSize: '26rpx', fontWeight: 800, color: '#081A3A' }}>
          {q.workerName || '接单者'}
        </Text>
        {tagStyle ? (
          <View style={{ padding: '4rpx 12rpx', borderRadius: '999rpx', background: tagStyle.bg }}>
            <Text style={{ fontSize: '20rpx', color: tagStyle.color, fontWeight: 600 }}>{q.aiTag}</Text>
          </View>
        ) : null}
        <Text style={{ fontSize: '28rpx', fontWeight: 700, color: '#B45309' }}>{fmtMoney(q.quotePrice)}</Text>
      </View>

      <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '14rpx' }}>
        {typeof q.distance === 'number' ? (
          <Text style={{ fontSize: '22rpx', color: '#8A6B4A' }}>距离 {q.distance.toFixed(1)} km</Text>
        ) : null}
        {typeof q.estimatedTime === 'number' ? (
          <Text style={{ fontSize: '22rpx', color: '#8A6B4A' }}>预计 {q.estimatedTime} 分钟</Text>
        ) : null}
        {typeof q.responseSpeed === 'number' ? (
          <Text style={{ fontSize: '22rpx', color: '#8A6B4A' }}>响应 {q.responseSpeed} 分钟</Text>
        ) : null}
        {typeof q.completionRate === 'number' ? (
          <Text style={{ fontSize: '22rpx', color: '#8A6B4A' }}>完成率 {Math.round(q.completionRate * 100)}%</Text>
        ) : null}
        {typeof q.goodRate === 'number' ? (
          <Text style={{ fontSize: '22rpx', color: '#8A6B4A' }}>好评 {Math.round(q.goodRate * 100)}%</Text>
        ) : null}
        {typeof q.similarTaskCount === 'number' ? (
          <Text style={{ fontSize: '22rpx', color: '#8A6B4A' }}>同类 {q.similarTaskCount} 单</Text>
        ) : null}
      </View>

      {q.reason ? (
        <View style={{ marginTop: '10rpx', display: 'flex', alignItems: 'flex-start', gap: '8rpx' }}>
          <TrendingUp size={12} color="#9CA3AF" />
          <Text style={{ flex: 1, fontSize: '22rpx', color: '#8A6B4A', lineHeight: 1.6 }}>{q.reason}</Text>
        </View>
      ) : null}

      {q.riskTag ? (
        <View
          style={{
            marginTop: '10rpx', padding: '10rpx 14rpx', borderRadius: '10rpx',
            background: '#FEF2F2', border: '1rpx solid #FECACA',
            display: 'flex', alignItems: 'center', gap: '8rpx',
          }}
        >
          <ShieldAlert size={12} color="#B91C1C" />
          <Text style={{ flex: 1, fontSize: '20rpx', color: '#B91C1C' }}>{q.riskTag}，建议先沟通确认。</Text>
        </View>
      ) : null}
    </View>
  );
};

export default AiQuoteCompare;
