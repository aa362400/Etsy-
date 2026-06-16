/**
 * 发布任务页 - 有应帮
 * 图片可选上传，不上传时提交 images: []
 */
import { View, Text, Picker } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Box,
  CircleCheck,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Image as ImageIcon,
  MapPin,
  Mic,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
  Zap,
} from 'lucide-react-taro';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import UploadImages from '@/components/UploadImages';
import AiChatWidget from '@/components/ai-chat-widget';
import AiMascot from '@/components/AiMascot';
import { createTask } from '@/lib/api';
import { requestTaskDraft } from '@/lib/ai-assist';
import { chooseManualLocation, LocationData } from '@/lib/location';
import { Network } from '@/network';
import { requestPay, waitForPayPaid } from '@/utils/payment';
import './index.css';

interface CategoryEntry {
  id: string;
  name: string;
  submitId?: string;
}

interface ExpectedTimeOption {
  value: string;
}

const FALLBACK_CATEGORIES: CategoryEntry[] = [
  { id: 'CAT_ERRAND', name: '跑腿代办' },
  { id: 'CAT_DELIVERY', name: '快递代取' },
  { id: 'pickup', name: '取送服务', submitId: 'CAT_ERRAND' },
  { id: 'queue', name: '排队代办', submitId: 'CAT_ERRAND' },
  { id: 'CAT_TICKET', name: '代抢门票' },
  { id: 'moving', name: '搬家拉货', submitId: 'CAT_ERRAND' },
  { id: 'cleaning', name: '家政保洁', submitId: 'CAT_ERRAND' },
  { id: 'repair', name: '维修安装', submitId: 'CAT_BUSINESS' },
  { id: 'install', name: '安装服务', submitId: 'CAT_BUSINESS' },
  { id: 'tutor', name: '家教培训', submitId: 'CAT_BUSINESS' },
  { id: 'CAT_CARE', name: '照护陪伴' },
  { id: 'pet', name: '宠物照看', submitId: 'CAT_CARE' },
  { id: 'CAT_GAME', name: '游戏陪玩' },
  { id: 'CAT_BUSINESS', name: '商务服务' },
  { id: 'design', name: '设计服务', submitId: 'CAT_BUSINESS' },
  { id: 'digital', name: '数码维修', submitId: 'CAT_BUSINESS' },
  { id: 'event', name: '活动协助', submitId: 'CAT_BUSINESS' },
  { id: 'other', name: '更多分类', submitId: 'CAT_ERRAND' },
];
const SERVICE_MODES = ['一口价', '按时计费'];
const URGENCY_LEVELS = ['普通', '尽快', '紧急'];
const EXPECTED_TIME_SEGMENTS = [
  { name: '上午', range: '09:00-12:00' },
  { name: '下午', range: '13:00-16:00' },
  { name: '傍晚', range: '16:00-19:00' },
  { name: '晚上', range: '19:00-21:00' },
  { name: '全天', range: '09:00-18:00' },
];

const formatMonthDay = (date: Date) => `${date.getMonth() + 1}月${date.getDate()}日`;

const buildExpectedTimeOptions = (baseDate = new Date()): ExpectedTimeOption[] => {
  const dayLabels = ['今天', '明天', '后天'];
  return dayLabels.flatMap((dayLabel, offset) => {
    const date = new Date(baseDate);
    date.setDate(baseDate.getDate() + offset);
    const monthDay = formatMonthDay(date);
    return EXPECTED_TIME_SEGMENTS.map((segment) => ({
      value: `${dayLabel}${segment.name}（${monthDay} ${segment.range}）`,
    }));
  });
};

const normalizeCategoryText = (value: unknown) => String(value || '').trim().toLowerCase().replace(/\s+/g, '');

const findCategoryByHints = (
  options: CategoryEntry[],
  idHints: string[],
  nameHints: string[],
) => {
  const normalizedIdHints = idHints.map(normalizeCategoryText).filter(Boolean);
  const normalizedNameHints = nameHints.map(normalizeCategoryText).filter(Boolean);
  for (const hint of normalizedIdHints) {
    const matched = options.find((item) => normalizeCategoryText(item.id).includes(hint));
    if (matched) return matched;
  }
  for (const hint of normalizedNameHints) {
    const matched = options.find((item) => normalizeCategoryText(item.name).includes(hint));
    if (matched) return matched;
  }
  return undefined;
};

