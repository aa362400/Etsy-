/**
 * 微信小程序登录模块
 *
 * 登录优先级：
 * 1. 云托管 callContainer → POST /api/auth/wx-login（自动带 openid）
 * 2. 备用 wx.login → POST /api/auth/wx-code-login
 */

import Taro from '@tarojs/taro';
import { Network } from '@/network';

interface LoginResult {
  token: string;
  userId: string;
  openid: string;
  profileCompleted: boolean;
  user: {
    id: string;
    nickname: string;
    avatarUrl: string;
    city: string;
    role: string;
  };
}

interface ApiResponse<T> {
  code: number;
  msg: string;
  data: T;
}

const STORAGE_KEY_TOKEN = 'login_token';
const STORAGE_KEY_USER_ID = 'login_userId';
const STORAGE_KEY_LOGIN_STATE = 'login_state';
const STORAGE_KEY_USER_INFO = 'login_userInfo';
const LEGACY_STORAGE_KEY_TOKEN = 'token';
const LEGACY_STORAGE_KEY_USER_ID = 'userId';

/**
 * 主方案：通过云托管 callContainer 静默登录
 * 云托管会自动在请求头注入 x-wx-openid
 *
 * 抛出带 code 的错误对象，方便调用方区分：
 * - E404：接口不存在，后端未部署
 * - EOPENID：openid 为空，云托管配置问题
 * - EOTHER：其他错误
 */
export async function wxCloudLogin(): Promise<LoginResult> {
  console.log('[Auth] 开始云托管登录...');

  try {
    const res = await Network.request({
      url: '/api/auth/wx-login',
      method: 'POST',
      data: {},
    });

    const body = (res.data as ApiResponse<LoginResult>) || (res as any);
    console.log('[Auth] wx-login 响应:', JSON.stringify(body));

    // 后端返回 401 且提示 openid → 说明接口存在但 callContainer 没注入 header
    if (body.code === 401 && body.msg && body.msg.includes('openid')) {
      console.warn('[Auth] openid 为空，尝试备用方案 code2Session...');
      return wxCodeLogin();
    }

    if (body.code !== 200 || !body.data) {
      // 其他后端错误
      const errMsg = body.msg || '登录失败';
      const err: any = new Error(errMsg);
      err.loginCode = 'EBACKEND';
      throw err;
    }

    saveLoginState(body.data);
    console.log('[Auth] 云托管登录成功, userId:', body.data.userId);
    return body.data;
  } catch (err: any) {
    // 检测是否 HTTP 404
    const statusCode = err?.statusCode || err?.errMsg || '';
    if (String(statusCode).includes('404') || String(err.message || '').includes('404')) {
      const e: any = new Error('登录接口不存在，请检查后端是否已部署到云托管 express-q5bl');
      e.loginCode = 'E404';
      throw e;
    }

    // openid 为空的错误（备用方案失败后的最终兜底）
    if (err.message && err.message.includes('openid')) {
      const e: any = new Error('未获取到 openid，请检查云托管配置（env ID、服务名 express-q5bl）');
      e.loginCode = 'EOPENID';
      throw e;
    }

    // 其他错误 → 尝试备用方案
    console.warn('[Auth] 云托管登录异常:', err.message, '→ 尝试备用方案');
    try {
      return wxCodeLogin();
    } catch (fallbackErr: any) {
      if (fallbackErr.loginCode) throw fallbackErr;
      const e: any = new Error(fallbackErr.message || '登录失败，请稍后重试');
      e.loginCode = 'EOTHER';
      throw e;
    }
  }
}

/**
 * 备用方案：wx.login + code2Session
 */
export async function wxCodeLogin(): Promise<LoginResult> {
  console.log('[Auth] 开始备用 code2Session 登录...');

  try {
    const loginRes = await Taro.login();
    if (!loginRes.code) {
      const err: any = new Error('wx.login 未返回 code');
      err.loginCode = 'EOTHER';
      throw err;
    }

    console.log('[Auth] 获取到 code, 前8位:', loginRes.code.slice(0, 8));

    const res = await Network.request({
      url: '/api/auth/wx-code-login',
      method: 'POST',
      data: { code: loginRes.code },
    });

    const body = (res.data as ApiResponse<LoginResult>) || (res as any);
    console.log('[Auth] wx-code-login 响应:', JSON.stringify(body));

    if (body.code !== 200 || !body.data) {
      const errMsg = body.msg || '登录失败';
      const err: any = new Error(errMsg);
      err.loginCode = 'EBACKEND';
      throw err;
    }

    saveLoginState(body.data);
    console.log('[Auth] code2Session 登录成功, userId:', body.data.userId);
    return body.data;
  } catch (err: any) {
    // 检测 HTTP 404
    const statusCode = err?.statusCode || '';
    if (String(statusCode).includes('404')) {
      const e: any = new Error('登录接口不存在，请检查后端是否已部署到云托管 express-q5bl');
      e.loginCode = 'E404';
      throw e;
    }
    if (err.loginCode) throw err;
    const msg = err.message || err.errMsg || '登录失败，请稍后重试';
    const e: any = new Error(msg);
    e.loginCode = 'EOTHER';
    throw e;
  }
}

