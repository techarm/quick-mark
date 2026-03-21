import { create } from 'zustand';
import type { SmartFilter } from '../lib/types';

type ViewMode = 'list' | 'card';

interface UIState {
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

  // 検索パレット
  searchPaletteOpen: boolean;
  setSearchPaletteOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
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

  searchPaletteOpen: false,
  setSearchPaletteOpen: (open) => set({ searchPaletteOpen: open }),
}));
