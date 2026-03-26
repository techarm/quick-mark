import { useCallback, useEffect, useState } from 'react';
import { Toaster, toast } from 'sonner';
import { ConfirmDialog } from './components/ConfirmDialog';
import { ImportDialog } from './components/ImportDialog';
import { AddLinkDialog } from './components/main/AddLinkDialog';
import { BulkActionBar } from './components/main/BulkActionBar';
import { CategoryDialog } from './components/main/CategoryDialog';
import { CredentialDialog } from './components/main/CredentialDialog';
import { CredentialList } from './components/main/CredentialList';
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
  CreateCredentialInput,
  CreateLinkInput,
  Credential,
  Link,
  UpdateLinkInput,
} from './lib/types';
import { safeOpenUrl } from './lib/utils';
import { useUIStore } from './stores/ui.store';

// 独立検索ウィンドウのトグル（tauri.conf.jsonで事前定義済み）
async function toggleSearchWindow() {
  try {
    const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
    const win = await WebviewWindow.getByLabel('search-palette');
    if (!win) return;

    const visible = await win.isVisible();
    if (visible) {
      await win.hide();
    } else {
      await win.show();
      await win.setFocus();
    }
  } catch (err) {
    console.error('Failed to toggle search window:', err);
  }
}

function App() {
  const [links, setLinks] = useState<Link[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // リンク編集
  const [editingLink, setEditingLink] = useState<Link | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // カテゴリ CRUD
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // 認証情報 CRUD
  const [credentialDialogOpen, setCredentialDialogOpen] = useState(false);
  const [editingCredential, setEditingCredential] = useState<Credential | null>(null);

  // 確認ダイアログ
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', onConfirm: () => {} });

  const {
    theme,
    activeFilter,
    activeCategoryId,
    selectedLinkId,
    detailPanelOpen,
    selectedLinkIds,
    clearSelection,
  } = useUIStore();

  const isCredentialsView = activeFilter === 'credentials' && !activeCategoryId;

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
        const filter =
          activeFilter === 'all' || activeFilter === 'credentials'
            ? undefined
            : (activeFilter ?? undefined);
        const results = await commands.getLinks(undefined, filter);
        setLinks(results);
      }
    } catch (err) {
      console.error('Failed to load links:', err);
      toast.error('リンクの読み込みに失敗しました');
      setLinks([]);
    }
  }, [searchQuery, activeFilter, activeCategoryId]);

  const loadCategories = useCallback(async () => {
    try {
      const cats = await commands.getCategories();
      setCategories(cats);
    } catch (err) {
      console.error('Failed to load categories:', err);
      toast.error('カテゴリの読み込みに失敗しました');
    }
  }, []);

  const loadCredentials = useCallback(async () => {
    try {
      const creds = await commands.getCredentials();
      setCredentials(creds);
    } catch (err) {
      console.error('Failed to load credentials:', err);
      toast.error('認証情報の読み込みに失敗しました');
    }
  }, []);

  useEffect(() => {
    loadLinks();
  }, [loadLinks]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadCredentials();
  }, [loadCredentials]);

  // Tauriイベントリスナー（認証情報コピー通知）
  useEffect(() => {
    let unlisten1: (() => void) | undefined;
    let unlisten2: (() => void) | undefined;

    async function setupListeners() {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        unlisten1 = await listen('credential:password-copied', () => {
          toast.success('パスワードをコピーしました', {
            description: '30秒後にクリップボードをクリアします',
          });
        });
        unlisten2 = await listen('credential:clipboard-cleared', () => {
          toast.info('クリップボードをクリアしました');
        });
      } catch {
        // ブラウザ環境では無視
      }
    }

    setupListeners();

    return () => {
      unlisten1?.();
      unlisten2?.();
    };
  }, []);

  // バックグラウンドでfaviconを取得（同一ドメインはキャッシュ活用）
  const refreshFaviconsBackground = useCallback(async () => {
    try {
      const missingLinks = await commands.getLinksWithoutFavicon();
      if (missingLinks.length === 0) return;

      const BATCH_SIZE = 5;
      let processed = 0;
      const domainCache = new Map<string, string>();

      for (const [id, url] of missingLinks) {
        try {
          let faviconUrl: string;
          const domain = new URL(url).hostname;

          // 同一ドメインのキャッシュがあればHTTPリクエスト不要
          if (domainCache.has(domain)) {
            faviconUrl = domainCache.get(domain)!;
          } else {
            const info = await commands.fetchUrlInfo(url);
            faviconUrl =
              info.favicon_url || `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
            domainCache.set(domain, faviconUrl);
          }

          await commands.refreshSingleFavicon(id, faviconUrl);
        } catch {
          // 個別失敗は無視して次へ
        }
        processed++;
        if (processed % BATCH_SIZE === 0) {
          loadLinks();
          await new Promise((r) => setTimeout(r, 100));
        }
      }
      if (processed % BATCH_SIZE !== 0) {
        loadLinks();
      }
    } catch (err) {
      console.error('Background favicon refresh failed:', err);
    }
  }, [loadLinks]);

  // 起動時に期限切れリンクをクリーンアップ + favicon更新
  useEffect(() => {
    commands.cleanupExpiredLinks().catch(console.error);
    refreshFaviconsBackground();
  }, [refreshFaviconsBackground]);

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
      // Cmd+A: リンク全選択（入力フォーカス中は除外）
      if (e.metaKey && e.key === 'a' && !e.shiftKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
          e.preventDefault();
          useUIStore.getState().selectAllLinks(links.map((l) => l.id));
        }
      }
      // Escape: 選択解除
      if (e.key === 'Escape') {
        const { selectedLinkIds } = useUIStore.getState();
        if (selectedLinkIds.size > 0) {
          e.preventDefault();
          useUIStore.getState().clearSelection();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [links]);

  // リンクを開く
  const handleOpenLink = useCallback(
    async (link: Link) => {
      try {
        const url = await commands.openLink(link.id);
        await safeOpenUrl(url);
        loadLinks();
      } catch (err) {
        console.error('Failed to open link:', err);
        toast.error('リンクを開けませんでした');
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
        toast.success('リンクを追加しました');
      } catch (err) {
        console.error('Failed to create link:', err);
        toast.error('リンクの追加に失敗しました');
      }
    },
    [loadLinks, loadCategories],
  );

  // データエクスポート
  const handleExport = useCallback(async () => {
    try {
      const jsonStr = await commands.exportData();
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { writeTextFile } = await import('@tauri-apps/plugin-fs');

      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const defaultName = `quickmark-backup-${dateStr}.json`;

      const filePath = await save({
        title: 'エクスポート先を選択',
        defaultPath: defaultName,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });

      if (filePath) {
        await writeTextFile(filePath, jsonStr);
        toast.success('エクスポートが完了しました');
      }
    } catch (err) {
      console.error('Failed to export:', err);
      toast.error('エクスポートに失敗しました');
    }
  }, []);

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
        toast.success('リンクを更新しました');
      } catch (err) {
        console.error('Failed to update link:', err);
        toast.error('リンクの更新に失敗しました');
      }
    },
    [loadLinks, loadCategories],
  );

  // リンクを削除（確認付き）
  const handleDeleteLink = useCallback(
    async (link: Link) => {
      setConfirmDialog({
        open: true,
        title: 'リンクの削除',
        message: `「${link.title || link.url}」を削除しますか？`,
        onConfirm: async () => {
          try {
            await commands.deleteLink(link.id);
            const store = useUIStore.getState();
            if (store.selectedLinkId === link.id) {
              store.setSelectedLinkId(null);
              store.setDetailPanelOpen(false);
            }
            loadLinks();
            loadCategories();
            toast.success('リンクを削除しました');
          } catch (err) {
            console.error('Failed to delete link:', err);
            toast.error('リンクの削除に失敗しました');
          }
        },
      });
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
        toast.error('ピン留めの変更に失敗しました');
      }
    },
    [loadLinks],
  );

  // 一括移動
  const handleBulkMove = useCallback(
    async (categoryId: string | null) => {
      const ids = Array.from(useUIStore.getState().selectedLinkIds);
      if (ids.length === 0) return;
      try {
        await commands.moveLinksToCategory(ids, categoryId);
        useUIStore.getState().clearSelection();
        loadLinks();
        loadCategories();
        toast.success(`${ids.length}件のリンクを移動しました`);
      } catch (err) {
        console.error('Failed to move links:', err);
        toast.error('リンクの移動に失敗しました');
      }
    },
    [loadLinks, loadCategories],
  );

  // 一括削除（確認付き）
  const handleBulkDelete = useCallback(() => {
    const ids = Array.from(useUIStore.getState().selectedLinkIds);
    if (ids.length === 0) return;
    setConfirmDialog({
      open: true,
      title: 'リンクの一括削除',
      message: `${ids.length}件のリンクを削除しますか？`,
      onConfirm: async () => {
        try {
          await commands.bulkDeleteLinks(ids);
          useUIStore.getState().clearSelection();
          loadLinks();
          loadCategories();
          toast.success(`${ids.length}件のリンクを削除しました`);
        } catch (err) {
          console.error('Failed to delete links:', err);
          toast.error('リンクの一括削除に失敗しました');
        }
      },
    });
  }, [loadLinks, loadCategories]);

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

  // カテゴリ削除（確認付き）
  const handleDeleteCategory = useCallback(
    (category: Category) => {
      setConfirmDialog({
        open: true,
        title: 'カテゴリの削除',
        message: `カテゴリ「${category.name}」を削除しますか？\nカテゴリ内のリンクは未分類に移動されます。`,
        onConfirm: async () => {
          try {
            await commands.deleteCategory(category.id);
            const store = useUIStore.getState();
            if (store.activeCategoryId === category.id) {
              store.setActiveFilter('all');
            }
            loadCategories();
            loadLinks();
            toast.success('カテゴリを削除しました');
          } catch (err) {
            console.error('Failed to delete category:', err);
            toast.error('カテゴリの削除に失敗しました');
          }
        },
      });
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
          toast.success('カテゴリを更新しました');
        } else {
          await commands.createCategory(input);
          toast.success('カテゴリを作成しました');
        }
        loadCategories();
      } catch (err) {
        console.error('Failed to save category:', err);
        toast.error('カテゴリの保存に失敗しました');
      }
    },
    [loadCategories],
  );

  // === 認証情報ハンドラ ===

  const handleAddCredential = useCallback(() => {
    setEditingCredential(null);
    setCredentialDialogOpen(true);
  }, []);

  const handleEditCredential = useCallback((credential: Credential) => {
    setEditingCredential(credential);
    setCredentialDialogOpen(true);
  }, []);

  const handleDeleteCredential = useCallback(
    (credential: Credential) => {
      setConfirmDialog({
        open: true,
        title: '認証情報の削除',
        message: `「${credential.name}」の認証情報を削除しますか？`,
        onConfirm: async () => {
          try {
            await commands.deleteCredential(credential.id);
            loadCredentials();
            toast.success('認証情報を削除しました');
          } catch (err) {
            console.error('Failed to delete credential:', err);
            toast.error('認証情報の削除に失敗しました');
          }
        },
      });
    },
    [loadCredentials],
  );

  const handleCredentialSubmit = useCallback(
    async (input: CreateCredentialInput & { id?: string }) => {
      try {
        if (input.id) {
          await commands.updateCredential({
            id: input.id,
            name: input.name,
            username: input.username,
            password: input.password || undefined,
            note: input.note,
          });
          toast.success('認証情報を更新しました');
        } else {
          await commands.createCredential(input);
          toast.success('認証情報を追加しました');
        }
        loadCredentials();
      } catch (err) {
        console.error('Failed to save credential:', err);
        toast.error('認証情報の保存に失敗しました');
      }
    },
    [loadCredentials],
  );

  const handleCopyCredentialField = useCallback(
    async (id: string, field: 'username' | 'password') => {
      try {
        await commands.copyCredentialField(id, field);
        if (field === 'username') {
          toast.success('ユーザー名をコピーしました');
        }
        // パスワードの場合はTauriイベントリスナーで通知
      } catch (err) {
        console.error('Failed to copy credential field:', err);
        toast.error('コピーに失敗しました');
      }
    },
    [],
  );

  // リンクカウントを計算
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const linkCounts = {
    all: links.length,
    recent: links.filter((l) => new Date(l.created_at) >= sevenDaysAgo).length,
    temporary: links.filter((l) => l.is_temporary).length,
    expired: links.filter((l) => l.is_temporary && l.expires_at && new Date(l.expires_at) < now)
      .length,
    pinned: links.filter((l) => l.is_pinned).length,
    credentials: credentials.length,
  };

  const selectedLink = links.find((l) => l.id === selectedLinkId) ?? null;

  return (
    <div className="flex h-screen flex-col" style={{ background: 'var(--bg-base)' }}>
      {/* タイトルバー（ウィンドウ全体の上部） */}
      <TitleBar />

      <div className="flex flex-1 overflow-hidden">
        {/* サイドバー */}
        <aside
          className="flex shrink-0 flex-col"
          style={{
            width: 'var(--sidebar-width)',
            background: 'var(--bg-sidebar)',
            borderRight: '1px solid var(--border-medium)',
          }}
        >
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
          {isCredentialsView ? (
            <>
              {/* 認証情報ツールバー */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 20px',
                  borderBottom: '1px solid var(--border-subtle)',
                  minHeight: 52,
                }}
              >
                <h2
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    margin: 0,
                  }}
                >
                  認証情報
                </h2>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ height: 32, fontSize: 12, gap: 6 }}
                  onClick={handleAddCredential}
                >
                  追加
                </button>
              </div>
              <CredentialList
                credentials={credentials}
                onAdd={handleAddCredential}
                onEdit={handleEditCredential}
                onDelete={handleDeleteCredential}
                onCopyField={handleCopyCredentialField}
              />
            </>
          ) : (
            <>
              {selectedLinkIds.size > 0 ? (
                <BulkActionBar
                  selectedCount={selectedLinkIds.size}
                  categories={categories}
                  onMove={handleBulkMove}
                  onDelete={handleBulkDelete}
                  onClear={clearSelection}
                />
              ) : (
                <Toolbar
                  onAddLink={() => setAddDialogOpen(true)}
                  onImport={() => setImportDialogOpen(true)}
                  onExport={handleExport}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                />
              )}
              <LinkList
                links={links}
                onOpen={handleOpenLink}
                onEdit={handleEditLink}
                onDelete={handleDeleteLink}
                onTogglePin={handleTogglePin}
              />
            </>
          )}
        </main>

        {/* 詳細パネル */}
        {detailPanelOpen && !isCredentialsView && (
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
        onUpdate={handleUpdateLink}
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

      {/* 認証情報ダイアログ */}
      <CredentialDialog
        open={credentialDialogOpen}
        onOpenChange={setCredentialDialogOpen}
        credential={editingCredential}
        onSubmit={handleCredentialSubmit}
      />

      {/* インポートダイアログ */}
      <ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onComplete={() => {
          loadLinks();
          loadCategories();
          // バックグラウンドでfaviconを1件ずつ取得
          refreshFaviconsBackground();
        }}
      />

      {/* 確認ダイアログ */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        onConfirm={confirmDialog.onConfirm}
      />

      {/* トースト通知 */}
      <Toaster
        position="bottom-right"
        theme={theme}
        toastOptions={{
          style: {
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-medium)',
            color: 'var(--text-primary)',
          },
        }}
      />
    </div>
  );
}

export default App;
