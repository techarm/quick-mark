import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle, Link2, Loader2, X } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import type { DuplicateInfo } from '../../lib/commands';
import * as commands from '../../lib/commands';
import type { Category, CreateLinkInput, UpdateLinkInput } from '../../lib/types';

interface AddLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  onSubmit: (input: CreateLinkInput) => void;
  onUpdate?: (input: UpdateLinkInput) => void;
}

export function AddLinkDialog({
  open,
  onOpenChange,
  categories,
  onSubmit,
  onUpdate,
}: AddLinkDialogProps) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [isTemporary, setIsTemporary] = useState(false);
  const [expiryDays, setExpiryDays] = useState(7);
  const [fetching, setFetching] = useState(false);
  const [duplicate, setDuplicate] = useState<DuplicateInfo | null>(null);
  const [duplicateAction, setDuplicateAction] = useState<'add' | 'update' | null>(null);
  const lastFetchedUrl = useRef('');

  const resetForm = useCallback(() => {
    setUrl('');
    setTitle('');
    setDescription('');
    setFaviconUrl('');
    setCategoryId('');
    setIsTemporary(false);
    setExpiryDays(7);
    setDuplicate(null);
    setDuplicateAction(null);
    lastFetchedUrl.current = '';
  }, []);

  // URL入力後のフォーカスアウトで自動取得
  const handleUrlBlur = useCallback(() => {
    const trimmed = url.trim();
    if (!trimmed || lastFetchedUrl.current === trimmed) return;
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return;

    lastFetchedUrl.current = trimmed;
    setFetching(true);
    setDuplicate(null);
    setDuplicateAction(null);

    // requestAnimationFrameでローディング表示を先にレンダリングしてから取得開始
    requestAnimationFrame(() => {
      // URL情報取得と重複チェックを並行実行
      const fetchPromise = commands
        .fetchUrlInfo(trimmed)
        .then((info) => {
          if (info.title && !title.trim()) setTitle(info.title);
          if (info.description && !description.trim()) setDescription(info.description);
          if (info.favicon_url) setFaviconUrl(info.favicon_url);
        })
        .catch(() => {
          try {
            const domain = new URL(trimmed).hostname;
            if (!title.trim()) setTitle(domain);
            setFaviconUrl(`https://www.google.com/s2/favicons?domain=${domain}&sz=32`);
          } catch {
            // URL解析失敗
          }
        });

      const dupPromise = commands
        .checkDuplicateUrl(trimmed)
        .then((info) => {
          setDuplicate(info);
        })
        .catch(() => {});

      Promise.all([fetchPromise, dupPromise]).finally(() => setFetching(false));
    });
  }, [url, title, description]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    const expiresAt = isTemporary
      ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString()
      : undefined;

    // 「既存を更新」を選択した場合
    if (duplicateAction === 'update' && duplicate && onUpdate) {
      onUpdate({
        id: duplicate.id,
        url: url.trim(),
        title: title.trim() || url.trim(),
        description: description.trim() || undefined,
        favicon_url: faviconUrl || undefined,
        category_id: categoryId || undefined,
        is_temporary: isTemporary,
        expires_at: expiresAt,
      });
    } else {
      onSubmit({
        url: url.trim(),
        title: title.trim() || url.trim(),
        description: description.trim() || undefined,
        favicon_url: faviconUrl || undefined,
        category_id: categoryId || undefined,
        is_temporary: isTemporary,
        expires_at: expiresAt,
      });
    }

    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) resetForm();
        onOpenChange(isOpen);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content glass-overlay" style={{ width: 480, padding: 0 }}>
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
                <Link2 size={14} style={{ color: 'var(--accent-primary)' }} />
              </div>
              リンクを追加
            </Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="dialog-close-btn">
                <X size={15} />
              </button>
            </Dialog.Close>
          </div>

          {/* フォーム */}
          <form onSubmit={handleSubmit}>
            <div
              className="dialog-body"
              style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'relative' }}
            >
              {/* ローディングオーバーレイ */}
              {fetching && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(15, 11, 11, 0.6)',
                    borderRadius: 'var(--radius-md)',
                    zIndex: 10,
                    gap: 10,
                  }}
                >
                  <Loader2
                    size={20}
                    style={{
                      color: 'var(--accent-primary)',
                      animation: 'spin 800ms linear infinite',
                    }}
                  />
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    URL情報を取得中...
                  </span>
                </div>
              )}

              {/* URL */}
              <div className="form-field">
                <label className="form-label">
                  URL<span className="required">*</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {faviconUrl && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 28,
                        height: 28,
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(255, 255, 255, 0.9)',
                        flexShrink: 0,
                      }}
                    >
                      <img
                        src={faviconUrl}
                        alt=""
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 3,
                        }}
                      />
                    </div>
                  )}
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onBlur={handleUrlBlur}
                    placeholder="https://example.com"
                    className="input-field"
                    style={{ flex: 1 }}
                    required
                  />
                </div>
              </div>

              {/* 重複警告 */}
              {duplicate && !duplicateAction && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid rgba(245, 158, 11, 0.2)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertTriangle
                      size={15}
                      style={{ color: 'var(--accent-warm)', flexShrink: 0 }}
                    />
                    <span style={{ fontSize: 13, color: 'var(--accent-warm)', fontWeight: 500 }}>
                      このURLは既に登録されています
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', paddingLeft: 23 }}>
                    「{duplicate.title}」
                    {duplicate.category_name && (
                      <span style={{ color: 'var(--text-tertiary)' }}>
                        {' '}
                        / {duplicate.category_name}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, paddingLeft: 23 }}>
                    {onUpdate && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ height: 28, fontSize: 12, padding: '0 12px' }}
                        onClick={() => setDuplicateAction('update')}
                      >
                        既存を更新
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ height: 28, fontSize: 12, padding: '0 12px' }}
                      onClick={() => setDuplicateAction('add')}
                    >
                      そのまま追加
                    </button>
                  </div>
                </div>
              )}

              {duplicateAction && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    background:
                      duplicateAction === 'update'
                        ? 'rgba(46, 213, 115, 0.08)'
                        : 'rgba(245, 158, 11, 0.06)',
                    fontSize: 12,
                    color:
                      duplicateAction === 'update' ? 'var(--accent-success)' : 'var(--accent-warm)',
                  }}
                >
                  {duplicateAction === 'update'
                    ? '既存リンクを更新します'
                    : '重複を無視して追加します'}
                  <button
                    type="button"
                    style={{
                      marginLeft: 'auto',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-tertiary)',
                      cursor: 'pointer',
                      fontSize: 11,
                    }}
                    onClick={() => setDuplicateAction(null)}
                  >
                    変更
                  </button>
                </div>
              )}

              {/* タイトル */}
              <div className="form-field">
                <label className="form-label">タイトル</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="リンクのタイトル（空欄ならURLから自動取得）"
                  className="input-field"
                />
              </div>

              {/* 説明 */}
              <div className="form-field">
                <label className="form-label">説明</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="メモや説明（任意）"
                  className="input-field"
                  rows={2}
                  style={{
                    height: 'auto',
                    minHeight: 64,
                    padding: '10px 12px',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* カテゴリ */}
              <div className="form-field">
                <label className="form-label">カテゴリ</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="input-field"
                >
                  <option value="">未分類</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 一時リンク */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 4 }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isTemporary}
                    onChange={(e) => setIsTemporary(e.target.checked)}
                    className="checkbox"
                  />
                  一時リンク
                </label>
                {isTemporary && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="number"
                      value={expiryDays}
                      onChange={(e) => setExpiryDays(Number(e.target.value))}
                      min={1}
                      max={365}
                      className="input-field"
                      style={{ width: 64, height: 32, textAlign: 'center', fontSize: 13 }}
                    />
                    <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                      日後に期限切れ
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* フッター */}
            <div className="dialog-footer">
              <Dialog.Close asChild>
                <button type="button" className="btn btn-ghost">
                  キャンセル
                </button>
              </Dialog.Close>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={fetching || (!!duplicate && !duplicateAction)}
              >
                {duplicateAction === 'update' ? '更新する' : '追加する'}
              </button>
            </div>
          </form>

          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
