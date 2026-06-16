import { useEffect, useMemo, useState } from 'react';
import { AdminRequest, fallbackGrowthData, fetchGrowthDashboard, GrowthDashboardData } from '../api/growth';

function formatNumber(value: number) {
  return Number(value || 0).toLocaleString('zh-CN');
}

function formatMoney(value: number) {
  return `¥${(Number(value || 0) / 100).toFixed(2)}`;
}

function formatRate(value: number) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function maxValue(values: number[]) {
  return Math.max(1, ...values.map((value) => Number(value || 0)));
}

export function GrowthDashboardPage(props: { request: AdminRequest; onToast: (message: string) => void }) {
  const [data, setData] = useState<GrowthDashboardData>(fallbackGrowthData);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const next = await fetchGrowthDashboard(props.request);
      setData(next);
      if (next.usingFallback) props.onToast('增长看板已展示兜底数据，接口接入后会自动切换。');
    } catch {
      setData(fallbackGrowthData);
      props.onToast('增长接口暂不可用，已展示安全兜底数据。');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const statCards = [
    { label: '今日新增用户', value: formatNumber(data.overview.todayNewUsers), hint: '微信授权新增' },
    { label: '总注册用户', value: formatNumber(data.overview.totalUsers), hint: '平台累计注册' },
    { label: '今日活跃用户', value: formatNumber(data.overview.activeUsers), hint: '访问 / 登录活跃' },
    { label: '新用户转化率', value: formatRate(data.overview.conversionRate), hint: '访问到注册' },
    { label: '任务发布人数', value: formatNumber(data.overview.taskPublishUsers), hint: '今日发布需求' },
    { label: '任务完成人数', value: formatNumber(data.overview.taskCompletedUsers), hint: '完成首单 / 任务' },
    { label: '推广消耗金额', value: formatMoney(data.overview.promotionCost), hint: '奖励与推广预算' },
    { label: '拉新成本', value: formatMoney(data.overview.acquisitionCost), hint: '单注册成本' },
  ];

  const trendMax = useMemo(() => maxValue(data.trend7.map((item) => Math.max(item.newUsers, item.activeUsers, item.taskPublishUsers))), [data.trend7]);
  const funnelMax = useMemo(() => maxValue(data.funnel.map((item) => item.count)), [data.funnel]);

  return (
    <section className="growth-page">
      <div className="growth-hero">
        <div>
          <span className="eyebrow">用户增长看板</span>
          <h2>看清用户从哪里来、为什么留下、哪里正在漏钱。</h2>
          <p>从新增、活跃、渠道、奖励漏斗到反薅羊毛，帮你把增长的钱花在该花的地方。</p>
        </div>
        <div className="growth-hero-actions">
          <span className={data.usingFallback ? 'growth-mode growth-mode-fallback' : 'growth-mode growth-mode-live'}>
            {data.usingFallback ? '兜底数据' : '真实数据'}
          </span>
          <button className="ghost-button" onClick={() => void load()} disabled={loading}>{loading ? '刷新中...' : '刷新增长数据'}</button>
        </div>
      </div>

      <div className={`growth-api-note ${data.usingFallback ? 'growth-api-note-warn' : 'growth-api-note-ok'}`}>
        {data.apiStatus}
      </div>

      <div className="growth-stat-grid">
        {statCards.map((card) => (
          <article className="growth-stat-card" key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <small>{card.hint}</small>
          </article>
        ))}
      </div>

      <div className="growth-layout">
        <div className="growth-main-col">
          <section className="growth-panel">
            <div className="growth-panel-head">
              <div>
                <h3>用户增长趋势</h3>
                <p>近 7 天新增、活跃和任务发布转化。</p>
              </div>
              <span>近 7 天</span>
            </div>
            <div className="growth-bars">
              {data.trend7.map((item) => (
                <div className="growth-bar-row" key={item.date}>
                  <span className="growth-bar-date">{item.date}</span>
                  <div className="growth-bar-track">
                    <i className="growth-bar-new" style={{ width: `${Math.max(4, (item.newUsers / trendMax) * 100)}%` }} />
                    <i className="growth-bar-active" style={{ width: `${Math.max(4, (item.activeUsers / trendMax) * 100)}%` }} />
                    <i className="growth-bar-task" style={{ width: `${Math.max(4, (item.taskPublishUsers / trendMax) * 100)}%` }} />
                  </div>
                  <strong>{formatNumber(item.newUsers)}</strong>
                </div>
              ))}
            </div>
            <div className="growth-legend">
              <span><b className="legend-new" />新增用户</span>
              <span><b className="legend-active" />活跃用户</span>
              <span><b className="legend-task" />任务发布</span>
            </div>
          </section>

          <section className="growth-panel">
            <div className="growth-panel-head">
              <div>
                <h3>推广渠道效果</h3>
                <p>不是只看访问量，更要看注册、发布任务和获客成本。</p>
              </div>
            </div>
            <div className="growth-channel-grid">
              {data.channels.map((channel) => (
                <article className="growth-channel-card" key={channel.name}>
                  <div>
                    <h4>{channel.name}</h4>
                    <span className={`growth-channel-status growth-channel-${channel.status}`}>{channel.status}</span>
                  </div>
                  <div className="growth-channel-metrics">
                    <span>访问 {formatNumber(channel.visits)}</span>
                    <span>注册 {formatNumber(channel.registers)}</span>
                    <span>发布 {formatNumber(channel.taskPublishUsers)}</span>
                    <span>成本 {formatMoney(channel.estimatedCost)}</span>
                  </div>
                  <div className="growth-channel-rate">
                    <i style={{ width: `${Math.min(100, Math.max(3, channel.conversionRate))}%` }} />
                    <strong>{formatRate(channel.conversionRate)}</strong>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="growth-side-col">
          <section className="growth-panel">
            <div className="growth-panel-head">
              <div>
                <h3>防薅羊毛监控</h3>
                <p>奖励可以发，但要发给真正会留下的人。</p>
              </div>
            </div>
            <div className="growth-risk-list">
              {data.risks.map((risk) => (
                <article className={`growth-risk-card growth-risk-${risk.status}`} key={risk.name}>
                  <div>
                    <strong>{risk.name}</strong>
                    <span>{risk.status}</span>
                  </div>
                  <b>{formatNumber(risk.count)}</b>
                  <p>{risk.suggestion}</p>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <section className="growth-panel">
        <div className="growth-panel-head">
          <div>
            <h3>新人奖励漏斗</h3>
            <p>进入小程序到完成首单，每一步都要能看见掉在哪里。</p>
          </div>
          <span>今日链路</span>
        </div>
        <div className="growth-funnel">
          {data.funnel.map((step, index) => (
            <div className="growth-funnel-step" key={step.key}>
              <div className="growth-funnel-node">
                <span>{index + 1}</span>
                <strong>{step.label}</strong>
                <small>{formatNumber(step.count)} 人 · {formatRate(step.conversionRate)}</small>
              </div>
              <div className="growth-funnel-fill" style={{ width: `${Math.max(6, (step.count / funnelMax) * 100)}%` }} />
              {index < data.funnel.length - 1 ? <b>↓</b> : null}
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
