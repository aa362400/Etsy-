export const centsToYuan = (value: number | string | undefined | null) => {
  const cents = Number(value || 0);
  if (!Number.isFinite(cents) || cents <= 0) return 0;
  return cents / 100;
};

export const formatCentsAsYuan = (
  value: number | string | undefined | null,
  options?: { fallback?: string; spaced?: boolean },
) => {
  const yuan = centsToYuan(value);
  if (yuan <= 0) return options?.fallback || '面议';
  const amount = yuan >= 100 ? String(Math.round(yuan)) : yuan.toFixed(2);
  return options?.spaced ? `¥ ${amount}` : `¥${amount}`;
};
