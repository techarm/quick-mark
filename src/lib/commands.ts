import { invoke as tauriInvoke } from '@tauri-apps/api/core';

// ブラウザ環境ではTauri APIが使えないため安全にラップ
async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await tauriInvoke<T>(cmd, args);
  } catch (e) {
    console.warn(`Tauri invoke '${cmd}' failed (running in browser?):`, e);
    throw e;
  }
}

import type {
  Category,
  CreateCategoryInput,
  CreateLinkInput,
  Link,
  UpdateCategoryInput,
  UpdateLinkInput,
} from './types';

// === リンク ===

export async function getLinks(categoryId?: string, filter?: string): Promise<Link[]> {
  return invoke('get_links', { categoryId, filter });
}

export async function createLink(input: CreateLinkInput): Promise<Link> {
  return invoke('create_link', { input });
}

export async function updateLink(input: UpdateLinkInput): Promise<Link> {
  return invoke('update_link', { input });
}

export async function deleteLink(id: string): Promise<void> {
  return invoke('delete_link', { id });
}

export async function searchLinks(query: string): Promise<Link[]> {
  return invoke('search_links', { query });
}

export async function openLink(id: string): Promise<string> {
  return invoke('open_link', { id });
}

export async function cleanupExpiredLinks(): Promise<number> {
  return invoke('cleanup_expired_links');
}

export interface UrlInfo {
  title: string;
  description: string;
  favicon_url: string;
}

export async function fetchUrlInfo(url: string): Promise<UrlInfo> {
  return invoke('fetch_url_info', { url });
}

export async function refreshFavicons(): Promise<number> {
  return invoke('refresh_favicons');
}

export async function moveLinksToCategory(
  linkIds: string[],
  categoryId: string | null,
): Promise<number> {
  return invoke('move_links_to_category', { linkIds, categoryId });
}

export async function bulkDeleteLinks(linkIds: string[]): Promise<number> {
  return invoke('bulk_delete_links', { linkIds });
}

// === カテゴリ ===

export async function getCategories(): Promise<Category[]> {
  return invoke('get_categories');
}

export async function createCategory(input: CreateCategoryInput): Promise<Category> {
  return invoke('create_category', { input });
}

export async function updateCategory(input: UpdateCategoryInput): Promise<Category> {
  return invoke('update_category', { input });
}

export async function deleteCategory(id: string): Promise<void> {
  return invoke('delete_category', { id });
}

// === ブラウザ ===

export interface BrowserInfo {
  url: string;
  title: string;
}

export async function getActiveBrowserUrl(): Promise<BrowserInfo | null> {
  return invoke('get_active_browser_url');
}

// === インポート ===

export interface ImportItem {
  url: string;
  title: string;
  folder: string | null;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  categories_created: number;
}

export async function parseBookmarksHtml(content: string): Promise<ImportItem[]> {
  return invoke('parse_bookmarks_html', { content });
}

export async function parseJsonLinks(content: string): Promise<ImportItem[]> {
  return invoke('parse_json_links', { content });
}

export async function importBookmarks(items: ImportItem[]): Promise<ImportResult> {
  return invoke('import_bookmarks', { items });
}
