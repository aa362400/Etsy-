import { useEffect, useState } from 'react';

/**
 * 防抖值 hook - 用户停止输入 delay 毫秒后才触发更新
 * 用于 AI 估价等高频计算场景，避免每次输入都重算。
 */
export function useDebouncedValue<T>(value: T, delay = 800): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
