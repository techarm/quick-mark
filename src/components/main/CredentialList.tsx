import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Copy, Eye, EyeOff, KeyRound, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import type { Credential } from '../../lib/types';

interface CredentialListProps {
  credentials: Credential[];
  onAdd: () => void;
  onEdit: (credential: Credential) => void;
  onDelete: (credential: Credential) => void;
  onCopyField: (id: string, field: 'username' | 'password') => void;
}

export function CredentialList({
  credentials,
  onAdd,
  onEdit,
  onDelete,
  onCopyField,
}: CredentialListProps) {
  if (credentials.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          gap: 16,
          padding: 40,
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
          }}
        >
          <KeyRound size={28} style={{ color: 'var(--text-tertiary)', opacity: 0.4 }} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 4px' }}>
            認証情報がありません
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: 0 }}>
            「追加」ボタンで認証情報を登録できます
          </p>
        </div>
        <button type="button" className="btn btn-primary" style={{ marginTop: 8 }} onClick={onAdd}>
          <Plus size={14} />
          認証情報を追加
        </button>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflow: 'auto' }}>
      {/* ヘッダー行 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr auto',
          gap: 12,
          padding: '8px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--text-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        <span>サービス名</span>
        <span>ユーザー名</span>
        <span style={{ width: 120, textAlign: 'center' }}>操作</span>
      </div>

      {credentials.map((cred) => (
        <CredentialRow
          key={cred.id}
          credential={cred}
          onEdit={onEdit}
          onDelete={onDelete}
          onCopyField={onCopyField}
        />
      ))}
    </div>
  );
}

function CredentialRow({
  credential,
  onEdit,
  onDelete,
  onCopyField,
}: {
  credential: Credential;
  onEdit: (credential: Credential) => void;
  onDelete: (credential: Credential) => void;
  onCopyField: (id: string, field: 'username' | 'password') => void;
}) {
  const [showPassword, setShowPassword] = useState(false);

  const handleTogglePassword = useCallback(() => {
    setShowPassword((prev) => {
      if (!prev) {
        // 5秒後に自動的に非表示
        setTimeout(() => setShowPassword(false), 5000);
      }
      return !prev;
    });
  }, []);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr auto',
        gap: 12,
        alignItems: 'center',
        padding: '12px 20px',
        borderBottom: '1px solid var(--border-subtle)',
        transition: 'background 75ms ease',
      }}
      className="hover:bg-[var(--bg-hover)]"
    >
      {/* サービス名 + メモ */}
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <KeyRound
            size={14}
            style={{ color: 'var(--accent-primary)', flexShrink: 0, opacity: 0.7 }}
          />
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
        {credential.note && (
          <span
            style={{
              display: 'block',
              fontSize: 11,
              color: 'var(--text-tertiary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginTop: 2,
              paddingLeft: 22,
            }}
          >
            {credential.note}
          </span>
        )}
      </div>

      {/* ユーザー名 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        <span
          style={{
            fontSize: 13,
            color: 'var(--text-secondary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}
        >
          {credential.username || '—'}
        </span>
        {credential.username && (
          <button
            type="button"
            onClick={() => onCopyField(credential.id, 'username')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 26,
              height: 26,
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
            title="ユーザー名をコピー"
          >
            <Copy size={13} />
          </button>
        )}
      </div>

      {/* 操作ボタン */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          width: 120,
          justifyContent: 'flex-end',
        }}
      >
        {/* パスワード表示/非表示 */}
        <button
          type="button"
          onClick={handleTogglePassword}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 30,
            height: 30,
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: 'transparent',
            color: showPassword ? 'var(--accent-primary)' : 'var(--text-tertiary)',
            cursor: 'pointer',
          }}
          title={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
        >
          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>

        {/* パスワードコピー */}
        <button
          type="button"
          onClick={() => onCopyField(credential.id, 'password')}
          className="btn btn-secondary"
          style={{
            height: 30,
            fontSize: 11,
            padding: '0 10px',
            gap: 4,
          }}
          title="パスワードをコピー"
        >
          <Copy size={12} />
          PW
        </button>

        {/* メニュー */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 30,
                height: 30,
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
              }}
            >
              <MoreHorizontal size={16} />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className="dropdown-menu-content" sideOffset={4}>
              <DropdownMenu.Item className="dropdown-menu-item" onSelect={() => onEdit(credential)}>
                <Pencil size={14} />
                編集
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="dropdown-menu-separator" />
              <DropdownMenu.Item
                className="dropdown-menu-item dropdown-menu-item-danger"
                onSelect={() => onDelete(credential)}
              >
                <Trash2 size={14} />
                削除
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      {/* パスワード表示（行の下に表示） */}
      {showPassword && (
        <div
          style={{
            gridColumn: '1 / -1',
            padding: '8px 22px',
            fontSize: 12,
            color: 'var(--text-secondary)',
            background: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-sm)',
            fontFamily: 'monospace',
            wordBreak: 'break-all',
          }}
        >
          {atob(credential.password_encoded)}
        </div>
      )}
    </div>
  );
}
