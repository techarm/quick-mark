import { TitleBar } from './components/TitleBar';

function App() {
  return (
    <div className="flex h-screen flex-col" style={{ background: 'var(--bg-base)' }}>
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        {/* サイドバー */}
        <aside
          className="glass-surface flex w-[var(--sidebar-width)] flex-col border-r"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex-1 p-3">
            <div className="mb-4">
              <h2
                className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: 'var(--text-tertiary)' }}
              >
                スマートフォルダ
              </h2>
              <nav className="space-y-0.5">
                <SidebarItem label="すべてのリンク" count={0} active />
                <SidebarItem label="最近追加" count={0} />
                <SidebarItem label="一時リンク" count={0} />
                <SidebarItem label="期限切れ" count={0} />
              </nav>
            </div>
            <div>
              <h2
                className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: 'var(--text-tertiary)' }}
              >
                カテゴリ
              </h2>
              <p className="px-2 text-xs italic" style={{ color: 'var(--text-tertiary)' }}>
                カテゴリがありません
              </p>
            </div>
          </div>
        </aside>

        {/* メインコンテンツ */}
        <main className="flex flex-1 flex-col overflow-hidden">
          <div
            className="flex items-center gap-2 border-b px-4 py-2"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div
              className="flex flex-1 items-center gap-2 rounded-md px-3 py-1.5 text-sm"
              style={{
                background: 'var(--bg-input)',
                color: 'var(--text-tertiary)',
              }}
            >
              リンクを検索...
            </div>
          </div>
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>
                リンクがありません
              </p>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                リンクを追加して整理を始めましょう
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarItem({
  label,
  count,
  active = false,
}: {
  label: string;
  count: number;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors"
      style={{
        background: active ? 'var(--accent-subtle)' : 'transparent',
        color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
      }}
    >
      <span>{label}</span>
      <span className="text-xs tabular-nums" style={{ color: 'var(--text-tertiary)' }}>
        {count}
      </span>
    </button>
  );
}

export default App;
