import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { FolderOpen, Trash2, X } from 'lucide-react';
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
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ height: 32, padding: '0 12px', gap: 6, fontSize: 12 }}
          >
            <FolderOpen size={14} />
            移動
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="dropdown-menu-content"
            sideOffset={4}
            align="end"
            style={{ maxHeight: 300, overflow: 'auto' }}
          >
            <DropdownMenu.Item
              className="dropdown-menu-item"
              onSelect={() => onMove(null)}
            >
              未分類に移動
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="dropdown-menu-separator" />
            {categories.map((cat) => (
              <DropdownMenu.Item
                key={cat.id}
                className="dropdown-menu-item"
                onSelect={() => onMove(cat.id)}
              >
                <FolderOpen size={14} style={{ color: cat.color, opacity: 0.7 }} />
                {cat.name}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

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
        aria-label="選択解除"
      >
        <X size={15} />
      </button>
    </div>
  );
}
