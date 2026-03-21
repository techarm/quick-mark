import { Command } from 'cmdk';
import { ExternalLink, Pin, Search, Timer } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as commands from './lib/commands';
import type { Link } from './lib/types';

async function safeOpenUrl(url: string) {
  try {
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    await openUrl(url);
  } catch {
    window.open(url, '_blank');
  }
}

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

  // ウィンドウ表示時にフォーカスを復元
  useEffect(() => {
    const handleFocus = () => {
      doSearch(query || '');
      setTimeout(() => inputRef.current?.focus(), 50);
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [query, doSearch]);

  // ウィンドウがフォーカスを失ったら非表示にする
  useEffect(() => {
    const handleBlur = () => {
      // 少し遅延させてフォーカス移動先を確認（ウィンドウ内の要素への移動は無視）
      setTimeout(async () => {
        if (!document.hasFocus()) {
          await hideWindow();
        }
      }, 100);
    };
    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, []);

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
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-overlay)',
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid var(--border-medium)',
        boxShadow:
          '0 0 0 1px rgba(255,255,255,0.04), 0 24px 48px rgba(0,0,0,0.5), 0 8px 16px rgba(0,0,0,0.3)',
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
            flex: 1,
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

      <style>{`
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
          {domain}
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

function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
