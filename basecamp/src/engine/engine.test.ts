import { describe, expect, it } from 'vitest';
import type { AppData, Session, SetLog } from '../types';
import { DEFAULT_LEVELS } from '../data/exercises';
import { EXTRA_TYPES } from '../data/program';
import { addDays, diffDays, startOfWeek, weekdayIndex } from './dates';
import { dayStatus, dayTypeFor, extraTypeFor, isDeloadWeek, moveWorkout, phaseForWeek, upcoming, weekNumber } from './schedule';
import { buildWorkout } from './builder';
import { allSuggestions, suggestionFor } from './progression';
import { currentStreak, detectPRs, ringsFor, weekSummary } from './stats';
import { newlyUnlocked } from './achievements';
import { initialActive } from '../store/useStore';

function baseData(overrides: Partial<AppData> = {}): AppData {
  return {
    version: 1,
    profile: {
      name: 'Test', heightIn: 69, startWeightLb: 235, goalWeightLb: 190, startDate: '2026-09-28',
      defaultLocation: 'gym', roundRest: 75, switchRest: 15, sound: true, vibration: true, units: 'imperial',
      goals: { steps: 8000, water: 8, protein: 170, sleep: 7.5, weeklyMinutes: 300 },
    },
    levels: { ...DEFAULT_LEVELS },
    levelSince: {},
    sessions: [],
    weights: [],
    measurements: [],
    habits: {},
    photos: [],
    planOverrides: {},
    extraOverrides: {},
    skipped: [],
    progression: [],
    unlocked: {},
    active: null,
    onboarded: true,
    ...overrides,
  };
}

function session(date: string, sets: SetLog[], extra: Partial<Session> = {}): Session {
  const totalReps = sets.filter((s) => s.mode === 'reps').reduce((a, s) => a + s.value, 0);
  return {
    id: `s-${date}`, date, dayType: 'upperA', name: 'Upper A', location: 'gym',
    startedAt: new Date(`${date}T10:00:00`).getTime(), finishedAt: new Date(`${date}T10:50:00`).getTime(), durationSec: 3000,
    sets, totalReps, totalHoldSec: 0, phase: 'foundation', week: 1, deload: false, prs: [], achievements: [], ...extra,
  };
}

function pushSets(value: number, rounds = 3, level = 2): SetLog[] {
  return Array.from({ length: rounds }, (_, r) => ({
    block: 0, round: r, exerciseId: 'incline_pushup_bench', pattern: 'push', level, mode: 'reps', value, target: [6, 10],
  }));
}

describe('dates', () => {
  it('computes weekday with Monday = 0', () => {
    expect(weekdayIndex('2026-09-28')).toBe(0); // Monday
    expect(weekdayIndex('2026-10-04')).toBe(6); // Sunday
  });
  it('adds and diffs days', () => {
    expect(addDays('2026-09-30', 2)).toBe('2026-10-02');
    expect(diffDays('2026-09-28', '2026-10-05')).toBe(7);
    expect(startOfWeek('2026-10-01')).toBe('2026-09-28');
  });
});

describe('schedule', () => {
  it('numbers weeks from the Monday of the start date', () => {
    expect(weekNumber('2026-09-30', '2026-09-28')).toBe(1);
    expect(weekNumber('2026-09-30', '2026-10-04')).toBe(1);
    expect(weekNumber('2026-09-30', '2026-10-05')).toBe(2);
    expect(weekNumber('2026-09-30', '2026-11-02')).toBe(6);
  });
  it('phases and deloads', () => {
    expect(phaseForWeek(1)).toBe('foundation');
    expect(phaseForWeek(3)).toBe('build');
    expect(phaseForWeek(7)).toBe('push');
    expect(isDeloadWeek(5)).toBe(true);
    expect(isDeloadWeek(10)).toBe(true);
    expect(isDeloadWeek(4)).toBe(false);
  });
  it('maps weekdays to the split with overrides', () => {
    const d = baseData();
    expect(dayTypeFor(d, '2026-09-28')).toBe('upperA');
    expect(dayTypeFor(d, '2026-10-04')).toBe('rest');
    const moved = moveWorkout({}, '2026-09-28', '2026-10-04', 'upperA');
    expect(moved['2026-10-04']).toBe('upperA');
    expect(moved['2026-09-28']).toBe('rest');
  });
  it('uses a custom weekly split', () => {
    const d = baseData();
    d.profile.weekSplit = ['lowerA', 'upperA', 'rest', 'upperC', 'lowerC', 'cardioCore', 'hiit'];
    expect(dayTypeFor(d, '2026-09-28')).toBe('lowerA');
    expect(dayTypeFor(d, '2026-09-30')).toBe('rest');
    expect(dayTypeFor(d, '2026-10-04')).toBe('hiit');
    expect(buildWorkout({ data: d, date: '2026-10-01' })!.name).toBe('Upper C');
    expect(buildWorkout({ data: d, date: '2026-10-02' })!.name).toBe('Lower C');
  });
  it('reports day status', () => {
    const d = baseData({ sessions: [session('2026-09-28', pushSets(8))], skipped: ['2026-09-29'] });
    const today = '2026-09-30';
    expect(dayStatus(d, '2026-09-28', today)).toBe('done');
    expect(dayStatus(d, '2026-09-29', today)).toBe('skipped');
    expect(dayStatus(d, '2026-09-30', today)).toBe('today');
    expect(dayStatus(d, '2026-10-01', today)).toBe('planned');
    expect(dayStatus(d, '2026-10-04', today)).toBe('rest');
    expect(dayStatus(baseData(), '2026-09-29', today)).toBe('missed');
    expect(dayStatus(baseData(), '2026-09-22', today)).toBe('before');
  });
  it('lists upcoming training days skipping rest', () => {
    const list = upcoming(baseData(), '2026-10-03', 3);
    expect(list.map((x) => x.dayType)).toEqual(['upperA', 'lowerA', 'cardioCore']);
    expect(list[0].date).toBe('2026-10-05');
  });
});

