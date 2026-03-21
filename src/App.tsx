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
import { CategoryDialog } from './components/main/CategoryDialog';
import { EditLinkDialog } from './components/main/EditLinkDialog';
import { LinkDetail } from './components/main/LinkDetail';
import { LinkList } from './components/main/LinkList';
import { Sidebar } from './components/main/Sidebar';
import { Toolbar } from './components/main/Toolbar';
import { TitleBar } from './components/TitleBar';
import * as commands from './lib/commands';
import type {
  Category,
  CreateCategoryInput,
  CreateLinkInput,
  Link,
  UpdateLinkInput,
} from './lib/types';
import { useUIStore } from './stores/ui.store';

// 独立検索ウィンドウのトグル
async function toggleSearchWindow() {
  try {
    const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');

    const existing = await WebviewWindow.getByLabel('search-palette');
    if (existing) {
      const visible = await existing.isVisible();
      if (visible) {
        await existing.hide();
      } else {
        await existing.show();
        await existing.setFocus();
      }
    } else {
      // 新しい検索ウィンドウを作成
      new WebviewWindow('search-palette', {
        url: '/search',
        title: 'QuickMark Search',
        width: 640,
        height: 460,
        center: true,
        decorations: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        focus: true,
      });
    }
  } catch (err) {
    console.error('Failed to toggle search window:', err);
  }
}

