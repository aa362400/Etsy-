import { View, Text, Image } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  Bot,
  ChevronRight,
  CircleCheck,
  Clock,
  ExternalLink,
  Package,
  ShieldCheck,
  Sparkles,
} from 'lucide-react-taro';
import AiMascot from '@/components/AiMascot';
import './index.css';

interface ProductInfo {
  id?: string;
  title?: string;
  image?: string;
  price?: number | string;
  source?: string;
  source_url?: string;
  seller?: string;
  rating?: number | string;
  sales?: number | string;
  desc?: string;
  description?: string;
  product_type?: string;
  tags?: string[];
}

const createDraftFromProduct = (product: ProductInfo) => ({
  title: `想发布：${product.title || '商品/服务需求'}`,
  description: [
    `我想发布一个类似「${product.title || '商品/服务'}」的需求。`,
    product.price ? `参考价格：¥${product.price}` : '',
    product.source ? `参考来源：${product.source}` : '',
    product.seller ? `参考服务方：${product.seller}` : '',
    '请补充图片、交付方式、时间和验收标准。',
  ].filter(Boolean).join('\n'),
  budget_amount: product.price ? String(product.price) : '',
  service_type: 'online',
  acceptance_standard: '按约定完成并提供凭证',
});

const goBack = () => {
  const pages = Taro.getCurrentPages();
  if (pages.length > 1) {
    Taro.navigateBack();
    return;
  }
  Taro.navigateTo({ url: '/pages/ai-assistant/index' });
};

const hasText = (value: unknown) => value !== undefined && value !== null && String(value).trim() !== '';
const toText = (value: unknown, fallback = '待确认') => hasText(value) ? String(value) : fallback;
const toPriceText = (value: ProductInfo['price']) => {
  if (!hasText(value)) return '价格待确认';
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    return `¥ ${numeric > 1000 ? (numeric / 100).toFixed(2) : numeric}`;
  }
  return `¥ ${value}`;
};

