import { Image, View } from '@tarojs/components';
import mascot from '@/assets/brand/ai-mascot.png';
import './index.css';

type MascotSize = 'sm' | 'md' | 'lg' | 'xl';
type MascotPose = 'wave' | 'think' | 'point' | 'cheer' | 'idle';

interface AiMascotProps {
  size?: MascotSize;
  pose?: MascotPose;
  breath?: boolean;
  className?: string;
}

const SIZE_CLASS: Record<MascotSize, string> = {
  sm: 'ai-mascot-sm',
  md: 'ai-mascot-md',
  lg: 'ai-mascot-lg',
  xl: 'ai-mascot-xl',
};

export default function AiMascot({
  size = 'md',
  pose = 'idle',
  breath = true,
  className = '',
}: AiMascotProps) {
  return (
    <View className={`ai-mascot ${SIZE_CLASS[size]} ai-mascot-${pose} ${breath ? 'ai-mascot-breath' : ''} ${className}`}>
      <Image className="ai-mascot-image" src={mascot} mode="aspectFill" />
    </View>
  );
}