const findExactCategory = (options: CategoryEntry[], value: unknown) => {
  const normalized = normalizeCategoryText(value);
  if (!normalized) return undefined;
  return options.find((item) => (
    normalizeCategoryText(item.id) === normalized
    || normalizeCategoryText(item.name) === normalized
  ));
};

const CATEGORY_KEYWORD_RULES = [
  {
    keywords: ['快递', '取件', '取包裹', '包裹', '驿站', '菜鸟', '丰巢'],
    idHints: ['CAT_DELIVERY', 'delivery', 'express', 'CAT_ERRAND', 'errand'],
    nameHints: ['快递', '代取', '取件', '跑腿', '代办', '同城'],
  },
  {
    keywords: ['取送', '送文件', '送东西', '配送', '取货', '送货'],
    idHints: ['pickup', 'delivery', 'CAT_DELIVERY', 'CAT_ERRAND'],
    nameHints: ['取送', '配送', '快递', '跑腿', '代办'],
  },
  {
    keywords: ['跑腿', '代办', '代买', '代购', '买一下', '帮买'],
    idHints: ['CAT_ERRAND', 'errand'],
    nameHints: ['跑腿', '代办', '同城'],
  },
  {
    keywords: ['排队', '占座', '取号'],
    idHints: ['queue', 'CAT_ERRAND'],
    nameHints: ['排队', '代办', '跑腿'],
  },
  {
    keywords: ['搬家', '搬运', '拉货', '家具', '沙发', '重物'],
    idHints: ['moving'],
    nameHints: ['搬家', '搬运', '拉货'],
  },
  {
    keywords: ['保洁', '打扫', '清洁', '家政', '收纳'],
    idHints: ['cleaning'],
    nameHints: ['保洁', '家政', '清洁'],
  },
  {
    keywords: ['安装', '组装', '拆装'],
    idHints: ['install', 'repair'],
    nameHints: ['安装', '维修'],
  },
  {
    keywords: ['维修', '修理', '修一下', '坏了', '手机维修', '电脑维修'],
    idHints: ['repair', 'digital'],
    nameHints: ['维修', '数码'],
  },
  {
    keywords: ['设计', '海报', 'logo', '图片处理', '修图', '名片'],
    idHints: ['design', 'CAT_BUSINESS'],
    nameHints: ['设计', '商务'],
  },
  {
    keywords: ['家教', '补课', '培训', '辅导'],
    idHints: ['tutor'],
    nameHints: ['家教', '培训', '辅导'],
  },
  {
    keywords: ['照顾', '照护', '陪伴', '看护', '老人', '小孩'],
    idHints: ['CAT_CARE', 'care'],
    nameHints: ['照护', '陪伴', '看护'],
  },
  {
    keywords: ['宠物', '遛狗', '喂猫', '喂狗'],
    idHints: ['pet', 'CAT_CARE'],
    nameHints: ['宠物', '照看'],
  },
  {
    keywords: ['陪玩', '代练', '上分', '开黑', '游戏'],
    idHints: ['CAT_GAME', 'game'],
    nameHints: ['游戏', '陪玩'],
  },
  {
    keywords: ['ppt', 'excel', '表格', '文案', '翻译', '资料', '商务'],
    idHints: ['CAT_BUSINESS'],
    nameHints: ['商务', '设计'],
  },
];

