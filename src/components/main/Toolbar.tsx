import { LayoutGrid, List, Plus, Search } from 'lucide-react';
import { cn } from '../../lib/utils';
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
      className="flex shrink-0 items-center gap-3 border-b px-4"
      style={{
        height: 'var(--toolbar-height)',
        borderColor: 'var(--border-subtle)',
        background: 'var(--bg-surface)',
      }}
    >
      {/* 検索 */}
      <div
        className="flex flex-1 items-center gap-2.5 rounded-lg px-3 py-2"
        style={{
          background: 'var(--bg-input)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <Search size={15} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
        <input
          type="text"
          placeholder="リンクを検索..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="flex-1 bg-transparent text-[13px] outline-none"
          style={{ color: 'var(--text-primary)' }}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="rounded px-1 text-[10px]"
            style={{ color: 'var(--text-tertiary)' }}
          >
            ✕
          </button>
        )}
      </div>

      {/* 表示切替 */}
      <div
        className="flex items-center gap-0.5 rounded-lg p-[3px]"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <ViewButton active={viewMode === 'list'} onClick={() => setViewMode('list')}>
          <List size={14} />
        </ViewButton>
        <ViewButton active={viewMode === 'card'} onClick={() => setViewMode('card')}>
          <LayoutGrid size={14} />
        </ViewButton>
      </div>

      {/* 追加ボタン */}
      <button
        type="button"
        onClick={onAddLink}
        className="flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-[7px] text-[13px] font-medium transition-all duration-150 hover:brightness-110"
        style={{
          background: 'var(--accent-gradient)',
          color: 'var(--text-on-accent)',
          boxShadow: '0 2px 8px rgba(226, 80, 80, 0.25)',
        }}
      >
        <Plus size={14} strokeWidth={2.5} />
        追加
      </button>
    </div>
  );
}

function ViewButton({
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
      className={cn('rounded-md p-1.5 transition-all duration-150')}
      style={{
        background: active ? 'var(--accent-subtle)' : 'transparent',
        color: active ? 'var(--accent-primary)' : 'var(--text-tertiary)',
        boxShadow: active ? 'var(--shadow-sm)' : 'none',
      }}
    >
      {children}
    </button>
  );
}
