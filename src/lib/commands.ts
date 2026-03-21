import { invoke } from '@tauri-apps/api/core';
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