export default function ProductDetailPage() {
  const [product, setProduct] = useState<ProductInfo | null>(null);

  useDidShow(() => {
    try {
      const cached = Taro.getStorageSync('ai_selected_product');
      if (cached) setProduct(cached);
    } catch (_) {
      setProduct(null);
    }
  });

  const openSource = () => {
    const url = product?.source_url || '';
    if (!url) {
      Taro.showToast({ title: '暂无外部商品链接', icon: 'none' });
      return;
    }
    if (/^https?:\/\//i.test(url)) {
      Taro.navigateTo({ url: `/pages/webview/index?url=${encodeURIComponent(url)}&title=${encodeURIComponent(product?.title || '商品详情')}` });
      return;
    }
    if (url.startsWith('/pages/')) {
      Taro.navigateTo({ url }).catch(() => Taro.switchTab({ url }));
      return;
    }
    Taro.setClipboardData({ data: url });
    Taro.showToast({ title: '已复制商品链接', icon: 'none' });
  };

  const publishSimilar = () => {
    if (!product) return;
    Taro.setStorageSync('ai_publish_draft', createDraftFromProduct(product));
    Taro.switchTab({ url: '/pages/publish/index' });
  };

  if (!product) {
    return (
      <View className="product-detail-page">
        <NavTitle title="商品参考" />
        <View className="product-detail-empty-card">
          <AiMascot size="xl" pose="point" />
          <Text className="product-detail-empty-kicker">AI 小应还没拿到商品</Text>
          <Text className="product-detail-empty-title">先去 AI 助手挑一个参考</Text>
          <Text className="product-detail-empty-desc">你可以让 AI 帮你找服务、商品或价格参考，再一键转成发布需求草稿。</Text>
          <View className="product-detail-empty-action" onClick={() => Taro.navigateTo({ url: '/pages/ai-assistant/index?scene=product' })}>
            <Bot size={26} color="#FFFFFF" />
            <Text className="product-detail-empty-action-text">让 AI 帮我找</Text>
          </View>
        </View>
      </View>
    );
  }

  const title = toText(product.title, 'AI 推荐参考');
  const priceText = toPriceText(product.price);
  const sourceText = toText(product.source, '来源待确认');
  const sellerText = toText(product.seller, '服务方待确认');
  const ratingText = hasText(product.rating) ? `${product.rating} 分` : '评价待同步';
  const salesText = hasText(product.sales) ? `${product.sales} 单` : '成交数据待同步';
  const description = toText(product.description || product.desc, 'AI 暂未返回详细说明，请发布前补充交付方式、时间、验收标准和售后要求。');

  return (
    <View className="product-detail-page">
      <NavTitle title="商品参考" />

      <View className="product-detail-hero">
        <View className="product-detail-hero-copy">
          <Text className="product-detail-kicker">AI 推荐参考</Text>
          <Text className="product-detail-hero-title">确认信息后，一键转成发布需求</Text>
          <Text className="product-detail-hero-desc">价格仅作为参考，实际成交以服务方报价、订单状态和平台规则为准。</Text>
        </View>
        <AiMascot size="lg" pose="point" />
      </View>

      <View className="product-detail-card">
        <View className="product-detail-media-wrap">
          {product.image ? (
            <Image className="product-detail-image" src={product.image} mode="aspectFill" />
          ) : (
            <View className="product-detail-image-fallback">
              <Package size={50} color="#FF6A00" />
              <Text className="product-detail-image-fallback-text">图片待同步</Text>
            </View>
          )}
          <View className="product-detail-media-badge">
            <Sparkles size={18} color="#FFFFFF" />
            <Text className="product-detail-media-badge-text">AI 已整理</Text>
          </View>
        </View>

        <View className="product-detail-title-row">
          <View className="product-detail-title-main">
            <Text className="product-detail-title">{title}</Text>
            <Text className="product-detail-desc">{description}</Text>
          </View>
          <View className="product-detail-price-card">
            <Text className="product-detail-price-label">参考价</Text>
            <Text className="product-detail-price">{priceText}</Text>
          </View>
        </View>

        {Array.isArray(product.tags) && product.tags.length ? (
          <View className="product-detail-tags">
            {product.tags.map((tag) => <Text className="product-detail-tag" key={tag}>{tag}</Text>)}
          </View>
        ) : null}

        <View className="product-detail-grid">
          <InfoCell icon={BadgeCheck} label="来源" value={sourceText} />
          <InfoCell icon={ShieldCheck} label="服务方" value={sellerText} />
          <InfoCell icon={CircleCheck} label="评价" value={ratingText} />
          <InfoCell icon={Clock} label="成交" value={salesText} />
        </View>
      </View>

      <View className="product-detail-ai-card">
        <View className="product-detail-ai-icon">
          <ShieldCheck size={28} color="#FF4D19" />
        </View>
        <View className="product-detail-ai-main">
          <Text className="product-detail-ai-title">发布前建议补齐验收标准</Text>
          <Text className="product-detail-ai-desc">请补充图片、交付方式、时间、售后要求和预算范围，避免服务方理解偏差。</Text>
        </View>
        <ChevronRight size={24} color="#B87920" />
      </View>

      <View className="product-detail-check-card">
        <Text className="product-detail-check-title">转成需求前请确认</Text>
        <CheckLine text="不要直接承诺价格，预算只作为参考区间" />
        <CheckLine text="补充交付方式、期望时间、验收标准和售后边界" />
        <CheckLine text="涉及退款、时效、平台保障时，以订单状态和平台规则为准" />
      </View>

      <View className="product-detail-actions">
        <View className={`product-detail-btn ${product.source_url ? '' : 'product-detail-btn-muted'}`} onClick={openSource}>
          <ExternalLink size={26} color="#FF4D19" />
          <Text className="product-detail-btn-text">打开来源</Text>
        </View>
        <View className="product-detail-btn primary" onClick={publishSimilar}>
          <Sparkles size={26} color="#FFFFFF" />
          <Text className="product-detail-btn-text product-detail-btn-text-primary">发布类似需求</Text>
        </View>
      </View>
    </View>
  );
}

function InfoCell({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View className="product-detail-info-cell">
      <View className="product-detail-info-icon">
        <Icon size={22} color="#FF4D19" />
      </View>
      <Text className="product-detail-info-label">{label}</Text>
      <Text className="product-detail-info-value">{value}</Text>
    </View>
  );
}

function CheckLine({ text }: { text: string }) {
  return (
    <View className="product-detail-check-line">
      <CircleCheck size={20} color="#17B978" />
      <Text className="product-detail-check-text">{text}</Text>
    </View>
  );
}

function NavTitle({ title }: { title: string }) {
  return (
    <View className="product-detail-nav">
      <View className="product-detail-back" onClick={goBack}>
        <ArrowLeft size={30} color="#081A3A" />
      </View>
      <Text className="product-detail-nav-title">{title}</Text>
      <View className="product-detail-menu-pill">
        <Text className="product-detail-menu-dot">•••</Text>
        <Text className="product-detail-menu-line">—</Text>
        <Text className="product-detail-menu-circle">◎</Text>
      </View>
    </View>
  );
}
