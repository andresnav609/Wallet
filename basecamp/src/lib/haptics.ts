/** Vibration API is not available on iOS Safari; these calls are safe no-ops there. */
export function vibrate(pattern: number | number[]): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}

export const haptic = {
  tick: () => vibrate(30),
  tap: () => vibrate(15),
  done: () => vibrate([80, 40, 80]),
  finish: () => vibrate([100, 50, 100, 50, 200]),
};
