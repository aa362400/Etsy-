import { useEffect, useMemo, useState } from 'react';

type UiPageKey = 'home' | 'aiAssistant' | 'publish' | 'tasks' | 'taskDetail' | 'orders' | 'profile';

interface UiThemeConfig {
  preset: string;
  primary: string;
  accent: string;
  background: string;
  cardBg: string;
  textColor: string;
  subTextColor: string;
  successColor: string;
  warnColor: string;
  errorColor: string;
  radius: number;
  shadow: 'none' | 'soft' | 'medium' | 'strong';
  mode: 'warm' | 'fresh' | 'luxury' | 'cream' | 'tech';
}

interface UiCopyConfig {
  homeWelcome: string;
  aiEntryTitle: string;
  aiEntrySubtitle: string;
  aiAssistantWelcome: string;
  aiInputPlaceholder: string;
  emptyState: string;
  loadingText: string;
  uploadSuccess: string;
  publishSuccess: string;
  handoffSuccess: string;
  networkError: string;
  unauthorized: string;
  newcomerGuide: string;
  safetyTip: string;
}

interface UiModuleConfig {
  key: string;
  title: string;
  subtitle?: string;
  visible: boolean;
  buttonText?: string;
  routeTo?: string;
  imageUrl?: string;
  extras?: Record<string, string | number | boolean>;
}

interface UiPageConfig {
  page: UiPageKey;
  modules: UiModuleConfig[];
}

interface UiFullConfig {
  theme: UiThemeConfig;
  copy: UiCopyConfig;
  pages: Record<UiPageKey, UiPageConfig>;
  version: number;
  updatedAt: string;
  button?: Record<string, unknown>;
  card?: Record<string, unknown>;
  bubble?: Record<string, unknown>;
  animation?: Record<string, unknown>;
}

interface UiAdminCurrent {
  live: UiFullConfig;
  draft: UiFullConfig | null;
  version: number;
  status: 'draft' | 'published';
  updatedAt?: string;
  publishedAt?: string;
}

const COPY_FIELDS: Array<{ key: keyof UiCopyConfig; label: string; rows?: number }> = [
  { key: 'homeWelcome', label: '首页主标题' },
  { key: 'aiEntryTitle', label: 'AI 入口标题' },
  { key: 'aiEntrySubtitle', label: 'AI 入口副标题' },
  { key: 'emptyState', label: '空状态文案' },
  { key: 'loadingText', label: '加载提示' },
  { key: 'networkError', label: '网络错误提示', rows: 2 },
];

const THEME_FIELDS: Array<{ key: keyof UiThemeConfig; label: string }> = [
  { key: 'primary', label: '主色' },
  { key: 'accent', label: '强调色' },
  { key: 'background', label: '页面背景' },
  { key: 'cardBg', label: '卡片背景' },
  { key: 'textColor', label: '主文字' },
  { key: 'subTextColor', label: '副文字' },
];

function cloneConfig(cfg: UiFullConfig): UiFullConfig {
  return JSON.parse(JSON.stringify(cfg));
}

function getHomeModule(config: UiFullConfig, key: string): UiModuleConfig | undefined {
  return config.pages?.home?.modules?.find((item) => item.key === key);
}

