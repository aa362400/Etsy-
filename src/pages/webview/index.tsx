import { View, Text, WebView } from '@tarojs/components';
import { useRouter } from '@tarojs/taro';
import './index.css';

export default function ProductWebViewPage() {
  const router = useRouter();
  const rawUrl = router.params?.url || '';
  const title = decodeURIComponent(router.params?.title || '商品详情');
  const url = rawUrl ? decodeURIComponent(rawUrl) : '';

  if (!url || !/^https?:\/\//i.test(url)) {
    return (
      <View className="webview-empty">
        <Text className="webview-title">暂时打不开这个商品</Text>
        <Text className="webview-desc">商品链接为空或格式不正确，可以回到有应帮AI助手重新选择。</Text>
      </View>
    );
  }

  return (
    <View className="webview-page">
      <View className="webview-header">
        <Text className="webview-title">{title}</Text>
      </View>
      <WebView src={url} />
    </View>
  );
}
