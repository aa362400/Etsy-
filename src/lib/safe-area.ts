import Taro from '@tarojs/taro';

export interface SafeAreaInfo {
  statusBarHeight: number;
  safeAreaBottom: number;
  safeAreaTop: number;
  menuButton: { top: number; bottom: number; height: number; width: number; left: number; right: number };
  navBarHeight: number;
  navBarTotalHeight: number;
  screenWidth: number;
  screenHeight: number;
  windowWidth: number;
  windowHeight: number;
  isNotchDevice: boolean;
}

let cachedInfo: SafeAreaInfo | null = null;

export const getSafeAreaInfo = (): SafeAreaInfo => {
  if (cachedInfo) return cachedInfo;
  try {
    const windowInfo = (Taro as any).getWindowInfo?.() || {};
    const systemInfo = Taro.getSystemInfoSync?.() || ({} as any);
    // H5 mode: getMenuButtonBoundingClientRect throws, use fallback
    let menuButton: any = { top: 32, bottom: 64, height: 32, width: 87 };
    try {
      if (TARO_ENV !== 'h5') {
        const mb = Taro.getMenuButtonBoundingClientRect?.() as any;
        if (mb && typeof mb.then !== 'function') menuButton = mb;
      }
    } catch (_) { /* H5 fallback used */ }
    const statusBarHeight = windowInfo.statusBarHeight || systemInfo.statusBarHeight || 20;
    const screenWidth = windowInfo.screenWidth || systemInfo.screenWidth || 375;
    const screenHeight = windowInfo.screenHeight || systemInfo.screenHeight || 812;
    const windowWidth = windowInfo.windowWidth || systemInfo.windowWidth || 375;
    const windowHeight = windowInfo.windowHeight || systemInfo.windowHeight || 667;
    const rawSafeBottom = screenHeight - statusBarHeight - windowHeight;
    const safeAreaBottom = rawSafeBottom > 0 ? rawSafeBottom : 0;
    const safeAreaTop = statusBarHeight;
    const isNotchDevice = statusBarHeight > 30 || screenHeight >= 812;
    const mb = {
      top: menuButton.top || 32, bottom: menuButton.bottom || 64,
      height: menuButton.height || 32, width: menuButton.width || 87,
      left: menuButton.left || screenWidth - 97, right: menuButton.right || screenWidth - 10,
    };
    const gapToStatus = mb.top - statusBarHeight;
    const navBarHeight = mb.height + gapToStatus * 2;
    const navBarTotalHeight = statusBarHeight + navBarHeight;
    cachedInfo = {
      statusBarHeight, safeAreaBottom, safeAreaTop, menuButton: mb,
      navBarHeight, navBarTotalHeight, screenWidth, screenHeight,
      windowWidth, windowHeight, isNotchDevice,
    };
    return cachedInfo;
  } catch {
    cachedInfo = {
      statusBarHeight: 20, safeAreaBottom: 0, safeAreaTop: 20,
      menuButton: { top: 32, bottom: 64, height: 32, width: 87, left: 278, right: 365 },
      navBarHeight: 44, navBarTotalHeight: 64, screenWidth: 375,
      screenHeight: 812, windowWidth: 375, windowHeight: 667, isNotchDevice: false,
    };
    return cachedInfo;
  }
};

export const getSafeBottomRpx = (): number => {
  const info = getSafeAreaInfo();
  return Math.ceil(info.safeAreaBottom * 750 / info.screenWidth);
};

export const getNavBarTotalRpx = (): number => {
  const info = getSafeAreaInfo();
  return Math.ceil(info.navBarTotalHeight * 750 / info.screenWidth);
};
