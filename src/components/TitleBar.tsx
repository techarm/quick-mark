export function TitleBar() {
  return (
    <div
      data-tauri-drag-region
      className="flex shrink-0 items-center"
      style={{
        height: 'var(--titlebar-height)',
        paddingLeft: '78px',
        paddingRight: '12px',
      }}
    >
      <div className="flex items-center gap-2.5" data-tauri-drag-region>
        {/* ロゴ */}
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{
            background: 'var(--accent-gradient)',
            boxShadow: 'var(--shadow-glow-accent)',
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            role="img"
            aria-label="QuickMark logo"
          >
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        </div>
        <span
          className="text-[15px] font-bold tracking-tight"
          style={{ color: 'var(--text-primary)' }}
          data-tauri-drag-region
        >
          QuickMark
        </span>
      </div>
    </div>
  );
}