describe('companion routines', () => {
  it('suggests a night routine after the main workout, a wake-up for night trainers', () => {
    const d = baseData();
    expect(extraTypeFor(d, '2026-09-28')).toBe('nightCore'); // upper day
    expect(extraTypeFor(d, '2026-09-29')).toBe('nightMobility'); // lower day
    expect(extraTypeFor(d, '2026-10-04')).toBe('nightWalk'); // rest day
    d.profile.trainingTime = 'night';
    expect(extraTypeFor(d, '2026-09-28')).toBe('morningWake');
    d.extraOverrides['2026-09-28'] = 'nightWalk';
    expect(extraTypeFor(d, '2026-09-28')).toBe('nightWalk');
  });
  it('builds short fixed routines that ignore phase and RPE', () => {
    const d = baseData({ sessions: [session('2026-09-28', pushSets(8), { rpe: 10 })] });
    const w = buildWorkout({ data: d, date: '2026-09-29', dayType: 'nightMobility' })!;
    expect(w.extra).toBe(true);
    expect(w.notes).toHaveLength(0);
    expect(w.blocks[0].rounds).toBe(3);
    const walk = buildWorkout({ data: d, date: '2026-09-29', dayType: 'nightWalk' })!;
    expect(walk.blocks[0].exercises[0].target).toEqual([1500, 1500]);
  });
  it('every companion routine lasts at least 30 minutes', () => {
    const d = baseData();
    for (const t of EXTRA_TYPES) {
      const w = buildWorkout({ data: d, date: '2026-09-29', dayType: t })!;
      expect(w.estMinutes, t).toBeGreaterThanOrEqual(30);
      expect(w.estMinutes, t).toBeLessThanOrEqual(45);
    }
  });
  it('does not count companion routines as the day being done', () => {
    const d = baseData({ sessions: [session('2026-09-28', [], { extra: true, dayType: 'nightCore' })] });
    expect(dayStatus(d, '2026-09-28', '2026-09-30')).toBe('missed');
    expect(currentStreak(d, '2026-09-28')).toBe(0);
  });
});

describe('player start', () => {
  it('starts the countdown when the first move is timed', () => {
    const d = baseData();
    const cardio = buildWorkout({ data: d, date: '2026-09-30' })!; // cardio day starts with a 20 min walk
    const a = initialActive(cardio, 1000);
    expect(a.timerEndsAt).toBe(1000 + 1200 * 1000);
    expect(a.timerTotal).toBe(1200);
    const upper = buildWorkout({ data: d, date: '2026-09-28' })!;
    const b = initialActive(upper, 1000);
    expect(b.timerEndsAt).toBeUndefined();
    expect(b.counter).toBe(6);
  });
});

