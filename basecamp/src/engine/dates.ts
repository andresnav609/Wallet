/** Date helpers. All app dates are local calendar days formatted YYYY-MM-DD. */

export function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function toKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(now: Date = new Date()): string {
  return toKey(now);
}

export function addDays(key: string, days: number): string {
  const d = fromKey(key);
  d.setDate(d.getDate() + days);
  return toKey(d);
}

export function diffDays(a: string, b: string): number {
  const ms = fromKey(b).getTime() - fromKey(a).getTime();
  return Math.round(ms / 86_400_000);
}

/** Monday = 0 ... Sunday = 6 */
export function weekdayIndex(key: string): number {
  return (fromKey(key).getDay() + 6) % 7;
}

/** Monday of the week containing the date. */
export function startOfWeek(key: string): string {
  return addDays(key, -weekdayIndex(key));
}

export function isBefore(a: string, b: string): boolean {
  return a < b;
}

export const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function formatLong(key: string): string {
  const d = fromKey(key);
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

export function formatShort(key: string): string {
  const d = fromKey(key);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}:${pad(m % 60)}:${pad(r)}`;
  }
  return `${m}:${pad(r)}`;
}

export function formatClock(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  const m = Math.floor(s / 60);
  return `${m}:${pad(s % 60)}`;
}
