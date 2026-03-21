import * as Dialog from '@radix-ui/react-dialog';
import { Plus, X } from 'lucide-react';
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

    // フォームリセット
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
        <Dialog.Overlay
          className="fixed inset-0 z-50"
          style={{ background: 'rgba(0, 0, 0, 0.5)' }}
        />
        <Dialog.Content className="glass-overlay fixed top-1/2 left-1/2 z-50 w-[480px] -translate-x-1/2 -translate-y-1/2 p-0">
          {/* ヘッダー */}
          <div
            className="flex items-center justify-between border-b px-5 py-3"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <Dialog.Title
              className="flex items-center gap-2 text-sm font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              <Plus size={16} style={{ color: 'var(--accent-primary)' }} />
              リンクを追加
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded p-1"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <X size={14} />
              </button>
            </Dialog.Close>
          </div>

          {/* フォーム */}
          <form onSubmit={handleSubmit} className="space-y-3 p-5">
            <FormField label="URL" required>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="input-field"
                required
              />
            </FormField>

            <FormField label="タイトル">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="リンクのタイトル"
                className="input-field"
              />
            </FormField>

            <FormField label="説明">
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="メモや説明（任意）"
                className="input-field"
              />
            </FormField>

            <FormField label="カテゴリ">
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
            </FormField>

            <div className="flex items-center gap-3">
              <label
                className="flex items-center gap-2 text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                <input
                  type="checkbox"
                  checked={isTemporary}
                  onChange={(e) => setIsTemporary(e.target.checked)}
                  className="accent-[var(--accent-primary)]"
                />
                一時リンク
              </label>
              {isTemporary && (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={expiryDays}
                    onChange={(e) => setExpiryDays(Number(e.target.value))}
                    min={1}
                    max={365}
                    className="input-field w-16 text-center"
                  />
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    日後に期限切れ
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-md px-4 py-2 text-sm transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  キャンセル
                </button>
              </Dialog.Close>
              <button
                type="submit"
                className="rounded-md px-4 py-2 text-sm font-medium transition-all duration-150 hover:brightness-110"
                style={{
                  background: 'var(--accent-gradient)',
                  color: 'var(--text-on-accent)',
                }}
              >
                追加する
              </button>
            </div>
          </form>

          <style>{`
            .input-field {
              width: 100%;
              padding: 6px 10px;
              border-radius: var(--radius-md);
              border: 1px solid var(--border-subtle);
              background: var(--bg-input);
              color: var(--text-primary);
              font-size: 0.875rem;
              outline: none;
              transition: border-color 150ms ease;
            }
            .input-field:focus {
              border-color: var(--border-focus);
            }
            .input-field::placeholder {
              color: var(--text-tertiary);
            }
          `}</style>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
        {label}
        {required && <span style={{ color: 'var(--accent-primary)' }}> *</span>}
      </span>
      {children}
    </label>
  );
}
