import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import { SettingsDialog } from './components/SettingsDialog';
import { TitleBar } from './components/TitleBar';
import * as commands from './lib/commands';
import { refreshFavicons } from './lib/favicon';
import type {
  Category,
  CreateCategoryInput,
  CreateCredentialInput,
  CreateLinkInput,
  Credential,
  Link,
  UpdateLinkInput,
  Workspace,
} from './lib/types';
import { isModKey, safeOpenUrl } from './lib/utils';
import { useUpdater } from './hooks/useUpdater';
import { useUIStore } from './stores/ui.store';

// カーソルがあるモニターの中央にウィンドウを配置（Spotlight風）
async function centerOnCursorMonitor(win: Awaited<ReturnType<typeof import('@tauri-apps/api/webviewWindow').WebviewWindow.getByLabel>>) {
  if (!win) return;
  try {
    const { availableMonitors, cursorPosition } = await import('@tauri-apps/api/window');
    const { LogicalPosition } = await import('@tauri-apps/api/dpi');
    const cursor = await cursorPosition();
    const monitors = await availableMonitors();

    // カーソルが含まれるモニターを検出
    const target = monitors.find((m) => {
      const { x, y } = m.position;
      const { width, height } = m.size;
      return cursor.x >= x && cursor.x < x + width && cursor.y >= y && cursor.y < y + height;
    }) ?? monitors[0];

    if (!target) return;

    const winSize = await win.innerSize();
    const scale = target.scaleFactor;
    // モニター中央・やや上寄りに配置（物理ピクセル→論理ピクセル変換）
    const x = target.position.x / scale + (target.size.width / scale - winSize.width / scale) / 2;
    const y = target.position.y / scale + (target.size.height / scale - winSize.height / scale) / 3;
    await win.setPosition(new LogicalPosition(Math.round(x), Math.round(y)));
  } catch {
    // フォールバック: 標準のcenter
    await win.center();
  }
}

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
      await centerOnCursorMonitor(win);
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
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [linkCounts, setLinkCounts] = useState<commands.LinkCounts>({
    all: 0,
    recent: 0,
    temporary: 0,
    expired: 0,
    pinned: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);

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
    activeWorkspaceId,
    setActiveWorkspaceId,
  } = useUIStore();

  const isCredentialsView = activeFilter === 'credentials' && !activeCategoryId;

  // アップデーター（起動後3秒で自動チェック）
  const updater = useUpdater(true);

  // アップデート検知時にトースト通知
  useEffect(() => {
    if (updater.status === 'available' && updater.availableVersion) {
      toast.info(`新しいバージョン v${updater.availableVersion} が利用可能です`, {
        action: {
          label: '詳細',
          onClick: () => setSettingsDialogOpen(true),
        },
        duration: 10000,
      });
    }
  }, [updater.status, updater.availableVersion]);

  // ワークスペース初期化
  const loadWorkspaces = useCallback(async () => {
    try {
      const ws = await commands.getWorkspaces();
      setWorkspaces(ws);
    } catch (err) {
      console.error('Failed to load workspaces:', err);
    }
  }, []);

  useEffect(() => {
    async function initWorkspace() {
      try {
        const [ws, activeId] = await Promise.all([
          commands.getWorkspaces(),
          commands.getActiveWorkspaceId(),
        ]);
        setWorkspaces(ws);
        setActiveWorkspaceId(activeId);
      } catch (err) {
        console.error('Failed to init workspaces:', err);
      }
    }
    initWorkspace();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // データの読み込み
  const loadLinks = useCallback(async () => {
    if (!activeWorkspaceId) return;
    const wsId = activeWorkspaceId;

    // リンク取得とカウント取得を並行実行
    const linksPromise = (async () => {
      if (searchQuery.trim()) {
        return commands.searchLinks(searchQuery, wsId);
      } else if (activeCategoryId) {
        return commands.getLinks(activeCategoryId, undefined, wsId);
      } else {
        const filter =
          activeFilter === 'all' || activeFilter === 'credentials'
            ? undefined
            : (activeFilter ?? undefined);
        return commands.getLinks(undefined, filter, wsId);
      }
    })();

    const countsPromise = commands.getLinkCounts(wsId);

    try {
      const [results, counts] = await Promise.all([linksPromise, countsPromise]);
      setLinks(results);
      setLinkCounts(counts);
    } catch (err) {
      console.error('Failed to load links:', err);
      toast.error('リンクの読み込みに失敗しました');
      setLinks([]);
    }
  }, [searchQuery, activeFilter, activeCategoryId, activeWorkspaceId]);

  const loadLinksRef = useRef(loadLinks);
  useEffect(() => {
    loadLinksRef.current = loadLinks;
  }, [loadLinks]);

  const loadCategories = useCallback(async () => {
    if (!activeWorkspaceId) return;
    try {
      const cats = await commands.getCategories(activeWorkspaceId);
      setCategories(cats);
    } catch (err) {
      console.error('Failed to load categories:', err);
      toast.error('カテゴリの読み込みに失敗しました');
    }
  }, [activeWorkspaceId]);

  const loadCredentials = useCallback(async () => {
    if (!activeWorkspaceId) return;
    try {
      const creds = await commands.getCredentials(activeWorkspaceId);
      setCredentials(creds);
    } catch (err) {
      console.error('Failed to load credentials:', err);
      toast.error('認証情報の読み込みに失敗しました');
    }
  }, [activeWorkspaceId]);

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
    let cancelled = false;
    let unlisten1: (() => void) | undefined;
    let unlisten2: (() => void) | undefined;
    let unlisten3: (() => void) | undefined;

    async function setupListeners() {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        if (cancelled) return;
        unlisten1 = await listen('credential:password-copied', () => {
          toast.success('パスワードをコピーしました', {
            description: '30秒後にクリップボードをクリアします',
          });
        });
        if (cancelled) {
          unlisten1();
          return;
        }
        unlisten2 = await listen('credential:clipboard-cleared', () => {
          toast.info('クリップボードをクリアしました');
        });
        if (cancelled) {
          unlisten2();
          return;
        }
        unlisten3 = await listen('links:created-from-extension', () => {
          loadLinksRef.current();
          toast.success('ブラウザ拡張機能からリンクを保存しました');
        });
        if (cancelled) {
          unlisten3();
          return;
        }
      } catch {
        // ブラウザ環境では無視
      }
    }

    setupListeners();

    return () => {
      cancelled = true;
      unlisten1?.();
      unlisten2?.();
      unlisten3?.();
    };
  }, []);

  // 起動時に期限切れリンクをクリーンアップ + favicon未取得分を取得（初回のみ）
  useEffect(() => {
    commands.cleanupExpiredLinks().catch(console.error);
    refreshFavicons()
      .then(() => loadLinksRef.current())
      .catch((err) => console.error('Background favicon refresh failed:', err));
  }, []);

  // OS-level グローバルショートカット → 独立検索ウィンドウ
  const globalShortcut = useUIStore((s) => s.globalShortcut);

  useEffect(() => {
    let cancelled = false;

    async function setupGlobalShortcut() {
      try {
        const { register, unregisterAll } = await import('@tauri-apps/plugin-global-shortcut');
        if (cancelled) return;

        // 既存のショートカットをすべて解除してからクリーンに登録
        await unregisterAll();
        if (cancelled) return;

        await register(globalShortcut, async (event) => {
          if (event.state === 'Released') return;
          await toggleSearchWindow();
        });
      } catch (err) {
        console.warn('Global shortcut registration failed:', err);
      }
    }

    setupGlobalShortcut();

    return () => {
      cancelled = true;
      import('@tauri-apps/plugin-global-shortcut')
        .then(({ unregisterAll }) => unregisterAll())
        .catch(() => {});
    };
  }, [globalShortcut]);

  // アプリ内キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl+K: 独立検索ウィンドウを開く
      if (isModKey(e) && e.key === 'k') {
        e.preventDefault();
        toggleSearchWindow();
      }
      // Cmd/Ctrl+Shift+A: リンク追加
      if (isModKey(e) && e.shiftKey && e.key === 'a') {
        e.preventDefault();
        setAddDialogOpen(true);
      }
      // Cmd/Ctrl+A: リンク全選択（入力フォーカス中は除外）
      if (isModKey(e) && e.key === 'a' && !e.shiftKey) {
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
        await commands.createLink({ ...input, workspace_id: activeWorkspaceId ?? undefined });
        loadLinks();
        loadCategories();
        toast.success('リンクを追加しました');
      } catch (err) {
        console.error('Failed to create link:', err);
        toast.error('リンクの追加に失敗しました');
      }
    },
    [loadLinks, loadCategories, activeWorkspaceId],
  );

  // データエクスポート
  const handleExport = useCallback(async () => {
    try {
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      if (workspaces.length >= 2) {
        // 複数ワークスペース: 各ワークスペースをJSONにしてZIPにまとめる
        const JSZip = (await import('jszip')).default;
        const { writeFile } = await import('@tauri-apps/plugin-fs');
        const zip = new JSZip();
        for (const ws of workspaces) {
          const jsonStr = await commands.exportData(ws.id);
          zip.file(`${ws.name}.json`, jsonStr);
        }
        const blob = await zip.generateAsync({ type: 'uint8array' });
        const defaultName = `quickmark-backup-${dateStr}.zip`;

        const filePath = await save({
          title: 'エクスポート先を選択',
          defaultPath: defaultName,
          filters: [{ name: 'ZIP', extensions: ['zip'] }],
        });

        if (filePath) {
          await writeFile(filePath, blob);
          toast.success('全ワークスペースをエクスポートしました');
        }
      } else {
        // 単一ワークスペース: 従来通りJSON
        const jsonStr = await commands.exportData(activeWorkspaceId ?? undefined);
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
      }
    } catch (err) {
      console.error('Failed to export:', err);
      toast.error('エクスポートに失敗しました');
    }
  }, [activeWorkspaceId, workspaces]);

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
          await commands.createCategory({ ...input, workspace_id: activeWorkspaceId ?? undefined });
          toast.success('カテゴリを作成しました');
        }
        loadCategories();
      } catch (err) {
        console.error('Failed to save category:', err);
        toast.error('カテゴリの保存に失敗しました');
      }
    },
    [loadCategories, activeWorkspaceId],
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
          await commands.createCredential({ ...input, workspace_id: activeWorkspaceId ?? undefined });
          toast.success('認証情報を追加しました');
        }
        loadCredentials();
      } catch (err) {
        console.error('Failed to save credential:', err);
        toast.error('認証情報の保存に失敗しました');
      }
    },
    [loadCredentials, activeWorkspaceId],
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

  // === ワークスペースハンドラ ===

  const handleSwitchWorkspace = useCallback(
    async (id: string) => {
      try {
        await commands.setActiveWorkspaceId(id);
        setActiveWorkspaceId(id);
      } catch (err) {
        console.error('Failed to switch workspace:', err);
        toast.error('ワークスペースの切替に失敗しました');
      }
    },
    [setActiveWorkspaceId],
  );

  const handleCreateWorkspace = useCallback(
    async (name: string, color: string) => {
      try {
        await commands.createWorkspace({ name, color });
        loadWorkspaces();
        toast.success('ワークスペースを作成しました');
      } catch (err) {
        console.error('Failed to create workspace:', err);
        toast.error('ワークスペースの作成に失敗しました');
      }
    },
    [loadWorkspaces],
  );

  const handleUpdateWorkspace = useCallback(
    async (id: string, name: string, color: string) => {
      try {
        await commands.updateWorkspace({ id, name, color });
        loadWorkspaces();
        toast.success('ワークスペースを更新しました');
      } catch (err) {
        console.error('Failed to update workspace:', err);
        toast.error('ワークスペースの更新に失敗しました');
      }
    },
    [loadWorkspaces],
  );

  const handleDeleteWorkspace = useCallback(
    async (id: string) => {
      try {
        await commands.deleteWorkspace(id);
        const ws = await commands.getWorkspaces();
        setWorkspaces(ws);
        // 削除したのがアクティブだった場合、新しいアクティブを取得
        if (id === activeWorkspaceId) {
          const newActiveId = await commands.getActiveWorkspaceId();
          setActiveWorkspaceId(newActiveId);
        }
        toast.success('ワークスペースを削除しました');
      } catch (err) {
        console.error('Failed to delete workspace:', err);
        toast.error('ワークスペースの削除に失敗しました');
      }
    },
    [activeWorkspaceId, setActiveWorkspaceId],
  );

  // サイドバー用カウント（DB由来 + 認証情報）
  const sidebarCounts = {
    ...linkCounts,
    credentials: credentials.length,
  };

  const selectedLink = links.find((l) => l.id === selectedLinkId) ?? null;

  // タイトルバーに表示するワークスペース名（2つ以上の場合のみ）
  const activeWorkspace = workspaces.find((ws) => ws.id === activeWorkspaceId);
  const titleBarWorkspaceName =
    workspaces.length >= 2 ? (activeWorkspace?.name ?? undefined) : undefined;

  return (
    <div className="flex h-screen flex-col" style={{ background: 'var(--bg-base)' }}>
      {/* タイトルバー（ウィンドウ全体の上部） */}
      <TitleBar
        onOpenSettings={() => setSettingsDialogOpen(true)}
        workspaceName={titleBarWorkspaceName}
      />

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
            linkCounts={sidebarCounts}
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
        workspaceId={activeWorkspaceId ?? undefined}
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

      {/* 設定ダイアログ */}
      <SettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
        onImport={() => setImportDialogOpen(true)}
        onExport={handleExport}
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        onSwitchWorkspace={handleSwitchWorkspace}
        onCreateWorkspace={handleCreateWorkspace}
        onUpdateWorkspace={handleUpdateWorkspace}
        onDeleteWorkspace={handleDeleteWorkspace}
        updater={updater}
      />

      {/* インポートダイアログ */}
      <ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onComplete={() => {
          loadLinks();
          loadCategories();
        }}
        workspaceId={activeWorkspaceId ?? undefined}
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
