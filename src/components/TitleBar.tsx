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
        aria-label={theme === 'dark' ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
        className="titlebar-icon-btn"
        style={{ position: 'absolute', right: 12 }}
      >
        {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
      </button>
    </div>
  );
}