export function UiDecorView(props: {
  request: <T>(path: string, options?: RequestInit) => Promise<T>;
  onToast: (msg: string) => void;
}) {
  const { request, onToast } = props;
  const [current, setCurrent] = useState<UiAdminCurrent | null>(null);
  const [draft, setDraft] = useState<UiFullConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [changelog, setChangelog] = useState('');

  const dirty = useMemo(() => {
    if (!current || !draft) return false;
    return JSON.stringify(draft) !== JSON.stringify(current.live);
  }, [current, draft]);

  const loadCurrent = async () => {
    setLoading(true);
    try {
      const data = await request<UiAdminCurrent>('/admin/ui-config/current');
      setCurrent(data);
      setDraft(cloneConfig(data.draft || data.live));
    } catch (error: any) {
      onToast(`装修配置读取失败：${error?.message || '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCurrent();
  }, []);

  const patchDraft = (mutator: (next: UiFullConfig) => void) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = cloneConfig(prev);
      mutator(next);
      return next;
    });
  };

  const saveDraft = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await request('/admin/ui-config/save', {
        method: 'POST',
        body: JSON.stringify({ config: draft }),
      });
      onToast('草稿已保存。发布上线后，小程序端会读取最新装修。');
      await loadCurrent();
    } catch (error: any) {
      onToast(`保存失败：${error?.message || '未知错误'}`);
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (!draft) return;
    setPublishing(true);
    try {
      await request('/admin/ui-config/publish', {
        method: 'POST',
        body: JSON.stringify({ config: draft, changelog: changelog.trim() || '前端装修发布' }),
      });
      setChangelog('');
      onToast('装修已发布，小程序端刷新后会看到新配置。');
      await loadCurrent();
    } catch (error: any) {
      onToast(`发布失败：${error?.message || '未知错误'}`);
    } finally {
      setPublishing(false);
    }
  };

  if (loading || !draft || !current) {
    return (
      <div className="ui-decor-shell">
        <div className="ui-decor-card ui-decor-loading">正在读取小程序装修配置...</div>
      </div>
    );
  }

  const welcome = getHomeModule(draft, 'welcome');
  const aiEntry = getHomeModule(draft, 'aiEntry');

  return (
    <div className="ui-decor-shell">
      <div className="ui-decor-hero">
        <div>
          <span className="eyebrow">小程序前端装修</span>
          <h2>改这里，发布后小程序首页会读取最新配置</h2>
          <p>当前线上版本 v{current.version}。草稿保存不会影响用户，点击“发布上线”才会进入小程序公开接口。</p>
        </div>
        <div className={`ui-decor-status ${dirty ? 'ui-decor-status-warn' : 'ui-decor-status-ok'}`}>
          {dirty ? '有未发布修改' : '草稿与线上一致'}
        </div>
      </div>

      <div className="ui-decor-grid">
        <section className="ui-decor-card">
          <h3>主题颜色</h3>
          <div className="ui-decor-form-grid">
            {THEME_FIELDS.map((field) => (
              <label key={field.key} className="ui-decor-field">
                <span>{field.label}</span>
                <div className="ui-decor-color-row">
                  <input
                    type="color"
                    value={String(draft.theme[field.key] || '#000000')}
                    onChange={(event) => patchDraft((next) => { (next.theme as any)[field.key] = event.target.value; })}
                  />
                  <input
                    value={String(draft.theme[field.key] || '')}
                    onChange={(event) => patchDraft((next) => { (next.theme as any)[field.key] = event.target.value; })}
                  />
                </div>
              </label>
            ))}
          </div>
        </section>

        <section className="ui-decor-card">
          <h3>首页文案</h3>
          {COPY_FIELDS.map((field) => (
            <label key={field.key} className="ui-decor-field">
              <span>{field.label}</span>
              <textarea
                rows={field.rows || 1}
                value={draft.copy[field.key] || ''}
                onChange={(event) => patchDraft((next) => { next.copy[field.key] = event.target.value; })}
              />
            </label>
          ))}
        </section>

        <section className="ui-decor-card">
          <h3>首页模块</h3>
          <label className="ui-decor-field">
            <span>欢迎模块标题</span>
            <input
              value={welcome?.title || ''}
              onChange={(event) => patchDraft((next) => {
                const item = getHomeModule(next, 'welcome');
                if (item) item.title = event.target.value;
              })}
            />
          </label>
          <label className="ui-decor-field">
            <span>欢迎模块副标题</span>
            <input
              value={welcome?.subtitle || ''}
              onChange={(event) => patchDraft((next) => {
                const item = getHomeModule(next, 'welcome');
                if (item) item.subtitle = event.target.value;
              })}
            />
          </label>
          <label className="ui-decor-field">
            <span>AI 入口按钮文案</span>
            <input
              value={aiEntry?.buttonText || ''}
              onChange={(event) => patchDraft((next) => {
                const item = getHomeModule(next, 'aiEntry');
                if (item) item.buttonText = event.target.value;
              })}
            />
          </label>
        </section>

        <section className="ui-decor-preview-card">
          <div className="ui-decor-phone" style={{ background: draft.theme.background, color: draft.theme.textColor }}>
            <div className="ui-decor-phone-top">9:41 · 有应帮</div>
            <div className="ui-decor-phone-banner" style={{ background: `linear-gradient(135deg, ${draft.theme.primary}, ${draft.theme.accent})` }}>
              <strong>{draft.copy.homeWelcome}</strong>
              <span>{welcome?.subtitle || draft.copy.newcomerGuide}</span>
            </div>
            <div className="ui-decor-phone-card" style={{ background: draft.theme.cardBg }}>
              <b>{draft.copy.aiEntryTitle}</b>
              <span>{draft.copy.aiEntrySubtitle}</span>
              <button style={{ background: draft.theme.primary, color: draft.theme.background }}>{aiEntry?.buttonText || '去问问'}</button>
            </div>
            <div className="ui-decor-phone-empty" style={{ color: draft.theme.subTextColor }}>{draft.copy.emptyState}</div>
          </div>
        </section>
      </div>

      <div className="ui-decor-publish-bar">
        <input
          value={changelog}
          onChange={(event) => setChangelog(event.target.value)}
          placeholder="本次发布说明，例如：首页主色调整、AI入口文案优化"
        />
        <button className="btn-outline" onClick={() => void loadCurrent()} disabled={saving || publishing}>重新读取</button>
        <button className="btn-outline" onClick={() => void saveDraft()} disabled={saving || publishing}>{saving ? '保存中...' : '保存草稿'}</button>
        <button className="btn-primary" onClick={() => void publish()} disabled={publishing || saving}>{publishing ? '发布中...' : '发布上线'}</button>
      </div>
    </div>
  );
}
