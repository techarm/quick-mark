import * as Dialog from '@radix-ui/react-dialog';
import { Link2, X } from 'lucide-react';
import { useState } from 'react';
import type { Category, CreateLinkInput } from '../../lib/types';

interface AddLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  onSubmit: (input: CreateLinkInput) => void;
}

export function AddLinkDialog({ open, onOpenChange, categories, onSubmit }: AddLinkDialogProps) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [isTemporary, setIsTemporary] = useState(false);
  const [expiryDays, setExpiryDays] = useState(7);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    const expiresAt = isTemporary
      ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString()
      : undefined;

    onSubmit({
      url: url.trim(),
      title: title.trim() || url.trim(),
      description: description.trim() || undefined,
      category_id: categoryId || undefined,
      is_temporary: isTemporary,
      expires_at: expiresAt,
    });

    setUrl('');
    setTitle('');
    setDescription('');
    setCategoryId('');
    setIsTemporary(false);
    setExpiryDays(7);
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content glass-overlay" style={{ width: 480, padding: 0 }}>
          {/* ヘッダー */}
          <div className="dialog-header">
            <Dialog.Title
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 15,
                fontWeight: 600,
                color: 'var(--text-primary)',
                margin: 0,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--accent-subtle)',
                }}
              >
                <Link2 size={14} style={{ color: 'var(--accent-primary)' }} />
              </div>
              リンクを追加
            </Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="dialog-close-btn">
                <X size={15} />
              </button>
            </Dialog.Close>
          </div>

          {/* フォーム */}
          <form onSubmit={handleSubmit}>
            <div
              className="dialog-body"
              style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              <div className="form-field">
                <label className="form-label">
                  URL<span className="required">*</span>
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="input-field"
                  required
                />
              </div>

              <div className="form-field">
                <label className="form-label">タイトル</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="リンクのタイトル（空欄ならURLから取得）"
                  className="input-field"
                />
              </div>

              <div className="form-field">
                <label className="form-label">説明</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="メモや説明（任意）"
                  className="input-field"
                  rows={2}
                  style={{
                    height: 'auto',
                    minHeight: 64,
                    padding: '10px 12px',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div className="form-field">
                <label className="form-label">カテゴリ</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="input-field"
                >
                  <option value="">未分類</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 一時リンク */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 4 }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isTemporary}
                    onChange={(e) => setIsTemporary(e.target.checked)}
                    className="checkbox"
                  />
                  一時リンク
                </label>
                {isTemporary && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="number"
                      value={expiryDays}
                      onChange={(e) => setExpiryDays(Number(e.target.value))}
                      min={1}
                      max={365}
                      className="input-field"
                      style={{ width: 64, height: 32, textAlign: 'center', fontSize: 13 }}
                    />
                    <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                      日後に期限切れ
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* フッター */}
            <div className="dialog-footer">
              <Dialog.Close asChild>
                <button type="button" className="btn btn-ghost">
                  キャンセル
                </button>
              </Dialog.Close>
              <button type="submit" className="btn btn-primary">
                追加する
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
