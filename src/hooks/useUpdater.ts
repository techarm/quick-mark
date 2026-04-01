import { useCallback, useEffect, useState } from 'react';

export type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error';

interface UpdateState {
  status: UpdateStatus;
  availableVersion: string | null;
  progress: number;
  error: string | null;
}

export function useUpdater(checkOnMount = true) {
  const [state, setState] = useState<UpdateState>({
    status: 'idle',
    availableVersion: null,
    progress: 0,
    error: null,
  });
  const [update, setUpdate] = useState<Awaited<
    ReturnType<typeof import('@tauri-apps/plugin-updater').check>
  > | null>(null);

  const checkForUpdate = useCallback(async () => {
    setState((s) => ({ ...s, status: 'checking', error: null }));
    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const result = await check();
      if (result) {
        setUpdate(result);
        setState((s) => ({
          ...s,
          status: 'available',
          availableVersion: result.version,
        }));
        return true;
      }
      setState((s) => ({ ...s, status: 'idle' }));
      return false;
    } catch (e) {
      console.warn('Update check failed:', e);
      setState((s) => ({
        ...s,
        status: 'error',
        error: e instanceof Error ? e.message : String(e),
      }));
      return false;
    }
  }, []);

  const downloadAndInstall = useCallback(async () => {
    if (!update) return;
    setState((s) => ({ ...s, status: 'downloading', progress: 0 }));
    try {
      let totalSize = 0;
      let downloaded = 0;
      await update.downloadAndInstall((event) => {
        if (event.event === 'Started' && event.data.contentLength) {
          totalSize = event.data.contentLength;
        } else if (event.event === 'Progress') {
          downloaded += event.data.chunkLength;
          const pct = totalSize > 0 ? Math.round((downloaded / totalSize) * 100) : 0;
          setState((s) => ({ ...s, progress: pct }));
        } else if (event.event === 'Finished') {
          setState((s) => ({ ...s, status: 'ready', progress: 100 }));
        }
      });
    } catch (e) {
      setState((s) => ({
        ...s,
        status: 'error',
        error: e instanceof Error ? e.message : String(e),
      }));
    }
  }, [update]);

  const restartApp = useCallback(async () => {
    const { relaunch } = await import('@tauri-apps/plugin-process');
    await relaunch();
  }, []);

  useEffect(() => {
    if (!checkOnMount) return;
    const timer = setTimeout(() => {
      checkForUpdate();
    }, 3000);
    return () => clearTimeout(timer);
  }, [checkOnMount, checkForUpdate]);

  return { ...state, checkForUpdate, downloadAndInstall, restartApp };
}
