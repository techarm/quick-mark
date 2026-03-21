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

  // 選択中のリンク
  selectedLinkId: string | null;
  setSelectedLinkId: (id: string | null) => void;

  // 詳細パネル
  detailPanelOpen: boolean;
  setDetailPanelOpen: (open: boolean) => void;
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

  detailPanelOpen: false,
  setDetailPanelOpen: (open) => set({ detailPanelOpen: open }),
}));
