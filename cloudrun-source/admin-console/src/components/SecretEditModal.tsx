import { FormEvent, useEffect, useState } from 'react';
import { SecretItem } from '../api/secrets';

export function SecretEditModal(props: {
  item: SecretItem | null;
  saving: boolean;
  onClose: () => void;
  onSave: (value: string) => Promise<void>;
}) {
  const [value, setValue] = useState('');

  useEffect(() => {
    setValue('');
  }, [props.item?.key]);

  if (!props.item) return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await props.onSave(value);
  }

  const InputTag = props.item.multiline ? 'textarea' : 'input';

  return (
    <div className="secret-modal-layer">
      <div className="secret-modal-backdrop" onClick={props.onClose} />
      <form className="secret-modal" onSubmit={handleSubmit}>
        <div className="secret-modal-head">
          <div>
            <span className="secret-card-kicker">{props.item.categoryLabel}</span>
            <h3>录入 {props.item.label}</h3>
            <p>完整密钥只在本次输入时可见。保存后页面只显示脱敏状态，后端会加密保存并同步到当前运行时。</p>
          </div>
          <button type="button" className="secret-modal-close" onClick={props.onClose}>x</button>
        </div>
        <label className="secret-field">
          <span>{props.item.key}</span>
          <InputTag
            className={props.item.multiline ? 'secret-textarea' : 'secret-input'}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={props.item.multiline ? '粘贴 PEM 私钥，保存后不会再次明文展示' : '请输入新的后端 API 配置值'}
            autoFocus
          />
        </label>
        <div className="secret-safe-note">
          不会保存到 localStorage / sessionStorage，也不会写入前端构建产物；后端会使用 ENCRYPTION_KEY 加密持久化。
        </div>
        <div className="secret-modal-actions">
          <button type="button" className="btn-outline" onClick={props.onClose}>取消</button>
          <button type="submit" className="btn-primary" disabled={props.saving || !value.trim()}>
            {props.saving ? '保存中...' : '加密保存'}
          </button>
        </div>
      </form>
    </div>
  );
}
