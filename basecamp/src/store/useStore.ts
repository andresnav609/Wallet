import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type {
  ActiveSession, AppData, BuiltWorkout, DayType, Habits, Location, Measurement, Pattern, PersonalRecord, Profile, Session, SetLog, Suggestion, WeightEntry, PhotoMeta,
} from '../types';
import { DEFAULT_LEVELS, getLadder } from '../data/exercises';
import { idbStorage } from './db';
import { todayKey } from '../engine/dates';
import { detectPRs, sessionTotals } from '../engine/stats';
import { newlyUnlocked } from '../engine/achievements';
import { moveWorkout } from '../engine/schedule';

export const DATA_VERSION = 1;

export function defaultProfile(): Profile {
  return {
    name: '',
    heightIn: 69,
    startWeightLb: 235,
    goalWeightLb: 190,
    startDate: todayKey(),
    defaultLocation: 'gym',
    roundRest: 75,
    switchRest: 15,
    sound: true,
    vibration: true,
    units: 'imperial',
    goals: { steps: 8000, water: 8, protein: 170, sleep: 7.5, weeklyMinutes: 270 },
  };
}

export function defaultData(): AppData {
  return {
    version: DATA_VERSION,
    profile: defaultProfile(),
    levels: { ...DEFAULT_LEVELS },
    levelSince: {},
    sessions: [],
    weights: [],
    measurements: [],
    habits: {},
    photos: [],
    planOverrides: {},
    skipped: [],
    progression: [],
    unlocked: {},
    active: null,
    onboarded: false,
  };
}

export interface FinishResult {
  session: Session;
  prs: PersonalRecord[];
  achievements: string[];
}

interface Actions {
  hydrated: boolean;
  setHydrated: (v: boolean) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  updateGoals: (patch: Partial<Profile['goals']>) => void;
  completeOnboarding: (patch: Partial<Profile>) => void;
  setLevel: (pattern: Pattern, level: number, reason: 'auto' | 'manual') => void;
  acceptSuggestion: (s: Suggestion) => void;
  dismissSuggestion: (pattern: Pattern) => void;
  logWeight: (entry: WeightEntry) => void;
  deleteWeight: (date: string) => void;
  logMeasurement: (m: Measurement) => void;
  deleteMeasurement: (date: string) => void;
  setHabit: (date: string, key: keyof Habits, value: number | undefined) => void;
  addPhoto: (meta: PhotoMeta) => void;
  deletePhoto: (id: string) => void;
  movePlan: (from: string, to: string, fromType: DayType) => void;
  toggleSkip: (date: string) => void;
  startSession: (workout: BuiltWorkout) => void;
  updateActive: (patch: Partial<ActiveSession> | ((a: ActiveSession) => Partial<ActiveSession>)) => void;
  cancelSession: () => void;
  finishSession: (sets: SetLog[], rpe: number | undefined, notes: string) => FinishResult;
  deleteSession: (id: string) => void;
  importData: (data: AppData) => void;
  exportData: () => AppData;
  resetAll: () => void;
}

