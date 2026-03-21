import { LayoutGrid, List, Plus, Search, X } from 'lucide-react';
import { useUIStore } from '../../stores/ui.store';

interface ToolbarProps {
  onAddLink: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function Toolbar({ onAddLink, searchQuery, onSearchChange }: ToolbarProps) {
  const { viewMode, setViewMode } = useUIStore();

  return (
    <div
      data-tauri-drag-region
      className="flex shrink-0 items-center"
      style={{
        height: 'var(--toolbar-height)',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-surface)',
        padding: '0 20px',
        gap: '12px',
      }}
    >
      {/* 検索バー */}
      <div
        className="flex flex-1 items-center gap-2.5 rounded-lg px-3"
        style={{
          height: '34px',
          background: 'var(--bg-input)',
          border: '1px solid var(--border-medium)',
        }}
      >
        <Search size={15} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
        <input
          type="text"
          placeholder="リンクを検索...  ⌘K"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="flex-1 bg-transparent text-[13px] outline-none"
          style={{ color: 'var(--text-primary)' }}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="flex h-4 w-4 items-center justify-center rounded-full transition-colors"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-tertiary)' }}
          >
            <X size={10} />
          </button>
        )}
      </div>

      {/* 表示切替 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          borderRadius: 'var(--radius-md)',
          padding: 3,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <ViewToggle active={viewMode === 'list'} onClick={() => setViewMode('list')}>
          <List size={15} />
        </ViewToggle>
        <ViewToggle active={viewMode === 'card'} onClick={() => setViewMode('card')}>
          <LayoutGrid size={15} />
        </ViewToggle>
      </div>

      {/* 追加ボタン */}
      <button
        type="button"
        onClick={onAddLink}
        className="btn btn-primary"
        style={{
          height: 36,
          padding: '0 18px',
          gap: 6,
          flexShrink: 0,
        }}
      >
        <Plus size={15} strokeWidth={2.5} />
        <span>追加</span>
      </button>
    </div>
  );
}

function ViewToggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center rounded-md transition-all duration-150"
      style={{
        width: '28px',
        height: '28px',
        background: active ? 'var(--bg-active)' : 'transparent',
        color: active ? 'var(--accent-primary)' : 'var(--text-tertiary)',
      }}
    >
      {children}
    </button>
  );
}
