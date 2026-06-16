import { ScrollView, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import {
  AirVent,
  BadgeDollarSign,
  Bath,
  BookOpen,
  BriefcaseBusiness,
  BrushCleaning,
  CalendarDays,
  Camera,
  Car,
  ChevronRight,
  Clapperboard,
  Code,
  ConciergeBell,
  Database,
  Drill,
  FileText,
  Folder,
  Gift,
  Grid2x2,
  Handbag,
  HardHat,
  House,
  Image,
  Languages,
  MapPin,
  MapPinned,
  Megaphone,
  MessageCircle,
  Mic,
  Monitor,
  Package,
  Paintbrush,
  PawPrint,
  PenLine,
  ScanLine,
  Scale,
  Search,
  Smartphone,
  Sofa,
  SprayCan,
  Stamp,
  Truck,
  User,
  Users,
  Wifi,
  Wrench,
} from 'lucide-react-taro';
import AiMascot from '@/components/AiMascot';
import ReplicaTabBar from '@/components/ReplicaTabBar';
import './index.css';

type IconType = any;
type Tone = 'orange' | 'blue' | 'green' | 'purple';

interface ServiceItem {
  name: string;
  icon: IconType;
  tone: Tone;
}

interface CategoryGroup {
  title: string;
  items: ServiceItem[];
}

const TONE_COLOR: Record<Tone, string> = {
  orange: '#FF6A00',
  blue: '#2563EB',
  green: '#17B978',
  purple: '#8B5CF6',
};

const QUICK: ServiceItem[] = [
  { name: '深度保洁', icon: House, tone: 'green' },
  { name: '电脑维修', icon: Monitor, tone: 'purple' },
  { name: '帮拍视频', icon: Camera, tone: 'orange' },
  { name: '代取文件', icon: Folder, tone: 'blue' },
];

const GROUPS: CategoryGroup[] = [
  {
    title: '生活服务',
    items: [
      { name: '家常做饭', icon: ConciergeBell, tone: 'orange' },
      { name: '活动主持', icon: Mic, tone: 'blue' },
      { name: '拍照摄影', icon: Camera, tone: 'green' },
      { name: '活动策划', icon: CalendarDays, tone: 'purple' },
    ],
  },
  {
    title: '技能服务',
    items: [
      { name: '编程开发', icon: Code, tone: 'blue' },
      { name: '法律咨询', icon: Scale, tone: 'green' },
      { name: '财税代办', icon: BadgeDollarSign, tone: 'orange' },
      { name: '翻译服务', icon: Languages, tone: 'purple' },
    ],
  },
  {
    title: '跑腿代办',
    items: [
      { name: '帮买帮送', icon: Handbag, tone: 'orange' },
      { name: '取送文件', icon: Folder, tone: 'blue' },
      { name: '排队代办', icon: Users, tone: 'green' },
      { name: '代办手续', icon: Stamp, tone: 'purple' },
    ],
  },
  {
    title: '家政保洁',
    items: [
      { name: '日常保洁', icon: BrushCleaning, tone: 'green' },
      { name: '深度保洁', icon: SprayCan, tone: 'blue' },
      { name: '钟点工', icon: HardHat, tone: 'orange' },
      { name: '保姆月嫂', icon: User, tone: 'purple' },
    ],
  },
  {
    title: '搬家拉货',
    items: [
      { name: '同城搬家', icon: Truck, tone: 'orange' },
      { name: '跨城搬家', icon: Truck, tone: 'blue' },
      { name: '货运拉货', icon: Package, tone: 'green' },
      { name: '拆装打包', icon: Package, tone: 'purple' },
    ],
  },
  {
    title: '维修安装',
    items: [
      { name: '家电维修', icon: Wrench, tone: 'blue' },
      { name: '家具维修', icon: Sofa, tone: 'green' },
      { name: '水电维修', icon: Drill, tone: 'orange' },
      { name: '门窗安装', icon: Wrench, tone: 'purple' },
    ],
  },
  {
    title: '数码服务',
    items: [
      { name: '电脑维修', icon: Monitor, tone: 'purple' },
      { name: '手机维修', icon: Smartphone, tone: 'green' },
      { name: '数据恢复', icon: Database, tone: 'blue' },
      { name: '网络调试', icon: Wifi, tone: 'purple' },
    ],
  },
  {
    title: '宠物服务',
    items: [
      { name: '宠物寄养', icon: House, tone: 'orange' },
      { name: '上门喂养', icon: Handbag, tone: 'green' },
      { name: '洗澡美容', icon: Bath, tone: 'blue' },
      { name: '遛狗陪玩', icon: PawPrint, tone: 'purple' },
    ],
  },
  {
    title: '二手闲置',
    items: [
      { name: '二手交易', icon: Handbag, tone: 'orange' },
      { name: '闲置数码', icon: Smartphone, tone: 'green' },
      { name: '家具家电', icon: Sofa, tone: 'blue' },
      { name: '图书文玩', icon: BookOpen, tone: 'purple' },
    ],
  },
  {
    title: '临时用工',
    items: [
      { name: '临时工', icon: HardHat, tone: 'green' },
      { name: '兼职服务', icon: BriefcaseBusiness, tone: 'orange' },
      { name: '展会协助', icon: CalendarDays, tone: 'blue' },
      { name: '活动协助', icon: Megaphone, tone: 'purple' },
    ],
  },
  {
    title: '租赁求租',
    items: [
      { name: '房屋租赁', icon: House, tone: 'green' },
      { name: '设备租赁', icon: Drill, tone: 'blue' },
      { name: '求租求购', icon: MessageCircle, tone: 'orange' },
      { name: '场地租赁', icon: MapPinned, tone: 'purple' },
    ],
  },
  {
    title: '教育辅导',
    items: [
      { name: '上门家教', icon: Users, tone: 'green' },
      { name: '兴趣培训', icon: Paintbrush, tone: 'orange' },
      { name: '语言学习', icon: Languages, tone: 'blue' },
      { name: '考试辅导', icon: PenLine, tone: 'purple' },
    ],
  },
  {
    title: '设计文案',
    items: [
      { name: 'LOGO设计', icon: Paintbrush, tone: 'purple' },
      { name: '平面设计', icon: Image, tone: 'green' },
      { name: '视频剪辑', icon: Clapperboard, tone: 'blue' },
      { name: '文案写作', icon: PenLine, tone: 'orange' },
    ],
  },
  {
    title: '陪诊陪护',
    items: [
      { name: '陪诊看病', icon: BriefcaseBusiness, tone: 'green' },
      { name: '老人陪护', icon: User, tone: 'orange' },
      { name: '医院代办', icon: FileText, tone: 'blue' },
      { name: '护工服务', icon: Users, tone: 'purple' },
    ],
  },
  {
    title: '家电清洗',
    items: [
      { name: '空调清洗', icon: AirVent, tone: 'blue' },
      { name: '油烟机清洗', icon: BrushCleaning, tone: 'green' },
      { name: '洗衣机清洗', icon: SprayCan, tone: 'orange' },
      { name: '冰箱清洗', icon: Wrench, tone: 'purple' },
    ],
  },
  {
    title: '其他服务',
    items: [
      { name: '礼品代购', icon: Gift, tone: 'orange' },
      { name: '代收快递', icon: Package, tone: 'green' },
      { name: '车辆服务', icon: Car, tone: 'blue' },
      { name: '更多服务', icon: Grid2x2, tone: 'purple' },
    ],
  },
];

const goSearch = (keyword = '') => {
  const query = keyword ? `?q=${encodeURIComponent(keyword)}` : '';
  Taro.navigateTo({ url: `/pages/search/index${query}` });
};

const handleScan = () => {
  if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
    Taro.showToast({ title: '请在微信小程序中使用扫一扫', icon: 'none' });
    return;
  }
  Taro.scanCode({ onlyFromCamera: false }).catch(() => {});
};

