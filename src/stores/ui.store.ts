import { create } from 'zustand';
import type { SmartFilter } from '../lib/types';

type ViewMode = 'list' | 'card';
type Theme = 'light' | 'dark';

function getInitialTheme(): Theme {
  const stored = localStorage.getItem('quickmark-theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('quickmark-theme', theme);
}

const DEFAULT_GLOBAL_SHORTCUT = 'CommandOrControl+Shift+Space';

function getInitialGlobalShortcut(): string {
  return localStorage.getItem('quickmark-global-shortcut') || DEFAULT_GLOBAL_SHORTCUT;
}

interface UIState {
  // テーマ
  theme: Theme;
  toggleTheme: () => void;

  // サイドバー
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // アクティブフィルタ/カテゴリ
  activeFilter: SmartFilter | null;
  activeCategoryId: string | null;
  setActiveFilter: (filter: SmartFilter) => void;
  setActiveCategoryId: (id: string | null) => void;

  // 表示モード
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  // 選択中のリンク（単一）
  selectedLinkId: string | null;
  setSelectedLinkId: (id: string | null) => void;

  // 複数選択
  selectedLinkIds: Set<string>;
  toggleLinkSelection: (id: string) => void;
  addRangeSelection: (ids: string[]) => void;
  selectAllLinks: (ids: string[]) => void;
  clearSelection: () => void;

  // 詳細パネル
  detailPanelOpen: boolean;
  setDetailPanelOpen: (open: boolean) => void;

  // ワークスペース
  activeWorkspaceId: string | null;
  setActiveWorkspaceId: (id: string) => void;

  // グローバルショートカット
  globalShortcut: string;
  setGlobalShortcut: (shortcut: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: getInitialTheme(),
  toggleTheme: () =>
    set((s) => {
      const next: Theme = s.theme === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      return { theme: next };
    }),

  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  activeFilter: 'all',
  activeCategoryId: null,
  setActiveFilter: (filter) => set({ activeFilter: filter, activeCategoryId: null }),
  setActiveCategoryId: (id) => set({ activeCategoryId: id, activeFilter: null }),

  viewMode: 'list',
  setViewMode: (mode) => set({ viewMode: mode }),

  selectedLinkId: null,
  setSelectedLinkId: (id) => set({ selectedLinkId: id, detailPanelOpen: id !== null }),

  // 複数選択
  selectedLinkIds: new Set(),
  toggleLinkSelection: (id) =>
    set((s) => {
      const next = new Set(s.selectedLinkIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { selectedLinkIds: next };
    }),
  addRangeSelection: (ids) =>
    set((s) => {
      const next = new Set(s.selectedLinkIds);
      for (const id of ids) next.add(id);
      return { selectedLinkIds: next };
    }),
  selectAllLinks: (ids) => set({ selectedLinkIds: new Set(ids) }),
  clearSelection: () => set({ selectedLinkIds: new Set() }),

  detailPanelOpen: false,
  setDetailPanelOpen: (open) => set({ detailPanelOpen: open }),

  activeWorkspaceId: null,
  setActiveWorkspaceId: (id) =>
    set({
      activeWorkspaceId: id,
      activeFilter: 'all',
      activeCategoryId: null,
      selectedLinkId: null,
      selectedLinkIds: new Set(),
      detailPanelOpen: false,
    }),

  globalShortcut: getInitialGlobalShortcut(),
  setGlobalShortcut: (shortcut) => {
    localStorage.setItem('quickmark-global-shortcut', shortcut);
    set({ globalShortcut: shortcut });
  },
}));
