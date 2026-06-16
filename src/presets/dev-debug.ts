import Taro from '@tarojs/taro';

/**
 * 小程序调试工具
 * 只在开发版自动开启调试模式
 * 支持微信小程序
 */
export function devDebug() {
  const env = Taro.getEnv();
  if (env === Taro.ENV_TYPE.WEAPP) {
    try {
      const wxConfigEnvVersion = (globalThis as any).__wxConfig?.envVersion;
      const accountInfo = Taro.getAccountInfoSync();
      const envVersion = wxConfigEnvVersion || accountInfo.miniProgram.envVersion;
      console.log('[Debug] envVersion:', envVersion);

      if (envVersion === 'develop') {
        Taro.setEnableDebug({ enableDebug: true });
      } else {
        Taro.setEnableDebug({ enableDebug: false });
      }
    } catch (error) {
      console.warn('[Debug] 调试模式配置失败:', error);
    }
  }
}
