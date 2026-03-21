import { Calendar, Clock, ExternalLink, Hash, Link2, Pin, X } from 'lucide-react';
import type { Link } from '../../lib/types';
import { useUIStore } from '../../stores/ui.store';

interface LinkDetailProps {
  link: Link | null;
  onOpen: (link: Link) => void;
}

export function LinkDetail({ link, onOpen }: LinkDetailProps) {
  const { setDetailPanelOpen, setSelectedLinkId } = useUIStore();

  if (!link) return null;

  const domain = getDomain(link.url);

  return (
    <div
      className="flex h-full w-[var(--detail-panel-width)] flex-col border-l"
      style={{
        borderColor: 'var(--border-subtle)',
        background: 'var(--bg-surface)',
      }}
    >
      {/* ヘッダー */}
      <div
        className="flex items-center justify-between border-b px-4 py-2"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
          リンク詳細
        </span>
        <button
          type="button"
          onClick={() => {
            setDetailPanelOpen(false);
            setSelectedLinkId(null);
          }}
          className="rounded p-1 transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <X size={14} />
        </button>
      </div>

      {/* コンテンツ */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Favicon + タイトル */}
        <div className="mb-4 flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{ background: 'var(--bg-elevated)' }}
          >
            {link.favicon_url ? (
              <img src={link.favicon_url} alt="" className="h-7 w-7 rounded" />
            ) : (
              <ExternalLink size={20} style={{ color: 'var(--text-tertiary)' }} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3
              className="text-sm font-semibold leading-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              {link.title || '無題'}
            </h3>
            {link.is_pinned && (
              <div className="mt-1 flex items-center gap-1">
                <Pin size={10} style={{ color: 'var(--accent-primary)' }} />
                <span className="text-[10px]" style={{ color: 'var(--accent-primary)' }}>
                  ピン留め
                </span>
              </div>
            )}
          </div>
        </div>

        {/* URL */}
        <DetailRow icon={Link2} label="URL">
          <button
            type="button"
            onClick={() => onOpen(link)}
            className="url-text truncate text-left transition-colors hover:underline"
            style={{ color: 'var(--accent-primary)' }}
          >
            {link.url}
          </button>
        </DetailRow>

        {/* ドメイン */}
        <DetailRow icon={ExternalLink} label="ドメイン">
          <span className="url-text" style={{ color: 'var(--text-secondary)' }}>
            {domain}
          </span>
        </DetailRow>

        {/* 説明 */}
        {link.description && (
          <DetailRow icon={Hash} label="説明">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {link.description}
            </p>
          </DetailRow>
        )}

        {/* メタデータ */}
        <div className="mt-4 border-t pt-4" style={{ borderColor: 'var(--border-subtle)' }}>
          <DetailRow icon={Hash} label="アクセス回数">
            <span className="text-sm tabular-nums" style={{ color: 'var(--text-secondary)' }}>
              {link.visit_count}回
            </span>
          </DetailRow>

          <DetailRow icon={Calendar} label="作成日時">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {formatDate(link.created_at)}
            </span>
          </DetailRow>

          {link.last_visited_at && (
            <DetailRow icon={Clock} label="最終アクセス">
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {formatDate(link.last_visited_at)}
              </span>
            </DetailRow>
          )}

          {link.is_temporary && link.expires_at && (
            <DetailRow icon={Clock} label="期限">
              <span
                className="text-sm"
                style={{
                  color:
                    new Date(link.expires_at) < new Date()
                      ? 'var(--accent-danger)'
                      : 'var(--accent-warm)',
                }}
              >
                {formatDate(link.expires_at)}
              </span>
            </DetailRow>
          )}
        </div>
      </div>

      {/* アクション */}
      <div className="border-t p-3" style={{ borderColor: 'var(--border-subtle)' }}>
        <button
          type="button"
          onClick={() => onOpen(link)}
          className="flex w-full items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-all duration-150 hover:brightness-110"
          style={{
            background: 'var(--accent-gradient)',
            color: 'var(--text-on-accent)',
          }}
        >
          <ExternalLink size={14} />
          ブラウザで開く
        </button>
      </div>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof ExternalLink;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center gap-1.5">
        <Icon size={11} style={{ color: 'var(--text-tertiary)' }} />
        <span
          className="text-[10px] uppercase tracking-wider"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {label}
        </span>
      </div>
      <div className="pl-[18px]">{children}</div>
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

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return dateStr;
  }
}
