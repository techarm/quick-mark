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
      className="flex items-center gap-2 border-b px-4 py-2"
      style={{ borderColor: 'var(--border-subtle)' }}
    >
      {/* 検索 */}
      <div
        className="flex flex-1 items-center gap-2 rounded-md px-3 py-1.5"
        style={{ background: 'var(--bg-input)' }}
      >
        <Search size={14} style={{ color: 'var(--text-tertiary)' }} />
        <input
          type="text"
          placeholder="リンクを検索..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="flex-1 bg-transparent text-sm outline-none"
          style={{ color: 'var(--text-primary)' }}
        />
      </div>

      {/* 表示切替 */}
      <div className="flex items-center rounded-md p-0.5" style={{ background: 'var(--bg-input)' }}>
        <button
          type="button"
          onClick={() => setViewMode('list')}
          className={cn('rounded p-1.5 transition-colors')}
          style={{
            background: viewMode === 'list' ? 'var(--accent-subtle)' : 'transparent',
            color: viewMode === 'list' ? 'var(--accent-primary)' : 'var(--text-tertiary)',
          }}
        >
          <List size={14} />
        </button>
        <button
          type="button"
          onClick={() => setViewMode('card')}
          className={cn('rounded p-1.5 transition-colors')}
          style={{
            background: viewMode === 'card' ? 'var(--accent-subtle)' : 'transparent',
            color: viewMode === 'card' ? 'var(--accent-primary)' : 'var(--text-tertiary)',
          }}
        >
          <LayoutGrid size={14} />
        </button>
      </div>

      {/* 追加ボタン */}
      <button
        type="button"
        onClick={onAddLink}
        className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-150 hover:brightness-110"
        style={{
          background: 'var(--accent-gradient)',
          color: 'var(--text-on-accent)',
        }}
      >
        <Plus size={14} />
        追加
      </button>
    </div>
  );
}
