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

  // 検索実行
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

  // 空クエリ時のおすすめを読み込み
  useEffect(() => {
    if (open) {
      doSearch('');
      // フォーカス
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [open, doSearch]);

  // デバウンス検索
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 80);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open, doSearch]);

  // ESCで閉じる
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
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      style={{ background: 'rgba(0, 0, 0, 0.4)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div
        className="glass-overlay w-[680px] overflow-hidden"
        style={{
          animation: 'search-enter 150ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <Command shouldFilter={false} onKeyDown={handleKeyDown}>
          {/* 検索入力 */}
          <div
            className="flex items-center gap-3 border-b px-4 py-3"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <Search size={18} style={{ color: 'var(--text-tertiary)' }} />
            <Command.Input
              ref={inputRef}
              value={query}
              onValueChange={setQuery}
              placeholder="リンクを検索..."
              className="flex-1 bg-transparent text-base outline-none"
              style={{ color: 'var(--text-primary)' }}
            />
            {loading && (
              <div
                className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"
                style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }}
              />
            )}
            <kbd
              className="rounded px-1.5 py-0.5 text-[10px]"
              style={{
                background: 'var(--bg-elevated)',
                color: 'var(--text-tertiary)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              ESC
            </kbd>
          </div>

          {/* 結果リスト */}
          <Command.List
            className="max-h-[400px] overflow-y-auto p-2"
            style={{ scrollbarWidth: 'thin' }}
          >
            <Command.Empty>
              <div className="py-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
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
            className="flex items-center justify-between border-t px-4 py-2"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center gap-3">
              <span
                className="flex items-center gap-1 text-[10px]"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <kbd className="rounded bg-[var(--bg-elevated)] px-1 py-0.5 text-[9px]">↑↓</kbd>
                選択
              </span>
              <span
                className="flex items-center gap-1 text-[10px]"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <kbd className="rounded bg-[var(--bg-elevated)] px-1 py-0.5 text-[9px]">Enter</kbd>
                開く
              </span>
            </div>
            <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
              {results.length}件
            </span>
          </div>
        </Command>

        <style>{`
          @keyframes search-enter {
            from {
              opacity: 0;
              transform: scale(0.96) translateY(-8px);
            }
            to {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }
        `}</style>
      </div>
    </div>
  );
}

function SearchResultItem({ link, onSelect }: { link: Link; onSelect: () => void }) {
  const domain = getDomain(link.url);

  return (
    <Command.Item
      value={link.id}
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 transition-colors duration-75 aria-selected:bg-[rgba(226,80,80,0.1)]"
    >
      {/* Favicon */}
      <div
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded"
        style={{ background: 'var(--bg-elevated)' }}
      >
        {link.favicon_url ? (
          <img src={link.favicon_url} alt="" className="h-4 w-4 rounded-sm" />
        ) : (
          <ExternalLink size={12} style={{ color: 'var(--text-tertiary)' }} />
        )}
      </div>

      {/* タイトル + URL */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {link.title || link.url}
          </span>
          {link.is_pinned && <Pin size={10} style={{ color: 'var(--accent-primary)' }} />}
        </div>
        <span className="url-text truncate block">{domain}</span>
      </div>

      {/* バッジ */}
      {link.is_temporary && link.expires_at && (
        <span
          className="flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px]"
          style={{
            background: 'rgba(245, 158, 11, 0.15)',
            color: 'var(--accent-warm)',
          }}
        >
          <Timer size={9} />
          一時
        </span>
      )}

      {/* アクセス回数 */}
      {link.visit_count > 0 && (
        <span
          className="shrink-0 text-[10px] tabular-nums"
          style={{ color: 'var(--text-tertiary)' }}
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
