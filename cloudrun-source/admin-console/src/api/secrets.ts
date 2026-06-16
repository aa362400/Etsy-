export type SecretCategory = 'wechat' | 'wechat_pay' | 'map' | 'ai' | 'sms' | 'storage' | 'security';

export type SecretStatus = 'missing' | 'configured' | 'disabled' | 'abnormal';

export interface SecretItem {
  key: string;
  label: string;
  category: SecretCategory;
  categoryLabel: string;
  description: string;
  enabled: boolean;
  configured: boolean;
  status: SecretStatus;
  valueMasked: string;
  source: 'database' | 'env' | 'empty';
  updatedAt?: string;
  updatedBy?: string | null;
  testable: boolean;
  multiline?: boolean;
}

export interface SecretsListResult {
  categories: string[];
  items: SecretItem[];
}

export interface SecretTestResult {
  ok: boolean;
  status: 'success' | 'warning' | 'failed';
  message: string;
  checkedAt: string;
  details?: string[];
}

export type AdminRequest = <T>(path: string, options?: RequestInit) => Promise<T>;

export function fetchSecrets(request: AdminRequest) {
  return request<SecretsListResult>('/admin/secrets');
}

export function saveSecret(request: AdminRequest, payload: { key: string; value: string; category: SecretCategory; description: string }) {
  return request<SecretItem>('/admin/secrets', { method: 'POST', body: JSON.stringify(payload) });
}

export function disableSecret(request: AdminRequest, key: string) {
  return request<SecretItem>('/admin/secrets/disable', { method: 'POST', body: JSON.stringify({ key }) });
}

export function testSecret(request: AdminRequest, key: string) {
  return request<SecretTestResult>('/admin/secrets/test', { method: 'POST', body: JSON.stringify({ key }) });
}
