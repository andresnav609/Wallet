import { useEffect, useRef } from 'react';

type WakeLockSentinelLike = { release: () => Promise<void>; addEventListener?: (t: string, cb: () => void) => void };

/** Keep the screen awake while mounted. Re-acquires when the app returns to the foreground. */
export function useWakeLock(enabled = true): void {
  const sentinel = useRef<WakeLockSentinelLike | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<WakeLockSentinelLike> } };
    if (!nav.wakeLock) return;

    let cancelled = false;
    const request = async () => {
      try {
        const s = await nav.wakeLock!.request('screen');
        if (cancelled) {
          await s.release();
          return;
        }
        sentinel.current = s;
      } catch {
        /* denied or unsupported; ignore */
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') void request();
    };
    void request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      void sentinel.current?.release().catch(() => undefined);
      sentinel.current = null;
    };
  }, [enabled]);
}
