// Core domain types for Base Camp.

export type Location = 'gym' | 'home';
export type LocationTag = Location | 'both';

export type DayType =
  | 'upperA'
  | 'lowerA'
  | 'cardioCore'
  | 'upperB'
  | 'lowerB'
  | 'hiit'
  | 'rest';

export type Pattern =
  | 'push'
  | 'pull'
  | 'row'
  | 'dip'
  | 'pike'
  | 'squat'
  | 'hinge'
  | 'lunge'
  | 'stepup'
  | 'calf'
  | 'plank'
  | 'kneeRaise'
  | 'antiExtension'
  | 'sidePlank'
  | 'cardio'
  | 'conditioning'
  | 'accessory';

export type Mode = 'reps' | 'time';

export type PhaseId = 'foundation' | 'build' | 'push';

export type Units = 'imperial' | 'metric';

export interface Exercise {
  id: string;
  name: string;
  pattern: Pattern;
  mode: Mode;
  location: LocationTag;
  /** Rung on the pattern ladder (0 = easiest). Undefined for non-ladder moves. */
  level?: number;
  cues: string[];
  muscles: string[];
  equipment: string[];
  /** Reps are counted per side. */
  unilateral?: boolean;
  /** Explicit target range; overrides the phase default. */
  range?: [number, number];
  /** Short note on why this rung exists / what it teaches. */
  note?: string;
}

export interface LadderRung {
  label: string;
  gym: string;
  home: string;
}

export interface Ladder {
  pattern: Pattern;
  name: string;
  description: string;
  rungs: LadderRung[];
}

/** A slot in a circuit template. Either a ladder pattern or a fixed pair of exercises. */
export interface Slot {
  pattern?: Pattern;
  fixed?: { gym: string; home: string };
  /** Override the phase default target range. */
  reps?: [number, number];
  seconds?: [number, number];
}

export interface BlockTemplate {
  name: string;
  slots: Slot[];
  /** Fixed number of rounds (ignores phase). */
  rounds?: number;
  /** Rest between exercises in seconds (overrides profile switch rest). */
  switchRest?: number;
  /** Rest between rounds in seconds (overrides profile round rest). */
  roundRest?: number;
}

export interface WorkoutTemplate {
  dayType: DayType;
  name: string;
  focus: string;
  emoji: string;
  blocks: BlockTemplate[];
  warmup: string[];
  cooldown: string[];
}

export interface PhaseParams {
  id: PhaseId;
  name: string;
  rounds: number;
  roundRest: number;
  switchRest: number;
  reps: [number, number];
  seconds: [number, number];
  cardioMinutes: number;
  description: string;
}

export interface WorkoutExercise {
  exerciseId: string;
  name: string;
  pattern: Pattern;
  level?: number;
  mode: Mode;
  target: [number, number];
  unilateral: boolean;
}

export interface WorkoutBlock {
  name: string;
  rounds: number;
  roundRest: number;
  switchRest: number;
  exercises: WorkoutExercise[];
}

export interface BuiltWorkout {
  date: string;
  dayType: DayType;
  name: string;
  focus: string;
  emoji: string;
  location: Location;
  phase: PhaseId;
  phaseName: string;
  week: number;
  deload: boolean;
  blocks: WorkoutBlock[];
  warmup: string[];
  cooldown: string[];
  estMinutes: number;
  /** Human-readable adjustments applied (deload, RPE, etc.). */
  notes: string[];
}

export interface SetLog {
  block: number;
  round: number;
  exerciseId: string;
  pattern: Pattern;
  level?: number;
  mode: Mode;
  value: number;
  target: [number, number];
}

export interface Session {
  id: string;
  date: string;
  dayType: DayType;
  name: string;
  location: Location;
  startedAt: number;
  finishedAt: number;
  durationSec: number;
  sets: SetLog[];
  totalReps: number;
  totalHoldSec: number;
  rpe?: number;
  notes?: string;
  phase: PhaseId;
  week: number;
  deload: boolean;
  prs: PersonalRecord[];
  achievements: string[];
}

export interface PersonalRecord {
  exerciseId: string;
  kind: 'round' | 'session';
  value: number;
  previous: number;
}

export type PlayerStep = 'exercise' | 'switch' | 'rest' | 'done';

export interface ActiveSession {
  workout: BuiltWorkout;
  startedAt: number;
  block: number;
  round: number;
  exIndex: number;
  step: PlayerStep;
  /** Absolute timestamp when the running timer ends (switch, rest, or timed exercise). */
  timerEndsAt?: number;
  timerTotal?: number;
  /** Current +/- counter value for a rep exercise. */
  counter: number;
  sets: SetLog[];
}

export interface Profile {
  name: string;
  heightIn: number;
  startWeightLb: number;
  goalWeightLb: number;
  /** Program week 1 starts on the Monday of this date. */
  startDate: string;
  defaultLocation: Location;
  roundRest: number;
  switchRest: number;
  sound: boolean;
  vibration: boolean;
  units: Units;
  goals: {
    steps: number;
    water: number;
    protein: number;
    sleep: number;
    weeklyMinutes: number;
  };
}

export interface WeightEntry {
  date: string;
  lb: number;
}

export interface Measurement {
  date: string;
  waist?: number;
  chest?: number;
  arm?: number;
  hips?: number;
}

export interface Habits {
  steps?: number;
  water?: number;
  protein?: number;
  sleep?: number;
}

export interface PhotoMeta {
  id: string;
  date: string;
  note?: string;
}

export interface ProgressionEvent {
  date: string;
  pattern: Pattern;
  from: number;
  to: number;
  reason: 'auto' | 'manual';
}

export type Levels = Partial<Record<Pattern, number>>;

export interface AppData {
  version: number;
  profile: Profile;
  levels: Levels;
  /** Sessions before this date do not count toward the next suggestion for the pattern. */
  levelSince: Partial<Record<Pattern, string>>;
  sessions: Session[];
  weights: WeightEntry[];
  measurements: Measurement[];
  habits: Record<string, Habits>;
  photos: PhotoMeta[];
  planOverrides: Record<string, DayType>;
  skipped: string[];
  progression: ProgressionEvent[];
  unlocked: Record<string, string>; // achievementId -> date
  active: ActiveSession | null;
  onboarded: boolean;
}

export interface Suggestion {
  pattern: Pattern;
  direction: 'up' | 'down';
  from: number;
  to: number;
  fromName: string;
  toName: string;
  reason: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  emoji: string;
}
