import {
  Calendar,
  Clock,
  ExternalLink,
  Hash,
  Link2,
  Pencil,
  Pin,
  PinOff,
  Trash2,
  X,
} from 'lucide-react';
import type { Link } from '../../lib/types';
import { formatDate, getDomain } from '../../lib/utils';
import { useUIStore } from '../../stores/ui.store';

interface LinkDetailProps {
  link: Link | null;
  onOpen: (link: Link) => void;
  onEdit?: (link: Link) => void;
  onDelete?: (link: Link) => void;
  onTogglePin?: (link: Link) => void;
}

export function LinkDetail({ link, onOpen, onEdit, onDelete, onTogglePin }: LinkDetailProps) {
  const { setDetailPanelOpen, setSelectedLinkId } = useUIStore();

  if (!link) return null;

  const domain = getDomain(link.url);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: 'var(--detail-panel-width)',
        borderLeft: '1px solid var(--border-medium)',
        background: 'var(--bg-surface)',
      }}
    >
      {/* ヘッダー */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          リンク詳細
        </span>
        <button
          type="button"
          onClick={() => {
            setDetailPanelOpen(false);
            setSelectedLinkId(null);
          }}
          className="dialog-close-btn"
          aria-label="詳細パネルを閉じる"
        >
          <X size={14} />
        </button>
      </div>

      {/* コンテンツ */}
      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        {/* Favicon + タイトル */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 14,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              borderRadius: 'var(--radius-lg)',
              background: 'var(--favicon-bg)',
              border: '1px solid var(--border-subtle)',
              flexShrink: 0,
            }}
          >
            {link.favicon_url ? (
              <img
                src={link.favicon_url}
                alt=""
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 4,
                }}
              />
            ) : (
              <ExternalLink size={20} style={{ color: 'var(--text-tertiary)' }} />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--text-primary)',
                lineHeight: 1.4,
                wordBreak: 'break-word',
              }}
            >
              {link.title || '無題'}
            </h3>
            {link.is_pinned && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  marginTop: 6,
                }}
              >
                <Pin
                  size={11}
                  style={{
                    color: 'var(--accent-primary)',
                  }}
                />
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--accent-primary)',
                    fontWeight: 500,
                  }}
                >
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
            className="url-text"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--accent-primary)',
              textAlign: 'left',
              wordBreak: 'break-all',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.85em',
              padding: 0,
            }}
          >
            {link.url}
          </button>
        </DetailRow>

        <DetailRow icon={ExternalLink} label="ドメイン">
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{domain}</span>
        </DetailRow>

        {link.description && (
          <DetailRow icon={Hash} label="説明">
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {link.description}
            </p>
          </DetailRow>
        )}

        {/* メタデータ */}
        <div
          style={{
            marginTop: 20,
            paddingTop: 20,
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <DetailRow icon={Hash} label="アクセス回数">
            <span
              style={{
                fontSize: 13,
                color: 'var(--text-secondary)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {link.visit_count}回
            </span>
          </DetailRow>

          <DetailRow icon={Calendar} label="作成日時">
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {formatDate(link.created_at)}
            </span>
          </DetailRow>

          {link.last_visited_at && (
            <DetailRow icon={Clock} label="最終アクセス">
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {formatDate(link.last_visited_at)}
              </span>
            </DetailRow>
          )}

          {link.is_temporary && link.expires_at && (
            <DetailRow icon={Clock} label="期限">
              <span
                style={{
                  fontSize: 13,
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
      <div
        style={{
          padding: 16,
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <button
          type="button"
          onClick={() => onOpen(link)}
          className="btn btn-primary"
          style={{
            width: '100%',
            gap: 8,
          }}
        >
          <ExternalLink size={14} />
          ブラウザで開く
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(link)}
              className="btn btn-secondary"
              style={{ flex: 1, gap: 6 }}
            >
              <Pencil size={13} />
              編集
            </button>
          )}
          {onTogglePin && (
            <button
              type="button"
              onClick={() => onTogglePin(link)}
              className="btn btn-secondary"
              style={{ flex: 1, gap: 6 }}
            >
              {link.is_pinned ? <PinOff size={13} /> : <Pin size={13} />}
              {link.is_pinned ? '解除' : 'ピン留め'}
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(link)}
              className="btn btn-ghost"
              style={{
                flex: 1,
                gap: 6,
                color: 'var(--accent-danger)',
              }}
            >
              <Trash2 size={13} />
              削除
            </button>
          )}
        </div>
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
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 4,
        }}
      >
        <Icon size={12} style={{ color: 'var(--text-tertiary)' }} />
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {label}
        </span>
      </div>
      <div style={{ paddingLeft: 18 }}>{children}</div>
    </div>
  );
}
