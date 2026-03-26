import { Command } from 'cmdk';
import { Check, ExternalLink, KeyRound, Pin, Search, Timer } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as commands from './lib/commands';
import type { Credential, Link } from './lib/types';
import { safeOpenUrl } from './lib/utils';

const ITEM_HEIGHT = 52;
const HEADER_HEIGHT = 52;
const FOOTER_HEIGHT = 40;
const EMPTY_HEIGHT = 80;
const MAX_VISIBLE_ITEMS = 7;
const PADDING = 16; // リスト上下パディング

type SearchMode = 'links' | 'credentials';

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
  const [linkResults, setLinkResults] = useState<Link[]>([]);
  const [credentialResults, setCredentialResults] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState<{
    name: string;
    field: 'password' | 'username';
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const searchMode: SearchMode = query.startsWith('@') ? 'credentials' : 'links';
  const effectiveQuery = searchMode === 'credentials' ? query.slice(1) : query;

  const doSearch = useCallback(async (q: string, mode: SearchMode) => {
    setLoading(true);
    try {
      if (mode === 'credentials') {
        const creds = await commands.searchCredentials(q);
        setCredentialResults(creds);
      } else {
        const links = await commands.searchLinks(q);
        setLinkResults(links);
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 初回マウント時に検索 + フォーカス
  useEffect(() => {
    doSearch('', 'links');
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [doSearch]);

  // デバウンス検索
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(effectiveQuery, searchMode), 80);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [effectiveQuery, searchMode, doSearch]);

  // ウィンドウ表示時にクエリをクリア・テーマ同期・フォーカス復元
  useEffect(() => {
    const handleFocus = () => {
      // メインウィンドウで変更されたテーマを同期
      const theme = localStorage.getItem('quickmark-theme');
      if (theme === 'light' || theme === 'dark') {
        document.documentElement.dataset.theme = theme;
      }
      setCopySuccess(null);
      setQuery('');
      doSearch('', 'links');
      setTimeout(() => inputRef.current?.focus(), 50);
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [doSearch]);

  const results = searchMode === 'credentials' ? credentialResults : linkResults;

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

  // 認証情報のパスワードをコピー
  const handleCopyPassword = useCallback(async (credential: Credential) => {
    try {
      await commands.copyCredentialPassword(credential.id);
      setCopySuccess({ name: credential.name, field: 'password' });
      setTimeout(async () => {
        setCopySuccess(null);
        await hideWindow();
      }, 1200);
    } catch (err) {
      console.error('Failed to copy password:', err);
    }
  }, []);

  // 認証情報のユーザー名をコピー
  const handleCopyUsername = useCallback(async (credential: Credential) => {
    try {
      await commands.copyCredentialField(credential.id, 'username');
      setCopySuccess({ name: credential.name, field: 'username' });
      setTimeout(async () => {
        setCopySuccess(null);
        await hideWindow();
      }, 1200);
    } catch (err) {
      console.error('Failed to copy username:', err);
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
      // Tab: 認証情報モードでユーザー名をコピー
      if (e.key === 'Tab' && searchMode === 'credentials' && credentialResults.length > 0) {
        e.preventDefault();
        const selected = document.querySelector<HTMLElement>('[cmdk-item][aria-selected="true"]');
        if (selected) {
          const selectedValue = selected.getAttribute('data-value');
          const cred = credentialResults.find((c) => c.id === selectedValue);
          if (cred) {
            handleCopyUsername(cred);
          }
        }
      }
    },
    [query, searchMode, credentialResults, handleCopyUsername],
  );

  // コピー成功時のウィンドウサイズ
  useEffect(() => {
    if (!copySuccess) return;
    (async () => {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const win = getCurrentWindow();
        await win.setSize(
          new (await import('@tauri-apps/api/dpi')).LogicalSize(640, HEADER_HEIGHT + 100),
        );
      } catch {
        // ブラウザ環境では無視
      }
    })();
  }, [copySuccess]);

  // コピー成功表示
  if (copySuccess) {
    return (
      <div
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-overlay)',
          borderRadius: 10,
          overflow: 'hidden',
          border: '1px solid var(--border-medium)',
          height: HEADER_HEIGHT + 100,
          gap: 10,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'rgba(46, 213, 115, 0.12)',
          }}
        >
          <Check size={22} style={{ color: 'var(--accent-success, #2ed573)' }} />
        </div>
        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
          {copySuccess.name} の{copySuccess.field === 'password' ? 'パスワード' : 'ユーザー名'}
          をコピーしました
        </span>
        {copySuccess.field === 'password' && (
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            30秒後にクリップボードをクリアします
          </span>
        )}
      </div>
    );
  }

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
          {searchMode === 'credentials' ? (
            <KeyRound size={18} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
          ) : (
            <Search size={18} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
          )}
          <Command.Input
            ref={inputRef}
            value={query}
            onValueChange={setQuery}
            placeholder="検索..."
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
              {searchMode === 'credentials'
                ? effectiveQuery
                  ? '該当する認証情報が見つかりません'
                  : '認証情報がありません'
                : query
                  ? '該当するリンクが見つかりません'
                  : 'リンクがありません'}
            </div>
          </Command.Empty>

          {searchMode === 'credentials'
            ? credentialResults.map((cred) => (
                <CredentialResultItem
                  key={cred.id}
                  credential={cred}
                  onSelect={() => handleCopyPassword(cred)}
                />
              ))
            : linkResults.map((link) => (
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
              {searchMode === 'credentials' ? 'PW コピー' : '開く'}
            </span>
            {searchMode === 'credentials' ? (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  color: 'var(--text-tertiary)',
                }}
              >
                <span className="kbd">Tab</span>
                ID コピー
              </span>
            ) : (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  color: 'var(--text-tertiary)',
                }}
              >
                <span className="kbd">@</span>
                認証情報
              </span>
            )}
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
            fontSize: 11,
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

function CredentialResultItem({
  credential,
  onSelect,
}: {
  credential: Credential;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      value={credential.id}
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
          background: 'var(--accent-subtle)',
          flexShrink: 0,
        }}
      >
        <KeyRound size={14} style={{ color: 'var(--accent-primary)' }} />
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
            {credential.name}
          </span>
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
          {credential.username}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        <span
          style={{
            padding: '2px 8px',
            borderRadius: 99,
            fontSize: 11,
            background: 'var(--accent-subtle)',
            color: 'var(--accent-primary)',
          }}
        >
          Enter PW
        </span>
        <span
          style={{
            padding: '2px 8px',
            borderRadius: 99,
            fontSize: 11,
            background: 'var(--bg-elevated)',
            color: 'var(--text-tertiary)',
          }}
        >
          Tab ID
        </span>
      </div>
    </Command.Item>
  );
}