export default function CategoriesPage() {
  return (
    <View className="cat-page">
      <View className="cat-header">
        <View className="cat-status-space" />
        <View className="cat-brand-row">
          <View className="cat-logo" onClick={() => Taro.switchTab({ url: '/pages/home/index' })}>
            <Text className="cat-logo-main">有应</Text>
            <Text className="cat-logo-accent">帮</Text>
          </View>
          <View className="cat-city">
            <MapPin size={18} color="#111827" />
            <Text className="cat-city-text">厦门市</Text>
          </View>
          <View className="cat-search" onClick={() => goSearch()}>
            <Search size={20} color="#111827" />
            <Text className="cat-search-placeholder">搜索服务、技能或商品</Text>
          </View>
          <View className="cat-header-action" onClick={() => Taro.navigateTo({ url: '/pages/messages/index' })}>
            <MessageCircle size={21} color="#111827" />
            <Text className="cat-header-action-text">消息</Text>
          </View>
          <View className="cat-header-action" onClick={handleScan}>
            <ScanLine size={21} color="#111827" />
            <Text className="cat-header-action-text">扫一扫</Text>
          </View>
        </View>

        <View className="cat-title-row">
          <View className="cat-title-copy">
            <Text className="cat-title">全部分类</Text>
            <Text className="cat-subtitle">找服务、找技能、找闲置，一页看全</Text>
          </View>
          <View className="cat-robot-wrap">
            <AiMascot size="xl" pose="wave" />
          </View>
        </View>

        <View className="cat-ai-strip">
          <AiMascot size="md" pose="cheer" />
          <Text className="cat-ai-title">AI猜你想找：</Text>
          <ScrollView scrollX showScrollbar={false} className="cat-ai-scroll">
            <View className="cat-ai-chip-row">
              {QUICK.map((item) => {
                const Icon = item.icon;
                return (
                  <View className="cat-ai-chip" key={item.name} onClick={() => goSearch(item.name)}>
                    <View className={`cat-ai-chip-icon cat-tone-${item.tone}`}>
                      <Icon size={19} color={TONE_COLOR[item.tone]} />
                    </View>
                    <Text className="cat-ai-chip-text">{item.name}</Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>

      <View className="cat-grid">
        {GROUPS.map((group) => (
          <View className="cat-card" key={group.title}>
            <View className="cat-card-head" onClick={() => goSearch(group.title)}>
              <Text className="cat-card-title">{group.title}</Text>
              <ChevronRight size={22} color="#7A8190" />
            </View>
            <View className="cat-card-items">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <View className="cat-service" key={`${group.title}-${item.name}`} onClick={() => goSearch(item.name)}>
                    <View className={`cat-service-icon cat-tone-${item.tone}`}>
                      <Icon size={27} color={TONE_COLOR[item.tone]} />
                    </View>
                    <Text className="cat-service-name">{item.name}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        ))}
      </View>

      <View className="cat-bottom-space" />
      <ReplicaTabBar active="tasks" variant="main" />
    </View>
  );
}
