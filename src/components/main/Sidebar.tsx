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

  // カテゴリをツリー構造に変換
  const rootCategories = categories.filter((c) => !c.parent_id);
  const getChildren = (parentId: string) => categories.filter((c) => c.parent_id === parentId);

  return (
    <div className="flex h-full flex-col p-3">
      {/* スマートフォルダ */}
      <div className="mb-4">
        <h2
          className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: 'var(--text-tertiary)' }}
        >
          スマートフォルダ
        </h2>
        <nav className="space-y-0.5">
          {smartFilters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setActiveFilter(filter.id)}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-all duration-150',
              )}
              style={{
                background: activeFilter === filter.id ? 'var(--accent-subtle)' : 'transparent',
                color:
                  activeFilter === filter.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
              }}
            >
              <filter.icon size={15} style={{ opacity: 0.7 }} />
              <span className="flex-1">{filter.label}</span>
              <span className="text-xs tabular-nums" style={{ color: 'var(--text-tertiary)' }}>
                {getCount(filter.id)}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* 区切り線 */}
      <div className="mx-2 mb-3 border-b" style={{ borderColor: 'var(--border-subtle)' }} />

      {/* カテゴリツリー */}
      <div className="flex-1 overflow-y-auto">
        <h2
          className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: 'var(--text-tertiary)' }}
        >
          カテゴリ
        </h2>
        {rootCategories.length === 0 ? (
          <p className="px-2 text-xs italic" style={{ color: 'var(--text-tertiary)' }}>
            カテゴリがありません
          </p>
        ) : (
          <nav className="space-y-0.5">
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
          'flex w-full items-center gap-2 rounded-md py-1.5 text-left text-sm transition-all duration-150',
        )}
        style={{
          paddingLeft: `${8 + depth * 16}px`,
          paddingRight: '8px',
          background: active ? 'var(--accent-subtle)' : 'transparent',
          color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
        }}
      >
        <FolderOpen size={15} style={{ color: category.color, opacity: 0.8 }} />
        <span className="flex-1 truncate">{category.name}</span>
        <span className="text-xs tabular-nums" style={{ color: 'var(--text-tertiary)' }}>
          {category.link_count}
        </span>
      </button>
      {childCategories.length > 0 && (
        <div className="space-y-0.5">
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
