import Taro from '@tarojs/taro';
import { normalizeNetworkResponseData } from '@/lib/network-response';

type RequestOption = Parameters<typeof Taro.request>[0];
type UploadOption = Parameters<typeof Taro.uploadFile>[0];
type DownloadOption = Parameters<typeof Taro.downloadFile>[0];

const isFullUrl = (url: string) => /^https?:\/\//i.test(url);
const DEFAULT_REQUEST_TIMEOUT_MS = 12000;
const MAX_TRANSIENT_RETRIES = 2;
const TRANSIENT_STATUS_CODES = [502, 503, 504];

const LOGIN_STORAGE_KEYS = [
  'login_token',
  'login_userId',
  'login_state',
  'login_userInfo',
  'token',
  'userId',
];

let authExpiredToastShown = false;
let accountLockedToastShown = false;
let transientRetryToastShown = false;

const clearLoginCache = () => {
  LOGIN_STORAGE_KEYS.forEach((key) => {
    try {
      Taro.removeStorageSync(key);
    } catch {
      // Ignore storage errors in preview or degraded runtime.
    }
  });
};

const isUnauthorizedResponse = (res: any) => {
  const code = res?.data?.code ?? res?.data?.statusCode;
  return res?.statusCode === 401 || code === 401 || code === '401' || code === 'UNAUTHORIZED';
};

const getBusinessCode = (res: any) =>
  res?.data?.data?.code ||
  res?.data?.data?.errorCode ||
  res?.data?.errorCode ||
  res?.data?.code ||
  res?.data?.statusCode;

const getStatusCode = (res: any) => {
  const code = getBusinessCode(res);
  const numericCode = typeof code === 'number' ? code : Number(code);
  return res?.statusCode || (Number.isFinite(numericCode) ? numericCode : 0);
};

const isAccountLockedResponse = (res: any) => {
  const code = String(getBusinessCode(res) || '').toUpperCase();
  return ['USER_BANNED', 'USER_FROZEN', 'USER_DELETED'].includes(code);
};

const getAccountLockedMessage = (res: any) => {
  const code = String(getBusinessCode(res) || '').toUpperCase();
  const msg = res?.data?.msg || res?.data?.message;
  if (msg) return msg;
  if (code === 'USER_BANNED') return '账号已被封禁，请联系平台客服';
  if (code === 'USER_FROZEN') return '账号已被冻结，请联系平台客服';
  if (code === 'USER_DELETED') return '账号已注销或不可用';
  return '账号状态异常，请联系平台客服';
};

const isTransientResponse = (res: any) => {
  const statusCode = getStatusCode(res);
  return TRANSIENT_STATUS_CODES.includes(statusCode);
};

const isTransientNetworkError = (error: any) => {
  const statusCode = Number(error?.statusCode || error?.status || 0);
  const message = String(error?.errMsg || error?.message || error || '').toLowerCase();
  return TRANSIENT_STATUS_CODES.includes(statusCode) ||
    message.includes('timeout') ||
    message.includes('time out') ||
    message.includes('fail') ||
    message.includes('socket') ||
    message.includes('econnreset') ||
    message.includes('network');
};

const getResponseErrorMessage = (res: any) => {
  const code = getBusinessCode(res);
  const msg = res?.data?.msg || res?.data?.message;
  const numericCode = getStatusCode(res);
  if (isAccountLockedResponse(res)) {
    return getAccountLockedMessage(res);
  }
  if (res?.statusCode === 403 || numericCode === 403 || code === 'FORBIDDEN') {
    return msg || '权限不足，无法执行该操作';
  }
  if (res?.statusCode >= 500 || numericCode >= 500) {
    return msg || '服务器暂时开小差，请稍后重试';
  }
  if (res?.statusCode >= 400 || (Number.isFinite(numericCode) && numericCode >= 400)) {
    return msg || '请求失败，请稍后重试';
  }
  return '';
};

const handleAuthExpired = () => {
  clearLoginCache();
  if (!authExpiredToastShown) {
    authExpiredToastShown = true;
    Taro.showToast({ title: '登录已过期，请重新登录', icon: 'none' });
    setTimeout(() => {
      authExpiredToastShown = false;
    }, 2500);
  }
};

const handleAccountLocked = (res: any) => {
  clearLoginCache();
  if (!accountLockedToastShown) {
    accountLockedToastShown = true;
    Taro.showToast({ title: getAccountLockedMessage(res), icon: 'none', duration: 2500 });
    setTimeout(() => {
      accountLockedToastShown = false;
      try {
        Taro.switchTab({ url: '/pages/profile/index' });
      } catch {
        // Some routes or preview runtimes may not support switchTab here.
      }
    }, 1200);
  }
};

const normalizeResponse = <T>(res: T): T => {
  const normalized = normalizeNetworkResponseData(res as T & { data?: unknown }) as T;
  if (isUnauthorizedResponse(normalized)) {
    handleAuthExpired();
    throw new Error('登录已过期，请重新登录');
  }
  if (isAccountLockedResponse(normalized)) {
    handleAccountLocked(normalized);
    throw new Error(getAccountLockedMessage(normalized));
  }
  const errorMessage = getResponseErrorMessage(normalized);
  if (errorMessage) {
    throw new Error(errorMessage);
  }
  return normalized;
};

const createUrl = (url: string): string => {
  if (isFullUrl(url)) {
    return url;
  }

  return `${PROJECT_DOMAIN || ''}${url}`;
};

