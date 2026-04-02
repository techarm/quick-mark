import * as Dialog from '@radix-ui/react-dialog';
import {
  Check,
  Copy,
  Download,
  Eye,
  EyeOff,
  Info,
  Keyboard,
  Layers,
  Loader2,
  Moon,
  Palette,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Settings,
  Sun,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import * as commands from '../lib/commands';
import { isMac, modKey, shiftKey } from '../lib/utils';
import { useUIStore } from '../stores/ui.store';

import type { UpdateStatus } from '../hooks/useUpdater';
import type { Workspace } from '../lib/types';

type SettingsTab = 'general' | 'workspaces' | 'appearance' | 'shortcuts' | 'about';

const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: 'general', label: '一般', icon: <Settings size={16} /> },
  { id: 'workspaces', label: 'ワークスペース', icon: <Layers size={16} /> },
  { id: 'appearance', label: '外観', icon: <Palette size={16} /> },
  { id: 'shortcuts', label: 'ショートカット', icon: <Keyboard size={16} /> },
  { id: 'about', label: 'About', icon: <Info size={16} /> },
];

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: () => void;
  onExport: () => void;
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  onSwitchWorkspace: (id: string) => void;
  onCreateWorkspace: (name: string, color: string) => void;
  onUpdateWorkspace: (id: string, name: string, color: string) => void;
  onDeleteWorkspace: (id: string) => void;
  updater: {
    status: UpdateStatus;
    availableVersion: string | null;
    progress: number;
    error: string | null;
    checkForUpdate: () => Promise<boolean>;
    downloadAndInstall: () => Promise<void>;
    restartApp: () => Promise<void>;
  };
}

