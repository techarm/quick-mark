import { Sun, Moon } from 'lucide-react';
import { useUIStore } from '../stores/ui.store';

export function TitleBar() {
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);

  return (
    <div
      data-tauri-drag-region
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 'var(--titlebar-height)',
        flexShrink: 0,
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <span
        data-tauri-drag-region
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--text-secondary)',
          letterSpacing: '0.01em',
          userSelect: 'none',
        }}
      >
        QuickMark
      </span>
      <button
        onClick={toggleTheme}
        title={theme === 'dark' ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
        style={{
          position: 'absolute',
          right: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 26,
          height: 26,
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          background: 'transparent',
          color: 'var(--text-tertiary)',
          cursor: 'pointer',
          transition: 'all 150ms ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--bg-hover)';
          e.currentTarget.style.color = 'var(--text-secondary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--text-tertiary)';
        }}
      >
        {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
      </button>
    </div>
  );
}
