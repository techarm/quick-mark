import { useEffect, useState } from 'react';
import { Sun, Moon, Minus, Square, X } from 'lucide-react';
import { useUIStore } from '../stores/ui.store';

export function TitleBar() {
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const [isWindows, setIsWindows] = useState(false);

  useEffect(() => {
    setIsWindows(navigator.userAgent.includes('Windows'));
  }, []);

  const handleMinimize = async () => {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().minimize();
  };

  const handleMaximize = async () => {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().toggleMaximize();
  };

  const handleClose = async () => {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().close();
  };

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

      {/* テーマ切替ボタン（Windowsではウィンドウ操作ボタンの左に配置） */}
      <button
        onClick={toggleTheme}
        title={theme === 'dark' ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
        aria-label={theme === 'dark' ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
        className="titlebar-icon-btn"
        style={{ position: 'absolute', right: isWindows ? 108 : 12 }}
      >
        {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
      </button>

      {/* Windows: ウィンドウ操作ボタン */}
      {isWindows && (
        <div style={{ position: 'absolute', right: 0, top: 0, display: 'flex', height: '100%' }}>
          <button
            onClick={handleMinimize}
            className="win-titlebar-btn"
            aria-label="最小化"
          >
            <Minus size={14} />
          </button>
          <button
            onClick={handleMaximize}
            className="win-titlebar-btn"
            aria-label="最大化"
          >
            <Square size={12} />
          </button>
          <button
            onClick={handleClose}
            className="win-titlebar-btn win-titlebar-btn-close"
            aria-label="閉じる"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
