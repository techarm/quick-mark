import * as Dialog from '@radix-ui/react-dialog';
import { FolderOpen, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Category, CreateCategoryInput } from '../../lib/types';

const PRESET_COLORS = [
  '#e25050',
  '#e87040',
  '#f59e0b',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#78716c',
  '#94a3b8',
];

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
  categories: Category[];
  onSubmit: (input: CreateCategoryInput & { id?: string }) => void;
}

export function CategoryDialog({
  open,
  onOpenChange,
  category,
  categories,
  onSubmit,
}: CategoryDialogProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [parentId, setParentId] = useState<string>('');
  const [searchAlias, setSearchAlias] = useState('');

  const isEdit = !!category;

  useEffect(() => {
    if (category) {
      setName(category.name);
      setColor(category.color || PRESET_COLORS[0]);
      setParentId(category.parent_id || '');
      setSearchAlias(category.search_alias || '');
    } else {
      setName('');
      setColor(PRESET_COLORS[0]);
      setParentId('');
      setSearchAlias('');
    }
  }, [category]);

  // 親カテゴリ候補（自分自身と自分の子孫は除外）
  const parentOptions = categories.filter((c) => {
    if (!category) return !c.parent_id; // 新規作成時はルートカテゴリのみ
    // 編集時は自分自身を除外
    if (c.id === category.id) return false;
    return true;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSubmit({
      ...(category ? { id: category.id } : {}),
      name: name.trim(),
      parent_id: parentId || undefined,
      color,
      search_alias: searchAlias.trim() || undefined,
    });

    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content glass-overlay" style={{ width: 420, padding: 0 }}>
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
                <FolderOpen size={14} style={{ color: 'var(--accent-primary)' }} />
              </div>
              {isEdit ? 'カテゴリを編集' : 'カテゴリを追加'}
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
                <label htmlFor="category-name" className="form-label">
                  名前<span className="required">*</span>
                </label>
                <input
                  id="category-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="カテゴリ名"
                  className="input-field"
                  required
                />
              </div>

              <div className="form-field">
                <label className="form-label" id="category-color-label">カラー</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 4 }} role="group" aria-labelledby="category-color-label">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`color-swatch${color === c ? ' active' : ''}`}
                      style={{ background: c }}
                      onClick={() => setColor(c)}
                      title={c}
                      aria-label={`カラー ${c}`}
                      aria-pressed={color === c}
                    />
                  ))}
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="category-alias" className="form-label">検索キーワード</label>
                <input
                  id="category-alias"
                  type="text"
                  value={searchAlias}
                  onChange={(e) => setSearchAlias(e.target.value)}
                  placeholder="英語名やキーワード（例: cloud, dev tools）"
                  className="input-field"
                />
              </div>

              <div className="form-field">
                <label htmlFor="category-parent" className="form-label">親カテゴリ</label>
                <select
                  id="category-parent"
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="input-field"
                >
                  <option value="">なし（ルート）</option>
                  {parentOptions.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
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
                {isEdit ? '保存する' : '追加する'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