export type Store = AppData & Actions;

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function pickData(s: Store): AppData {
  const {
    version, profile, levels, levelSince, sessions, weights, measurements, habits, photos, planOverrides, skipped, progression, unlocked, active, onboarded,
  } = s;
  return { version, profile, levels, levelSince, sessions, weights, measurements, habits, photos, planOverrides, skipped, progression, unlocked, active, onboarded };
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...defaultData(),
      hydrated: false,
      setHydrated: (v) => set({ hydrated: v }),

      updateProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),
      updateGoals: (patch) => set((s) => ({ profile: { ...s.profile, goals: { ...s.profile.goals, ...patch } } })),
      completeOnboarding: (patch) =>
        set((s) => {
          const profile = { ...s.profile, ...patch };
          const weights = s.weights.length === 0 ? [{ date: profile.startDate, lb: profile.startWeightLb }] : s.weights;
          return { profile, weights, onboarded: true };
        }),

      setLevel: (pattern, level, reason) =>
        set((s) => {
          const ladder = getLadder(pattern);
          if (!ladder) return {};
          const clamped = Math.min(Math.max(level, 0), ladder.rungs.length - 1);
          const from = s.levels[pattern] ?? 0;
          if (from === clamped) return {};
          return {
            levels: { ...s.levels, [pattern]: clamped },
            levelSince: { ...s.levelSince, [pattern]: todayKey() },
            progression: [...s.progression, { date: todayKey(), pattern, from, to: clamped, reason }],
          };
        }),
      acceptSuggestion: (sug) => get().setLevel(sug.pattern, sug.to, 'auto'),
      dismissSuggestion: (pattern) => set((s) => ({ levelSince: { ...s.levelSince, [pattern]: todayKey() } })),

      logWeight: (entry) =>
        set((s) => ({ weights: [...s.weights.filter((w) => w.date !== entry.date), entry].sort((a, b) => (a.date < b.date ? -1 : 1)) })),
      deleteWeight: (date) => set((s) => ({ weights: s.weights.filter((w) => w.date !== date) })),
      logMeasurement: (m) =>
        set((s) => {
          const existing = s.measurements.find((x) => x.date === m.date);
          const merged = existing ? { ...existing, ...m } : m;
          return { measurements: [...s.measurements.filter((x) => x.date !== m.date), merged].sort((a, b) => (a.date < b.date ? -1 : 1)) };
        }),
      deleteMeasurement: (date) => set((s) => ({ measurements: s.measurements.filter((x) => x.date !== date) })),
      setHabit: (date, key, value) =>
        set((s) => ({ habits: { ...s.habits, [date]: { ...(s.habits[date] ?? {}), [key]: value } } })),
      addPhoto: (meta) => set((s) => ({ photos: [meta, ...s.photos] })),
      deletePhoto: (id) => set((s) => ({ photos: s.photos.filter((p) => p.id !== id) })),

      movePlan: (from, to, fromType) => set((s) => ({ planOverrides: moveWorkout(s.planOverrides, from, to, fromType) })),
      toggleSkip: (date) =>
        set((s) => ({ skipped: s.skipped.includes(date) ? s.skipped.filter((d) => d !== date) : [...s.skipped, date] })),

      startSession: (workout) =>
        set({
          active: {
            workout,
            startedAt: Date.now(),
            block: 0,
            round: 0,
            exIndex: 0,
            step: 'exercise',
            counter: workout.blocks[0].exercises[0].mode === 'reps' ? workout.blocks[0].exercises[0].target[0] : 0,
            sets: [],
          },
        }),
      updateActive: (patch) =>
        set((s) => {
          if (!s.active) return {};
          const p = typeof patch === 'function' ? patch(s.active) : patch;
          return { active: { ...s.active, ...p } };
        }),
      cancelSession: () => set({ active: null }),

      finishSession: (sets, rpe, notes) => {
        const s = get();
        const active = s.active;
        if (!active) throw new Error('No active session');
        const now = Date.now();
        const totals = sessionTotals(sets);
        const prs = detectPRs(s.sessions, sets);
        const session: Session = {
          id: uid(),
          date: active.workout.date,
          dayType: active.workout.dayType,
          name: active.workout.name,
          location: active.workout.location,
          startedAt: active.startedAt,
          finishedAt: now,
          durationSec: Math.round((now - active.startedAt) / 1000),
          sets,
          totalReps: totals.totalReps,
          totalHoldSec: totals.totalHoldSec,
          rpe,
          notes: notes || undefined,
          phase: active.workout.phase,
          week: active.workout.week,
          deload: active.workout.deload,
          prs,
          achievements: [],
        };
        const nextData: AppData = { ...pickData(s), sessions: [...s.sessions, session], active: null };
        const achievements = newlyUnlocked(nextData);
        session.achievements = achievements;
        const unlocked = { ...s.unlocked };
        for (const id of achievements) unlocked[id] = session.date;
        set({ sessions: nextData.sessions, active: null, unlocked });
        return { session, prs, achievements };
      },
      deleteSession: (id) => set((s) => ({ sessions: s.sessions.filter((x) => x.id !== id) })),

      importData: (data) => set({ ...defaultData(), ...data, version: DATA_VERSION, hydrated: true }),
      exportData: () => pickData(get()),
      resetAll: () => set({ ...defaultData(), hydrated: true }),
    }),
    {
      name: 'basecamp-state',
      version: DATA_VERSION,
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => pickData(s),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);

export function useProfile(): Profile {
  return useStore((s) => s.profile);
}

export function locationLabel(l: Location): string {
  return l === 'gym' ? 'Gym' : 'Home';
}
