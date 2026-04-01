import { Minus, Settings, Square, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface TitleBarProps {
  onOpenSettings?: () => void;
  workspaceName?: string;
}

export function TitleBar({ onOpenSettings, workspaceName }: TitleBarProps) {
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
    const win = getCurrentWindow();
    if (await win.isMaximized()) {
      await win.unmaximize();
    } else {
      await win.maximize();
    }
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
        {workspaceName ? `QuickMark — ${workspaceName}` : 'QuickMark'}
      </span>

      {/* 設定ボタン（Windowsではウィンドウ操作ボタンの左に配置） */}
      <button
        type="button"
        onClick={onOpenSettings}
        title="設定"
        aria-label="設定"
        className="titlebar-icon-btn"
        style={{ position: 'absolute', right: isWindows ? 108 : 12 }}
      >
        <Settings size={14} />
      </button>

      {/* Windows: ウィンドウ操作ボタン */}
      {isWindows && (
        <div style={{ position: 'absolute', right: 0, top: 0, display: 'flex', height: '100%' }}>
          <button
            type="button"
            onClick={handleMinimize}
            className="win-titlebar-btn"
            aria-label="最小化"
          >
            <Minus size={14} />
          </button>
          <button
            type="button"
            onClick={handleMaximize}
            className="win-titlebar-btn"
            aria-label="最大化"
          >
            <Square size={12} />
          </button>
          <button
            type="button"
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
