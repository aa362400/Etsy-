import { CoverView, Map, ScrollView, Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ClipboardList,
  LocateFixed,
  MapPin,
  MessageCircle,
  Search,
  ShieldCheck,
} from 'lucide-react-taro';
import AiMascot from '@/components/AiMascot';
import { extractImages, getTaskList } from '@/lib/api';
import { DEFAULT_CITY_LABEL, DEFAULT_MAP_CENTER, fetchCurrentCity, getCachedCity, getCachedLocation, getUserLocation, normalizeCityName } from '@/lib/location';
import { getModule, isModuleVisible } from '@/lib/ui-config';
import './index.css';

const TASK_MARKER_ICON = '/assets/tabbar/plus-circle-active.png';
const filters = ['全部', '附近', '可议价', '即时响应', '信用优先'];

interface NearbyTask {
  id: string;
  title: string;
  category: string;
  region: string;
  budget: string;
  imageCount: number;
  applicationCount: number;
  latitude: number;
  longitude: number;
}

const goBack = () => {
  const pages = Taro.getCurrentPages();
  if (pages.length > 1) {
    Taro.navigateBack();
    return;
  }
  Taro.switchTab({ url: '/pages/home/index' });
};

const goPublish = () => Taro.switchTab({ url: '/pages/publish/index' });
const goTasks = () => Taro.switchTab({ url: '/pages/tasks/index' });
const goAi = () => Taro.navigateTo({ url: '/pages/ai-assistant/index?scene=nearby-map' });

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const pickNumber = (source: any, keys: string[]): number | null => {
  for (const key of keys) {
    const value = toNumber(source?.[key]);
    if (value !== null) return value;
  }
  return null;
};

const isValidLatitude = (value: number | null): value is number => value !== null && value >= -90 && value <= 90;
const isValidLongitude = (value: number | null): value is number => value !== null && value >= -180 && value <= 180;

const extractCoordinate = (task: any): { latitude: number; longitude: number } | null => {
  const candidates = [
    task,
    task?.location,
    task?.address,
    task?.geo,
    task?.position,
    task?.task_location,
  ].filter(Boolean);

  for (const item of candidates) {
    const latitude = pickNumber(item, ['latitude', 'lat', 'location_lat', 'address_lat', 'geo_lat']);
    const longitude = pickNumber(item, ['longitude', 'lng', 'lon', 'location_lng', 'address_lng', 'geo_lng']);
    if (isValidLatitude(latitude) && isValidLongitude(longitude)) {
      return { latitude, longitude };
    }
  }
  return null;
};

const formatBudget = (task: any) => {
  const amount = Number(task.budget_amount || task.budget_max || task.budget_min || task.amount || task.reward || 0);
  if (!Number.isFinite(amount) || amount <= 0) return '预算待同步';
  const yuan = amount > 1000 ? amount / 100 : amount;
  return `¥${Math.round(yuan)}`;
};

const normalizeTask = (task: any): NearbyTask | null => {
  const point = extractCoordinate(task);
  const id = String(task.id || task.task_id || '');
  if (!id || !point) return null;

  return {
    id,
    title: task.title || '未命名需求',
    category: task.task_categories?.name || task.category_name || task.category || '同城服务',
    region: task.region || task.city || task.address?.name || task.address || '位置待同步',
    budget: formatBudget(task),
    imageCount: extractImages(task).length,
    applicationCount: task.task_applications?.length || task.application_count || task.applyCount || 0,
    latitude: point.latitude,
    longitude: point.longitude,
  };
};

