import { PropsWithChildren, useCallback, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { LucideTaroProvider } from 'lucide-react-taro';
import '@/app.css';
import { getSafeAreaInfo } from '@/lib/safe-area';
import { Toaster } from '@/components/ui/toast';
import { AiChatFloatButton } from '@/components/AiChat';
import { loadUiConfig } from '@/lib/ui-config';
import { hydrateLegacyLoginState } from '@/lib/auth';
import { usePrivacy, PrivacyAgreementBar } from '@/components/PrivacyAuth';
import { Preset } from './presets';

const redirectH5MiniProgramPath = () => {
  if (TARO_ENV !== 'h5') return;

  const location = (globalThis as any).location;
  if (!location?.pathname || location.hash) return;

  const pathname = String(location.pathname).replace(/\/+$/, '');
  if (/^\/pages\/[^?#]+\/index$/.test(pathname)) {
    location.replace(`/index.html#${pathname}${location.search || ''}`);
  }
};

const App = ({ children }: PropsWithChildren) => {
  const { privacyAuthorized, privacyChecked, requestPrivacy, openPrivacyContract } = usePrivacy();

  const handlePrivacyAgree = useCallback(async () => {
    const ok = await requestPrivacy();
    if (ok) {
      Taro.eventCenter.trigger('privacyAuthorized');
    }
  }, [requestPrivacy]);

  useEffect(() => {
    redirectH5MiniProgramPath();
    hydrateLegacyLoginState();

    // 预加载安全区信息（缓存到内存，后续页面直接复用）
    getSafeAreaInfo();

    // 正式版/体验版禁用 vConsole（防止用户看到绿色调试按钮）
    if (TARO_ENV === 'weapp' && (Taro as any).getAccountInfoSync) {
      const wxConfigEnvVersion = (globalThis as any).__wxConfig?.envVersion;
      const accountInfo = (Taro as any).getAccountInfoSync();
      const envVersion = wxConfigEnvVersion || accountInfo?.miniProgram?.envVersion;
      if (envVersion === 'release' || envVersion === 'trial') {
        try { (Taro as any).setEnableDebug?.({ enableDebug: false }); } catch (_) { /* ignore */ }
      }
    }

    // 启动后异步拉装修配置；失败有缓存 + 默认值兜底，绝不阻塞首屏
    loadUiConfig().catch(() => {/* 已 fallback */});
    const uiConfigTimer = setInterval(() => {
      loadUiConfig().catch(() => {/* 已 fallback */});
    }, 30000);

    if (TARO_ENV !== 'weapp') {
      return () => clearInterval(uiConfigTimer);
    }

    const cloud = (Taro as any).cloud;
    if (!cloud?.init) {
      return () => clearInterval(uiConfigTimer);
    }

    try {
      if (!WECHAT_CLOUD_ENV_ID) {
        console.warn('[WeChat Cloud] envId 未配置，跳过云初始化');
        return () => clearInterval(uiConfigTimer);
      }
      cloud.init({
        env: WECHAT_CLOUD_ENV_ID,
        traceUser: true,
      });
      console.log('[WeChat Cloud] 初始化成功, env:', WECHAT_CLOUD_ENV_ID);
    } catch (error) {
      console.warn('[WeChat Cloud] init failed:', error);
    }
    return () => clearInterval(uiConfigTimer);
  }, []);

  return (
    <LucideTaroProvider defaultColor="#000" defaultSize={24}>
      <Preset>{children}</Preset>
      <Toaster />
      <AiChatFloatButton />
      {privacyChecked && !privacyAuthorized && (
        <PrivacyAgreementBar
          onAgree={handlePrivacyAgree}
          onViewPolicy={openPrivacyContract}
        />
      )}
    </LucideTaroProvider>
  );
};

export default App;
