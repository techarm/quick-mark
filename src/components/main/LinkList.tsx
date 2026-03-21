import { ExternalLink, MoreHorizontal, Pin, Timer } from 'lucide-react';
import type { Link } from '../../lib/types';
import { cn } from '../../lib/utils';
import { useUIStore } from '../../stores/ui.store';

interface LinkListProps {
  links: Link[];
  onOpen: (link: Link) => void;
}

export function LinkList({ links, onOpen }: LinkListProps) {
  const { viewMode, selectedLinkId, setSelectedLinkId } = useUIStore();

  if (links.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ background: 'var(--bg-elevated)' }}
          >
            <ExternalLink size={28} style={{ color: 'var(--text-tertiary)', opacity: 0.5 }} />
          </div>
          <p className="text-[15px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            リンクがありません
          </p>
          <p className="mt-1.5 text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
            「追加」ボタンまたは Cmd+Shift+A で
            <br />
            リンクを追加して整理を始めましょう
          </p>
        </div>
      </div>
    );
  }

  if (viewMode === 'card') {
    return (
      <div className="grid grid-cols-2 gap-3 overflow-y-auto p-4 xl:grid-cols-3">
        {links.map((link) => (
          <LinkCard
            key={link.id}
            link={link}
            selected={selectedLinkId === link.id}
            onSelect={() => setSelectedLinkId(link.id)}
            onOpen={() => onOpen(link)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {links.map((link) => (
        <LinkRow
          key={link.id}
          link={link}
          selected={selectedLinkId === link.id}
          onSelect={() => setSelectedLinkId(link.id)}
          onOpen={() => onOpen(link)}
        />
      ))}
    </div>
  );
}

function LinkRow({
  link,
  selected,
  onSelect,
  onOpen,
}: {
  link: Link;
  selected: boolean;
  onSelect: () => void;
  onOpen: () => void;
}) {
  const domain = getDomain(link.url);
  const expiryInfo = getExpiryInfo(link);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onDoubleClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen();
      }}
      className={cn(
        'flex h-12 cursor-pointer items-center gap-3 border-b px-4 transition-colors duration-100',
      )}
      style={{
        borderColor: 'var(--border-subtle)',
        background: selected ? 'var(--accent-subtle)' : 'transparent',
        borderLeft: link.is_temporary ? '2px solid var(--accent-warm)' : '2px solid transparent',
      }}
    >
      {/* Favicon */}
      <div
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded"
        style={{ background: 'var(--bg-elevated)' }}
      >
        {link.favicon_url ? (
          <img src={link.favicon_url} alt="" className="h-4 w-4 rounded-sm" />
        ) : (
          <ExternalLink size={12} style={{ color: 'var(--text-tertiary)' }} />
        )}
      </div>

      {/* タイトル */}
      <span className="flex-1 truncate text-sm" style={{ color: 'var(--text-primary)' }}>
        {link.title || link.url}
      </span>

      {/* ドメイン */}
      <span className="url-text hidden shrink-0 sm:inline">{domain}</span>

      {/* ピンバッジ */}
      {link.is_pinned && <Pin size={12} style={{ color: 'var(--accent-primary)' }} />}

      {/* 期限バッジ */}
      {expiryInfo && (
        <span
          className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
          style={{
            background: expiryInfo.urgent ? 'rgba(255, 71, 87, 0.15)' : 'rgba(245, 158, 11, 0.15)',
            color: expiryInfo.urgent ? 'var(--accent-danger)' : 'var(--accent-warm)',
          }}
        >
          <Timer size={10} />
          {expiryInfo.label}
        </span>
      )}

      {/* アクセス回数 */}
      <span className="shrink-0 text-xs tabular-nums" style={{ color: 'var(--text-tertiary)' }}>
        {link.visit_count > 0 ? `${link.visit_count}回` : ''}
      </span>

      {/* メニュー */}
      <button
        type="button"
        onClick={(e) => e.stopPropagation()}
        className="rounded p-1 opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-100"
        style={{ color: 'var(--text-tertiary)' }}
      >
        <MoreHorizontal size={14} />
      </button>
    </div>
  );
}

function LinkCard({
  link,
  selected,
  onSelect,
  onOpen,
}: {
  link: Link;
  selected: boolean;
  onSelect: () => void;
  onOpen: () => void;
}) {
  const domain = getDomain(link.url);
  const expiryInfo = getExpiryInfo(link);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onDoubleClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen();
      }}
      className={cn('card-gradient group cursor-pointer p-3 transition-transform duration-150')}
      style={{
        borderColor: selected ? 'var(--border-focus)' : undefined,
        borderLeft: link.is_temporary
          ? '2px solid var(--accent-warm)'
          : '2px solid var(--border-subtle)',
      }}
    >
      <div className="mb-2 flex items-start gap-2">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
          style={{ background: 'var(--bg-elevated)' }}
        >
          {link.favicon_url ? (
            <img src={link.favicon_url} alt="" className="h-6 w-6 rounded" />
          ) : (
            <ExternalLink size={16} style={{ color: 'var(--text-tertiary)' }} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {link.title || link.url}
          </p>
          <p className="url-text truncate">{domain}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {link.is_pinned && <Pin size={11} style={{ color: 'var(--accent-primary)' }} />}
        </div>
        <div className="flex items-center gap-2">
          {expiryInfo && (
            <span
              className="flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px]"
              style={{
                background: expiryInfo.urgent
                  ? 'rgba(255, 71, 87, 0.15)'
                  : 'rgba(245, 158, 11, 0.15)',
                color: expiryInfo.urgent ? 'var(--accent-danger)' : 'var(--accent-warm)',
              }}
            >
              {expiryInfo.label}
            </span>
          )}
          {link.visit_count > 0 && (
            <span className="text-[10px] tabular-nums" style={{ color: 'var(--text-tertiary)' }}>
              {link.visit_count}回閲覧
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ユーティリティ関数

function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function getExpiryInfo(link: Link): { label: string; urgent: boolean } | null {
  if (!link.is_temporary || !link.expires_at) return null;

  const now = new Date();
  const expires = new Date(link.expires_at);
  const diffMs = expires.getTime() - now.getTime();

  if (diffMs < 0) {
    return { label: '期限切れ', urgent: true };
  }

  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 1) {
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
    return { label: `あと${diffHours}時間`, urgent: true };
  }

  return { label: `あと${diffDays}日`, urgent: false };
}