function App() {
  const [links, setLinks] = useState<Link[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // リンク編集
  const [editingLink, setEditingLink] = useState<Link | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // カテゴリ CRUD
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const { activeFilter, activeCategoryId, selectedLinkId, detailPanelOpen } = useUIStore();

  // データの読み込み
  const loadLinks = useCallback(async () => {
    try {
      if (searchQuery.trim()) {
        const results = await commands.searchLinks(searchQuery);
        setLinks(results);
      } else if (activeCategoryId) {
        const results = await commands.getLinks(activeCategoryId);
        setLinks(results);
      } else {
        const filter = activeFilter === 'all' ? undefined : activeFilter;
        const results = await commands.getLinks(undefined, filter);
        setLinks(results);
      }
    } catch (err) {
      console.error('Failed to load links:', err);
      setLinks([]);
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

  // 起動時に期限切れリンクをクリーンアップ + favicon更新
  useEffect(() => {
    commands.cleanupExpiredLinks().catch(console.error);
    commands
      .refreshFavicons()
      .then((count) => {
        if (count > 0) loadLinks();
      })
      .catch(console.error);
  }, [loadLinks]);

  // OS-level グローバルショートカット（Cmd+Shift+Space）
  // OS-level グローバルショートカット（Cmd+Shift+Space）→ 独立検索ウィンドウ
  useEffect(() => {
    let registered = false;

    async function setupGlobalShortcut() {
      try {
        const { register, unregister } = await import('@tauri-apps/plugin-global-shortcut');

        try {
          await unregister('CommandOrControl+Shift+Space');
        } catch {
          // 未登録の場合は無視
        }

        await register('CommandOrControl+Shift+Space', async (event) => {
          if (event.state === 'Released') return;
          await toggleSearchWindow();
        });

        registered = true;
      } catch (err) {
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
      // Cmd+K: 独立検索ウィンドウを開く
      if (e.metaKey && e.key === 'k') {
        e.preventDefault();
        toggleSearchWindow();
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

  // リンクを編集
  const handleEditLink = useCallback((link: Link) => {
    setEditingLink(link);
    setEditDialogOpen(true);
  }, []);

  // リンクを更新
  const handleUpdateLink = useCallback(
    async (input: UpdateLinkInput) => {
      try {
        await commands.updateLink(input);
        loadLinks();
        loadCategories();
      } catch (err) {
        console.error('Failed to update link:', err);
      }
    },
    [loadLinks, loadCategories],
  );

  // リンクを削除
  const handleDeleteLink = useCallback(
    async (link: Link) => {
      try {
        await commands.deleteLink(link.id);
        const store = useUIStore.getState();
        if (store.selectedLinkId === link.id) {
          store.setSelectedLinkId(null);
          store.setDetailPanelOpen(false);
        }
        loadLinks();
        loadCategories();
      } catch (err) {
        console.error('Failed to delete link:', err);
      }
    },
    [loadLinks, loadCategories],
  );

  // ピン留めトグル
  const handleTogglePin = useCallback(
    async (link: Link) => {
      try {
        await commands.updateLink({
          id: link.id,
          is_pinned: !link.is_pinned,
        });
        loadLinks();
      } catch (err) {
        console.error('Failed to toggle pin:', err);
      }
    },
    [loadLinks],
  );

  // カテゴリ追加
  const handleAddCategory = useCallback(() => {
    setEditingCategory(null);
    setCategoryDialogOpen(true);
  }, []);

  // カテゴリ編集
  const handleEditCategory = useCallback((category: Category) => {
    setEditingCategory(category);
    setCategoryDialogOpen(true);
  }, []);

  // カテゴリ削除
  const handleDeleteCategory = useCallback(
    async (category: Category) => {
      try {
        await commands.deleteCategory(category.id);
        const store = useUIStore.getState();
        if (store.activeCategoryId === category.id) {
          store.setActiveFilter('all');
        }
        loadCategories();
        loadLinks();
      } catch (err) {
        console.error('Failed to delete category:', err);
      }
    },
    [loadCategories, loadLinks],
  );

  // カテゴリ作成/更新
  const handleCategorySubmit = useCallback(
    async (input: CreateCategoryInput & { id?: string }) => {
      try {
        if (input.id) {
          await commands.updateCategory({
            id: input.id,
            name: input.name,
            parent_id: input.parent_id || null,
            set_parent_id: true,
            icon: input.icon,
            color: input.color,
            search_alias: input.search_alias,
          });
        } else {
          await commands.createCategory(input);
        }
        loadCategories();
      } catch (err) {
        console.error('Failed to save category:', err);
      }
    },
    [loadCategories],
  );

  // リンクカウントを計算
  const linkCounts = {
    all: links.length,
    recent: links.length,
    temporary: links.filter((l) => l.is_temporary).length,
    expired: links.filter(
      (l) => l.is_temporary && l.expires_at && new Date(l.expires_at) < new Date(),
    ).length,
    pinned: links.filter((l) => l.is_pinned).length,
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
          <Sidebar
            categories={categories}
            linkCounts={linkCounts}
            onAddCategory={handleAddCategory}
            onEditCategory={handleEditCategory}
            onDeleteCategory={handleDeleteCategory}
          />
        </aside>

        {/* メインエリア */}
        <main
          className="flex flex-1 flex-col overflow-hidden"
          style={{ background: 'var(--bg-base)' }}
        >
          <Toolbar
            onAddLink={() => setAddDialogOpen(true)}
            onImport={() => setImportDialogOpen(true)}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
          <LinkList
            links={links}
            onOpen={handleOpenLink}
            onEdit={handleEditLink}
            onDelete={handleDeleteLink}
            onTogglePin={handleTogglePin}
          />
        </main>

        {/* 詳細パネル */}
        {detailPanelOpen && (
          <LinkDetail
            link={selectedLink}
            onOpen={handleOpenLink}
            onEdit={handleEditLink}
            onDelete={handleDeleteLink}
            onTogglePin={handleTogglePin}
          />
        )}
      </div>

      {/* リンク追加ダイアログ */}
      <AddLinkDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        categories={categories}
        onSubmit={handleAddLink}
      />

      {/* リンク編集ダイアログ */}
      <EditLinkDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        link={editingLink}
        categories={categories}
        onSubmit={handleUpdateLink}
      />

      {/* カテゴリダイアログ */}
      <CategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        category={editingCategory}
        categories={categories}
        onSubmit={handleCategorySubmit}
      />

      {/* インポートダイアログ */}
      <ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onComplete={() => {
          // インポート後にfaviconを一括更新してからリンクを再読み込み
          commands
            .refreshFavicons()
            .then(() => loadLinks())
            .catch(() => loadLinks());
          loadCategories();
        }}
      />
    </div>
  );
}

export default App;
