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
      className="flex h-[var(--titlebar-height)] items-center justify-between border-b px-3"
      style={{
        borderColor: 'var(--border-subtle)',
        background: 'var(--bg-surface)',
      }}
    >
      {/* macOS: トラフィックライト用スペース */}
      <div className="flex w-[70px] items-center" data-tauri-drag-region>
        <span
          className="text-xs font-medium tracking-wide"
          style={{ color: 'var(--text-tertiary)' }}
          data-tauri-drag-region
        >
          QuickMark
        </span>
      </div>

      {/* 中央: タイトル */}
      <div className="flex-1 text-center" data-tauri-drag-region>
        <span
          className="text-xs font-medium"
          style={{ color: 'var(--text-tertiary)' }}
          data-tauri-drag-region
        />
      </div>

      {/* Windows用ウィンドウコントロール (macOSでは非表示) */}
      <div className="hidden items-center gap-1 windows:flex">
        <button
          type="button"
          onClick={minimizeWindow}
          className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-white/10"
        >
          <Minus size={12} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <button
          type="button"
          onClick={toggleMaximizeWindow}
          className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-white/10"
        >
          <Square size={10} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <button
          type="button"
          onClick={closeWindow}
          className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-red-500/80"
        >
          <X size={12} style={{ color: 'var(--text-secondary)' }} />
        </button>
      </div>
    </div>
  );
}