const resolveCategoryIdFromDraft = (draft: any, options: CategoryEntry[]) => {
  const idCandidates = [
    draft?.category_id,
    draft?.categoryId,
  ];
  for (const candidate of idCandidates) {
    const exact = findExactCategory(options, candidate);
    if (exact) return exact.id;
  }

  const candidates = [
    draft?.category,
    draft?.category_name,
    draft?.categoryName,
    draft?.service_type,
    draft?.serviceType,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  const intentText = [
    ...idCandidates,
    ...candidates,
    draft?.title,
    draft?.description,
    draft?.remark,
    draft?.content,
  ].map((value) => String(value || '')).join(' ');

  for (const rule of CATEGORY_KEYWORD_RULES) {
    if (rule.keywords.some((keyword) => intentText.includes(keyword))) {
      const matched = findCategoryByHints(options, rule.idHints, rule.nameHints);
      if (matched) return matched.id;
    }
  }

  for (const candidate of candidates) {
    const exact = findExactCategory(options, candidate);
    if (exact) return exact.id;
  }

  return '';
};

const mergeCategoryOptions = (realCategories: CategoryEntry[]) => {
  const seenIds = new Set(realCategories.map((item) => normalizeCategoryText(item.id)));
  const seenNames = new Set(realCategories.map((item) => normalizeCategoryText(item.name)));
  const fallbackAliases = FALLBACK_CATEGORIES
    .filter((item) => !seenIds.has(normalizeCategoryText(item.id)) && !seenNames.has(normalizeCategoryText(item.name)))
    .map((item) => {
      const submitId = resolveCategoryIdFromDraft(
        { title: item.name, category_name: item.name, service_type: item.name },
        realCategories,
      );
      return { ...item, submitId: submitId || item.submitId || item.id };
    });
  return [...realCategories, ...fallbackAliases];
};

const resolveCategorySubmitId = (categoryId: string, options: CategoryEntry[]) => {
  const option = options.find((item) => item.id === categoryId);
  return option?.submitId || option?.id || categoryId;
};

const isProductionRuntime = () => {
  if (TARO_ENV !== 'weapp') return true;
  const wxConfigEnvVersion = (globalThis as any).__wxConfig?.envVersion;
  const accountInfo = Taro.getAccountInfoSync?.();
  const envVersion = wxConfigEnvVersion || accountInfo?.miniProgram?.envVersion;
  return envVersion === 'release' || envVersion === 'trial';
};

const PublishPage = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [categoryOptions, setCategoryOptions] = useState<CategoryEntry[]>(FALLBACK_CATEGORIES);
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [expectedTime, setExpectedTime] = useState('');
  const [location, setLocation] = useState('');
  const [taskLocation, setTaskLocation] = useState<Pick<LocationData, 'latitude' | 'longitude'> | null>(null);
  const [serviceMode, setServiceMode] = useState(SERVICE_MODES[0]);
  const [urgency, setUrgency] = useState(URGENCY_LEVELS[1]);
  const [images, setImages] = useState<string[]>([]);
  const [anonymous, setAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [aiDrafting, setAiDrafting] = useState(false);
  const [aiChatVisible, setAiChatVisible] = useState(false);
  const [categoryExpanded, setCategoryExpanded] = useState(false);

  const expectedTimeOptions = useMemo(() => buildExpectedTimeOptions(), []);
  const expectedTimeRange = useMemo(() => expectedTimeOptions.map((item) => item.value), [expectedTimeOptions]);
  const expectedTimeIndex = Math.max(0, expectedTimeRange.indexOf(expectedTime));

  const categoryName = useMemo(() => {
    return categoryOptions.find((item) => item.id === category)?.name || category;
  }, [category, categoryOptions]);
  const categoryForSubmit = useMemo(() => {
    return resolveCategorySubmitId(category, categoryOptions);
  }, [category, categoryOptions]);

  useEffect(() => {
    loadCategories();
  }, []);

  useDidShow(() => {
    applyAiDraft();
  });

  const loadCategories = async () => {
    try {
      const res = await Network.request({ url: '/api/categories' });
      const items = Array.isArray(res.data?.data) ? res.data.data : [];
      const mapped = items
        .map((item: any) => ({
          id: String(item.id || item.category_id || item.name || ''),
          name: String(item.name || item.title || '其他服务'),
        }))
        .filter((item: CategoryEntry) => item.id && item.name);
      if (mapped.length) {
        const merged = mergeCategoryOptions(mapped);
        setCategoryOptions(merged);
        setCategory((prev) => prev || merged[0].id);
      } else {
        setCategory((prev) => prev || FALLBACK_CATEGORIES[0].id);
      }
    } catch {
      setCategory((prev) => prev || FALLBACK_CATEGORIES[0].id);
    }
  };

  const normalizeDraftBudget = (value: unknown) => {
    if (value === undefined || value === null || value === '') return '';
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return String(value);
    return String(numeric > 1000 ? Math.round(numeric / 100) : numeric);
  };

  const applyAiDraft = () => {
    try {
      const draft = Taro.getStorageSync('ai_publish_draft');
      if (!draft) return;
      if (draft.title) setTitle(String(draft.title));
      if (draft.description) setDescription(String(draft.description));
      const resolvedCategory = resolveCategoryIdFromDraft(draft, categoryOptions);
      if (resolvedCategory) setCategory(resolvedCategory);
      if (draft.deadline) setExpectedTime(String(draft.deadline));
      if (draft.region) setLocation(String(draft.region));
      const latitude = Number(draft.latitude || draft.lat || 0);
      const longitude = Number(draft.longitude || draft.lng || 0);
      if (Number.isFinite(latitude) && Number.isFinite(longitude) && latitude && longitude) {
        setTaskLocation({ latitude, longitude });
      }
      if (draft.service_type) {
        setServiceMode(/按时|小时|计时/.test(String(draft.service_type)) ? SERVICE_MODES[1] : SERVICE_MODES[0]);
      }
      const budget = normalizeDraftBudget(draft.budget_amount || draft.budget || draft.price);
      if (budget) {
        setBudgetMin((prev) => prev || budget);
        setBudgetMax((prev) => prev || budget);
      }
      Taro.removeStorageSync('ai_publish_draft');
      Taro.showToast({ title: '已带入 AI 草稿，可继续完善', icon: 'none' });
    } catch {
      // 草稿读取失败不影响手动发布。
    }
  };

  const matchScore = useMemo(() => {
    const score = 52
      + (title.trim().length >= 8 ? 12 : 0)
      + (category ? 10 : 0)
      + (expectedTime.trim() ? 8 : 0)
      + (location.trim() ? 8 : 0)
      + (budgetMin.trim() && budgetMax.trim() ? 10 : 0)
      + (images.length > 0 ? 8 : 0)
      + (description.trim() ? 6 : 0);
    return Math.min(98, score);
  }, [budgetMax, budgetMin, category, description, expectedTime, images.length, location, title]);

  const aiPriceText = useMemo(() => {
    const min = Number(budgetMin);
    const max = Number(budgetMax);
    if (Number.isFinite(min) && Number.isFinite(max) && min > 0 && max >= min) return `¥${min} - ¥${max}`;
    if (Number.isFinite(min) && min > 0) return `¥${min} 起`;
    if (Number.isFinite(max) && max > 0) return `¥${Math.max(1, Math.round(max * 0.8))} - ¥${max}`;
    return '待填写预算';
  }, [budgetMax, budgetMin]);

  const validateForm = () => {
    if (title.trim().length < 2) return '请用一句话描述你的需求';
    if (!category) return '请选择服务类型';
    if (!budgetMin.trim()) return '请填写最低预算';
    if (!budgetMax.trim()) return '请填写最高预算';
    if (!expectedTime.trim()) return '请选择期望完成时间';
    if (Number(budgetMin) < 0 || Number(budgetMax) < 0) return '预算不能小于 0';
    if (Number(budgetMin) > Number(budgetMax)) return '最低预算不能高于最高预算';
    return '';
  };

  const handleManualLocation = async () => {
    try {
      const picked = await chooseManualLocation();
      setLocation(picked.address || picked.name || picked.city || '');
      setTaskLocation({ latitude: picked.latitude, longitude: picked.longitude });
      Taro.showToast({ title: '已选择位置', icon: 'success' });
    } catch (err: any) {
      Taro.showToast({ title: err?.message || '位置选择失败，可手动填写', icon: 'none' });
    }
  };

  const handleExpectedTimeChange = (event: any) => {
    const index = Number(event.detail.value);
    const option = expectedTimeOptions[index];
    if (option) setExpectedTime(option.value);
  };

  const handleAiDraft = async () => {
    const prompt = [title, description, expectedTime, location, budgetMin || budgetMax]
      .filter(Boolean)
      .join('，');
    if (!prompt.trim()) {
      Taro.showToast({ title: '先简单说一句你的需求', icon: 'none' });
      return;
    }
    setAiDrafting(true);
    try {
      Taro.showLoading({ title: 'AI生成草稿中' });
      const draft = await requestTaskDraft(prompt);
      Taro.hideLoading();
      if (!draft) {
        throw new Error('AI草稿生成失败');
      }
      Taro.setStorageSync('ai_publish_draft', draft);
      applyAiDraft();
      Taro.showToast({ title: 'AI已填入草稿', icon: 'success' });
    } catch (error: any) {
      Taro.hideLoading();
      Taro.showToast({ title: error?.message || 'AI草稿生成失败', icon: 'none' });
    } finally {
      setAiDrafting(false);
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    const message = validateForm();
    if (message) {
      Taro.showToast({ title: message, icon: 'none' });
      return;
    }

    setSubmitting(true);
    try {
      Taro.showLoading({ title: '安全检测中' });
      try {
        const secRes = await Network.request({
          url: '/api/security/msg-check',
          method: 'POST',
          data: { content: `${title.trim()} ${description.trim().slice(0, 500)}` },
        });
        const secBody = secRes.data;
        if (secBody.code !== 200 && secBody.code !== 0) {
          Taro.hideLoading();
          Taro.showModal({
            title: '内容安全提醒',
            content: secBody.msg || `您的发布内容触发了安全审核(${secBody.risk_label || 'risky'})，请修改后再提交。`,
            showCancel: false,
            confirmText: '知道了',
          });
          return;
        }
      } catch (secErr: any) {
        console.warn('[Publish] 内容安全接口异常，降级放行:', secErr?.message);
        if (isProductionRuntime()) {
          Taro.hideLoading();
          Taro.showModal({
            title: '安全审核暂不可用',
            content: '安全审核暂不可用，请稍后重试。',
            showCancel: false,
            confirmText: '知道了',
          });
          return;
        }
      }
      Taro.hideLoading();

      const finalDescription = description.trim() || `${title.trim()}。服务模式：${serviceMode}；紧急程度：${urgency}`;
      Taro.showLoading({ title: '提交审核中' });
      const res = await createTask({
        title: title.trim(),
        category: categoryForSubmit,
        description: finalDescription,
        budgetMin: Number(budgetMin),
        budgetMax: Number(budgetMax),
        expectedTime: expectedTime.trim(),
        location: location.trim(),
        latitude: taskLocation?.latitude,
        longitude: taskLocation?.longitude,
        images,
        anonymous,
      });
      Taro.hideLoading();

      const taskData = res?.data || {};
      const taskId = taskData.id || taskData.task_id || taskData.taskId;
      if (res?.code !== 200 || !taskId) {
        throw new Error(res?.msg || '任务提交失败，请稍后重试');
      }

      Taro.showLoading({ title: '拉起支付...' });
      const payResult = await requestPay({
        orderType: 'task',
        businessId: taskId,
        amount: Number(budgetMax || budgetMin),
        description: title.trim().slice(0, 30),
      });
      Taro.hideLoading();

      if (!payResult.success) {
        Taro.showModal({
          title: '任务已创建',
          content: `支付${payResult.errorMsg || '未完成'}。任务可在订单中继续处理。`,
          confirmText: '去查看',
          cancelText: '稍后处理',
          success: (modalRes) => {
            if (modalRes.confirm) {
              Taro.switchTab({ url: '/pages/tasks/index' });
            }
          },
        });
        return;
      }

      if (payResult.orderId) {
        Taro.showLoading({ title: '确认支付结果...' });
        const paidStatus = await waitForPayPaid(payResult.orderId, 10, 1000);
        Taro.hideLoading();

        if (!paidStatus) {
          Taro.showModal({
            title: '任务已创建',
            content: '支付确认中，任务会在后端确认托管成功后进入待接单。你可以在订单中心或我的任务里查看进度。',
            confirmText: '去查看',
            cancelText: '稍后处理',
            success: (modalRes) => {
              if (modalRes.confirm) {
                Taro.switchTab({ url: '/pages/orders/index' });
              }
            },
          });
          return;
        }
      }

      Taro.showToast({ title: '支付确认成功，任务已进入待接单', icon: 'success' });
      setTimeout(() => Taro.switchTab({ url: '/pages/tasks/index' }), 900);
    } catch (err: any) {
      Taro.hideLoading();
      Taro.showToast({ title: err?.message || '发布失败', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="publish-page">
      <View className="publish-nav">
        <View className="publish-back" onClick={() => Taro.navigateBack()}>
          <ChevronLeft size={42} color="#081A3A" />
        </View>
        <Text className="publish-title">发布需求</Text>
        <View className="publish-menu-pill">
          <Text className="publish-menu-dot">•••</Text>
          <Text className="publish-menu-line">—</Text>
          <Text className="publish-menu-circle">◎</Text>
        </View>
      </View>

      <View className="publish-ai-card">
        <View className="publish-ai-head">
          <AiMascot size="lg" pose="point" />
          <View className="publish-ai-copy">
            <Text className="publish-ai-title">一句话描述，AI帮你补全表单</Text>
            <Text className="publish-ai-sub">越详细，匹配越精准哦～</Text>
          </View>
          <View className="publish-ai-pill" onClick={() => setAiChatVisible(true)}>
            <ShieldCheck size={22} color="#FFFFFF" />
            <Text className="publish-ai-pill-text">有应AI助手</Text>
          </View>
        </View>

        <View className="publish-step-card">
          {['填写', 'AI检查', '平台审核', '服务者报价'].map((item, index) => (
            <View className="publish-step-item" key={item}>
              <View className={`publish-step-dot ${index === 0 ? 'publish-step-dot-active' : ''}`}>
                <Text className={`publish-step-dot-text ${index === 0 ? 'publish-step-dot-text-active' : ''}`}>{index + 1}</Text>
              </View>
              <Text className={`publish-step-label ${index === 0 ? 'publish-step-label-active' : ''}`}>{item}</Text>
              {index < 3 ? <View className="publish-step-line" /> : null}
            </View>
          ))}
        </View>

        <View className="publish-prompt-box">
          <Textarea
            className="publish-prompt-input"
            value={title}
            maxlength={200}
            placeholder="例如：帮我明天下午搬一张沙发到思明区"
            onInput={(e) => setTitle(e.detail.value)}
          />
          {title ? (
            <View className="publish-clear" onClick={() => setTitle('')}>
              <Text className="publish-clear-text">×</Text>
            </View>
          ) : null}
          <View className="publish-prompt-meta">
            <Text className="publish-prompt-count">{title.length}/200</Text>
            <View className="publish-prompt-line" />
            <Mic size={30} color="#5F6673" />
          </View>
        </View>

        <View className="publish-ai-draft-row">
          <View className="publish-ai-draft-btn" onClick={handleAiDraft}>
            <Sparkles size={24} color="#FFFFFF" />
            <Text className="publish-ai-draft-text">{aiDrafting ? 'AI生成中...' : 'AI一键生成草稿'}</Text>
          </View>
          <View className="publish-ai-draft-outline" onClick={() => setAiChatVisible(true)}>
            <Text className="publish-ai-draft-outline-text">问AI怎么写更好</Text>
          </View>
        </View>

        <View className="publish-ai-understood">
          <Sparkles size={24} color="#FF5A1F" />
          <Text className="publish-ai-understood-text">AI已理解需求，已为你智能填充以下信息</Text>
          <CircleCheck size={24} color="#22C55E" />
        </View>
      </View>

      <View className="publish-info-card">
        <View className={`publish-info-row publish-category-row ${categoryExpanded ? 'publish-category-row-expanded' : ''}`}>
          <View className="publish-info-label">
            <View className="publish-info-icon publish-icon-orange">
              <Box size={24} color="#FFFFFF" />
            </View>
            <Text className="publish-info-title">服务类型</Text>
          </View>
          <View className={`publish-category-chips ${categoryExpanded ? 'publish-category-chips-expanded' : ''}`}>
            {categoryOptions.map((item) => (
              <View
                key={item.id}
                className={`publish-category-chip ${category === item.id ? 'publish-category-chip-active' : ''}`}
                onClick={() => setCategory(item.id)}
              >
                <Text className={`publish-category-text ${category === item.id ? 'publish-category-text-active' : ''}`}>{item.name}</Text>
              </View>
            ))}
          </View>
          <View
            className={`publish-category-toggle ${categoryExpanded ? 'publish-category-toggle-open' : ''}`}
            onClick={() => setCategoryExpanded((prev) => !prev)}
          >
            <ChevronRight size={26} color="#8A8F99" />
          </View>
        </View>

        <View className="publish-info-row">
          <View className="publish-info-label">
            <View className="publish-info-icon publish-icon-blue">
              <Clock3 size={24} color="#FFFFFF" />
            </View>
            <Text className="publish-info-title">时间</Text>
          </View>
          <Picker
            className="publish-time-picker-wrap"
            mode="selector"
            range={expectedTimeRange}
            value={expectedTimeIndex}
            onChange={handleExpectedTimeChange}
          >
            <View className="publish-time-picker">
              <Text className={`publish-time-value ${expectedTime ? '' : 'publish-time-placeholder'}`}>
                {expectedTime || '请选择期望完成时间'}
              </Text>
            </View>
          </Picker>
          <ChevronRight size={26} color="#8A8F99" />
        </View>

        <View className="publish-info-row">
          <View className="publish-info-label">
            <View className="publish-info-icon publish-icon-green">
              <MapPin size={24} color="#FFFFFF" />
            </View>
            <Text className="publish-info-title">地点</Text>
          </View>
          <Input
            className="publish-inline-input"
            value={location}
            placeholder="选择定位或填写详细地址"
            onInput={(e) => {
              setLocation(e.detail.value);
              setTaskLocation(null);
            }}
          />
          <View className="publish-location-pick" onClick={handleManualLocation}>
            <Text className="publish-location-pick-text">{taskLocation ? '已定位' : '选择'}</Text>
            <ChevronRight size={26} color="#8A8F99" />
          </View>
        </View>

        <View className="publish-info-row">
          <View className="publish-info-label">
            <View className="publish-info-icon publish-icon-yellow">
              <Wallet size={24} color="#FFFFFF" />
            </View>
            <Text className="publish-info-title">预算</Text>
          </View>
          <View className="publish-budget-inline">
            <Input
              className="publish-budget-input"
              type="digit"
              value={budgetMin}
              placeholder="150"
              onInput={(e) => setBudgetMin(e.detail.value)}
            />
            <Text className="publish-budget-dash">-</Text>
            <Input
              className="publish-budget-input"
              type="digit"
              value={budgetMax}
              placeholder="220"
              onInput={(e) => setBudgetMax(e.detail.value)}
            />
            <Text className="publish-budget-unit">元</Text>
          </View>
          <ChevronRight size={26} color="#8A8F99" />
        </View>

        <View className="publish-info-row">
          <View className="publish-info-label">
            <View className="publish-info-icon publish-icon-purple">
              <Zap size={24} color="#FFFFFF" />
            </View>
            <Text className="publish-info-title">服务模式</Text>
          </View>
          <View className="publish-segment">
            {SERVICE_MODES.map((item) => (
              <View
                key={item}
                className={`publish-segment-item ${serviceMode === item ? 'publish-segment-active' : ''}`}
                onClick={() => setServiceMode(item)}
              >
                <Text className={`publish-segment-text ${serviceMode === item ? 'publish-segment-text-active' : ''}`}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className="publish-info-row">
          <View className="publish-info-label">
            <View className="publish-info-icon publish-icon-red">
              <Bell size={24} color="#FFFFFF" />
            </View>
            <Text className="publish-info-title">紧急程度</Text>
          </View>
          <View className="publish-segment publish-urgency-segment">
            {URGENCY_LEVELS.map((item) => (
              <View
                key={item}
                className={`publish-segment-item ${urgency === item ? 'publish-segment-active' : ''}`}
                onClick={() => setUrgency(item)}
              >
                <Text className={`publish-segment-text ${urgency === item ? 'publish-segment-text-active' : ''}`}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className="publish-info-row publish-image-row">
          <View className="publish-info-label">
            <View className="publish-info-icon publish-icon-image">
              <ImageIcon size={24} color="#FFFFFF" />
            </View>
            <Text className="publish-info-title">图片附件</Text>
          </View>
          <View className="publish-image-upload">
            <UploadImages value={images} onChange={setImages} />
          </View>
        </View>
      </View>

      <View className="publish-price-card">
        <View className="publish-price-left">
          <View className="publish-price-title-row">
            <Sparkles size={32} color="#7C3AED" />
            <Text className="publish-price-title">AI建议出价</Text>
            <View className="publish-price-source">
              <Text className="publish-price-source-text">基于类似需求智能估价</Text>
            </View>
          </View>
          <Text className="publish-price-main">{aiPriceText}</Text>
          <View className="publish-price-demand">
            <Users size={28} color="#FF6A00" />
            <Text className="publish-price-demand-text">当前时段需求适中，预计10-20人接单</Text>
          </View>
        </View>
        <View className="publish-score-box">
          <Text className="publish-score-label">匹配置信度</Text>
          <Text className="publish-score-value">{matchScore}%</Text>
          <Text className="publish-score-desc">信息越完整，匹配越精准</Text>
        </View>
      </View>

      <View className="publish-tip-row">
        <Sparkles size={26} color="#FF9F1C" />
        <Text className="publish-tip-text">小贴士：上传清晰图片和补充需求细节，可大幅提升接单效率哦～</Text>
        <ChevronRight size={26} color="#A56A21" />
      </View>

      <View className="publish-extra-card">
        <View className="publish-extra-head">
          <Text className="publish-extra-title">补充说明</Text>
          <Text className="publish-extra-optional">选填</Text>
        </View>
        <Textarea
          className="publish-extra-input"
          value={description}
          maxlength={200}
          placeholder="如：物品是否需要拆装、有无电梯、是否需要搬运工等"
          onInput={(e) => setDescription(e.detail.value)}
        />
        <Text className="publish-extra-count">{description.length}/200</Text>
      </View>

      <View className="publish-privacy-row">
        <View className="publish-privacy-copy">
          <Text className="publish-privacy-title">匿名发布</Text>
          <Text className="publish-privacy-desc">开启后列表中不展示你的昵称</Text>
        </View>
        <Switch checked={anonymous} onCheckedChange={setAnonymous} />
      </View>

      <View className="publish-guard-row">
        <View className="publish-guard-item">
          <ShieldCheck size={42} color="#5B8CFF" />
          <Text className="publish-guard-title">平台保障</Text>
          <Text className="publish-guard-desc">交易更安心</Text>
        </View>
        <View className="publish-guard-item">
          <Users size={42} color="#5B8CFF" />
          <Text className="publish-guard-title">智能匹配</Text>
          <Text className="publish-guard-desc">精准推荐服务者</Text>
        </View>
        <View className="publish-guard-item">
          <Zap size={42} color="#5B8CFF" />
          <Text className="publish-guard-title">快速响应</Text>
          <Text className="publish-guard-desc">接单快人一步</Text>
        </View>
      </View>

      <View className="publish-submit-wrap">
        <View className={`publish-submit-btn ${submitting ? 'publish-submit-disabled' : ''}`} onClick={handleSubmit}>
          <View className="publish-submit-spark">✦</View>
          <View className="publish-submit-copy">
            <Text className="publish-submit-text">{submitting ? '提交中...' : '发布并智能匹配'}</Text>
            <Text className="publish-submit-sub">发布后，AI将为你推荐最合适的服务者</Text>
          </View>
          <AiMascot size="md" pose="cheer" className="publish-submit-mascot" />
        </View>
        <View className="publish-security-note">
          <ShieldCheck size={22} color="#9CA3AF" />
          <Text className="publish-security-text">我们将严格保护你的信息安全</Text>
        </View>
      </View>

      <AiChatWidget
        visible={aiChatVisible}
        onClose={() => setAiChatVisible(false)}
        context={{
          scene: 'publish',
          title,
          description,
          category: categoryName,
          budget: budgetMin || budgetMax ? `${budgetMin || 0}-${budgetMax || 0}` : '',
          imageCount: images.length,
        }}
      />
    </View>
  );
};

export default PublishPage;
