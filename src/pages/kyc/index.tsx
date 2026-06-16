import { Image, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  BrushCleaning,
  Camera,
  CircleCheck,
  CircleAlert,
  Clock,
  Eye,
  Lock,
  Monitor,
  Package,
  PawPrint,
  Shield,
  ShieldCheck,
  Sofa,
  Truck,
  Upload,
  UserCheck,
  Wallet,
  Wrench,
} from 'lucide-react-taro';
import AiMascot from '@/components/AiMascot';
import { Input } from '@/components/ui/input';
import { getToken } from '@/lib/auth';
import { Network } from '@/network';
import './index.css';

type UploadKey = 'front' | 'back' | 'face';

const SERVICES = [
  { name: '搬家拉货', icon: Truck },
  { name: '家政保洁', icon: BrushCleaning },
  { name: '维修安装', icon: Wrench },
  { name: '宠物照看', icon: PawPrint },
  { name: '跑腿代办', icon: Package },
  { name: '临时用工', icon: BriefcaseBusiness },
  { name: '家电维修', icon: Monitor },
  { name: '家具搬运', icon: Sofa },
  { name: '二手交易', icon: Wallet },
  { name: '更多服务', icon: BadgeCheck },
];

const TRUST_STATS = [
  { label: '审核时效', value: '1-2天' },
  { label: '资料用途', value: '仅审核' },
  { label: '风控保护', value: '全程留痕' },
];

const goBack = () => {
  const pages = Taro.getCurrentPages();
  if (pages.length > 1) {
    Taro.navigateBack();
    return;
  }
  Taro.switchTab({ url: '/pages/profile/index' });
};

