import * as Dialog from '@radix-ui/react-dialog';
import { Eye, EyeOff, KeyRound, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { CreateCredentialInput, Credential, UpdateCredentialInput } from '../../lib/types';

interface CredentialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credential: Credential | null;
  onSubmit: (input: CreateCredentialInput & { id?: string }) => void;
}

export function CredentialDialog({
  open,
  onOpenChange,
  credential,
  onSubmit,
}: CredentialDialogProps) {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [note, setNote] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const isEditing = !!credential;

  useEffect(() => {
    if (open && credential) {
      setName(credential.name);
      setUsername(credential.username);
      setPassword(''); // パスワードはクリア（変更時のみ送信）
      setNote(credential.note ?? '');
      setShowPassword(false);
    } else if (open) {
      setName('');
      setUsername('');
      setPassword('');
      setNote('');
      setShowPassword(false);
    }
  }, [open, credential]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim()) return;

      if (isEditing && credential) {
        const input: UpdateCredentialInput & { id: string } = {
          id: credential.id,
          name: name.trim(),
          username: username.trim(),
          note: note.trim() || undefined,
        };
        // パスワードが入力された場合のみ更新
        if (password) {
          input.password = password;
        }
        onSubmit(input as CreateCredentialInput & { id?: string });
      } else {
        onSubmit({
          name: name.trim(),
          username: username.trim(),
          password,
          note: note.trim() || undefined,
        });
      }

      onOpenChange(false);
    },
    [name, username, password, note, isEditing, credential, onSubmit, onOpenChange],
  );

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
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
                <KeyRound size={14} style={{ color: 'var(--accent-primary)' }} />
              </div>
              {isEditing ? '認証情報を編集' : '認証情報を追加'}
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
              style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              {/* サービス名 */}
              <div className="form-field">
                <label htmlFor="cred-name" className="form-label">
                  サービス名<span className="required">*</span>
                </label>
                <input
                  id="cred-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例: AWS Console, GitHub, 社内Slack"
                  className="input-field"
                  required
                />
              </div>

              {/* ユーザー名 */}
              <div className="form-field">
                <label htmlFor="cred-username" className="form-label">
                  ユーザー名
                </label>
                <input
                  id="cred-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="メールアドレスやユーザーID"
                  className="input-field"
                />
              </div>

              {/* パスワード */}
              <div className="form-field">
                <label htmlFor="cred-password" className="form-label">
                  パスワード{isEditing && '（変更する場合のみ入力）'}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="cred-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isEditing ? '変更しない場合は空欄' : 'パスワード'}
                    className="input-field"
                    style={{ paddingRight: 40 }}
                    required={!isEditing}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: 8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-tertiary)',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 4,
                    }}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* メモ */}
              <div className="form-field">
                <label htmlFor="cred-note" className="form-label">
                  メモ
                </label>
                <textarea
                  id="cred-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="メモ（任意）"
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
            </div>

            {/* フッター */}
            <div className="dialog-footer">
              <Dialog.Close asChild>
                <button type="button" className="btn btn-ghost">
                  キャンセル
                </button>
              </Dialog.Close>
              <button type="submit" className="btn btn-primary">
                {isEditing ? '更新する' : '追加する'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
