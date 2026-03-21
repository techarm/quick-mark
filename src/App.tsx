import { openUrl } from '@tauri-apps/plugin-opener';
import { useCallback, useEffect, useState } from 'react';
import { AddLinkDialog } from './components/main/AddLinkDialog';
import { LinkDetail } from './components/main/LinkDetail';
import { LinkList } from './components/main/LinkList';
import { Sidebar } from './components/main/Sidebar';
import { Toolbar } from './components/main/Toolbar';
import { TitleBar } from './components/TitleBar';
import * as commands from './lib/commands';
import type { Category, CreateLinkInput, Link } from './lib/types';
import { useUIStore } from './stores/ui.store';

function App() {
  const [links, setLinks] = useState<Link[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const { activeFilter, activeCategoryId, selectedLinkId, detailPanelOpen } = useUIStore();

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

  // リンクを開く
  const handleOpenLink = useCallback(
    async (link: Link) => {
      try {
        const url = await commands.openLink(link.id);
        await openUrl(url);
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
      <TitleBar />

      <div className="flex flex-1 overflow-hidden">
        {/* サイドバー */}
        <aside
          className="glass-surface flex w-[var(--sidebar-width)] shrink-0 flex-col border-r"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <Sidebar categories={categories} linkCounts={linkCounts} />
        </aside>

        {/* メインコンテンツ */}
        <main className="flex flex-1 flex-col overflow-hidden">
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

      {/* リンク追加ダイアログ */}
      <AddLinkDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        categories={categories}
        onSubmit={handleAddLink}
      />
    </div>
  );
}

export default App;
