export function TitleBar() {
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
    </div>
  );
}
