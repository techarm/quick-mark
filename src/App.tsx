// openUrl を動的インポートで安全に呼び出す
async function safeOpenUrl(url: string) {
  try {
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    await openUrl(url);
  } catch {
    // ブラウザ環境ではwindow.openにフォールバック
    window.open(url, '_blank');
  }
}

import { useCallback, useEffect, useState } from 'react';
import { ImportDialog } from './components/ImportDialog';
import { AddLinkDialog } from './components/main/AddLinkDialog';
import { LinkDetail } from './components/main/LinkDetail';
import { LinkList } from './components/main/LinkList';
import { Sidebar } from './components/main/Sidebar';
import { Toolbar } from './components/main/Toolbar';
import { SearchPalette } from './components/search/SearchPalette';
import { TitleBar } from './components/TitleBar';
import * as commands from './lib/commands';
import type { Category, CreateLinkInput, Link } from './lib/types';
import { useUIStore } from './stores/ui.store';

function App() {
  const [links, setLinks] = useState<Link[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const {
    activeFilter,
    activeCategoryId,
    selectedLinkId,
    detailPanelOpen,
    searchPaletteOpen,
    setSearchPaletteOpen,
  } = useUIStore();

  // データの読み込み
  const loadLinks = useCallback(async () => {
    try {
      if (searchQuery.trim()) {
        const results = await commands.searchLinks(searchQuery);
        setLinks(results);
      } else if (activeFilter) {
        const filter = activeFilter === 'all' ? undefined : activeFilter;
        const results = await commands.getLinks(undefined, filter);
        setLinks(results);
      } else if (activeCategoryId) {
        const results = await commands.getLinks(activeCategoryId);
        setLinks(results);
      }
    } catch (err) {
      console.error('Failed to load links:', err);
    }
  }, [searchQuery, activeFilter, activeCategoryId]);

  const loadCategories = useCallback(async () => {
    try {
      const cats = await commands.getCategories();
      setCategories(cats);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }, []);

  useEffect(() => {
    loadLinks();
  }, [loadLinks]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // 起動時に期限切れリンクをクリーンアップ
  useEffect(() => {
    commands.cleanupExpiredLinks().catch(console.error);
  }, []);

  // OS-level グローバルショートカット（Cmd+Shift+Space）
  useEffect(() => {
    let registered = false;

    async function setupGlobalShortcut() {
      try {
        const { register, unregister } = await import('@tauri-apps/plugin-global-shortcut');
        const { getCurrentWindow } = await import('@tauri-apps/api/window');

        // 既存のショートカットがあれば解除
        try {
          await unregister('CommandOrControl+Shift+Space');
        } catch {
          // 未登録の場合は無視
        }

        await register('CommandOrControl+Shift+Space', async () => {
          const win = getCurrentWindow();
          const store = useUIStore.getState();

          try {
            const visible = await win.isVisible();

            if (visible && store.searchPaletteOpen) {
              // パレット表示中 → 閉じてウィンドウを隠す
              store.setSearchPaletteOpen(false);
              await win.hide();
            } else {
              // ウィンドウを表示してパレットを開く
              await win.show();
              await win.setFocus();
              store.setSearchPaletteOpen(true);
            }
          } catch (err) {
            console.error('Global shortcut handler error:', err);
          }
        });

        registered = true;
      } catch (err) {
        // ブラウザ環境では登録できないので無視
        console.warn('Global shortcut not available:', err);
      }
    }

    setupGlobalShortcut();

    return () => {
      if (registered) {
        import('@tauri-apps/plugin-global-shortcut')
          .then(({ unregister }) => unregister('CommandOrControl+Shift+Space'))
          .catch(() => {});
      }
    };
  }, []);

  // アプリ内キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const store = useUIStore.getState();

      // Cmd+K: 検索パレットトグル
      if (e.metaKey && e.key === 'k') {
        e.preventDefault();
        store.setSearchPaletteOpen(!store.searchPaletteOpen);
      }
      // Cmd+Shift+A: リンク追加
      if (e.metaKey && e.shiftKey && e.key === 'a') {
        e.preventDefault();
        setAddDialogOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // リンクを開く
  const handleOpenLink = useCallback(
    async (link: Link) => {
      try {
        const url = await commands.openLink(link.id);
        await safeOpenUrl(url);
        loadLinks();
      } catch (err) {
        console.error('Failed to open link:', err);
      }
    },
    [loadLinks],
  );

  // リンクを追加
  const handleAddLink = useCallback(
    async (input: CreateLinkInput) => {
      try {
        await commands.createLink(input);
        loadLinks();
        loadCategories();
      } catch (err) {
        console.error('Failed to create link:', err);
      }
    },
    [loadLinks, loadCategories],
  );

  // リンクカウントを計算
  const linkCounts = {
    all: links.length,
    recent: links.length,
    temporary: links.filter((l) => l.is_temporary).length,
    expired: links.filter(
      (l) => l.is_temporary && l.expires_at && new Date(l.expires_at) < new Date(),
    ).length,
  };

  const selectedLink = links.find((l) => l.id === selectedLinkId) ?? null;

  return (
    <div className="flex h-screen flex-col" style={{ background: 'var(--bg-base)' }}>
      <div className="flex flex-1 overflow-hidden">
        {/* サイドバー（タイトル含む） */}
        <aside
          className="flex shrink-0 flex-col"
          style={{
            width: 'var(--sidebar-width)',
            background: 'var(--bg-sidebar)',
            borderRight: '1px solid var(--border-medium)',
          }}
        >
          <TitleBar />
          <Sidebar categories={categories} linkCounts={linkCounts} />
        </aside>

        {/* メインエリア */}
        <main
          className="flex flex-1 flex-col overflow-hidden"
          style={{ background: 'var(--bg-base)' }}
        >
          <Toolbar
            onAddLink={() => setAddDialogOpen(true)}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
          <LinkList links={links} onOpen={handleOpenLink} />
        </main>

        {/* 詳細パネル */}
        {detailPanelOpen && <LinkDetail link={selectedLink} onOpen={handleOpenLink} />}
      </div>

      {/* 検索パレット（Spotlight風） */}
      <SearchPalette
        open={searchPaletteOpen}
        onOpenChange={setSearchPaletteOpen}
        onOpenLink={handleOpenLink}
      />

      {/* リンク追加ダイアログ */}
      <AddLinkDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        categories={categories}
        onSubmit={handleAddLink}
      />

      {/* インポートダイアログ */}
      <ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onComplete={() => {
          loadLinks();
          loadCategories();
        }}
      />
    </div>
  );
}

export default App;