/**
 * 统一登录入口：优先云托管，失败降级 code2Session
 */
export async function login(): Promise<LoginResult> {
  const isWeapp = Taro.getEnv() === Taro.ENV_TYPE.WEAPP;

  if (!isWeapp) {
    // H5 环境：直接请求（走 Vite proxy 到后端）
    console.log('[Auth] H5 环境登录');
    return wxCloudLogin();
  }

  // 微信小程序：先尝试 callContainer
  return wxCloudLogin();
}

/**
 * 保存登录状态到本地
 */
export function saveLoginState(data: LoginResult) {
  Taro.setStorageSync(STORAGE_KEY_TOKEN, data.token);
  Taro.setStorageSync(STORAGE_KEY_USER_ID, data.userId);
  Taro.setStorageSync(STORAGE_KEY_LOGIN_STATE, 'logged_in');
  Taro.setStorageSync(STORAGE_KEY_USER_INFO, JSON.stringify(data.user));
  // 兼容旧页面：部分页面历史上直接读取 token/userId。
  Taro.setStorageSync(LEGACY_STORAGE_KEY_TOKEN, data.token);
  Taro.setStorageSync(LEGACY_STORAGE_KEY_USER_ID, data.userId);
}

/**
 * 获取当前存储的 token
 */
export function getToken(): string {
  return Taro.getStorageSync(STORAGE_KEY_TOKEN) || Taro.getStorageSync(LEGACY_STORAGE_KEY_TOKEN) || '';
}

/**
 * 获取当前存储的 userId
 */
export function getUserId(): string {
  return Taro.getStorageSync(STORAGE_KEY_USER_ID) || Taro.getStorageSync(LEGACY_STORAGE_KEY_USER_ID) || '';
}

/**
 * 启动时同步新旧登录缓存。
 * 旧页面还在读取 token/userId；新登录模块使用 login_token/login_userId。
 */
export function hydrateLegacyLoginState() {
  const token = Taro.getStorageSync(STORAGE_KEY_TOKEN) || Taro.getStorageSync(LEGACY_STORAGE_KEY_TOKEN) || '';
  const userId = Taro.getStorageSync(STORAGE_KEY_USER_ID) || Taro.getStorageSync(LEGACY_STORAGE_KEY_USER_ID) || '';

  if (token) {
    Taro.setStorageSync(STORAGE_KEY_TOKEN, token);
    Taro.setStorageSync(LEGACY_STORAGE_KEY_TOKEN, token);
  }

  if (userId) {
    Taro.setStorageSync(STORAGE_KEY_USER_ID, userId);
    Taro.setStorageSync(LEGACY_STORAGE_KEY_USER_ID, userId);
  }

  if (token && userId) {
    Taro.setStorageSync(STORAGE_KEY_LOGIN_STATE, 'logged_in');
  }
}

/**
 * 获取缓存的用户信息
 */
export function getCachedUserInfo(): LoginResult['user'] | null {
  try {
    const raw = Taro.getStorageSync(STORAGE_KEY_USER_INFO);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * 判断是否已登录
 */
export function isLoggedIn(): boolean {
  const state = Taro.getStorageSync(STORAGE_KEY_LOGIN_STATE);
  const token = getToken();
  return state === 'logged_in' && token.length > 0;
}

/**
 * 判断资料是否已完善
 */
export function isProfileCompleted(): boolean {
  const userInfo = getCachedUserInfo();
  return !!(userInfo?.nickname);
}

/**
 * 清除登录状态
 */
export function logout() {
  Taro.removeStorageSync(STORAGE_KEY_TOKEN);
  Taro.removeStorageSync(STORAGE_KEY_USER_ID);
  Taro.removeStorageSync(STORAGE_KEY_LOGIN_STATE);
  Taro.removeStorageSync(STORAGE_KEY_USER_INFO);
  Taro.removeStorageSync(LEGACY_STORAGE_KEY_TOKEN);
  Taro.removeStorageSync(LEGACY_STORAGE_KEY_USER_ID);
}

/**
 * 更新资料
 */
export async function updateProfile(nickname: string, avatarUrl: string) {
  const token = getToken();
  if (!token) throw new Error('请先登录');

  const res = await Network.request({
    url: '/api/auth/update-profile',
    method: 'POST',
    data: { nickname, avatarUrl },
    header: { authorization: `Bearer ${token}` },
  });

  const body = (res.data as ApiResponse<any>) || (res as any);
  if (body.code !== 200) throw new Error(body.msg || '更新失败');

  // 更新本地缓存
  const userInfo = getCachedUserInfo();
  if (userInfo) {
    userInfo.nickname = nickname;
    userInfo.avatarUrl = avatarUrl;
    Taro.setStorageSync(STORAGE_KEY_USER_INFO, JSON.stringify(userInfo));
  }

  return body.data;
}
