import { FolderOpen, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import type { Category } from '../../lib/types';

interface BulkActionBarProps {
  selectedCount: number;
  categories: Category[];
  onMove: (categoryId: string | null) => void;
  onDelete: () => void;
  onClear: () => void;
}

export function BulkActionBar({
  selectedCount,
  categories,
  onMove,
  onDelete,
  onClear,
}: BulkActionBarProps) {
  const [showMoveMenu, setShowMoveMenu] = useState(false);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        height: 'var(--toolbar-height)',
        padding: '0 20px',
        gap: 12,
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--accent-subtle)',
      }}
    >
      {/* 選択数 */}
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--accent-primary)',
        }}
      >
        {selectedCount}件選択中
      </span>

      <div style={{ flex: 1 }} />

      {/* 移動ボタン */}
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ height: 32, padding: '0 12px', gap: 6, fontSize: 12 }}
          onClick={() => setShowMoveMenu(!showMoveMenu)}
        >
          <FolderOpen size={14} />
          移動
        </button>

        {showMoveMenu && (
          <>
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 99 }}
              onClick={() => setShowMoveMenu(false)}
              onKeyDown={() => {}}
              role="presentation"
            />
            <div
              className="dropdown-menu-content"
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 4,
                zIndex: 100,
                maxHeight: 300,
                overflow: 'auto',
              }}
            >
              <button
                type="button"
                className="dropdown-menu-item"
                style={{ width: '100%' }}
                onClick={() => {
                  onMove(null);
                  setShowMoveMenu(false);
                }}
              >
                未分類に移動
              </button>
              <div className="dropdown-menu-separator" />
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className="dropdown-menu-item"
                  style={{ width: '100%' }}
                  onClick={() => {
                    onMove(cat.id);
                    setShowMoveMenu(false);
                  }}
                >
                  <FolderOpen size={14} style={{ color: cat.color, opacity: 0.7 }} />
                  {cat.name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 削除ボタン */}
      <button
        type="button"
        className="btn btn-ghost"
        style={{
          height: 32,
          padding: '0 12px',
          gap: 6,
          fontSize: 12,
          color: 'var(--accent-danger)',
        }}
        onClick={onDelete}
      >
        <Trash2 size={14} />
        削除
      </button>

      {/* 選択解除 */}
      <button
        type="button"
        className="btn btn-ghost"
        style={{ height: 32, padding: '0 8px' }}
        onClick={onClear}
        title="選択解除"
      >
        <X size={15} />
      </button>
    </div>
  );
}
