import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Link } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** URLからドメイン名を取得。パース失敗時は元のURLを返す */
export function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/** URLを安全に開く（Tauri環境→openerプラグイン、ブラウザ→window.open） */
export async function safeOpenUrl(url: string) {
  try {
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    await openUrl(url);
  } catch {
    window.open(url, '_blank');
  }
}

/** 一時リンクの期限情報を返す。一時リンクでなければnull */
export function getExpiryInfo(link: Link): { label: string; urgent: boolean } | null {
  if (!link.is_temporary || !link.expires_at) return null;

  const now = new Date();
  const expires = new Date(link.expires_at);
  const diffMs = expires.getTime() - now.getTime();

  if (diffMs < 0) {
    return { label: '期限切れ', urgent: true };
  }

  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 1) {
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
    return { label: `あと${diffHours}時間`, urgent: true };
  }

  return { label: `あと${diffDays}日`, urgent: false };
}

/** 日付文字列を日本語フォーマットに変換 */
export function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return dateStr;
  }
}
