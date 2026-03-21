import * as Dialog from '@radix-ui/react-dialog';
import { open as openFileDialog } from '@tauri-apps/plugin-dialog';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { CheckCircle, FileUp, Loader2, Upload, X } from 'lucide-react';
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

  const handleSelectFile = async () => {
    try {
      const selected = await openFileDialog({
        multiple: false,
        filters: [{ name: 'HTMLファイル', extensions: ['html', 'htm'] }],
      });

      if (!selected) return;

      setState('parsing');
      setError(null);

      const filePath =
        typeof selected === 'string' ? selected : (selected as { path: string }).path;
      const content = await readTextFile(filePath);
      const parsed = await commands.parseBookmarksHtml(content);
      setItems(parsed);
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
    onOpenChange(false);
  };

  // フォルダごとにグループ化
  const grouped = items.reduce<Record<string, ImportItem[]>>((acc, item) => {
    const key = item.folder || '未分類';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-50"
          style={{ background: 'rgba(0, 0, 0, 0.5)' }}
        />
        <Dialog.Content className="glass-overlay fixed top-1/2 left-1/2 z-50 w-[560px] max-h-[80vh] -translate-x-1/2 -translate-y-1/2 flex flex-col p-0">
          {/* ヘッダー */}
          <div
            className="flex items-center justify-between border-b px-5 py-3"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <Dialog.Title
              className="flex items-center gap-2 text-sm font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              <Upload size={16} style={{ color: 'var(--accent-primary)' }} />
              ブックマークをインポート
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded p-1"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <X size={14} />
              </button>
            </Dialog.Close>
          </div>

          {/* コンテンツ */}
          <div className="flex-1 overflow-y-auto p-5">
            {state === 'idle' && (
              <div className="flex flex-col items-center gap-4 py-8">
                <FileUp size={48} style={{ color: 'var(--text-tertiary)' }} />
                <div className="text-center">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    ブラウザからエクスポートしたHTMLファイルを選択
                  </p>
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    Chrome、Firefox、Safari、Edge のブックマークに対応
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSelectFile}
                  className="rounded-md px-4 py-2 text-sm font-medium transition-all hover:brightness-110"
                  style={{ background: 'var(--accent-gradient)', color: 'var(--text-on-accent)' }}
                >
                  ファイルを選択
                </button>
              </div>
            )}

            {state === 'parsing' && (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2
                  size={32}
                  className="animate-spin"
                  style={{ color: 'var(--accent-primary)' }}
                />
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  ブックマークを解析中...
                </p>
              </div>
            )}

            {state === 'preview' && (
              <div>
                <p className="mb-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {items.length}件のリンクが見つかりました。インポートしますか？
                </p>
                <div className="max-h-[300px] space-y-3 overflow-y-auto">
                  {Object.entries(grouped).map(([folder, folderItems]) => (
                    <div key={folder}>
                      <p
                        className="mb-1 text-xs font-semibold"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        {folder}（{folderItems.length}件）
                      </p>
                      <div className="space-y-1">
                        {folderItems.slice(0, 5).map((item) => (
                          <div
                            key={item.url}
                            className="rounded px-2 py-1 text-xs"
                            style={{
                              background: 'var(--bg-elevated)',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            <span className="truncate">{item.title}</span>
                          </div>
                        ))}
                        {folderItems.length > 5 && (
                          <p className="px-2 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
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
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2
                  size={32}
                  className="animate-spin"
                  style={{ color: 'var(--accent-primary)' }}
                />
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  インポート中...
                </p>
              </div>
            )}

            {state === 'done' && result && (
              <div className="flex flex-col items-center gap-3 py-8">
                <CheckCircle size={48} style={{ color: 'var(--accent-success)' }} />
                <div className="text-center">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    インポート完了
                  </p>
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {result.imported}件インポート / {result.skipped}件スキップ（重複）/
                    {result.categories_created}カテゴリ作成
                  </p>
                </div>
              </div>
            )}

            {error && (
              <p className="mt-2 text-xs" style={{ color: 'var(--accent-danger)' }}>
                {error}
              </p>
            )}
          </div>

          {/* フッター */}
          {(state === 'preview' || state === 'done') && (
            <div
              className="flex justify-end gap-2 border-t px-5 py-3"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              {state === 'preview' && (
                <>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-md px-4 py-2 text-sm"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    キャンセル
                  </button>
                  <button
                    type="button"
                    onClick={handleImport}
                    className="rounded-md px-4 py-2 text-sm font-medium transition-all hover:brightness-110"
                    style={{ background: 'var(--accent-gradient)', color: 'var(--text-on-accent)' }}
                  >
                    {items.length}件をインポート
                  </button>
                </>
              )}
              {state === 'done' && (
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-md px-4 py-2 text-sm font-medium transition-all hover:brightness-110"
                  style={{ background: 'var(--accent-gradient)', color: 'var(--text-on-accent)' }}
                >
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