const getCloud = () => (Taro as any).cloud;

let cloudInitialized = false;

const ensureCloudInit = () => {
  const cloud = getCloud();
  if (cloudInitialized || !cloud?.init) {
    return;
  }

  cloud.init({
    env: WECHAT_CLOUD_ENV_ID || undefined,
    traceUser: true,
  });
  cloudInitialized = true;
};

const canUseCloudContainer = (url: string) =>
  TARO_ENV === 'weapp' &&
  !isFullUrl(url) &&
  WECHAT_USE_CLOUD_CONTAINER !== false &&
  !PROJECT_DOMAIN &&
  Boolean(WECHAT_CLOUD_ENV_ID) &&
  Boolean(WECHAT_CLOUD_SERVICE_NAME) &&
  Boolean(getCloud()?.callContainer);

const canUseCloudStorage = () =>
  TARO_ENV === 'weapp' && Boolean(getCloud()?.uploadFile);

const shouldUploadThroughBackend = (url: string) =>
  !isFullUrl(url) && url.startsWith('/api/uploads/') && Boolean(PROJECT_DOMAIN);

const normalizeCloudPath = (url: string) => {
  const path = url.replace(/^https?:\/\/[^/]+/i, '');
  return path.startsWith('/') ? path : `/${path}`;
};

const createCloudStoragePath = (filePath: string) => {
  const extMatch = filePath.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  const ext = extMatch?.[1] || 'jpg';
  const prefix = (WECHAT_CLOUD_STORAGE_PREFIX || 'task-images').replace(/^\/+|\/+$/g, '');
  return `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
};

const withCallbacks = <T>(promise: Promise<T>, option: any) =>
  promise
    .then((res) => {
      option.success?.(res);
      option.complete?.(res);
      return res;
    })
    .catch((error) => {
      option.fail?.(error);
      option.complete?.(error);
      throw error;
    }) as any;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const showTransientRetryToast = () => {
  if (transientRetryToastShown) return;
  transientRetryToastShown = true;
  Taro.showToast({ title: '服务正在唤醒，请稍候', icon: 'none', duration: 1800 });
  setTimeout(() => {
    transientRetryToastShown = false;
  }, 2500);
};

const withRequestRetry = async <T>(operation: () => Promise<T>): Promise<T> => {
  let lastError: any;
  for (let attempt = 0; attempt <= MAX_TRANSIENT_RETRIES; attempt += 1) {
    try {
      const res = await operation();
      if (isTransientResponse(res) && attempt < MAX_TRANSIENT_RETRIES) {
        showTransientRetryToast();
        await sleep(400 * (attempt + 1));
        continue;
      }
      return normalizeResponse(res);
    } catch (error: any) {
      lastError = error;
      if (attempt < MAX_TRANSIENT_RETRIES && isTransientNetworkError(error)) {
        showTransientRetryToast();
        await sleep(400 * (attempt + 1));
        continue;
      }
      throw error;
    }
  }
  throw lastError || new Error('请求失败，请稍后重试');
};

export namespace Network {
  export const request = (option: RequestOption) => {
    if (canUseCloudContainer(option.url)) {
      ensureCloudInit();
      const cloud = getCloud();
      const promise = withRequestRetry(() => cloud.callContainer({
        config: WECHAT_CLOUD_ENV_ID ? { env: WECHAT_CLOUD_ENV_ID } : undefined,
        path: normalizeCloudPath(option.url),
        method: option.method || 'GET',
        data: option.data,
        header: {
          ...(option.header || {}),
          'X-WX-SERVICE': WECHAT_CLOUD_SERVICE_NAME,
        },
        timeout: option.timeout || DEFAULT_REQUEST_TIMEOUT_MS,
      }));

      return withCallbacks(promise, option);
    }

    const promise = withRequestRetry(() => Taro.request({
      ...option,
      timeout: option.timeout || DEFAULT_REQUEST_TIMEOUT_MS,
      url: createUrl(option.url),
    }));
    return withCallbacks(promise, option);
  };

  export const uploadFile = (option: UploadOption) => {
    if (shouldUploadThroughBackend(option.url)) {
      return Taro.uploadFile({
        ...option,
        url: createUrl(option.url),
      });
    }

    if (canUseCloudStorage()) {
      ensureCloudInit();
      const cloud = getCloud();
      const promise = cloud.uploadFile({
        cloudPath: createCloudStoragePath(option.filePath),
        filePath: option.filePath,
      }).then((res: any) => ({
        errMsg: res.errMsg || 'uploadFile:ok',
        statusCode: 200,
        header: {},
        data: JSON.stringify({
          code: 200,
          msg: 'success',
          data: {
            file_url: res.fileID,
            file_type: 'image',
            original_name: option.filePath.split('/').pop() || 'image',
            size: 0,
          },
        }),
      }));

      return withCallbacks(promise, option);
    }

    return Taro.uploadFile({
      ...option,
      url: createUrl(option.url),
    });
  };

  export const downloadFile = (option: DownloadOption) => {
    if (TARO_ENV === 'weapp' && option.url.startsWith('cloud://') && getCloud()?.downloadFile) {
      ensureCloudInit();
      const promise = getCloud().downloadFile({ fileID: option.url });
      return withCallbacks(promise, option);
    }

    return Taro.downloadFile({
      ...option,
      url: createUrl(option.url),
    });
  };
}
