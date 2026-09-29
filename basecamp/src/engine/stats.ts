import type { AppData, PersonalRecord, Session, SetLog } from '../types';
import { addDays, startOfWeek, todayKey } from './dates';
import { dayTypeFor, plannedThisWeek } from './schedule';

export function sessionTotals(sets: SetLog[]): { totalReps: number; totalHoldSec: number } {
  let totalReps = 0;
  let totalHoldSec = 0;
  for (const s of sets) {
    if (s.mode === 'reps') totalReps += s.value;
    else totalHoldSec += s.value;
  }
  return { totalReps, totalHoldSec };
}

/** Best single-round value per exercise across sessions. */
export function bestRound(sessions: Session[], exerciseId: string): number {
  let best = 0;
  for (const s of sessions) for (const x of s.sets) if (x.exerciseId === exerciseId && x.value > best) best = x.value;
  return best;
}

/** Best session total per exercise across sessions. */
export function bestSessionTotal(sessions: Session[], exerciseId: string): number {
  let best = 0;
  for (const s of sessions) {
    const total = s.sets.filter((x) => x.exerciseId === exerciseId).reduce((a, x) => a + x.value, 0);
    if (total > best) best = total;
  }
  return best;
}

/** Records set by `sets` compared with `previous` sessions. Cardio blocks are excluded. */
export function detectPRs(previous: Session[], sets: SetLog[]): PersonalRecord[] {
  const out: PersonalRecord[] = [];
  const ids = [...new Set(sets.map((s) => s.exerciseId))];
  for (const id of ids) {
    const mine = sets.filter((s) => s.exerciseId === id);
    if (mine[0].pattern === 'cardio') continue;
    const prevRound = bestRound(previous, id);
    const myRound = Math.max(...mine.map((s) => s.value));
    if (myRound > prevRound && myRound > 0) out.push({ exerciseId: id, kind: 'round', value: myRound, previous: prevRound });
    const prevTotal = bestSessionTotal(previous, id);
    const myTotal = mine.reduce((a, s) => a + s.value, 0);
    if (myTotal > prevTotal && mine.length > 1 && myTotal > 0) out.push({ exerciseId: id, kind: 'session', value: myTotal, previous: prevTotal });
  }
  return out;
}

/**
 * Current streak: consecutive days, counting back from today, where every planned
 * training day was done. Rest days and skipped days do not break it. Today does
 * not break it if not done yet.
 */
export function currentStreak(data: Pick<AppData, 'sessions' | 'planOverrides' | 'skipped' | 'profile'>, today = todayKey()): number {
  const doneDates = new Set(data.sessions.map((s) => s.date));
  let streak = 0;
  let d = today;
  let guard = 0;
  while (guard < 400) {
    const done = doneDates.has(d);
    if (done) streak++;
    else {
      const type = dayTypeFor(data, d);
      const isRest = type === 'rest' || data.skipped.includes(d);
      if (!isRest && d !== today) break;
    }
    d = addDays(d, -1);
    guard++;
  }
  return streak;
}

export function bestStreak(data: Pick<AppData, 'sessions' | 'planOverrides' | 'skipped' | 'profile'>, today = todayKey()): number {
  if (data.sessions.length === 0) return 0;
  const first = [...data.sessions].sort((a, b) => (a.date < b.date ? -1 : 1))[0].date;
  const doneDates = new Set(data.sessions.map((s) => s.date));
  let best = 0;
  let run = 0;
  let d = first;
  while (d <= today) {
    if (doneDates.has(d)) run++;
    else {
      const type = dayTypeFor(data, d);
      const isRest = type === 'rest' || data.skipped.includes(d);
      if (!isRest && d !== today) run = 0;
    }
    if (run > best) best = run;
    d = addDays(d, 1);
  }
  return best;
}

export interface WeekSummary {
  start: string;
  workouts: number;
  minutes: number;
  reps: number;
  holdSec: number;
}

export function weekSummary(sessions: Session[], anyDateInWeek: string): WeekSummary {
  const start = startOfWeek(anyDateInWeek);
  const end = addDays(start, 6);
  const mine = sessions.filter((s) => s.date >= start && s.date <= end);
  return {
    start,
    workouts: mine.length,
    minutes: Math.round(mine.reduce((a, s) => a + s.durationSec, 0) / 60),
    reps: mine.reduce((a, s) => a + s.totalReps, 0),
    holdSec: mine.reduce((a, s) => a + s.totalHoldSec, 0),
  };
}

export function lastWeeks(sessions: Session[], count: number, today = todayKey()): WeekSummary[] {
  const out: WeekSummary[] = [];
  const thisStart = startOfWeek(today);
  for (let i = count - 1; i >= 0; i--) out.push(weekSummary(sessions, addDays(thisStart, -7 * i)));
  return out;
}

export interface Rings {
  workoutsDone: number;
  workoutsPlanned: number;
  minutes: number;
  minutesGoal: number;
  streak: number;
  streakGoal: number;
}

export function ringsFor(data: Pick<AppData, 'sessions' | 'planOverrides' | 'skipped' | 'profile'>, today = todayKey()): Rings {
  const w = weekSummary(data.sessions, today);
  return {
    workoutsDone: w.workouts,
    workoutsPlanned: plannedThisWeek(data, today).length,
    minutes: w.minutes,
    minutesGoal: data.profile.goals.weeklyMinutes,
    streak: currentStreak(data, today),
    streakGoal: 7,
  };
}

export function totalReps(sessions: Session[]): number {
  return sessions.reduce((a, s) => a + s.totalReps, 0);
}
