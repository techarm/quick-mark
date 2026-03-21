import { Clock, FolderOpen, Globe, Hourglass, Timer } from 'lucide-react';
import type { Category, SmartFilter } from '../../lib/types';
import { cn } from '../../lib/utils';
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
    <div className="flex h-full flex-col px-3 pt-2 pb-3">
      {/* スマートフォルダ */}
      <div className="mb-3">
        <SectionHeader>スマートフォルダ</SectionHeader>
        <nav className="space-y-[2px]">
          {smartFilters.map((filter) => {
            const isActive = activeFilter === filter.id;
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setActiveFilter(filter.id)}
                className={cn(
                  'group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-left text-[13px] transition-all duration-150',
                  isActive ? 'font-medium' : 'font-normal',
                )}
                style={{
                  background: isActive ? 'var(--accent-subtle)' : 'transparent',
                  color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent';
                }}
              >
                <filter.icon
                  size={16}
                  strokeWidth={isActive ? 2 : 1.5}
                  style={{ opacity: isActive ? 0.9 : 0.5 }}
                />
                <span className="flex-1">{filter.label}</span>
                {getCount(filter.id) > 0 && (
                  <span
                    className="min-w-[20px] rounded-full px-1.5 py-[1px] text-center text-[10px] tabular-nums"
                    style={{
                      background: isActive ? 'rgba(226, 80, 80, 0.15)' : 'var(--bg-elevated)',
                      color: isActive ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                    }}
                  >
                    {getCount(filter.id)}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* 区切り線 */}
      <div className="mx-2 mb-3" style={{ borderBottom: '1px solid var(--border-subtle)' }} />

      {/* カテゴリツリー */}
      <div className="flex-1 overflow-y-auto">
        <SectionHeader>カテゴリ</SectionHeader>
        {rootCategories.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6">
            <FolderOpen size={24} style={{ color: 'var(--text-tertiary)', opacity: 0.4 }} />
            <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              カテゴリがありません
            </p>
          </div>
        ) : (
          <nav className="space-y-[2px]">
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
      className="mb-1.5 px-2.5 text-[10px] font-bold uppercase tracking-[0.12em]"
      style={{ color: 'var(--text-tertiary)' }}
    >
      {children}
    </h2>
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
        className={cn(
          'group flex w-full items-center gap-2.5 rounded-lg py-[7px] text-left text-[13px] transition-all duration-150',
          active ? 'font-medium' : 'font-normal',
        )}
        style={{
          paddingLeft: `${10 + depth * 18}px`,
          paddingRight: '10px',
          background: active ? 'var(--accent-subtle)' : 'transparent',
          color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
        }}
        onMouseEnter={(e) => {
          if (!active) e.currentTarget.style.background = 'var(--bg-hover)';
        }}
        onMouseLeave={(e) => {
          if (!active) e.currentTarget.style.background = 'transparent';
        }}
      >
        <FolderOpen size={15} style={{ color: category.color, opacity: active ? 0.9 : 0.6 }} />
        <span className="flex-1 truncate">{category.name}</span>
        {category.link_count > 0 && (
          <span
            className="min-w-[20px] rounded-full px-1.5 py-[1px] text-center text-[10px] tabular-nums"
            style={{
              background: active ? 'rgba(226, 80, 80, 0.15)' : 'var(--bg-elevated)',
              color: active ? 'var(--accent-primary)' : 'var(--text-tertiary)',
            }}
          >
            {category.link_count}
          </span>
        )}
      </button>
      {childCategories.length > 0 && (
        <div className="space-y-[2px]">
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
