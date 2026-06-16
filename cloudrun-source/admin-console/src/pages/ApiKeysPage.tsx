import { useEffect, useMemo, useState } from 'react';
import { AdminRequest, disableSecret, fetchSecrets, saveSecret, SecretItem, SecretTestResult, testSecret } from '../api/secrets';
import { SecretCard } from '../components/SecretCard';
import { SecretEditModal } from '../components/SecretEditModal';

export function ApiKeysPage(props: { request: AdminRequest; onToast: (message: string) => void }) {
  const [items, setItems] = useState<SecretItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<SecretItem | null>(null);
  const [activeCategory, setActiveCategory] = useState('全部');
  const [testingKey, setTestingKey] = useState('');
  const [testResults, setTestResults] = useState<Record<string, SecretTestResult>>({});

  async function load() {
    setLoading(true);
    try {
      const data = await fetchSecrets(props.request);
      setItems(data.items || []);
    } catch (error) {
      props.onToast(error instanceof Error ? error.message : 'API 配置加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const categories = useMemo(() => ['全部', ...Array.from(new Set(items.map((item) => item.categoryLabel)))], [items]);
  const visibleItems = activeCategory === '全部' ? items : items.filter((item) => item.categoryLabel === activeCategory);
  const configuredCount = items.filter((item) => item.status === 'configured').length;
  const abnormalCount = items.filter((item) => item.status === 'abnormal').length;
  const missingCount = items.filter((item) => item.status === 'missing').length;

  async function handleSave(value: string) {
    if (!editing) return;
    setSaving(true);
    try {
      await saveSecret(props.request, {
        key: editing.key,
        value,
        category: editing.category,
        description: editing.description,
      });
      setEditing(null);
      await load();
      props.onToast(`${editing.label} 已加密保存，并已同步到当前后端运行时`);
    } catch (error) {
      props.onToast(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleDisable(item: SecretItem) {
    if (!window.confirm(`确认禁用 ${item.label}？禁用后后端会回退读取 .env。`)) return;
    try {
      await disableSecret(props.request, item.key);
      await load();
      props.onToast(`${item.label} 已禁用`);
    } catch (error) {
      props.onToast(error instanceof Error ? error.message : '禁用失败');
    }
  }

  async function handleTest(item: SecretItem) {
    setTestingKey(item.key);
    try {
      const result = await testSecret(props.request, item.key);
      setTestResults((prev) => ({ ...prev, [item.key]: result }));
      props.onToast(result.message);
    } catch (error) {
      props.onToast(error instanceof Error ? error.message : '测试失败');
    } finally {
      setTestingKey('');
    }
  }

  return (
    <section className="api-keys-page">
      <div className="api-keys-hero">
        <div>
          <span className="eyebrow">API 配置 / 后端密钥中心</span>
          <h2>后端 API 配置统一放在这里</h2>
          <p>微信登录、微信支付、AI 客服、地图、短信、云存储和风控密钥都可以在中控台直接录入。真实密钥只在后端用 ENCRYPTION_KEY 加密保存，前端只显示脱敏状态。</p>
        </div>
        <button className="ghost-button" onClick={() => void load()} disabled={loading}>{loading ? '刷新中...' : '刷新状态'}</button>
      </div>

      <div className="secret-summary-grid">
        <div><span>已配置</span><strong>{configuredCount}</strong></div>
        <div><span>未配置</span><strong>{missingCount}</strong></div>
        <div><span>异常</span><strong>{abnormalCount}</strong></div>
        <div><span>安全策略</span><strong>后端加密</strong></div>
      </div>

      <div className="secret-category-tabs">
        {categories.map((category) => (
          <button key={category} className={activeCategory === category ? 'secret-tab-active' : ''} onClick={() => setActiveCategory(category)}>
            {category}
          </button>
        ))}
      </div>

      <div className="secret-grid">
        {visibleItems.map((item) => (
          <SecretCard
            key={item.key}
            item={item}
            testing={testingKey === item.key}
            testResult={testResults[item.key]}
            onEdit={setEditing}
            onDisable={handleDisable}
            onTest={handleTest}
          />
        ))}
      </div>

      {!visibleItems.length ? (
        <div className="empty-gentle">
          <div className="empty-gentle-icon">KEY</div>
          <p className="empty-gentle-title">还没有可展示的 API 配置项</p>
          <p className="empty-gentle-desc">请确认后端 /api/admin/secrets 接口已启动，并刷新页面。</p>
        </div>
      ) : null}

      <SecretEditModal item={editing} saving={saving} onClose={() => setEditing(null)} onSave={handleSave} />
    </section>
  );
}
