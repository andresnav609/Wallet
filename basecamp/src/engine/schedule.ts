import type { AppData, DayType, PhaseId, Session } from '../types';
import { DELOAD_EVERY, PHASES, WEEK_SPLIT } from '../data/program';
import { addDays, diffDays, startOfWeek, weekdayIndex } from './dates';

/** 1-based program week for a date. Dates before the start count as week 1. */
export function weekNumber(startDate: string, date: string): number {
  const start = startOfWeek(startDate);
  const days = diffDays(start, date);
  if (days < 0) return 1;
  return Math.floor(days / 7) + 1;
}

export function isDeloadWeek(week: number): boolean {
  return week > 0 && week % DELOAD_EVERY === 0;
}

export function phaseForWeek(week: number): PhaseId {
  if (week <= 2) return 'foundation';
  if (week <= 6) return 'build';
  return 'push';
}

export function phaseName(id: PhaseId): string {
  return PHASES[id].name;
}

/** The weekly template: the user's custom split or the default one. */
export function weekSplitOf(data: Pick<AppData, 'profile'>): DayType[] {
  const s = data.profile.weekSplit;
  return s && s.length === 7 ? s : WEEK_SPLIT;
}

/** The planned day type for a date, considering moves and skips. */
export function dayTypeFor(data: Pick<AppData, 'planOverrides' | 'profile'>, date: string): DayType {
  const o = data.planOverrides[date];
  if (o) return o;
  return weekSplitOf(data)[weekdayIndex(date)];
}

export type DayStatus = 'done' | 'missed' | 'skipped' | 'planned' | 'rest' | 'today' | 'before';

export function sessionsOn(sessions: Session[], date: string): Session[] {
  return sessions.filter((s) => s.date === date);
}

export function dayStatus(
  data: Pick<AppData, 'planOverrides' | 'skipped' | 'sessions' | 'profile'>,
  date: string,
  today: string,
): DayStatus {
  const done = data.sessions.some((s) => s.date === date);
  if (done) return 'done';
  const type = dayTypeFor(data, date);
  if (data.skipped.includes(date)) return 'skipped';
  if (type === 'rest') return 'rest';
  if (date === today) return 'today';
  if (date < data.profile.startDate) return 'before';
  if (date < today) return 'missed';
  return 'planned';
}

/** Move the workout planned on `from` to `to`. The source becomes a rest day. */
export function moveWorkout(
  overrides: Record<string, DayType>,
  from: string,
  to: string,
  fromType: DayType,
  split: DayType[] = WEEK_SPLIT,
): Record<string, DayType> {
  const next = { ...overrides };
  const targetType = next[to] ?? split[weekdayIndex(to)];
  next[to] = fromType;
  // Swap so the week still contains every session.
  next[from] = targetType;
  return next;
}

/** Next `count` non-rest planned days strictly after `date`. */
export function upcoming(data: Pick<AppData, 'planOverrides' | 'skipped' | 'sessions' | 'profile'>, date: string, count: number): { date: string; dayType: DayType }[] {
  const out: { date: string; dayType: DayType }[] = [];
  let d = addDays(date, 1);
  let guard = 0;
  while (out.length < count && guard < 30) {
    const t = dayTypeFor(data, d);
    if (t !== 'rest' && !data.skipped.includes(d)) out.push({ date: d, dayType: t });
    d = addDays(d, 1);
    guard++;
  }
  return out;
}

/** Planned training days (non-rest) in the week containing `date`. */
export function plannedThisWeek(data: Pick<AppData, 'planOverrides' | 'profile'>, date: string): string[] {
  const start = startOfWeek(date);
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(start, i);
    if (dayTypeFor(data, d) !== 'rest') out.push(d);
  }
  return out;
}
