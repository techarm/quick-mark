import * as Dialog from '@radix-ui/react-dialog';
import { open as openFileDialog } from '@tauri-apps/plugin-dialog';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { AlertTriangle, CheckCircle, FileUp, Loader2, Upload, X } from 'lucide-react';
import { useState } from 'react';
import type { ImportItem, ImportResult } from '../lib/commands';
import * as commands from '../lib/commands';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

type ImportState = 'idle' | 'parsing' | 'preview' | 'importing' | 'done';

export function ImportDialog({ open, onOpenChange, onComplete }: ImportDialogProps) {
  const [state, setState] = useState<ImportState>('idle');
  const [items, setItems] = useState<ImportItem[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [duplicateUrls, setDuplicateUrls] = useState<Set<string>>(new Set());

  const handleSelectFile = async () => {
    try {
      const selected = await openFileDialog({
        multiple: false,
        filters: [
          { name: 'サポート形式', extensions: ['html', 'htm', 'json'] },
          { name: 'HTMLブックマーク', extensions: ['html', 'htm'] },
          { name: 'JSONファイル', extensions: ['json'] },
        ],
      });
      if (!selected) return;

      setState('parsing');
      setError(null);

      const filePath =
        typeof selected === 'string' ? selected : (selected as { path: string }).path;
      const content = await readTextFile(filePath);

      // 拡張子に応じてパーサーを選択
      const isJson = filePath.toLowerCase().endsWith('.json');
      const parsed = isJson
        ? await commands.parseJsonLinks(content)
        : await commands.parseBookmarksHtml(content);

      setItems(parsed);

      // 重複チェック
      try {
        const urls = parsed.map((item) => item.url);
        const dups = await commands.checkDuplicateUrls(urls);
        setDuplicateUrls(new Set(dups));
      } catch {
        setDuplicateUrls(new Set());
      }

      setState('preview');
    } catch (err) {
      setError(`ファイルの解析に失敗しました: ${err}`);
      setState('idle');
    }
  };

  const handleImport = async () => {
    setState('importing');
    try {
      const res = await commands.importBookmarks(items);
      setResult(res);
      setState('done');
      onComplete();
    } catch (err) {
      setError(`インポートに失敗しました: ${err}`);
      setState('preview');
    }
  };

  const handleClose = () => {
    setState('idle');
    setItems([]);
    setResult(null);
    setError(null);
    setDuplicateUrls(new Set());
    onOpenChange(false);
  };

  const grouped = items.reduce<Record<string, ImportItem[]>>((acc, item) => {
    const key = item.folder || '未分類';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          className="dialog-content glass-overlay"
          style={{
            width: 540,
            maxHeight: '80vh',
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* ヘッダー */}
          <div className="dialog-header">
            <Dialog.Title
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 15,
                fontWeight: 600,
                color: 'var(--text-primary)',
                margin: 0,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--accent-subtle)',
                }}
              >
                <Upload size={14} style={{ color: 'var(--accent-primary)' }} />
              </div>
              ブックマークをインポート
            </Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="dialog-close-btn">
                <X size={15} />
              </button>
            </Dialog.Close>
          </div>

          {/* コンテンツ */}
          <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
            {state === 'idle' && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 16,
                  padding: '32px 0',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 64,
                    height: 64,
                    borderRadius: 'var(--radius-xl)',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <FileUp size={28} style={{ color: 'var(--text-tertiary)', opacity: 0.6 }} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      marginBottom: 6,
                    }}
                  >
                    HTMLブックマークまたはJSONファイルを選択
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                    ブラウザブックマーク(.html) または JSON配列(.json)に対応
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSelectFile}
                  className="btn btn-primary"
                  style={{ marginTop: 4 }}
                >
                  ファイルを選択
                </button>
              </div>
            )}

            {state === 'parsing' && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 12,
                  padding: '40px 0',
                }}
              >
                <Loader2
                  size={28}
                  className="animate-spin"
                  style={{ color: 'var(--accent-primary)' }}
                />
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  ブックマークを解析中...
                </p>
              </div>
            )}

            {state === 'preview' && (
              <div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  <strong style={{ color: 'var(--text-primary)' }}>{items.length}件</strong>
                  のリンクが見つかりました
                </p>
                {duplicateUrls.size > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 12px',
                      marginBottom: 16,
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(245, 158, 11, 0.08)',
                      border: '1px solid rgba(245, 158, 11, 0.15)',
                      fontSize: 12,
                      color: 'var(--accent-warm)',
                    }}
                  >
                    <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                    {duplicateUrls.size}件は既に登録済みです（スキップされます）
                  </div>
                )}
                <div
                  style={{
                    maxHeight: 280,
                    overflow: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                  }}
                >
                  {Object.entries(grouped).map(([folder, folderItems]) => (
                    <div key={folder}>
                      <p
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: 'var(--text-tertiary)',
                          marginBottom: 6,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {folder}（{folderItems.length}件）
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {folderItems.slice(0, 5).map((item) => {
                          const isDup = duplicateUrls.has(item.url);
                          return (
                            <div
                              key={item.url}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '6px 10px',
                                borderRadius: 'var(--radius-sm)',
                                background: isDup
                                  ? 'rgba(245, 158, 11, 0.06)'
                                  : 'var(--bg-elevated)',
                                fontSize: 12,
                                color: isDup ? 'var(--text-tertiary)' : 'var(--text-secondary)',
                                textDecoration: isDup ? 'line-through' : 'none',
                              }}
                            >
                              <span
                                style={{
                                  flex: 1,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {item.title}
                              </span>
                              {isDup && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    color: 'var(--accent-warm)',
                                    flexShrink: 0,
                                  }}
                                >
                                  重複
                                </span>
                              )}
                            </div>
                          );
                        })}
                        {folderItems.length > 5 && (
                          <p
                            style={{ paddingLeft: 10, fontSize: 11, color: 'var(--text-tertiary)' }}
                          >
                            ...他 {folderItems.length - 5}件
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {state === 'importing' && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 12,
                  padding: '40px 0',
                }}
              >
                <Loader2
                  size={28}
                  className="animate-spin"
                  style={{ color: 'var(--accent-primary)' }}
                />
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>インポート中...</p>
              </div>
            )}

            {state === 'done' && result && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 16,
                  padding: '32px 0',
                }}
              >
                <CheckCircle size={40} style={{ color: 'var(--accent-success)' }} />
                <div style={{ textAlign: 'center' }}>
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      marginBottom: 6,
                    }}
                  >
                    インポート完了
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {result.imported}件インポート / {result.skipped}件スキップ /{' '}
                    {result.categories_created}カテゴリ作成
                  </p>
                </div>
              </div>
            )}

            {error && (
              <p style={{ marginTop: 12, fontSize: 12, color: 'var(--accent-danger)' }}>{error}</p>
            )}
          </div>

          {/* フッター */}
          {(state === 'preview' || state === 'done') && (
            <div className="dialog-footer">
              {state === 'preview' && (
                <>
                  <button type="button" onClick={handleClose} className="btn btn-ghost">
                    キャンセル
                  </button>
                  <button type="button" onClick={handleImport} className="btn btn-primary">
                    {items.length}件をインポート
                  </button>
                </>
              )}
              {state === 'done' && (
                <button type="button" onClick={handleClose} className="btn btn-primary">
                  閉じる
                </button>
              )}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