export default function NearbyMapPage() {
  const mapTabs = getModule('nearbyMap', 'mapTabs');
  const [tasks, setTasks] = useState<NearbyTask[]>([]);
  const [center, setCenter] = useState(DEFAULT_MAP_CENTER);
  const [city, setCity] = useState(DEFAULT_CITY_LABEL);
  const [activeTaskId, setActiveTaskId] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const selectedTask = useMemo(
    () => tasks.find((item) => item.id === activeTaskId) || tasks[0],
    [activeTaskId, tasks],
  );

  const markers = useMemo(
    () =>
      tasks.map((task, index) => ({
        id: index + 1,
        latitude: task.latitude,
        longitude: task.longitude,
        iconPath: TASK_MARKER_ICON,
        width: 34,
        height: 34,
        title: task.title,
        callout: {
          content: `${task.title}\n${task.budget}`,
          color: '#081A3A',
          fontSize: 13,
          anchorX: 0,
          anchorY: -8,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: '#FFE1CC',
          bgColor: '#FFFFFF',
          padding: 8,
          display: index === 0 ? 'ALWAYS' as const : 'BYCLICK' as const,
          textAlign: 'center' as const,
        },
      })),
    [tasks],
  );

  const includePoints = useMemo(
    () => tasks.map((task) => ({ latitude: task.latitude, longitude: task.longitude })),
    [tasks],
  );

  const loadLocation = async () => {
    const cachedCity = getCachedCity();
    if (cachedCity) setCity(cachedCity);
    const cachedLocation = getCachedLocation();
    if (cachedLocation?.latitude && cachedLocation?.longitude) {
      setCenter({ latitude: cachedLocation.latitude, longitude: cachedLocation.longitude });
      if (cachedLocation.city) setCity(normalizeCityName(cachedLocation.city));
      return;
    }
    try {
      const location = await getUserLocation();
      setCenter(location);
      const currentCity = await fetchCurrentCity();
      if (currentCity) setCity(currentCity);
    } catch {
      // 没授权或 H5 不支持时保留默认城市中心，不阻塞任务列表。
    }
  };

  const loadNearbyTasks = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await getTaskList({ page: 1, limit: 20, status: 'open', sort: 'latest' });
      if (res?.code !== 200) throw new Error(res?.msg || '附近任务接口返回异常');
      const rawItems = (res?.data as any)?.items || [];
      const normalized = Array.isArray(rawItems)
        ? rawItems.map(normalizeTask).filter((item): item is NearbyTask => Boolean(item))
        : [];
      setTasks(normalized);
      setActiveTaskId(normalized[0]?.id || '');
      if (normalized[0]) setCenter({ latitude: normalized[0].latitude, longitude: normalized[0].longitude });
    } catch (error: any) {
      setTasks([]);
      setActiveTaskId('');
      setErrorMsg(error?.message || '附近任务加载失败，请检查后端服务');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLocation();
    loadNearbyTasks();
    const reload = () => loadNearbyTasks();
    Taro.eventCenter.on('privacyAuthorized', reload);
    return () => {
      Taro.eventCenter.off('privacyAuthorized', reload);
    };
  }, []);

  useDidShow(() => {
    loadNearbyTasks();
  });

  const handleMarkerTap = (event: any) => {
    const markerId = Number(event?.detail?.markerId || event?.markerId || 0);
    const task = tasks[markerId - 1];
    if (!task) return;
    setActiveTaskId(task.id);
    Taro.navigateTo({ url: `/pages/task-detail/index?id=${task.id}` });
  };

  const locateAgain = async () => {
    try {
      const location = await getUserLocation();
      setCenter(location);
      const currentCity = await fetchCurrentCity();
      if (currentCity) setCity(currentCity);
      Taro.showToast({ title: '定位已更新', icon: 'success' });
    } catch {
      Taro.showToast({ title: '定位失败，请检查授权', icon: 'none' });
    }
  };

  return (
    <View className="nearby-map-page">
      <View className="nearby-top">
        <View className="nearby-brand-row">
          <View className="nearby-back" onClick={goBack}>
            <ArrowLeft size={24} color="#081A3A" />
          </View>
          <View className="nearby-brand">
            <Text className="nearby-logo-main">有应</Text>
            <Text className="nearby-logo-accent">帮</Text>
            <Text className="nearby-slogan">附近需求，实时响应</Text>
          </View>
          <View className="nearby-capsule">
            <Text className="nearby-capsule-dot">•••</Text>
            <Text className="nearby-capsule-line">|</Text>
            <Text className="nearby-capsule-circle">○</Text>
          </View>
        </View>

        <View className="nearby-search-row">
          <View className="nearby-city">
            <MapPin size={18} color="#081A3A" />
            <Text className="nearby-city-text">{city || '同城'}</Text>
          </View>
          <View className="nearby-search" onClick={goTasks}>
            <Search size={22} color="#8A8F99" />
            <Text className="nearby-search-text">搜索真实需求、技能或服务</Text>
          </View>
        </View>
      </View>

      <ScrollView scrollY className="nearby-scroll" showScrollbar={false}>
        <View className="nearby-title-row">
          <View className="nearby-title-copy">
            <Text className="nearby-title">{mapTabs?.title || '附近响应 / 地图派单'}</Text>
            <Text className="nearby-subtitle">只展示后端返回真实经纬度的需求，避免假点位误导用户。</Text>
          </View>
          <View className="nearby-locate" onClick={locateAgain}>
            <LocateFixed size={18} color="#FF4D19" />
            <Text className="nearby-locate-text">重新定位</Text>
          </View>
        </View>

        <ScrollView scrollX className="nearby-filter-scroll" showScrollbar={false}>
          <View className="nearby-filter-row">
            {filters.map((item, index) => (
              <View className={`nearby-filter ${index === 0 ? 'nearby-filter-active' : ''}`} key={item}>
                <Text className={`nearby-filter-text ${index === 0 ? 'nearby-filter-text-active' : ''}`}>{item}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        {isModuleVisible('nearbyMap', 'providerPins') ? (
          <View className="nearby-map-card">
            <Map
              className="nearby-real-map"
              latitude={center.latitude}
              longitude={center.longitude}
              scale={tasks.length ? 13 : 12}
              markers={markers}
              includePoints={includePoints.length > 0 ? includePoints : undefined}
              showLocation
              showCompass
              enableZoom
              enableScroll
              enablePoi
              onMarkerTap={handleMarkerTap}
              onError={() => {}}
            />
            <CoverView className="nearby-map-overlay nearby-map-overlay-top">
              <CoverView className="nearby-live-dot" />
              <CoverView className="nearby-map-overlay-title">{tasks.length ? `${tasks.length} 个真实定位需求` : '等待真实定位数据'}</CoverView>
            </CoverView>
            <CoverView className="nearby-map-tip">
              <CoverView className="nearby-map-tip-badge">AI</CoverView>
              <CoverView className="nearby-map-tip-text">发布需求后，AI 会按真实位置匹配</CoverView>
            </CoverView>
            {!loading && tasks.length === 0 ? (
              <CoverView className="nearby-map-empty">
                <CoverView className="nearby-map-empty-icon">定位</CoverView>
                <CoverView className="nearby-map-empty-title">暂无真实定位任务</CoverView>
                <CoverView className="nearby-map-empty-desc">
                  {errorMsg || '后端任务还没有经纬度字段，接入真实定位后这里会自动出现点位。'}
                </CoverView>
              </CoverView>
            ) : null}
          </View>
        ) : null}

        {isModuleVisible('nearbyMap', 'selectedDemand') ? (
          <View className="nearby-demand-card">
            <View className="nearby-demand-main">
              <Text className="nearby-demand-tag">{selectedTask ? '当前选中需求' : '当前需求'}</Text>
              <Text className="nearby-demand-title">{selectedTask?.title || '还没有可定位的真实需求'}</Text>
              <Text className="nearby-demand-desc">
                {selectedTask
                  ? `${selectedTask.region} · ${selectedTask.category} · ${selectedTask.applicationCount} 人响应`
                  : '发布需求并保存服务地址后，这里会展示预算、地址和响应情况。'}
              </Text>
            </View>
            <View
              className="nearby-price-card"
              onClick={() => (selectedTask ? Taro.navigateTo({ url: `/pages/task-detail/index?id=${selectedTask.id}` }) : goPublish())}
            >
              <Text className="nearby-price-label">{selectedTask ? '预算' : '下一步'}</Text>
              <Text className="nearby-price">{selectedTask?.budget || '发布'}</Text>
              <Text className="nearby-price-tip">{selectedTask ? '查看详情' : '让附近的人来响应'}</Text>
            </View>
          </View>
        ) : null}

        <View className="nearby-ai-card" onClick={goAi}>
          <View className="nearby-ai-info">
            <View className="nearby-ai-icon">
              <Text className="nearby-ai-icon-text">AI</Text>
            </View>
            <View className="nearby-ai-copy">
              <Text className="nearby-ai-title">AI 派单准备好了</Text>
              <Text className="nearby-ai-desc">先把需求说清楚，平台会按真实资料、位置和信用记录做匹配。</Text>
            </View>
          </View>
          <AiMascot size="lg" pose="point" />
        </View>

        <View className="nearby-task-strip">
          <View className="nearby-task-strip-head">
            <Text className="nearby-task-strip-title">地图任务</Text>
            <Text className="nearby-task-strip-count">{loading ? '加载中' : `${tasks.length} 个可定位`}</Text>
          </View>
          {loading ? (
            <View className="nearby-task-loading">
              <Text className="nearby-task-loading-text">正在读取附近真实任务...</Text>
            </View>
          ) : tasks.length > 0 ? (
            tasks.slice(0, 4).map((task) => (
              <View
                className={`nearby-task-row ${selectedTask?.id === task.id ? 'nearby-task-row-active' : ''}`}
                key={task.id}
                onClick={() => {
                  setActiveTaskId(task.id);
                  setCenter({ latitude: task.latitude, longitude: task.longitude });
                }}
              >
                <View className="nearby-task-icon">
                  <ClipboardList size={22} color="#FF4D19" />
                </View>
                <View className="nearby-task-main">
                  <Text className="nearby-task-title">{task.title}</Text>
                  <Text className="nearby-task-meta">{task.region} · {task.category} · {task.imageCount} 图</Text>
                </View>
                <View className="nearby-task-side">
                  <Text className="nearby-task-budget">{task.budget}</Text>
                  <Text className="nearby-task-link">定位</Text>
                </View>
              </View>
            ))
          ) : (
            <View className="nearby-empty-card">
              <AiMascot size="lg" pose="wave" />
              <View className="nearby-empty-main">
                <Text className="nearby-empty-title">附近服务列表等待真实定位接入</Text>
                <Text className="nearby-empty-desc">
                  当前没有可展示在地图上的真实经纬度数据。请在后端任务表补充地址坐标，或先发布一个带定位的需求。
                </Text>
                <View className="nearby-empty-actions">
                  <View className="nearby-empty-btn nearby-empty-btn-primary" onClick={goPublish}>
                    <Text className="nearby-empty-btn-primary-text">发布需求</Text>
                  </View>
                  <View className="nearby-empty-btn nearby-empty-btn-ghost" onClick={goTasks}>
                    <Text className="nearby-empty-btn-ghost-text">看需求广场</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>

        {isModuleVisible('nearbyMap', 'aiDispatch') ? (
          <View className="nearby-dispatch" onClick={goPublish}>
            <View>
              <Text className="nearby-dispatch-title">一键发布，AI 匹配真实响应</Text>
              <Text className="nearby-dispatch-desc">需求越清楚，服务者响应越快</Text>
            </View>
            <View className="nearby-dispatch-icon">
              <MessageCircle size={22} color="#FF4D19" />
            </View>
          </View>
        ) : null}

        <View className="nearby-safe-row">
          {['实名认证', '信用优先', '资金托管'].map((item) => (
            <View className="nearby-safe-item" key={item}>
              <ShieldCheck size={17} color="#20B26B" />
              <Text className="nearby-safe-text">{item}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
