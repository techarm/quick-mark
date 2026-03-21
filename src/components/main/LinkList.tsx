import { ExternalLink, MoreHorizontal, Pin, Timer } from 'lucide-react';
import type { Link } from '../../lib/types';
import { useUIStore } from '../../stores/ui.store';

interface LinkListProps {
  links: Link[];
  onOpen: (link: Link) => void;
}

export function LinkList({ links, onOpen }: LinkListProps) {
  const { viewMode, selectedLinkId, setSelectedLinkId } = useUIStore();

  if (links.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 20,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--radius-xl)',
              background: 'linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-surface) 100%)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              role="img"
              aria-label="リンクアイコン"
              style={{
                color: 'var(--text-tertiary)',
                opacity: 0.5,
              }}
            >
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p
              style={{
                fontSize: 15,
                fontWeight: 500,
                color: 'var(--text-secondary)',
                marginBottom: 8,
              }}
            >
              リンクがありません
            </p>
            <p
              style={{
                fontSize: 13,
                color: 'var(--text-tertiary)',
                lineHeight: 1.6,
              }}
            >
              右上の「追加」ボタンまたは
              <span className="kbd" style={{ margin: '0 4px' }}>
                ⌘⇧A
              </span>
              で追加
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === 'card') {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 12,
          padding: 20,
          overflow: 'auto',
          flex: 1,
        }}
      >
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
    <div style={{ flex: 1, overflow: 'auto' }}>
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
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        height: 48,
        padding: '0 20px',
        cursor: 'pointer',
        borderBottom: '1px solid var(--border-subtle)',
        background: selected ? 'var(--accent-subtle)' : 'transparent',
        borderLeft: link.is_temporary ? '3px solid var(--accent-warm)' : '3px solid transparent',
        transition: 'background 100ms ease',
      }}
    >
      {/* Favicon */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 28,
          height: 28,
          borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-elevated)',
          flexShrink: 0,
        }}
      >
        {link.favicon_url ? (
          <img
            src={link.favicon_url}
            alt=""
            style={{
              width: 16,
              height: 16,
              borderRadius: 2,
            }}
          />
        ) : (
          <ExternalLink size={13} style={{ color: 'var(--text-tertiary)' }} />
        )}
      </div>

      {/* タイトル */}
      <span
        style={{
          flex: 1,
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--text-primary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {link.title || link.url}
      </span>

      {/* ドメイン */}
      <span className="url-text" style={{ flexShrink: 0 }}>
        {domain}
      </span>

      {/* ピン */}
      {link.is_pinned && (
        <Pin
          size={12}
          style={{
            color: 'var(--accent-primary)',
            flexShrink: 0,
          }}
        />
      )}

      {/* 期限バッジ */}
      {expiryInfo && (
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            padding: '2px 8px',
            borderRadius: 99,
            fontSize: 10,
            fontWeight: 500,
            background: expiryInfo.urgent ? 'rgba(255, 71, 87, 0.12)' : 'rgba(245, 158, 11, 0.12)',
            color: expiryInfo.urgent ? 'var(--accent-danger)' : 'var(--accent-warm)',
            flexShrink: 0,
          }}
        >
          <Timer size={10} />
          {expiryInfo.label}
        </span>
      )}

      {/* アクセス回数 */}
      {link.visit_count > 0 && (
        <span
          style={{
            fontSize: 11,
            color: 'var(--text-tertiary)',
            fontVariantNumeric: 'tabular-nums',
            flexShrink: 0,
          }}
        >
          {link.visit_count}回
        </span>
      )}

      {/* メニュー */}
      <button
        type="button"
        onClick={(e) => e.stopPropagation()}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 24,
          height: 24,
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          background: 'transparent',
          color: 'var(--text-tertiary)',
          cursor: 'pointer',
          opacity: 0,
          transition: 'opacity 150ms ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '1';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '0';
        }}
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
      className="card-gradient"
      style={{
        padding: 16,
        cursor: 'pointer',
        borderColor: selected ? 'var(--border-focus)' : undefined,
        borderLeft: link.is_temporary ? '3px solid var(--accent-warm)' : undefined,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-elevated)',
            flexShrink: 0,
          }}
        >
          {link.favicon_url ? (
            <img
              src={link.favicon_url}
              alt=""
              style={{
                width: 20,
                height: 20,
                borderRadius: 4,
              }}
            />
          ) : (
            <ExternalLink size={16} style={{ color: 'var(--text-tertiary)' }} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginBottom: 2,
            }}
          >
            {link.title || link.url}
          </p>
          <span
            className="url-text"
            style={{
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {domain}
          </span>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {link.is_pinned && (
            <Pin
              size={11}
              style={{
                color: 'var(--accent-primary)',
              }}
            />
          )}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {expiryInfo && (
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                padding: '2px 8px',
                borderRadius: 99,
                fontSize: 10,
                background: expiryInfo.urgent
                  ? 'rgba(255, 71, 87, 0.12)'
                  : 'rgba(245, 158, 11, 0.12)',
                color: expiryInfo.urgent ? 'var(--accent-danger)' : 'var(--accent-warm)',
              }}
            >
              {expiryInfo.label}
            </span>
          )}
          {link.visit_count > 0 && (
            <span
              style={{
                fontSize: 10,
                color: 'var(--text-tertiary)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {link.visit_count}回
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

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
