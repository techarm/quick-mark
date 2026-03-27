import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock localStorage and matchMedia before importing the store
vi.stubGlobal('localStorage', {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
});
vi.stubGlobal(
  'matchMedia',
  vi.fn(() => ({ matches: true })),
);

const { useUIStore } = await import('./ui.store');

describe('useUIStore', () => {
  beforeEach(() => {
    useUIStore.setState({
      theme: 'dark',
      sidebarCollapsed: false,
      activeFilter: 'all',
      activeCategoryId: null,
      viewMode: 'list',
      selectedLinkId: null,
      selectedLinkIds: new Set(),
      detailPanelOpen: false,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('toggleTheme', () => {
    it('toggles from dark to light', () => {
      useUIStore.setState({ theme: 'dark' });
      useUIStore.getState().toggleTheme();
      expect(useUIStore.getState().theme).toBe('light');
    });

    it('toggles from light to dark', () => {
      useUIStore.setState({ theme: 'light' });
      useUIStore.getState().toggleTheme();
      expect(useUIStore.getState().theme).toBe('dark');
    });
  });

  describe('toggleSidebar', () => {
    it('toggles sidebar state', () => {
      expect(useUIStore.getState().sidebarCollapsed).toBe(false);
      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().sidebarCollapsed).toBe(true);
      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().sidebarCollapsed).toBe(false);
    });
  });

  describe('selection', () => {
    it('toggleLinkSelection adds and removes ids', () => {
      useUIStore.getState().toggleLinkSelection('a');
      expect(useUIStore.getState().selectedLinkIds.has('a')).toBe(true);

      useUIStore.getState().toggleLinkSelection('a');
      expect(useUIStore.getState().selectedLinkIds.has('a')).toBe(false);
    });

    it('addRangeSelection adds multiple ids', () => {
      useUIStore.getState().toggleLinkSelection('a');
      useUIStore.getState().addRangeSelection(['b', 'c']);
      const ids = useUIStore.getState().selectedLinkIds;
      expect(ids.has('a')).toBe(true);
      expect(ids.has('b')).toBe(true);
      expect(ids.has('c')).toBe(true);
    });

    it('selectAllLinks replaces current selection', () => {
      useUIStore.getState().toggleLinkSelection('a');
      useUIStore.getState().selectAllLinks(['x', 'y']);
      const ids = useUIStore.getState().selectedLinkIds;
      expect(ids.has('a')).toBe(false);
      expect(ids.has('x')).toBe(true);
      expect(ids.has('y')).toBe(true);
    });

    it('clearSelection empties the set', () => {
      useUIStore.getState().toggleLinkSelection('a');
      useUIStore.getState().clearSelection();
      expect(useUIStore.getState().selectedLinkIds.size).toBe(0);
    });
  });

  describe('setSelectedLinkId', () => {
    it('opens detail panel when selecting a link', () => {
      useUIStore.getState().setSelectedLinkId('link-1');
      expect(useUIStore.getState().selectedLinkId).toBe('link-1');
      expect(useUIStore.getState().detailPanelOpen).toBe(true);
    });

    it('closes detail panel when deselecting', () => {
      useUIStore.getState().setSelectedLinkId('link-1');
      useUIStore.getState().setSelectedLinkId(null);
      expect(useUIStore.getState().selectedLinkId).toBeNull();
      expect(useUIStore.getState().detailPanelOpen).toBe(false);
    });
  });

  describe('filter and category', () => {
    it('setActiveFilter clears activeCategoryId', () => {
      useUIStore.getState().setActiveCategoryId('cat-1');
      useUIStore.getState().setActiveFilter('recent');
      expect(useUIStore.getState().activeFilter).toBe('recent');
      expect(useUIStore.getState().activeCategoryId).toBeNull();
    });

    it('setActiveCategoryId clears activeFilter', () => {
      useUIStore.getState().setActiveFilter('all');
      useUIStore.getState().setActiveCategoryId('cat-1');
      expect(useUIStore.getState().activeCategoryId).toBe('cat-1');
      expect(useUIStore.getState().activeFilter).toBeNull();
    });
  });
});
