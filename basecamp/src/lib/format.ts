import type { WorkoutExercise } from '../types';

export function formatTarget(e: Pick<WorkoutExercise, 'mode' | 'target' | 'unilateral' | 'pattern'>): string {
  const [lo, hi] = e.target;
  if (e.pattern === 'cardio') return hi >= 60 ? `${Math.round(hi / 60)} min` : `${hi} s`;
  if (e.mode === 'time') return lo === hi ? `${hi} s` : `${lo}–${hi} s`;
  const range = lo === hi ? `${hi}` : `${lo}–${hi}`;
  return `${range} reps${e.unilateral ? ' / side' : ''}`;
}

export function formatValue(mode: 'reps' | 'time', v: number): string {
  return mode === 'time' ? `${v} s` : `${v}`;
}

export function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