export function SettingsDialog({
  open,
  onOpenChange,
  onImport,
  onExport,
  workspaces,
  activeWorkspaceId,
  onSwitchWorkspace,
  onCreateWorkspace,
  onUpdateWorkspace,
  onDeleteWorkspace,
  updater,
}: SettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          className="dialog-content glass-overlay"
          style={{ width: 640, maxHeight: '80vh', minHeight: 480, display: 'flex', flexDirection: 'column' }}
        >
          <div className="dialog-header">
            <Dialog.Title asChild>
              <h2>
                <Settings size={16} />
                設定
              </h2>
            </Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="dialog-close-btn" aria-label="閉じる">
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>

          {/* サイドバー + コンテンツ */}
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            {/* 左サイドバーナビゲーション */}
            <nav
              style={{
                width: 160,
                flexShrink: 0,
                padding: '12px 8px',
                borderRight: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`sidebar-item${activeTab === tab.id ? ' active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* 右コンテンツ */}
            <div style={{ flex: 1, padding: 20, overflow: 'auto' }}>
              {activeTab === 'general' && <GeneralTab onImport={onImport} onExport={onExport} />}
              {activeTab === 'workspaces' && (
                <WorkspacesTab
                  workspaces={workspaces}
                  activeWorkspaceId={activeWorkspaceId}
                  onSwitch={onSwitchWorkspace}
                  onCreate={onCreateWorkspace}
                  onUpdate={onUpdateWorkspace}
                  onDelete={onDeleteWorkspace}
                />
              )}
              {activeTab === 'appearance' && <AppearanceTab />}
              {activeTab === 'shortcuts' && <ShortcutsTab />}
              {activeTab === 'about' && <AboutTab updater={updater} />}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function GeneralTab({ onImport, onExport }: { onImport: () => void; onExport: () => void }) {
  const [apiToken, setApiToken] = useState<string | null>(null);
  const [tokenVisible, setTokenVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    commands.getApiToken().then(setApiToken).catch(console.error);
  }, []);

  const handleCopyToken = useCallback(async () => {
    if (!apiToken) return;
    try {
      const { writeText } = await import('@tauri-apps/plugin-clipboard-manager');
      await writeText(apiToken);
      setCopied(true);
      toast.success('APIトークンをコピーしました');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      try {
        await navigator.clipboard.writeText(apiToken);
        setCopied(true);
        toast.success('APIトークンをコピーしました');
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
        toast.error('コピーに失敗しました');
      }
    }
  }, [apiToken]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* APIトークン */}
      <section>
        <SectionTitle>APIトークン</SectionTitle>
        <p
          style={{
            fontSize: 12,
            color: 'var(--text-tertiary)',
            marginBottom: 10,
            lineHeight: 1.6,
          }}
        >
          ブラウザ拡張機能との連携に使用するトークンです。
        </p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              height: 38,
              padding: '0 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-medium)',
              background: 'var(--bg-input)',
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              color: 'var(--text-primary)',
              overflow: 'hidden',
              userSelect: tokenVisible ? 'text' : 'none',
            }}
          >
            {apiToken ? (tokenVisible ? apiToken : '\u2022'.repeat(36)) : '読み込み中...'}
          </div>
          <button
            type="button"
            className="titlebar-icon-btn"
            onClick={() => setTokenVisible((v) => !v)}
            title={tokenVisible ? 'トークンを隠す' : 'トークンを表示'}
            style={{ width: 38, height: 38, flexShrink: 0 }}
          >
            {tokenVisible ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
          <button
            type="button"
            className="titlebar-icon-btn"
            onClick={handleCopyToken}
            title="コピー"
            style={{ width: 38, height: 38, flexShrink: 0 }}
          >
            {copied ? (
              <Check size={15} style={{ color: 'var(--accent-success)' }} />
            ) : (
              <Copy size={15} />
            )}
          </button>
        </div>
      </section>

      {/* データ管理 */}
      <section>
        <SectionTitle>データ管理</SectionTitle>
        <p
          style={{
            fontSize: 12,
            color: 'var(--text-tertiary)',
            marginBottom: 10,
            lineHeight: 1.6,
          }}
        >
          ブックマークデータのインポート・エクスポートができます。
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onImport}
            style={{ gap: 6, fontSize: 13 }}
          >
            <Upload size={15} />
            インポート
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onExport}
            style={{ gap: 6, fontSize: 13 }}
          >
            <Download size={15} />
            エクスポート
          </button>
        </div>
      </section>
    </div>
  );
}

function AppearanceTab() {
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <section>
        <SectionTitle>テーマ</SectionTitle>
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <ThemeCard
            label="ダークモード"
            icon={<Moon size={18} />}
            active={theme === 'dark'}
            onClick={() => theme !== 'dark' && toggleTheme()}
          />
          <ThemeCard
            label="ライトモード"
            icon={<Sun size={18} />}
            active={theme === 'light'}
            onClick={() => theme !== 'light' && toggleTheme()}
          />
        </div>
      </section>
    </div>
  );
}

function ThemeCard({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: '16px 24px',
        borderRadius: 'var(--radius-md)',
        border: active ? '2px solid var(--accent-primary)' : '1px solid var(--border-medium)',
        background: active ? 'rgba(226, 80, 80, 0.08)' : 'var(--bg-elevated)',
        color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
        cursor: 'pointer',
        transition: 'all 150ms ease',
        fontFamily: 'inherit',
        fontSize: 12,
        fontWeight: active ? 600 : 400,
        flex: 1,
      }}
    >
      {icon}
      {label}
    </button>
  );
}

/** アプリ内で使用されているショートカット（Tauri形式） */
const IN_APP_SHORTCUTS: { shortcut: string; label: string }[] = [
  { shortcut: 'CommandOrControl+K', label: '検索ウィンドウを開く' },
  { shortcut: 'CommandOrControl+Shift+A', label: 'リンクを追加' },
  { shortcut: 'CommandOrControl+A', label: 'すべて選択' },
];

/** 新しいショートカットがアプリ内ショートカットと競合するかチェック */
function checkInAppConflict(shortcut: string): string | null {
  const normalize = (s: string) =>
    s
      .split('+')
      .map((p) => p.toLowerCase())
      .sort()
      .join('+');
  const normalized = normalize(shortcut);
  for (const entry of IN_APP_SHORTCUTS) {
    if (normalize(entry.shortcut) === normalized) {
      return entry.label;
    }
  }
  return null;
}

/** Tauri形式のショートカット文字列を表示用キー配列に変換 */
function shortcutToDisplayKeys(shortcut: string): string[] {
  return shortcut.split('+').map((part) => {
    switch (part) {
      case 'CommandOrControl':
        return isMac ? '⌘' : 'Ctrl';
      case 'Control':
        return isMac ? '⌃' : 'Ctrl';
      case 'Super':
        return isMac ? '⌘' : 'Win';
      case 'Shift':
        return isMac ? '⇧' : 'Shift';
      case 'Alt':
        return isMac ? '⌥' : 'Alt';
      default:
        return part;
    }
  });
}

/** KeyboardEventからTauri形式のショートカット文字列を生成 */
function keyEventToShortcut(e: React.KeyboardEvent): string | null {
  const key = e.key;

  // 修飾キーのみは無視
  if (['Control', 'Meta', 'Shift', 'Alt'].includes(key)) return null;

  // プラットフォームに応じて修飾キーを正しく識別
  // Mac: Cmd → CommandOrControl, Ctrl → Control
  // Win: Ctrl → CommandOrControl, Win → Super
  const parts: string[] = [];
  if (isMac) {
    if (e.metaKey) parts.push('CommandOrControl');
    if (e.ctrlKey) parts.push('Control');
  } else {
    if (e.ctrlKey) parts.push('CommandOrControl');
    if (e.metaKey) parts.push('Super');
  }
  if (e.shiftKey) parts.push('Shift');
  if (e.altKey) parts.push('Alt');

  // キー名をTauri形式に正規化
  let keyName: string;
  if (key === ' ') {
    keyName = 'Space';
  } else if (key.length === 1) {
    keyName = key.toUpperCase();
  } else {
    // F1-F24, ArrowUp, etc.
    keyName = key;
  }

  // 修飾キーなしはファンクションキー(F1-F12)のみ許可（通常キー単体はグローバルとして危険）
  if (parts.length === 0 && !/^F([1-9]|1[0-2])$/.test(keyName)) return null;

  parts.push(keyName);
  return parts.join('+');
}

function ShortcutsTab() {
  const globalShortcut = useUIStore((s) => s.globalShortcut);
  const setGlobalShortcut = useUIStore((s) => s.setGlobalShortcut);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <section>
        <SectionTitle>グローバル</SectionTitle>
        <GlobalShortcutRow
          action="検索ウィンドウの切替"
          shortcut={globalShortcut}
          onChangeShortcut={setGlobalShortcut}
        />
      </section>

      <section>
        <SectionTitle>メインウィンドウ</SectionTitle>
        <ShortcutRow action="検索ウィンドウを開く" keys={[modKey, 'K']} />
        <ShortcutRow action="リンクを追加" keys={[modKey, shiftKey, 'A']} />
        <ShortcutRow action="すべて選択" keys={[modKey, 'A']} />
        <ShortcutRow action="選択を解除" keys={['Esc']} />
      </section>

      <section>
        <SectionTitle>検索ウィンドウ</SectionTitle>
        <ShortcutRow action="リンクを開く / PW コピー" keys={['Enter']} />
        <ShortcutRow action="ユーザー名をコピー" keys={['Tab']} />
        <ShortcutRow action="認証情報モード切替" keys={['@']} />
        <ShortcutRow action="クエリクリア / 閉じる" keys={['Esc']} />
      </section>
    </div>
  );
}

function GlobalShortcutRow({
  action,
  shortcut,
  onChangeShortcut,
}: {
  action: string;
  shortcut: string;
  onChangeShortcut: (shortcut: string) => void;
}) {
  const [recording, setRecording] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const displayKeys = shortcutToDisplayKeys(shortcut);

  const verifyAndApply = async (newShortcut: string) => {
    setRecording(false);

    // アプリ内ショートカットとの競合チェック
    const conflict = checkInAppConflict(newShortcut);
    if (conflict) {
      toast.error(`「${conflict}」と競合しています`);
      return;
    }

    // OS レベルで登録可能か検証
    try {
      const { register, unregisterAll } = await import('@tauri-apps/plugin-global-shortcut');
      await unregisterAll();
      await register(newShortcut, () => {});
      // 検証成功 → 解除してストア更新（App.tsx の useEffect が再登録する）
      await unregisterAll();
      onChangeShortcut(newShortcut);
      toast.success('ショートカットを変更しました');
    } catch {
      toast.error('このショートカットは登録できません（OS側で競合の可能性）');
    }
  };

  const handleStartRecording = () => {
    setRecording(true);
    // フォーカスをボタンに当ててキーイベントを受け取れるようにする
    requestAnimationFrame(() => btnRef.current?.focus());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!recording) return;
    e.preventDefault();
    e.stopPropagation();

    // Escでキャンセル
    if (e.key === 'Escape') {
      setRecording(false);
      return;
    }

    const newShortcut = keyEventToShortcut(e);
    if (newShortcut) {
      // 登録可能か事前検証してからストアを更新
      verifyAndApply(newShortcut);
    }
  };

  const handleBlur = () => {
    setRecording(false);
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '6px 0',
      }}
    >
      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{action}</span>
      <button
        ref={btnRef}
        type="button"
        onClick={handleStartRecording}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        title="クリックしてショートカットを変更"
        style={{
          display: 'flex',
          gap: 4,
          alignItems: 'center',
          padding: '4px 8px',
          borderRadius: 'var(--radius-md)',
          border: recording ? '1px solid var(--accent-primary)' : '1px solid transparent',
          background: recording ? 'rgba(226, 80, 80, 0.08)' : 'transparent',
          cursor: 'pointer',
          fontFamily: 'inherit',
          transition: 'all 150ms ease',
        }}
      >
        {recording ? (
          <span style={{ fontSize: 12, color: 'var(--accent-primary)' }}>キーを入力...</span>
        ) : (
          displayKeys.map((key) => (
            <kbd key={key} className="kbd">
              {key}
            </kbd>
          ))
        )}
      </button>
    </div>
  );
}

function ShortcutRow({ action, keys }: { action: string; keys: string[] }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '6px 0',
      }}
    >
      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{action}</span>
      <div style={{ display: 'flex', gap: 4 }}>
        {keys.map((key) => (
          <kbd key={key} className="kbd">
            {key}
          </kbd>
        ))}
      </div>
    </div>
  );
}

const WORKSPACE_COLORS = [
  '#6366F1', '#E25050', '#F59E0B', '#10B981', '#3B82F6',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#6B7280',
];

function WorkspacesTab({
  workspaces,
  activeWorkspaceId,
  onSwitch,
  onCreate,
  onUpdate,
  onDelete,
}: {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  onSwitch: (id: string) => void;
  onCreate: (name: string, color: string) => void;
  onUpdate: (id: string, name: string, color: string) => void;
  onDelete: (id: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formColor, setFormColor] = useState(WORKSPACE_COLORS[0]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    if (editingId) {
      onUpdate(editingId, formName.trim(), formColor);
      setEditingId(null);
    } else {
      onCreate(formName.trim(), formColor);
    }
    setFormName('');
    setFormColor(WORKSPACE_COLORS[0]);
    setShowForm(false);
  };

  const startEdit = (ws: Workspace) => {
    setEditingId(ws.id);
    setFormName(ws.name);
    setFormColor(ws.color);
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormName('');
    setFormColor(WORKSPACE_COLORS[0]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <section>
        <SectionTitle>ワークスペース一覧</SectionTitle>
        <p
          style={{
            fontSize: 12,
            color: 'var(--text-tertiary)',
            marginBottom: 10,
            lineHeight: 1.6,
          }}
        >
          ワークスペースごとにリンク・カテゴリ・認証情報が独立して管理されます。
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {workspaces.map((ws) => (
            <div
              key={ws.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                border:
                  ws.id === activeWorkspaceId
                    ? '2px solid var(--accent-primary)'
                    : '1px solid var(--border-medium)',
                background:
                  ws.id === activeWorkspaceId ? 'rgba(226, 80, 80, 0.06)' : 'var(--bg-elevated)',
                cursor: 'pointer',
              }}
              onClick={() => onSwitch(ws.id)}
              onKeyDown={(e) => e.key === 'Enter' && onSwitch(ws.id)}
            >
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: ws.color,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  flex: 1,
                  fontSize: 13,
                  fontWeight: ws.id === activeWorkspaceId ? 600 : 400,
                  color: 'var(--text-primary)',
                }}
              >
                {ws.name}
              </span>
              {ws.id === activeWorkspaceId && (
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--accent-primary)',
                    fontWeight: 600,
                  }}
                >
                  使用中
                </span>
              )}
              <button
                type="button"
                className="titlebar-icon-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  startEdit(ws);
                }}
                title="編集"
                style={{ width: 28, height: 28 }}
              >
                <Pencil size={13} />
              </button>
              {workspaces.length > 1 && (
                <button
                  type="button"
                  className="titlebar-icon-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDeleteId(ws.id);
                  }}
                  title="削除"
                  style={{ width: 28, height: 28, color: 'var(--accent-danger, #ef4444)' }}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* 削除確認 */}
        {confirmDeleteId && (
          <div
            style={{
              marginTop: 10,
              padding: 12,
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--accent-danger, #ef4444)',
              background: 'rgba(239, 68, 68, 0.06)',
            }}
          >
            <p style={{ fontSize: 12, color: 'var(--text-primary)', marginBottom: 8 }}>
              このワークスペースを削除すると、含まれるすべてのリンク・カテゴリ・認証情報が削除されます。この操作は取り消せません。
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ fontSize: 12, color: 'var(--accent-danger, #ef4444)' }}
                onClick={() => {
                  onDelete(confirmDeleteId);
                  setConfirmDeleteId(null);
                }}
              >
                削除する
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ fontSize: 12 }}
                onClick={() => setConfirmDeleteId(null)}
              >
                キャンセル
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 追加/編集フォーム */}
      {showForm ? (
        <section>
          <SectionTitle>{editingId ? 'ワークスペースを編集' : '新しいワークスペース'}</SectionTitle>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="ワークスペース名"
              className="input-field"
              autoFocus
            />
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {WORKSPACE_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormColor(color)}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: color,
                    border: formColor === color ? '2px solid var(--text-primary)' : '2px solid transparent',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn btn-primary" style={{ fontSize: 12 }}>
                {editingId ? '保存' : '作成'}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ fontSize: 12 }}
                onClick={cancelForm}
              >
                キャンセル
              </button>
            </div>
          </form>
        </section>
      ) : (
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => setShowForm(true)}
          style={{ gap: 6, fontSize: 13, alignSelf: 'flex-start' }}
        >
          <Plus size={15} />
          ワークスペースを追加
        </button>
      )}
    </div>
  );
}

function AboutTab({
  updater,
}: {
  updater: SettingsDialogProps['updater'];
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <section style={{ textAlign: 'center', padding: '10px 0' }}>
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: 4,
          }}
        >
          QuickMark
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 16 }}>
          v{__APP_VERSION__}
        </div>
        <p
          style={{
            fontSize: 13,
            color: 'var(--text-secondary)',
            lineHeight: 1.8,
          }}
        >
          高速ブックマーク &amp; 認証情報マネージャー
        </p>
      </section>

      {/* アップデート */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
        <SectionTitle>アップデート</SectionTitle>
        <UpdateSection updater={updater} />
      </div>

      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
        <InfoRow label="アプリ名" value="QuickMark" />
        <InfoRow label="開発者" value="techarm" />
      </div>
    </div>
  );
}

function UpdateSection({ updater }: { updater: SettingsDialogProps['updater'] }) {
  const { status, availableVersion, progress, error } = updater;

  if (status === 'ready') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{ fontSize: 13, color: 'var(--accent-success, #10b981)' }}>
          アップデートの準備ができました。再起動して適用してください。
        </p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={updater.restartApp}
          style={{ gap: 6, fontSize: 13, alignSelf: 'flex-start' }}
        >
          <RotateCcw size={14} />
          再起動して適用
        </button>
      </div>
    );
  }

  if (status === 'downloading') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          v{availableVersion} をダウンロード中... {progress}%
        </p>
        <div
          style={{
            height: 6,
            borderRadius: 3,
            background: 'var(--bg-elevated)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: 'var(--accent-gradient)',
              borderRadius: 3,
              transition: 'width 200ms ease',
            }}
          />
        </div>
      </div>
    );
  }

  if (status === 'available') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{ fontSize: 13, color: 'var(--text-primary)' }}>
          新しいバージョン <strong>v{availableVersion}</strong> が利用可能です。
        </p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={updater.downloadAndInstall}
          style={{ gap: 6, fontSize: 13, alignSelf: 'flex-start' }}
        >
          <Download size={14} />
          ダウンロードしてインストール
        </button>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
          確認に失敗しました: {error}
        </p>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={updater.checkForUpdate}
          style={{ gap: 6, fontSize: 13, alignSelf: 'flex-start' }}
        >
          <RefreshCw size={14} />
          再試行
        </button>
      </div>
    );
  }

  // idle or checking
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={updater.checkForUpdate}
        disabled={status === 'checking'}
        style={{ gap: 6, fontSize: 13 }}
      >
        {status === 'checking' ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            確認中...
          </>
        ) : (
          <>
            <RefreshCw size={14} />
            アップデートを確認
          </>
        )}
      </button>
      {status === 'idle' && (
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
          最新のバージョンです
        </span>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 0',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--text-primary)',
        marginBottom: 8,
      }}
    >
      {children}
    </h3>
  );
}
