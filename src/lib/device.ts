import Taro from '@tarojs/taro';

const STORAGE_KEY = 'device_id_v1';

const hashString = (input: string) => {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
};

const createDeviceId = () => {
  let systemSeed = '';
  try {
    const info = Taro.getSystemInfoSync();
    systemSeed = [
      info.brand,
      info.model,
      info.platform,
      info.system,
      info.SDKVersion,
    ].filter(Boolean).join('|');
  } catch {
    systemSeed = 'unknown';
  }

  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `dev_${hashString(systemSeed)}_${ts}_${rand}`;
};

export const getDeviceId = () => {
  try {
    const cached = Taro.getStorageSync(STORAGE_KEY);
    if (typeof cached === 'string' && cached.startsWith('dev_') && cached.length >= 16) {
      return cached;
    }
  } catch {
    // Storage may be unavailable in some preview contexts; fall through.
  }

  const id = createDeviceId();
  try {
    Taro.setStorageSync(STORAGE_KEY, id);
  } catch {
    // Best effort only. Risk control can still use IP/openid if storage fails.
  }
  return id;
};
