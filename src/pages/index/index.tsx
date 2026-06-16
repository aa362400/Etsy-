/**
 * 兼容旧入口：统一跳转到新版首页
 */
import { View, Text } from '@tarojs/components';
import Taro, { useShareAppMessage, useShareTimeline } from '@tarojs/taro';
import { useEffect } from 'react';
import { ChevronRight } from 'lucide-react-taro';
import AiMascot from '@/components/AiMascot';
import './index.css';

const IndexPage = () => {
  useShareAppMessage(() => ({ title: '有应帮 - 发需求，有人应', path: '/pages/home/index' }));
  useShareTimeline(() => ({ title: '有应帮 - 让需求被看见，让技能被回应' }));

  useEffect(() => {
    const timer = setTimeout(() => {
      Taro.switchTab({ url: '/pages/home/index' });
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View className="legacy-page">
      <View className="legacy-card">
        <View className="legacy-brand">
          <Text className="legacy-brand-main">有应</Text>
          <Text className="legacy-brand-accent">帮</Text>
        </View>
        <AiMascot size="xl" pose="cheer" />
        <Text className="legacy-title">正在进入新版首页</Text>
        <Text className="legacy-desc">如果没有自动跳转，请点击下方按钮继续。</Text>
        <View className="legacy-btn" onClick={() => Taro.switchTab({ url: '/pages/home/index' })}>
          <Text className="legacy-btn-text">进入有应帮</Text>
          <ChevronRight size={28} color="#FFFFFF" />
        </View>
      </View>
    </View>
  );
};

export default IndexPage;
