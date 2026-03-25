import { Command } from 'cmdk';
import { ExternalLink, Pin, Search, Timer } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as commands from './lib/commands';
import type { Link } from './lib/types';
import { safeOpenUrl } from './lib/utils';

const ITEM_HEIGHT = 52;
const HEADER_HEIGHT = 52;
const FOOTER_HEIGHT = 40;
const EMPTY_HEIGHT = 80;
const MAX_VISIBLE_ITEMS = 7;
const PADDING = 16; // リスト上下パディング

async function hideWindow() {
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().hide();
  } catch {
    // ブラウザ環境では無視
  }
}

export function SearchWindow() {
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

  // 初回マウント時に検索 + フォーカス
  useEffect(() => {
    doSearch('');
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [doSearch]);

  // デバウンス検索
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 80);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, doSearch]);

  // ウィンドウ表示時にクエリをクリア・テーマ同期・フォーカス復元
  useEffect(() => {
    const handleFocus = () => {
      // メインウィンドウで変更されたテーマを同期
      const theme = localStorage.getItem('quickmark-theme');
      if (theme === 'light' || theme === 'dark') {
        document.documentElement.dataset.theme = theme;
      }
      setQuery('');
      doSearch('');
      setTimeout(() => inputRef.current?.focus(), 50);
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [doSearch]);

  // 結果件数に応じてウィンドウサイズを調整
  const listHeight = useMemo(() => {
    if (results.length === 0) return EMPTY_HEIGHT;
    const itemsToShow = Math.min(results.length, MAX_VISIBLE_ITEMS);
    return itemsToShow * ITEM_HEIGHT + PADDING;
  }, [results.length]);

  const totalHeight = HEADER_HEIGHT + listHeight + FOOTER_HEIGHT;

  useEffect(() => {
    (async () => {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const win = getCurrentWindow();
        await win.setSize(new (await import('@tauri-apps/api/dpi')).LogicalSize(640, totalHeight));
      } catch {
        // ブラウザ環境では無視
      }
    })();
  }, [totalHeight]);

  // リンクを開く
  const handleOpenLink = useCallback(async (link: Link) => {
    try {
      const url = await commands.openLink(link.id);
      await safeOpenUrl(url);
      await hideWindow();
    } catch (err) {
      console.error('Failed to open link:', err);
    }
  }, []);

  // キーボード
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (query) {
          setQuery('');
        } else {
          hideWindow();
        }
      }
    },
    [query],
  );

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-overlay)',
        borderRadius: 10,
        overflow: 'hidden',
        border: '1px solid var(--border-medium)',
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
            height: listHeight,
            overflow: 'auto',
            padding: 8,
            transition: 'height 150ms ease',
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
            <SearchResultItem key={link.id} link={link} onSelect={() => handleOpenLink(link)} />
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{results.length}件</span>
        </div>
      </Command>

    </div>
  );
}

function SearchResultItem({ link, onSelect }: { link: Link; onSelect: () => void }) {
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
      className="aria-selected:bg-[var(--bg-active)]"
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 26,
          height: 26,
          borderRadius: 6,
          background: 'var(--favicon-bg)',
          flexShrink: 0,
        }}
      >
        {link.favicon_url ? (
          <img src={link.favicon_url} alt="" style={{ width: 18, height: 18, borderRadius: 3 }} />
        ) : (
          <ExternalLink size={14} style={{ color: 'var(--text-tertiary)' }} />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
          {link.url}
        </span>
      </div>

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