describe('builder', () => {
  it('returns null on rest days', () => {
    expect(buildWorkout({ data: baseData(), date: '2026-10-04' })).toBeNull();
  });
  it('builds a circuit from the current levels', () => {
    const w = buildWorkout({ data: baseData(), date: '2026-09-28' })!;
    expect(w.dayType).toBe('upperA');
    expect(w.phase).toBe('foundation');
    expect(w.blocks[0].rounds).toBe(3);
    const push = w.blocks[0].exercises.find((e) => e.pattern === 'push')!;
    expect(push.exerciseId).toBe('incline_pushup_bench');
    expect(push.target).toEqual([6, 10]);
    const hang = w.blocks[0].exercises.find((e) => e.pattern === 'pull')!;
    expect(hang.mode).toBe('time');
    expect(hang.target).toEqual([15, 40]);
    expect(w.estMinutes).toBeGreaterThan(20);
    expect(w.estMinutes).toBeLessThan(70);
  });
  it('uses home variants', () => {
    const w = buildWorkout({ data: baseData(), date: '2026-09-28', location: 'home' })!;
    expect(w.blocks[0].exercises.find((e) => e.pattern === 'row')!.exerciseId).toBe('band_row');
  });
  it('applies deload and phase changes', () => {
    const w5 = buildWorkout({ data: baseData(), date: addDays('2026-09-28', 28) })!; // week 5
    expect(w5.deload).toBe(true);
    expect(w5.phase).toBe('build');
    expect(w5.blocks[0].rounds).toBe(3); // build 4 minus deload
    expect(w5.blocks[0].roundRest).toBe(105);
    const w7 = buildWorkout({ data: baseData(), date: addDays('2026-09-28', 42) })!;
    expect(w7.phase).toBe('push');
    expect(w7.blocks[0].exercises[0].target).toEqual([10, 15]);
  });
  it('adjusts to the last RPE', () => {
    const hard = baseData({ sessions: [session('2026-09-28', pushSets(8), { rpe: 9 })] });
    const w = buildWorkout({ data: hard, date: '2026-09-29' })!;
    expect(w.blocks[0].rounds).toBe(2);
    expect(w.notes[0]).toMatch(/very hard/);
    const easy = baseData({ sessions: [session('2026-09-28', pushSets(8), { rpe: 3 })] });
    expect(buildWorkout({ data: easy, date: '2026-09-29' })!.blocks[0].rounds).toBe(4);
  });
  it('cardio day has a long timed block then a core circuit', () => {
    const w = buildWorkout({ data: baseData(), date: '2026-09-30' })!;
    expect(w.blocks).toHaveLength(2);
    expect(w.blocks[0].exercises[0].target[0]).toBe(1200);
    expect(w.blocks[1].rounds).toBe(3);
  });
});

describe('progression', () => {
  it('suggests moving up after two sessions at the top of the range', () => {
    const d = baseData({ sessions: [session('2026-09-28', pushSets(10)), session('2026-09-30', pushSets(11))] });
    const s = suggestionFor(d, 'push')!;
    expect(s.direction).toBe('up');
    expect(s.to).toBe(3);
    expect(s.toName).toBe('Knee push-up');
  });
  it('does not suggest after a single good session or a mixed pair', () => {
    expect(suggestionFor(baseData({ sessions: [session('2026-09-28', pushSets(10))] }), 'push')).toBeNull();
    const mixed = baseData({ sessions: [session('2026-09-28', pushSets(10)), session('2026-09-30', pushSets(8))] });
    expect(suggestionFor(mixed, 'push')).toBeNull();
  });
  it('suggests moving down after two sessions under the bottom of the range', () => {
    const d = baseData({ sessions: [session('2026-09-28', pushSets(4)), session('2026-09-30', pushSets(5))] });
    expect(suggestionFor(d, 'push')!.direction).toBe('down');
  });
  it('ignores sessions before levelSince', () => {
    const d = baseData({
      sessions: [session('2026-09-28', pushSets(10)), session('2026-09-30', pushSets(10))],
      levelSince: { push: '2026-09-29' },
    });
    expect(suggestionFor(d, 'push')).toBeNull();
  });
  it('never suggests above the top rung', () => {
    const d = baseData({
      levels: { ...DEFAULT_LEVELS, push: 6 },
      sessions: [session('2026-09-28', pushSets(15, 3, 6)), session('2026-09-30', pushSets(15, 3, 6))],
    });
    expect(allSuggestions(d)).toHaveLength(0);
  });
});

describe('stats', () => {
  it('detects round and session PRs', () => {
    const prev = [session('2026-09-28', pushSets(8))];
    const prs = detectPRs(prev, pushSets(9));
    expect(prs.find((p) => p.kind === 'round')!.value).toBe(9);
    expect(prs.find((p) => p.kind === 'session')!.value).toBe(27);
    expect(detectPRs(prev, pushSets(7))).toHaveLength(0);
  });
  it('counts a streak across rest days', () => {
    const d = baseData({
      sessions: [session('2026-10-02', pushSets(8)), session('2026-10-03', pushSets(8)), session('2026-10-05', pushSets(8))],
    });
    // Fri, Sat done, Sun rest, Mon done, Tue (today) not yet.
    expect(currentStreak(d, '2026-10-06')).toBe(3);
    // A missed Tuesday breaks it on Wednesday.
    expect(currentStreak(d, '2026-10-07')).toBe(0);
  });
  it('summarises the week and rings', () => {
    const d = baseData({ sessions: [session('2026-09-28', pushSets(8)), session('2026-09-29', pushSets(8))] });
    expect(weekSummary(d.sessions, '2026-10-01').workouts).toBe(2);
    const r = ringsFor(d, '2026-09-30');
    expect(r.workoutsPlanned).toBe(6);
    expect(r.minutes).toBe(100);
  });
});

describe('achievements', () => {
  it('unlocks the first workout and weight milestones', () => {
    const d = baseData({ sessions: [session('2026-09-28', pushSets(8))], weights: [{ date: '2026-10-01', lb: 229 }] });
    const ids = newlyUnlocked(d);
    expect(ids).toContain('first_workout');
    expect(ids).toContain('lost_5');
    expect(ids).not.toContain('lost_10');
  });
});
