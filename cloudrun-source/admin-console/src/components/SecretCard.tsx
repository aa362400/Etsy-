import { SecretItem, SecretTestResult } from '../api/secrets';

const STATUS_TEXT: Record<SecretItem['status'], string> = {
  configured: '已配置',
  missing: '未配置',
  disabled: '已禁用',
  abnormal: '异常',
};

const STATUS_CLASS: Record<SecretItem['status'], string> = {
  configured: 'secret-status-ok',
  missing: 'secret-status-missing',
  disabled: 'secret-status-disabled',
  abnormal: 'secret-status-bad',
};

export function SecretCard(props: {
  item: SecretItem;
  testing?: boolean;
  testResult?: SecretTestResult;
  onEdit: (item: SecretItem) => void;
  onDisable: (item: SecretItem) => void;
  onTest: (item: SecretItem) => void;
}) {
  const { item, testing, testResult } = props;
  return (
    <article className="secret-card">
      <div className="secret-card-top">
        <div>
          <span className="secret-card-kicker">{item.categoryLabel}</span>
          <h3>{item.label}</h3>
          <code>{item.key}</code>
        </div>
        <span className={`secret-status ${STATUS_CLASS[item.status]}`}>{STATUS_TEXT[item.status]}</span>
      </div>
      <p className="secret-card-desc">{item.description}</p>
      <div className="secret-meta-grid">
        <div>
          <span>脱敏显示</span>
          <strong>{item.valueMasked || '未录入'}</strong>
        </div>
        <div>
          <span>来源</span>
          <strong>{item.source === 'database' ? '密钥中心' : item.source === 'env' ? '.env 兜底' : '空'}</strong>
        </div>
        <div>
          <span>最后更新</span>
          <strong>{item.updatedAt ? new Date(item.updatedAt).toLocaleString('zh-CN') : '暂无'}</strong>
        </div>
      </div>
      {testResult ? (
        <div className={`secret-test-result secret-test-${testResult.status}`}>
          <strong>{testResult.ok ? '连接正常' : '测试未通过'}</strong>
          <span>{testResult.message}</span>
        </div>
      ) : null}
      <div className="secret-card-actions">
        <button className="btn-primary" onClick={() => props.onEdit(item)}>编辑 / 录入</button>
        <button className="btn-outline" onClick={() => props.onTest(item)} disabled={!item.testable || testing}>
          {testing ? '测试中...' : '测试连接'}
        </button>
        <button className="btn-outline-danger" onClick={() => props.onDisable(item)} disabled={!item.configured || item.status === 'disabled'}>
          禁用
        </button>
      </div>
    </article>
  );
}
