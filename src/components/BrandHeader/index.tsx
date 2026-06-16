import { ReactNode } from 'react';
import { Text, View } from '@tarojs/components';
import { getTheme } from '@/lib/ui-config';
import './index.css';

interface BrandHeaderProps {
  title?: string;
  subtitle?: string;
  citySlot?: ReactNode;
  searchSlot?: ReactNode;
  rightSlot?: ReactNode;
  safeTop?: boolean;
}

export default function BrandHeader({
  title = '有应帮',
  subtitle = '让需求被看见，让技能被回应',
  citySlot,
  searchSlot,
  rightSlot,
  safeTop = true,
}: BrandHeaderProps) {
  const theme = getTheme();
  return (
    <View className={`brand-header ${safeTop ? 'brand-header-safe' : ''}`}>
      <View className="brand-header-row">
        <View className="brand-header-main">
          <View className="brand-header-title-row">
            <Text className="brand-header-title" style={{ color: '#081A3A' }}>{title.slice(0, -1)}</Text>
            <Text className="brand-header-title-accent" style={{ color: theme.primary }}>{title.slice(-1)}</Text>
          </View>
          <Text className="brand-header-subtitle">{subtitle}</Text>
        </View>
        {rightSlot ? <View className="brand-header-right">{rightSlot}</View> : null}
      </View>
      {citySlot || searchSlot ? (
        <View className="brand-header-tools">
          {citySlot ? <View className="brand-header-city">{citySlot}</View> : null}
          {searchSlot ? <View className="brand-header-search">{searchSlot}</View> : null}
        </View>
      ) : null}
    </View>
  );
}
