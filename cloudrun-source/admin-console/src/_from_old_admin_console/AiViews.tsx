import { useEffect, useState } from "react";

export type AiRequest = <T>(path: string, options?: RequestInit) => Promise<T>;

export interface AiConversation {
  id: string;
  user_id: string;
  scene?: string;
  intent_summary?: string;
  last_message?: string;
  handed_off?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AiMessage {
  id: string;
  conversation_id: string;
  user_id?: string;
  role: "user" | "assistant" | "system" | "staff";
  content: string;
  card_payload?: string;
  intent?: string;
  raw_response?: string;
  created_at?: string;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  conversation_id?: string;
  status: "pending" | "processing" | "resolved" | "rejected";
  summary?: string;
  assigned_admin_id?: string;
  created_at?: string;
}

export interface ProductSource {
  id: string;
  title: string;
  category?: string;
  price?: number | string;
  unit?: string;
  rating?: number | string;
  source?: string;
  image?: string;
  tags?: string;
  status?: "active" | "offline";
  created_at?: string;
}

export interface AiConfigStatus {
  provider: { provider: string; model: string; configured: boolean; base_url: string; last_error: string; has_key?: boolean };
  features: Record<string, boolean>;
  runtime_provider?: { provider: string; base_url: string; model: string; api_key_masked: string; enabled: boolean; is_default: boolean } | null;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "待处理",
  processing: "处理中",
  resolved: "已解决",
  rejected: "已驳回",
};

const ROLE_LABEL: Record<string, string> = {
  user: "用户",
  assistant: "AI 助手",
  system: "系统",
  staff: "客服人员",
};

/** 格式化用户 ID 显示：匿名用户显示为 "匿名用户 (后4位)" */
function formatUserId(userId: string | undefined): string {
  if (!userId) return '-';
  if (userId.startsWith('anon_')) {
    const short = userId.length >= 8 ? userId.slice(-4) : userId;
    return `匿名用户 (${short})`;
  }
  return userId;
}

export function AiConversationsView({ request, onToast }: { request: AiRequest; onToast: (msg: string) => void }) {
  const [items, setItems] = useState<AiConversation[]>([]);
  const [active, setActive] = useState<AiConversation | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [filter, setFilter] = useState({ status: "", intent: "", q: "" });
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.status) params.set("status", filter.status);
      if (filter.intent) params.set("intent", filter.intent);
      if (filter.q) params.set("q", filter.q);
      const data = await request<{ items: AiConversation[]; total: number }>(`/admin/ai/conversations?${params}`);
      setItems(data.items || []);
    } catch (e: any) {
      onToast("AI 会话加载失败：" + e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (c: AiConversation) => {
    setActive(c);
    try {
      const data = await request<{ conversation: AiConversation; messages: AiMessage[] }>(`/admin/ai/conversations/${c.id}`);
      setMessages(data.messages || []);
    } catch (e: any) {
      onToast("会话明细加载失败：" + e.message);
    }
  };

  useEffect(() => { void load(); }, []);

  return (
    <div className="ai-views-grid">
      <div className="ai-views-list">
        <div className="ai-views-toolbar">
          <input placeholder="按用户/关键词搜索" value={filter.q} onChange={(e) => setFilter({ ...filter, q: e.target.value })} />
          <select value={filter.intent} onChange={(e) => setFilter({ ...filter, intent: e.target.value })}>
            <option value="">全部意图</option>
            <option value="product_search">商品搜索</option>
            <option value="price_compare">价格对比</option>
            <option value="value_recommendation">性价比推荐</option>
            <option value="task_create_assist">任务创建</option>
            <option value="order_support">订单咨询</option>
            <option value="human_service">转人工</option>
            <option value="general_chat">通用</option>
          </select>
          <select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}>
            <option value="">全部状态</option>
            <option value="handed_off">已转人工</option>
            <option value="active">未转人工</option>
          </select>
          <button onClick={() => void load()} disabled={loading}>{loading ? "加载中" : "刷新"}</button>
        </div>
        <div className="ai-views-table">
          <div className="ai-views-row ai-views-head">
            <span>用户</span><span>意图</span><span>最后消息</span><span>转人工</span><span>更新时间</span>
          </div>
          {items.length === 0 ? (
            <div className="ai-views-empty">暂无 AI 会话记录</div>
          ) : items.map((c) => (
            <div key={c.id} className={`ai-views-row ${active?.id === c.id ? "active" : ""}`} onClick={() => void loadDetail(c)}>
              <span>{formatUserId(c.user_id)}</span>
              <span>{c.intent_summary || "-"}</span>
              <span className="truncate">{c.last_message || "-"}</span>
              <span>{c.handed_off ? "✅" : "—"}</span>
              <span>{c.updated_at ? new Date(c.updated_at).toLocaleString("zh-CN", { hour12: false }) : "-"}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="ai-views-detail">
        <h3>会话明细</h3>
        {!active ? <p className="ai-views-empty">点击左侧会话查看明细</p> : (
          <div className="ai-views-msgs">
            {messages.map((m) => (
              <div key={m.id} className={`ai-msg ai-msg-${m.role}`}>
                <div className="ai-msg-meta">{ROLE_LABEL[m.role] || m.role}{m.intent ? ` · ${m.intent}` : ""}{m.created_at ? " · " + new Date(m.created_at).toLocaleString("zh-CN", { hour12: false }) : ""}</div>
                <div className="ai-msg-content">{m.content}</div>
                {m.card_payload ? <div className="ai-msg-card">卡片：{m.card_payload}</div> : null}
              </div>
            ))}
            {messages.length === 0 ? <p className="ai-views-empty">暂无消息</p> : null}
          </div>
        )}
      </div>
    </div>
  );
}

export function SupportTicketsView({ request, onToast }: { request: AiRequest; onToast: (msg: string) => void }) {
  const [items, setItems] = useState<SupportTicket[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [active, setActive] = useState<SupportTicket | null>(null);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      const data = await request<{ items: SupportTicket[] }>(`/admin/ai/tickets?${params}`);
      setItems(data.items || []);
    } catch (e: any) { onToast("加载工单失败：" + e.message); } finally { setLoading(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await request(`/admin/ai/tickets/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      onToast("状态已更新");
      await load();
    } catch (e: any) { onToast("更新失败：" + e.message); }
  };

  const sendReply = async () => {
    if (!active || !reply.trim()) return;
    try {
      await request(`/admin/ai/tickets/${active.id}/reply`, { method: "POST", body: JSON.stringify({ content: reply.trim() }) });
      onToast("已回复用户");
      setReply("");
    } catch (e: any) { onToast("回复失败：" + e.message); }
  };

  useEffect(() => { void load(); }, [statusFilter]);

  return (
    <div className="ai-views-grid">
      <div className="ai-views-list">
        <div className="ai-views-toolbar">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">全部状态</option>
            <option value="pending">待处理</option>
            <option value="processing">处理中</option>
            <option value="resolved">已解决</option>
            <option value="rejected">已驳回</option>
          </select>
          <button onClick={() => void load()} disabled={loading}>{loading ? "加载中" : "刷新"}</button>
        </div>
        <div className="ai-views-table">
          <div className="ai-views-row ai-views-head"><span>用户</span><span>摘要</span><span>状态</span><span>时间</span></div>
          {items.length === 0 ? <div className="ai-views-empty">暂无客服工单</div> :
            items.map((t) => (
              <div key={t.id} className={`ai-views-row ${active?.id === t.id ? "active" : ""}`} onClick={() => setActive(t)}>
                <span>{formatUserId(t.user_id)}</span>
                <span className="truncate">{t.summary || "-"}</span>
                <span>{STATUS_LABEL[t.status] || t.status}</span>
                <span>{t.created_at ? new Date(t.created_at).toLocaleString("zh-CN", { hour12: false }) : "-"}</span>
              </div>
            ))}
        </div>
      </div>
      <div className="ai-views-detail">
        <h3>工单处理</h3>
        {!active ? <p className="ai-views-empty">点击左侧工单查看</p> : (
          <div>
            <p>用户：{formatUserId(active.user_id)}</p>
            <p>摘要：{active.summary}</p>
            <p>当前状态：{STATUS_LABEL[active.status] || active.status}</p>
            <div className="ai-views-actions">
              <button onClick={() => void updateStatus(active.id, "processing")}>认领处理</button>
              <button onClick={() => void updateStatus(active.id, "resolved")}>标记已解决</button>
              <button onClick={() => void updateStatus(active.id, "rejected")}>驳回</button>
            </div>
            <h4>给用户回复（会出现在小程序对话中）</h4>
            <textarea rows={4} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="例如：你好，已收到你的问题，订单将在 30 分钟内处理完成。" />
            <button onClick={() => void sendReply()} disabled={!reply.trim()}>发送回复</button>
          </div>
        )}
      </div>
    </div>
  );
}

export function ProductSourcesView({ request, onToast }: { request: AiRequest; onToast: (msg: string) => void }) {
  const [items, setItems] = useState<ProductSource[]>([]);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Partial<ProductSource> | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      const data = await request<{ items: ProductSource[] }>(`/admin/ai/products?${params}`);
      setItems(data.items || []);
    } catch (e: any) { onToast("加载失败：" + e.message); } finally { setLoading(false); }
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.title) { onToast("请填写商品名称"); return; }
    try {
      if (editing.id) {
        await request(`/admin/ai/products/${editing.id}`, { method: "PATCH", body: JSON.stringify(editing) });
      } else {
        await request(`/admin/ai/products`, { method: "POST", body: JSON.stringify(editing) });
      }
      onToast("已保存");
      setEditing(null);
      await load();
    } catch (e: any) { onToast("保存失败：" + e.message); }
  };

  const remove = async (id: string) => {
    if (!window.confirm("确定下架该商品？AI 助手将不再推荐它。")) return;
    try { await request(`/admin/ai/products/${id}`, { method: "DELETE" }); onToast("已下架"); await load(); }
    catch (e: any) { onToast("下架失败：" + e.message); }
  };

  useEffect(() => { void load(); }, []);

  return (
    <div className="ai-views-grid">
      <div className="ai-views-list">
        <div className="ai-views-toolbar">
          <input placeholder="搜索商品名称 / 分类" value={q} onChange={(e) => setQ(e.target.value)} />
          <button onClick={() => void load()} disabled={loading}>{loading ? "加载中" : "搜索"}</button>
          <button onClick={() => setEditing({ title: "", price: 0, status: "active" })}>新增商品</button>
        </div>
        <div className="ai-views-table">
          <div className="ai-views-row ai-views-head"><span>名称</span><span>分类</span><span>价格</span><span>来源</span><span>评分</span><span>状态</span><span>操作</span></div>
          {items.length === 0 ? <div className="ai-views-empty">暂无商品数据。AI 助手只会基于这里录入的真实商品做推荐，不会编造。</div> :
            items.map((p) => (
              <div key={p.id} className="ai-views-row">
                <span>{p.title}</span>
                <span>{p.category || "-"}</span>
                <span>¥{p.price ?? "-"}</span>
                <span>{p.source || "-"}</span>
                <span>{p.rating ?? "-"}</span>
                <span>{p.status === "offline" ? "已下架" : "在线"}</span>
                <span>
                  <button onClick={() => setEditing(p)}>编辑</button>
                  <button onClick={() => void remove(p.id)}>下架</button>
                </span>
              </div>
            ))}
        </div>
      </div>
      <div className="ai-views-detail">
        <h3>{editing?.id ? "编辑商品" : editing ? "新增商品" : "商品编辑"}</h3>
        {!editing ? <p className="ai-views-empty">点击左侧商品编辑，或点击「新增商品」录入。</p> : (
          <div className="ai-views-form">
            <label>名称<input value={editing.title || ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></label>
            <label>分类<input value={editing.category || ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} placeholder="如：家电 / 数码" /></label>
            <label>价格 (元)<input type="number" value={editing.price ?? ""} onChange={(e) => setEditing({ ...editing, price: e.target.value })} /></label>
            <label>单位<input value={editing.unit || ""} onChange={(e) => setEditing({ ...editing, unit: e.target.value })} placeholder="件/台/次" /></label>
            <label>评分<input value={editing.rating ?? ""} onChange={(e) => setEditing({ ...editing, rating: e.target.value })} placeholder="0-5" /></label>
            <label>来源<input value={editing.source || ""} onChange={(e) => setEditing({ ...editing, source: e.target.value })} placeholder="平台 / 渠道" /></label>
            <label>主图 URL<input value={editing.image || ""} onChange={(e) => setEditing({ ...editing, image: e.target.value })} /></label>
            <label>标签<input value={editing.tags || ""} onChange={(e) => setEditing({ ...editing, tags: e.target.value })} placeholder="逗号分隔" /></label>
            <label>状态
              <select value={editing.status || "active"} onChange={(e) => setEditing({ ...editing, status: e.target.value as any })}>
                <option value="active">在线</option>
                <option value="offline">已下架</option>
              </select>
            </label>
            <div className="ai-views-actions">
              <button onClick={() => void save()}>保存</button>
              <button onClick={() => setEditing(null)}>取消</button>
            </div>
            <p className="ai-views-hint">⚠ 价格、评分、来源都会被 AI 客户助手原样使用，请录入真实数据。</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function AiConfigView({ request, onToast }: { request: AiRequest; onToast: (msg: string) => void }) {
  const [data, setData] = useState<AiConfigStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState({ provider: '', baseUrl: '', model: '', apiKey: '', enabled: true, isDefault: false });

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const d = await request<AiConfigStatus>('/admin/ai/config/status');
      setData(d);
      // 优先使用运行时配置（管理后台保存的），回退到环境变量配置
      const runtime = d?.runtime_provider;
      const env = d?.provider;
      if (runtime && runtime.provider) {
        setForm({
          provider: runtime.provider || '',
          baseUrl: runtime.base_url || '',
          model: runtime.model || '',
          apiKey: '', // 密钥脱敏，不回填
          enabled: runtime.enabled || false,
          isDefault: runtime.is_default || false,
        });
      } else if (env) {
        setForm({
          provider: env.provider || '',
          baseUrl: env.base_url || '',
          model: env.model || '',
          apiKey: '',
          enabled: env.configured || false,
          isDefault: false,
        });
      }
    } catch (e: any) {
      setLoadError(e?.message || '未知错误');
      onToast('AI 配置加载失败：' + (e?.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const handleSave = async () => {
    // 前端校验
    if (!form.provider.trim()) { onToast('AI 提供方不能为空'); return; }
    if (!form.baseUrl.trim()) { onToast('接口地址不能为空'); return; }
    if (!form.model.trim()) { onToast('模型名称不能为空'); return; }
    if (!form.apiKey.trim()) { onToast('API 密钥不能为空'); return; }

    setLoading(true);
    try {
      await request('/admin/ai/config', {
        method: 'POST',
        body: JSON.stringify({
          provider: form.provider,
          base_url: form.baseUrl,
          model: form.model,
          api_key: form.apiKey,
          enabled: form.enabled,
          is_default: form.isDefault,
        }),
      });
      onToast('配置已保存，AI 管家可以使用这个模型了。');
      await load();
    } catch (e: any) {
      const msg = e?.message || '';
      if (msg.includes('Not Found') || msg.includes('404') || msg.includes('Cannot POST')) {
        onToast('后端暂未开放 AI 配置保存接口，请检查服务端路由。');
      } else {
        onToast('AI 配置保存失败，请检查后端接口或稍后再试。');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    if (!form.baseUrl.trim()) { onToast('请先填写接口地址'); return; }
    if (!form.model.trim()) { onToast('请先填写模型名称'); return; }
    if (!form.apiKey.trim()) { onToast('请先填写 API 密钥'); return; }

    setLoading(true);
    try {
      const result = await request<{ ok: boolean; message?: string }>('/admin/ai/config/test', {
        method: 'POST',
        body: JSON.stringify({
          base_url: form.baseUrl,
          model: form.model,
          api_key: form.apiKey,
        }),
      });
      if (result?.ok) {
        onToast('连接成功，模型可以正常调用。');
      } else {
        onToast('连接失败，请检查接口地址、模型名称或 API 密钥。');
      }
    } catch (e: any) {
      onToast('测试连接失败，请检查后端接口或稍后再试。');
    } finally {
      setLoading(false);
    }
  };

  // 加载中
  if (loading && !data) {
    return (
      <section className="page-root">
        <div className="page-header">
          <div className="page-header-left">
            <h2 className="page-header-title">AI 配置</h2>
            <p className="page-header-desc">管理 AI 提供方、模型接入方式、启用状态与连接检测。</p>
          </div>
        </div>
        <div className="card-v2">
          <div className="empty-gentle">
            <div className="empty-gentle-icon">⏳</div>
            <p className="empty-gentle-title">AI 配置加载中，请稍等</p>
          </div>
        </div>
      </section>
    );
  }

  // 加载失败
  if (loadError && !data) {
    return (
      <section className="page-root">
        <div className="page-header">
          <div className="page-header-left">
            <h2 className="page-header-title">AI 配置</h2>
            <p className="page-header-desc">管理 AI 提供方、模型接入方式、启用状态与连接检测。</p>
          </div>
          <button className="ghost-button" onClick={() => void load()}>重试</button>
        </div>
        <div className="card-v2">
          <div className="empty-gentle">
            <div className="empty-gentle-icon">⚠️</div>
            <p className="empty-gentle-title">AI 配置加载失败</p>
            <p className="empty-gentle-desc">请检查接口或稍后重试。<br />{loadError}</p>
            <button className="btn-primary" onClick={() => void load()}>重新加载</button>
          </div>
        </div>
      </section>
    );
  }

  const providerDisplay = data?.provider;
  const features = data?.features || {};

  return (
    <section className="page-root">
      {/* ── 页面标题区 ── */}
      <div className="page-header">
        <div className="page-header-left">
          <h2 className="page-header-title">AI 配置</h2>
          <p className="page-header-desc">管理 AI 提供方、模型接入方式、启用状态与连接检测。</p>
        </div>
        <button className="ghost-button" onClick={() => void load()} disabled={loading}>刷新</button>
      </div>

      {/* ── 卡片 1：AI 接入状态 ── */}
      <div className="card-v2">
        <div className="card-v2-head">
          <h3 className="card-v2-title">AI 接入状态</h3>
        </div>
        {!providerDisplay ? (
          <div className="empty-gentle">
            <div className="empty-gentle-icon">🤖</div>
            <p className="empty-gentle-title">暂无 AI 配置信息</p>
            <p className="empty-gentle-desc">请先填写提供方、接口地址和模型名称。</p>
          </div>
        ) : (
          <div className="info-grid-4">
            <div className="info-item-v2">
              <span className="info-item-label">当前提供方</span>
              <strong>{providerDisplay.provider || '未设置'}</strong>
            </div>
            <div className="info-item-v2">
              <span className="info-item-label">默认模型</span>
              <strong>{providerDisplay.model || '未设置'}</strong>
            </div>
            <div className="info-item-v2">
              <span className="info-item-label">接口状态</span>
              <strong>
                <span className={`status-tag ${providerDisplay.configured ? 'status-tag-green' : 'status-tag-gray'}`}>
                  {providerDisplay.configured ? '已配置' : '未配置'}
                </span>
              </strong>
            </div>
            <div className="info-item-v2">
              <span className="info-item-label">接口地址</span>
              <strong className="text-muted" style={{ fontSize: 12, wordBreak: 'break-all' }}>{providerDisplay.base_url || '未设置'}</strong>
            </div>
          </div>
        )}
        {providerDisplay?.last_error ? (
          <div className="ai-warn-banner">
            ⚠️ 最近错误：{providerDisplay.last_error}
          </div>
        ) : null}
      </div>

      {/* ── 卡片 2：模型配置 ── */}
      <div className="card-v2">
        <div className="card-v2-head">
          <h3 className="card-v2-title">模型配置</h3>
        </div>
        <div className="account-form-grid">
          <label className="account-field">
            <span className="account-field-label">AI 提供方</span>
            <select value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })}>
              <option value="">请选择提供方</option>
              <option value="openai">OpenAI</option>
              <option value="azure">Azure OpenAI</option>
              <option value="deepseek">DeepSeek</option>
              <option value="moonshot">Moonshot</option>
              <option value="zhipu">智谱 AI</option>
              <option value="qwen">通义千问</option>
              <option value="custom">自定义</option>
            </select>
          </label>
          <label className="account-field">
            <span className="account-field-label">接口地址</span>
            <input
              placeholder="https://api.openai.com/v1"
              value={form.baseUrl}
              onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
            />
          </label>
          <label className="account-field">
            <span className="account-field-label">模型名称</span>
            <input
              placeholder="gpt-4o-mini"
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
            />
          </label>
          <label className="account-field">
            <span className="account-field-label">API 密钥</span>
            <input
              type="password"
              placeholder="sk-***（留空则不修改）"
              value={form.apiKey}
              onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
            />
          </label>
        </div>
        <div className="ai-config-switches">
          <label className="ai-switch-row">
            <span>是否启用</span>
            <button
              type="button"
              className={`toggle-switch ${form.enabled ? 'toggle-on' : ''}`}
              onClick={() => setForm({ ...form, enabled: !form.enabled })}
            >
              <span className="toggle-dot" />
            </button>
          </label>
          <label className="ai-switch-row">
            <span>设为默认模型</span>
            <button
              type="button"
              className={`toggle-switch ${form.isDefault ? 'toggle-on' : ''}`}
              onClick={() => setForm({ ...form, isDefault: !form.isDefault })}
            >
              <span className="toggle-dot" />
            </button>
          </label>
        </div>
        <div className="ai-config-actions">
          <button className="btn-primary" onClick={() => void handleSave()} disabled={loading}>保存配置</button>
          <button className="btn-outline" onClick={() => void handleTest()} disabled={loading}>测试连接</button>
        </div>
      </div>

      {/* ── 卡片 3：功能开关 ── */}
      <div className="card-v2">
        <div className="card-v2-head">
          <h3 className="card-v2-title">功能开关</h3>
        </div>
        {Object.keys(features).length === 0 ? (
          <p className="text-muted" style={{ padding: '12px 0' }}>暂无功能开关配置。</p>
        ) : (
          <div className="feature-switch-list">
            {Object.entries(features).map(([k, v]) => (
              <div key={k} className="feature-switch-row">
                <span className="feature-switch-name">{k}</span>
                <span className={`status-tag ${v ? 'status-tag-green' : 'status-tag-gray'}`}>
                  {v ? '已启用' : '已关闭'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 卡片 4：调用说明 ── */}
      <div className="card-v2">
        <div className="card-v2-head">
          <h3 className="card-v2-title">调用说明</h3>
        </div>
        <div className="ai-notice">
          <p>AI 配置会用于客服小窗口、风险辅助判断、订单问题分析和用户咨询回复。</p>
          <p>请确认接口地址、模型名称和密钥正确后再启用。</p>
          <p className="ai-notice-warn">⚠️ 切勿把 API 密钥放到小程序前端代码里，仅后端使用。</p>
        </div>
      </div>
    </section>
  );
}

