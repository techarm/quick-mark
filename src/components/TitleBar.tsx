import { Minus, Square, X } from 'lucide-react';

async function minimizeWindow() {
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  getCurrentWindow().minimize();
}

async function toggleMaximizeWindow() {
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  getCurrentWindow().toggleMaximize();
}

async function closeWindow() {
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  getCurrentWindow().close();
}

export function TitleBar() {
  return (
    <div
      data-tauri-drag-region
      className="flex items-center border-b"
      style={{
        height: 'var(--titlebar-height)',
        borderColor: 'var(--border-subtle)',
        background: 'var(--bg-surface)',
      }}
    >
      {/* macOS: トラフィックライト用スペース */}
      <div
        className="flex h-full shrink-0 items-center"
        style={{ width: 'var(--sidebar-width)' }}
        data-tauri-drag-region
      >
        <div className="flex items-center gap-2 pl-[78px]" data-tauri-drag-region>
          <div
            className="h-[18px] w-[18px] rounded"
            style={{
              background: 'var(--accent-gradient)',
              boxShadow: '0 2px 6px rgba(226, 80, 80, 0.3)',
            }}
          />
          <span
            className="text-[13px] font-semibold tracking-tight"
            style={{ color: 'var(--text-primary)' }}
            data-tauri-drag-region
          >
            QuickMark
          </span>
        </div>
      </div>

      {/* 中央ドラッグエリア */}
      <div className="flex-1" data-tauri-drag-region />

      {/* Windows用ウィンドウコントロール (macOSでは非表示) */}
      <div className="hidden items-center gap-0.5 pr-2 windows:flex">
        <button
          type="button"
          onClick={minimizeWindow}
          className="flex h-7 w-7 items-center justify-center rounded transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <Minus size={12} />
        </button>
        <button
          type="button"
          onClick={toggleMaximizeWindow}
          className="flex h-7 w-7 items-center justify-center rounded transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <Square size={10} />
        </button>
        <button
          type="button"
          onClick={closeWindow}
          className="flex h-7 w-7 items-center justify-center rounded transition-colors hover:text-white"
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 71, 87, 0.8)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}
