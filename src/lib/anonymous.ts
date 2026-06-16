/**
 * 匿名访客标识模块。
 * 未登录用户使用 AI 功能时，前端生成并持久化 anonymousId，
 * 用于后端限流、统计和后续账号绑定。
 */
import Taro from '@tarojs/taro';

const STORAGE_KEY = 'anon_id';

/** 生成匿名访客 ID */
function generateAnonId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `anon_${ts}_${rand}`;
}

/** 获取或创建匿名访客 ID */
export function getAnonymousId(): string {
  try {
    const cached = Taro.getStorageSync(STORAGE_KEY);
    if (cached && typeof cached === 'string' && cached.length >= 10) {
      return cached;
    }
  } catch (_) { /* ignore */ }

  const id = generateAnonId();
  try {
    Taro.setStorageSync(STORAGE_KEY, id);
  } catch (_) { /* ignore */ }
  return id;
}

/** 短标识（用于 UI 展示，取后 4 位） */
export function getAnonymousShortId(): string {
  const id = getAnonymousId();
  return id.slice(-4);
}
