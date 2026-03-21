import * as ContextMenu from '@radix-ui/react-context-menu';
import {
  Clock,
  FolderOpen,
  Globe,
  Hourglass,
  Pencil,
  Pin,
  Plus,
  Timer,
  Trash2,
} from 'lucide-react';
import type { Category, SmartFilter } from '../../lib/types';
import { useUIStore } from '../../stores/ui.store';

interface SidebarProps {
  categories: Category[];
  linkCounts: {
    all: number;
    recent: number;
    temporary: number;
    expired: number;
    pinned: number;
  };
  onAddCategory?: () => void;
  onEditCategory?: (category: Category) => void;
  onDeleteCategory?: (category: Category) => void;
}

const smartFilters: { id: SmartFilter; label: string; icon: typeof Globe }[] = [
  { id: 'all', label: 'すべてのリンク', icon: Globe },
  { id: 'recent', label: '最近追加', icon: Clock },
  { id: 'temporary', label: '一時リンク', icon: Timer },
  { id: 'expired', label: '期限切れ', icon: Hourglass },
  { id: 'pinned', label: 'ピン留め', icon: Pin },
];

export function Sidebar({
  categories,
  linkCounts,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
}: SidebarProps) {
  const { activeFilter, activeCategoryId, setActiveFilter, setActiveCategoryId } = useUIStore();

  const getCount = (filter: SmartFilter) => {
    switch (filter) {
      case 'all':
        return linkCounts.all;
      case 'recent':
        return linkCounts.recent;
      case 'temporary':
        return linkCounts.temporary;
      case 'expired':
        return linkCounts.expired;
      case 'pinned':
        return linkCounts.pinned;
      default:
        return 0;
    }
  };

  const rootCategories = categories.filter((c) => !c.parent_id);
  const getChildren = (parentId: string) => categories.filter((c) => c.parent_id === parentId);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        overflow: 'hidden',
        padding: '4px 10px 12px',
      }}
    >
      {/* スマートフォルダ */}
      <div style={{ marginBottom: 6 }}>
        <SectionHeader>スマートフォルダ</SectionHeader>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {smartFilters.map((filter) => {
            const isActive = activeFilter === filter.id && !activeCategoryId;
            const count = getCount(filter.id);
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setActiveFilter(filter.id)}
                className="sidebar-item"
                style={
                  isActive
                    ? {
                        background: 'var(--bg-active)',
                        color: 'var(--accent-primary)',
                        fontWeight: 500,
                      }
                    : undefined
                }
              >
                <filter.icon
                  size={17}
                  strokeWidth={isActive ? 2.2 : 1.6}
                  style={{ opacity: isActive ? 1 : 0.5, flexShrink: 0 }}
                />
                <span className="flex-1 truncate">{filter.label}</span>
                {count > 0 && <CountBadge active={isActive}>{count}</CountBadge>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* 区切り線 */}
      <div style={{ margin: '8px 8px', borderBottom: '1px solid var(--border-subtle)' }} />

      {/* カテゴリ */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'auto' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingRight: 4,
          }}
        >
          <SectionHeader>カテゴリ</SectionHeader>
          <button
            type="button"
            onClick={onAddCategory}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 20,
              height: 20,
              borderRadius: 4,
              border: 'none',
              background: 'transparent',
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
            }}
            title="カテゴリを追加"
          >
            <Plus size={13} strokeWidth={2} />
          </button>
        </div>
        {rootCategories.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              gap: 10,
              paddingBottom: 32,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 40,
                height: 40,
                borderRadius: 'var(--radius-lg)',
                background: 'var(--bg-elevated)',
              }}
            >
              <FolderOpen size={20} style={{ color: 'var(--text-tertiary)', opacity: 0.5 }} />
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>カテゴリがありません</p>
          </div>
        ) : (
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {rootCategories.map((cat) => (
              <CategoryItem
                key={cat.id}
                category={cat}
                childCategories={getChildren(cat.id)}
                allCategories={categories}
                active={activeCategoryId === cat.id}
                onSelect={setActiveCategoryId}
                onEdit={onEditCategory}
                onDelete={onDeleteCategory}
                depth={0}
              />
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        color: 'var(--text-tertiary)',
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        padding: '6px 12px 4px',
        margin: 0,
      }}
    >
      {children}
    </h2>
  );
}

function CountBadge({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <span
      className="min-w-[22px] rounded-[5px] px-[6px] py-[1px] text-center text-[11px] tabular-nums"
      style={{
        background: active ? 'rgba(226, 80, 80, 0.18)' : 'rgba(255, 200, 200, 0.06)',
        color: active ? 'var(--accent-primary)' : 'var(--text-tertiary)',
        fontWeight: active ? 600 : 400,
      }}
    >
      {children}
    </span>
  );
}

function CategoryItem({
  category,
  childCategories,
  allCategories,
  active,
  onSelect,
  onEdit,
  onDelete,
  depth,
}: {
  category: Category;
  childCategories: Category[];
  allCategories: Category[];
  active: boolean;
  onSelect: (id: string) => void;
  onEdit?: (category: Category) => void;
  onDelete?: (category: Category) => void;
  depth: number;
}) {
  const getChildren = (parentId: string) => allCategories.filter((c) => c.parent_id === parentId);

  return (
    <div>
      <ContextMenu.Root>
        <ContextMenu.Trigger asChild>
          <button
            type="button"
            onClick={() => onSelect(category.id)}
            className="sidebar-item"
            style={{
              paddingLeft: `${12 + depth * 20}px`,
              ...(active
                ? {
                    background: 'var(--bg-active)',
                    color: 'var(--accent-primary)',
                    fontWeight: 500,
                  }
                : {}),
            }}
          >
            <FolderOpen
              size={16}
              style={{
                color: category.color || 'var(--text-tertiary)',
                opacity: active ? 1 : 0.6,
                flexShrink: 0,
              }}
            />
            <span className="flex-1 truncate">{category.name}</span>
            {category.link_count > 0 && (
              <CountBadge active={active}>{category.link_count}</CountBadge>
            )}
          </button>
        </ContextMenu.Trigger>
        {(onEdit || onDelete) && (
          <ContextMenu.Portal>
            <ContextMenu.Content className="dropdown-menu-content">
              {onEdit && (
                <ContextMenu.Item className="dropdown-menu-item" onSelect={() => onEdit(category)}>
                  <Pencil size={14} />
                  編集
                </ContextMenu.Item>
              )}
              {onDelete && (
                <>
                  <ContextMenu.Separator className="dropdown-menu-separator" />
                  <ContextMenu.Item
                    className="dropdown-menu-item dropdown-menu-item-danger"
                    onSelect={() => onDelete(category)}
                  >
                    <Trash2 size={14} />
                    削除
                  </ContextMenu.Item>
                </>
              )}
            </ContextMenu.Content>
          </ContextMenu.Portal>
        )}
      </ContextMenu.Root>
      {childCategories.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {childCategories.map((child) => (
            <CategoryItem
              key={child.id}
              category={child}
              childCategories={getChildren(child.id)}
              allCategories={allCategories}
              active={useUIStore.getState().activeCategoryId === child.id}
              onSelect={onSelect}
              onEdit={onEdit}
              onDelete={onDelete}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