export default function KYCPage() {
  const [kycStatus, setKycStatus] = useState<string>('none');
  const [realName, setRealName] = useState('');
  const [idCard, setIdCard] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [uploads, setUploads] = useState<Record<UploadKey, string>>({ front: '', back: '', face: '' });
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  useEffect(() => {
    loadKycStatus();
  }, []);

  const selectedCount = selectedServices.length;
  const canSubmit = useMemo(
    () => privacyAgreed && !!realName.trim() && idCard.trim().length >= 15 && phone.trim().length >= 11 && !submitting,
    [idCard, phone, privacyAgreed, realName, submitting],
  );

  const loadKycStatus = async () => {
    try {
      const res = await Network.request({
        url: '/api/user/kyc/status',
        header: { authorization: `Bearer ${getToken()}` },
      });
      if (res.data?.data) setKycStatus(res.data.data.status || 'none');
    } catch {
      // 状态接口失败时保持可填写，避免阻塞首次认证。
    }
  };

  const chooseUpload = async (key: UploadKey) => {
    try {
      const res = await Taro.chooseImage({ count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'] });
      const path = res.tempFilePaths?.[0];
      if (path) setUploads((prev) => ({ ...prev, [key]: path }));
    } catch {
      // 用户取消上传时不提示。
    }
  };

  const toggleService = (name: string) => {
    setSelectedServices((prev) => {
      if (prev.includes(name)) return prev.filter((item) => item !== name);
      return [...prev, name];
    });
  };

  const handleSubmit = async () => {
    if (!realName.trim()) {
      Taro.showToast({ title: '请输入真实姓名', icon: 'none' });
      return;
    }
    if (!idCard.trim() || idCard.length < 15) {
      Taro.showToast({ title: '请输入有效身份证号', icon: 'none' });
      return;
    }
    if (!phone.trim() || phone.length < 11) {
      Taro.showToast({ title: '请输入有效手机号', icon: 'none' });
      return;
    }
    if (!privacyAgreed) {
      Taro.showToast({ title: '请先阅读并同意协议', icon: 'none' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await Network.request({
        url: '/api/user/kyc/start',
        method: 'POST',
        data: {
          real_name: realName.trim(),
          id_card: idCard.trim(),
          phone: phone.trim(),
          service_categories: selectedServices,
        },
        header: { authorization: `Bearer ${getToken()}` },
      });
      if (res.data?.data) {
        setKycStatus('pending');
        Taro.showToast({ title: '认证申请已提交', icon: 'success' });
      } else {
        Taro.showToast({ title: res.data?.msg || '提交失败，请重试', icon: 'none' });
      }
    } catch {
      Taro.showToast({ title: '提交失败，请重试', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  if (kycStatus === 'verified') {
    return <StatusView type="verified" title="实名认证已完成" desc="您的身份已通过验证，可继续接单赚钱。" />;
  }

  if (kycStatus === 'pending') {
    return <StatusView type="pending" title="认证审核中" desc="资料提交后，我们会在 1-2 个工作日内完成审核。" />;
  }

  return (
    <View className="kyc-page">
      <View className="kyc-nav">
        <View className="kyc-back" onClick={goBack}>
          <ArrowLeft size={30} color="#081A3A" />
        </View>
        <Text className="kyc-nav-title">实名认证 / 服务者入驻</Text>
        <View className="kyc-menu-pill">
          <Text className="kyc-menu-dot">•••</Text>
          <Text className="kyc-menu-line">—</Text>
          <Text className="kyc-menu-circle">◎</Text>
        </View>
      </View>

      <View className="kyc-hero">
        <View className="kyc-hero-copy">
          <View className="kyc-hero-kicker">
            <ShieldCheck size={20} color="#FF4D19" />
            <Text className="kyc-hero-kicker-text">平台实名风控认证</Text>
          </View>
          <Text className="kyc-hero-title">完成认证后，才可以安全接单和报价</Text>
          <Text className="kyc-hero-desc">有应帮会结合身份、手机号、服务类目和订单行为做风险校验，保护需求方、服务者和平台资金安全。</Text>
          <View className="kyc-hero-stats">
            {TRUST_STATS.map((item) => (
              <View className="kyc-hero-stat" key={item.label}>
                <Text className="kyc-hero-stat-value">{item.value}</Text>
                <Text className="kyc-hero-stat-label">{item.label}</Text>
              </View>
            ))}
          </View>
        </View>
        <View className="kyc-hero-mascot">
          <AiMascot size="xl" pose="cheer" />
        </View>
      </View>

      <View className="kyc-step-card">
        <View className="kyc-steps">
          {['身份认证', '技能选择', '服务信息', '提交审核'].map((item, index) => (
            <View className="kyc-step" key={item}>
              <View className={`kyc-step-num ${index === 0 ? 'kyc-step-num-active' : ''}`}>
                <Text className={`kyc-step-num-text ${index === 0 ? 'kyc-step-num-text-active' : ''}`}>{index + 1}</Text>
              </View>
              <Text className={`kyc-step-text ${index === 0 ? 'kyc-step-text-active' : ''}`}>{item}</Text>
            </View>
          ))}
        </View>
        <AiMascot size="xl" pose="cheer" />
        <View className="kyc-step-note">
          <Shield size={18} color="#6B7280" />
          <Text className="kyc-step-note-text">完成认证后，您将成为有应帮平台认证服务者，开启接单赚钱之旅～</Text>
        </View>
      </View>

      <View className="kyc-card">
        <View className="kyc-card-head">
          <View className="kyc-card-title-row">
            <Text className="kyc-index">1</Text>
            <Text className="kyc-card-title">身份认证</Text>
            <Text className="kyc-card-desc">请确保信息真实有效，认证通过后不可随意修改</Text>
          </View>
          <View className="kyc-safe-label">
            <ShieldCheck size={18} color="#6B7280" />
            <Text className="kyc-safe-label-text">资料仅用于审核，严格保密</Text>
          </View>
        </View>

        <View className="kyc-upload-row">
          <UploadCard title="身份证正面" desc="请上传身份证人像面" image={uploads.front} onClick={() => chooseUpload('front')} />
          <UploadCard title="身份证反面" desc="请上传身份证国徽面" image={uploads.back} onClick={() => chooseUpload('back')} />
          <UploadCard title="人脸核验" desc="请进行人脸识别验证" image={uploads.face} face onClick={() => chooseUpload('face')} />
        </View>

        <View className="kyc-form">
          <FormInput label="真实姓名" value={realName} placeholder="请输入真实姓名" onInput={setRealName} />
          <FormInput label="身份证号" value={idCard} placeholder="请输入18位身份证号" maxlength={18} onInput={setIdCard} />
          <FormInput label="手机号" value={phone} placeholder="请输入手机号" maxlength={11} type="number" onInput={setPhone} />
        </View>

        <View className="kyc-tip-line">
          <Eye size={18} color="#6B7280" />
          <Text className="kyc-tip-text">请使用本人身份证进行认证，确保证件在有效期内，照片清晰无遮挡</Text>
        </View>
      </View>

      <View className="kyc-card">
        <View className="kyc-card-head">
          <View className="kyc-card-title-row">
            <Text className="kyc-index">2</Text>
            <Text className="kyc-card-title">选择擅长服务</Text>
            <Text className="kyc-card-desc">可多选，系统将为您精准匹配订单</Text>
          </View>
          <Text className="kyc-selected-count">已选择 {selectedCount} 项</Text>
        </View>

        <View className="kyc-service-grid">
          {SERVICES.map((service) => {
            const Icon = service.icon;
            const selected = selectedServices.includes(service.name);
            return (
              <View
                className={`kyc-service ${selected ? 'kyc-service-selected' : ''}`}
                key={service.name}
                onClick={() => toggleService(service.name)}
              >
                <Icon size={42} color={selected ? '#FF4D19' : '#FF8A00'} />
                <Text className={`kyc-service-text ${selected ? 'kyc-service-text-selected' : ''}`}>{service.name}</Text>
              </View>
            );
          })}
        </View>
        <View className="kyc-tip-line">
          <BadgeCheck size={18} color="#6B7280" />
          <Text className="kyc-tip-text">选得越精准，匹配订单越多哦～</Text>
        </View>
      </View>

      <View className="kyc-benefit">
        <View className="kyc-benefit-main">
          <Text className="kyc-benefit-title">入驻有应帮 · 收获更多机会</Text>
          <View className="kyc-benefit-row">
            <Benefit icon={Wallet} title="接单赚钱" desc="海量真实订单 稳定收入来源" />
            <Benefit icon={Truck} title="更多曝光" desc="平台千万流量 优先推荐展示" />
            <Benefit icon={BadgeCheck} title="信用背书" desc="官方认证服务者 提升信任和成交率" />
          </View>
        </View>
        <View className="kyc-wallet-visual">
          <Wallet size={68} color="#FFFFFF" />
        </View>
      </View>

      <View className="kyc-security-strip">
        <SecurityItem icon={ShieldCheck} title="平台保障" desc="官方认证，交易更安心" />
        <SecurityItem icon={Lock} title="隐私保护" desc="信息加密，仅用于审核" />
        <SecurityItem icon={CircleCheck} title="审核安全" desc="人工审核，公平公正" />
      </View>

      <View className="kyc-agreement" onClick={() => setPrivacyAgreed(!privacyAgreed)}>
        <View className={`kyc-checkbox ${privacyAgreed ? 'kyc-checkbox-active' : ''}`}>
          {privacyAgreed ? <CircleCheck size={18} color="#FFFFFF" /> : null}
        </View>
        <Text className="kyc-agreement-text">
          我已阅读并同意《服务者入驻协议》《隐私政策》《信息安全说明》
        </Text>
      </View>

      {kycStatus === 'rejected' ? (
        <View className="kyc-rejected">
          <CircleAlert size={18} color="#EF4444" />
          <Text className="kyc-rejected-text">认证未通过，请检查信息后重新提交。</Text>
        </View>
      ) : null}

      <View className={`kyc-submit ${canSubmit ? 'kyc-submit-active' : ''}`} onClick={canSubmit ? handleSubmit : undefined}>
        <Upload size={28} color="#FFFFFF" />
        <Text className="kyc-submit-text">{submitting ? '提交中...' : '提交认证资料'}</Text>
      </View>
      <View className="kyc-submit-note">
        <Lock size={17} color="#8A8F99" />
        <Text className="kyc-submit-note-text">资料提交后，我们会在1-2个工作日内完成审核</Text>
      </View>
    </View>
  );
}

function UploadCard({ title, desc, image, face, onClick }: { title: string; desc: string; image?: string; face?: boolean; onClick: () => void }) {
  return (
    <View className="kyc-upload-card" onClick={onClick}>
      <Text className="kyc-upload-title">{title}</Text>
      <Text className="kyc-upload-desc">{desc}</Text>
      <View className={`kyc-upload-preview ${face ? 'kyc-upload-face' : ''}`}>
        {image ? (
          <Image className="kyc-upload-image" src={image} mode="aspectFill" />
        ) : (
          <>
            {face ? <UserCheck size={54} color="#FF8A00" /> : <BadgeCheck size={54} color="#FF8A00" />}
            <View className="kyc-camera">
              <Camera size={22} color="#FFFFFF" />
            </View>
          </>
        )}
      </View>
    </View>
  );
}

function FormInput({ label, value, placeholder, type, maxlength, onInput }: {
  label: string;
  value: string;
  placeholder: string;
  type?: 'text' | 'number';
  maxlength?: number;
  onInput: (value: string) => void;
}) {
  return (
    <View className="kyc-form-item">
      <Text className="kyc-form-label">{label}</Text>
      <Input
        className="kyc-form-input"
        value={value}
        placeholder={placeholder}
        type={type || 'text'}
        maxlength={maxlength}
        onInput={(event) => onInput(event.detail.value)}
      />
    </View>
  );
}

function Benefit({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <View className="kyc-benefit-item">
      <View className="kyc-benefit-icon">
        <Icon size={28} color="#FF8A00" />
      </View>
      <View>
        <Text className="kyc-benefit-item-title">{title}</Text>
        <Text className="kyc-benefit-item-desc">{desc}</Text>
      </View>
    </View>
  );
}

function SecurityItem({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <View className="kyc-security-item">
      <Icon size={38} color="#FF6A00" />
      <View>
        <Text className="kyc-security-title">{title}</Text>
        <Text className="kyc-security-desc">{desc}</Text>
      </View>
    </View>
  );
}

function StatusView({ type, title, desc }: { type: 'verified' | 'pending'; title: string; desc: string }) {
  const Icon = type === 'verified' ? CircleCheck : Clock;
  const color = type === 'verified' ? '#22C55E' : '#FF8A00';
  return (
    <View className="kyc-status-page">
      <Icon size={72} color={color} />
      <Text className="kyc-status-title">{title}</Text>
      <Text className="kyc-status-desc">{desc}</Text>
      <View className="kyc-status-btn" onClick={() => Taro.switchTab({ url: '/pages/profile/index' })}>
        <Text className="kyc-status-btn-text">返回我的</Text>
      </View>
    </View>
  );
}
