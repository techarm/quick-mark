import * as Dialog from '@radix-ui/react-dialog';
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  Info,
  Keyboard,
  Moon,
  Palette,
  Settings,
  Sun,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import * as commands from '../lib/commands';
import { modKey, shiftKey } from '../lib/utils';
import { useUIStore } from '../stores/ui.store';

type SettingsTab = 'general' | 'appearance' | 'shortcuts' | 'about';

const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: 'general', label: '一般', icon: <Settings size={16} /> },
  { id: 'appearance', label: '外観', icon: <Palette size={16} /> },
  { id: 'shortcuts', label: 'ショートカット', icon: <Keyboard size={16} /> },
  { id: 'about', label: 'About', icon: <Info size={16} /> },
];

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          className="dialog-content glass-overlay"
          style={{ width: 600, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
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
              {activeTab === 'general' && <GeneralTab />}
              {activeTab === 'appearance' && <AppearanceTab />}
              {activeTab === 'shortcuts' && <ShortcutsTab />}
              {activeTab === 'about' && <AboutTab />}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function GeneralTab() {
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

function ShortcutsTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <section>
        <SectionTitle>グローバル</SectionTitle>
        <ShortcutRow action="検索ウィンドウの切替" keys={[modKey, shiftKey, 'Space']} />
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

function AboutTab() {
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

      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
        <InfoRow label="アプリ名" value="QuickMark" />
        <InfoRow label="開発者" value="techarm" />
      </div>
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
