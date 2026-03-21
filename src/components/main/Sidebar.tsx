import { Clock, FolderOpen, Globe, Hourglass, Plus, Timer } from 'lucide-react';
import type { Category, SmartFilter } from '../../lib/types';
import { useUIStore } from '../../stores/ui.store';

interface SidebarProps {
  categories: Category[];
  linkCounts: {
    all: number;
    recent: number;
    temporary: number;
    expired: number;
  };
}

const smartFilters: { id: SmartFilter; label: string; icon: typeof Globe }[] = [
  { id: 'all', label: 'すべてのリンク', icon: Globe },
  { id: 'recent', label: '最近追加', icon: Clock },
  { id: 'temporary', label: '一時リンク', icon: Timer },
  { id: 'expired', label: '期限切れ', icon: Hourglass },
];

export function Sidebar({ categories, linkCounts }: SidebarProps) {
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
      default:
        return 0;
    }
  };

  const rootCategories = categories.filter((c) => !c.parent_id);
  const getChildren = (parentId: string) => categories.filter((c) => c.parent_id === parentId);

  return (
    <div className="flex flex-1 flex-col overflow-hidden px-3 pb-3">
      {/* スマートフォルダ */}
      <div className="mb-1">
        <SectionHeader>スマートフォルダ</SectionHeader>
        <nav className="flex flex-col gap-[1px]">
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
      <div className="mx-2 my-2" style={{ borderBottom: '1px solid var(--border-subtle)' }} />

      {/* カテゴリ */}
      <div className="flex flex-1 flex-col overflow-y-auto">
        <div className="flex items-center justify-between pr-1">
          <SectionHeader>カテゴリ</SectionHeader>
          <button
            type="button"
            className="flex h-5 w-5 items-center justify-center rounded transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
            title="カテゴリを追加"
          >
            <Plus size={13} strokeWidth={2} />
          </button>
        </div>
        {rootCategories.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 pb-8">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: 'var(--bg-elevated)' }}
            >
              <FolderOpen size={20} style={{ color: 'var(--text-tertiary)', opacity: 0.5 }} />
            </div>
            <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
              カテゴリがありません
            </p>
          </div>
        ) : (
          <nav className="flex flex-col gap-[1px]">
            {rootCategories.map((cat) => (
              <CategoryItem
                key={cat.id}
                category={cat}
                childCategories={getChildren(cat.id)}
                allCategories={categories}
                active={activeCategoryId === cat.id}
                onSelect={setActiveCategoryId}
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
      className="mb-1 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]"
      style={{ color: 'var(--text-tertiary)' }}
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
  depth,
}: {
  category: Category;
  childCategories: Category[];
  allCategories: Category[];
  active: boolean;
  onSelect: (id: string) => void;
  depth: number;
}) {
  const getChildren = (parentId: string) => allCategories.filter((c) => c.parent_id === parentId);

  return (
    <div>
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
        {category.link_count > 0 && <CountBadge active={active}>{category.link_count}</CountBadge>}
      </button>
      {childCategories.length > 0 && (
        <div className="flex flex-col gap-[1px]">
          {childCategories.map((child) => (
            <CategoryItem
              key={child.id}
              category={child}
              childCategories={getChildren(child.id)}
              allCategories={allCategories}
              active={useUIStore.getState().activeCategoryId === child.id}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
