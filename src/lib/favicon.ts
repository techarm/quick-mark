import * as commands from './commands';

export interface FaviconRefreshOptions {
  /** 進捗コールバック (current, total) */
  onProgress?: (current: number, total: number) => void;
  /** バッチごとのコールバック（リスト再読み込み等） */
  onBatchComplete?: () => void;
  /** キャンセル判定関数。trueを返すと中断 */
  isCancelled?: () => boolean;
}

const BATCH_SIZE = 5;

/**
 * favicon未取得のリンクを順次取得する共通処理。
 * 同一ドメインはキャッシュして重複リクエストを回避。
 */
export async function refreshFavicons(options: FaviconRefreshOptions = {}): Promise<void> {
  const { onProgress, onBatchComplete, isCancelled } = options;

  const missingLinks = await commands.getLinksWithoutFavicon();
  if (missingLinks.length === 0) return;

  const total = missingLinks.length;
  let processed = 0;
  const domainCache = new Map<string, string>();

  for (const [id, url] of missingLinks) {
    if (isCancelled?.()) break;

    try {
      const domain = new URL(url).hostname;
      let faviconUrl: string;

      if (domainCache.has(domain)) {
        faviconUrl = domainCache.get(domain)!;
      } else {
        // Rust側で Google API → HTML meta → /favicon.ico → ドメインルート の多段フォールバック済み
        const info = await commands.fetchUrlInfo(url);
        faviconUrl = info.favicon_url;
        domainCache.set(domain, faviconUrl);
      }

      if (faviconUrl) {
        await commands.refreshSingleFavicon(id, faviconUrl);
      }
    } catch {
      // 個別失敗は無視して次へ
    }

    processed++;
    onProgress?.(processed, total);

    if (processed % BATCH_SIZE === 0) {
      onBatchComplete?.();
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  if (processed % BATCH_SIZE !== 0) {
    onBatchComplete?.();
  }
}
