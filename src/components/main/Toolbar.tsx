import { Download, LayoutGrid, List, Plus, Search, Upload, X } from 'lucide-react';
import { modKey } from '../../lib/utils';
import { useUIStore } from '../../stores/ui.store';

interface ToolbarProps {
  onAddLink: () => void;
  onImport?: () => void;
  onExport?: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function Toolbar({
  onAddLink,
  onImport,
  onExport,
  searchQuery,
  onSearchChange,
}: ToolbarProps) {
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
        style={{
          display: 'flex',
          flex: 1,
          alignItems: 'center',
          gap: 10,
          height: 36,
          padding: '0 14px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-input)',
          border: '1px solid var(--border-medium)',
        }}
      >
        <Search size={15} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
        <input
          type="text"
          placeholder={`リンクを検索...  ${modKey}K`}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: 13,
            color: 'var(--text-primary)',
            fontFamily: 'inherit',
          }}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 18,
              height: 18,
              borderRadius: '50%',
              border: 'none',
              background: 'var(--bg-elevated)',
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
            }}
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
        <ViewToggle
          active={viewMode === 'list'}
          onClick={() => setViewMode('list')}
          label="リスト表示"
        >
          <List size={15} />
        </ViewToggle>
        <ViewToggle
          active={viewMode === 'card'}
          onClick={() => setViewMode('card')}
          label="カード表示"
        >
          <LayoutGrid size={15} />
        </ViewToggle>
      </div>

      {/* インポートボタン */}
      {onImport && (
        <button
          type="button"
          onClick={onImport}
          className="btn btn-ghost"
          style={{
            height: 36,
            padding: '0 10px',
            flexShrink: 0,
          }}
          title="インポート"
          aria-label="インポート"
        >
          <Upload size={15} />
        </button>
      )}

      {/* エクスポートボタン */}
      {onExport && (
        <button
          type="button"
          onClick={onExport}
          className="btn btn-ghost"
          style={{
            height: 36,
            padding: '0 10px',
            flexShrink: 0,
          }}
          title="エクスポート（バックアップ）"
          aria-label="エクスポート"
        >
          <Download size={15} />
        </button>
      )}

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
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
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
