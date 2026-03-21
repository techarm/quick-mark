import { Command } from 'cmdk';
import { ExternalLink, Pin, Search, Timer } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as commands from '../../lib/commands';
import type { Link } from '../../lib/types';

interface SearchPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenLink: (link: Link) => void;
}

export function SearchPalette({ open, onOpenChange, onOpenLink }: SearchPaletteProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Link[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const doSearch = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const links = await commands.searchLinks(q);
      setResults(links);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      doSearch('');
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [open, doSearch]);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 80);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open, doSearch]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (query) {
          setQuery('');
        } else {
          onOpenChange(false);
        }
      }
    },
    [query, onOpenChange],
  );

  if (!open) return null;

  return (
    <div
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '15vh',
        background: 'rgba(0, 0, 0, 0.45)',
        animation: 'overlay-show 200ms ease',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div
        className="glass-overlay"
        style={{
          width: 640,
          overflow: 'hidden',
          animation: 'search-enter 150ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <Command shouldFilter={false} onKeyDown={handleKeyDown}>
          {/* 検索入力 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '14px 18px',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <Search size={18} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
            <Command.Input
              ref={inputRef}
              value={query}
              onValueChange={setQuery}
              placeholder="リンクを検索..."
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: 15,
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
              }}
            />
            {loading && (
              <div
                style={{
                  width: 16,
                  height: 16,
                  border: '2px solid var(--accent-primary)',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 600ms linear infinite',
                }}
              />
            )}
            <span className="kbd">ESC</span>
          </div>

          {/* 結果リスト */}
          <Command.List
            style={{
              maxHeight: 380,
              overflow: 'auto',
              padding: 8,
            }}
          >
            <Command.Empty>
              <div
                style={{
                  padding: '40px 0',
                  textAlign: 'center',
                  fontSize: 13,
                  color: 'var(--text-tertiary)',
                }}
              >
                {query ? '該当するリンクが見つかりません' : 'リンクがありません'}
              </div>
            </Command.Empty>

            {results.map((link) => (
              <SearchResultItem
                key={link.id}
                link={link}
                onSelect={() => {
                  onOpenLink(link);
                  onOpenChange(false);
                }}
              />
            ))}
          </Command.List>

          {/* フッター */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 18px',
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  color: 'var(--text-tertiary)',
                }}
              >
                <span className="kbd">↑↓</span>
                選択
              </span>
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  color: 'var(--text-tertiary)',
                }}
              >
                <span className="kbd">Enter</span>
                開く
              </span>
            </div>
            <span
              style={{
                fontSize: 11,
                color: 'var(--text-tertiary)',
              }}
            >
              {results.length}件
            </span>
          </div>
        </Command>
      </div>

      <style>{`
        @keyframes search-enter {
          from { opacity: 0; transform: scale(0.96) translateY(-8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function SearchResultItem({ link, onSelect }: { link: Link; onSelect: () => void }) {
  const domain = getDomain(link.url);

  return (
    <Command.Item
      value={link.id}
      onSelect={onSelect}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 12px',
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        transition: 'background 75ms ease',
      }}
      className="aria-selected:bg-[rgba(226,80,80,0.1)]"
    >
      {/* Favicon */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          height: 32,
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
              width: 18,
              height: 18,
              borderRadius: 3,
            }}
          />
        ) : (
          <ExternalLink size={14} style={{ color: 'var(--text-tertiary)' }} />
        )}
      </div>

      {/* タイトル + URL */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span
            style={{
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
          {link.is_pinned && (
            <Pin size={11} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
          )}
        </div>
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

      {/* バッジ */}
      {link.is_temporary && link.expires_at && (
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            padding: '2px 8px',
            borderRadius: 99,
            fontSize: 10,
            background: 'rgba(245, 158, 11, 0.12)',
            color: 'var(--accent-warm)',
            flexShrink: 0,
          }}
        >
          <Timer size={9} />
          一時
        </span>
      )}

      {link.visit_count > 0 && (
        <span
          style={{
            fontSize: 11,
            color: 'var(--text-tertiary)',
            flexShrink: 0,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {link.visit_count}回
        </span>
      )}
    </Command.Item>
  );
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
