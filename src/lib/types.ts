export interface Link {
  id: string;
  url: string;
  title: string;
  description: string | null;
  favicon_url: string | null;
  category_id: string | null;
  is_temporary: boolean;
  expires_at: string | null;
  visit_count: number;
  last_visited_at: string | null;
  is_pinned: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface CreateLinkInput {
  url: string;
  title: string;
  description?: string;
  favicon_url?: string;
  category_id?: string;
  is_temporary?: boolean;
  expires_at?: string;
  is_pinned?: boolean;
}

export interface UpdateLinkInput {
  id: string;
  url?: string;
  title?: string;
  description?: string;
  favicon_url?: string;
  category_id?: string;
  is_temporary?: boolean;
  expires_at?: string;
  is_pinned?: boolean;
}

export interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  path: string;
  icon: string;
  color: string;
  search_alias: string;
  position: number;
  created_at: string;
  link_count: number;
}

export interface CreateCategoryInput {
  name: string;
  parent_id?: string;
  icon?: string;
  color?: string;
  search_alias?: string;
}

export interface UpdateCategoryInput {
  id: string;
  name?: string;
  parent_id?: string | null;
  set_parent_id?: boolean;
  icon?: string;
  color?: string;
  search_alias?: string;
  position?: number;
}

export type SmartFilter = 'all' | 'recent' | 'temporary' | 'expired' | 'pinned';
