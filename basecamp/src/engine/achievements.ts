import type { Achievement, AppData } from '../types';
import { bestStreak, currentStreak, totalReps, weekSummary } from './stats';

type Check = (data: AppData) => boolean;

const defs: (Achievement & { check: Check })[] = [
  { id: 'first_workout', name: 'Base Camp', description: 'Finish your first workout.', emoji: '⛺', check: (d) => d.sessions.length >= 1 },
  { id: 'five_workouts', name: 'Warming up', description: 'Finish 5 workouts.', emoji: '🔥', check: (d) => d.sessions.length >= 5 },
  { id: 'ten_workouts', name: 'Regular', description: 'Finish 10 workouts.', emoji: '🎯', check: (d) => d.sessions.length >= 10 },
  { id: 'twentyfive_workouts', name: 'Committed', description: 'Finish 25 workouts.', emoji: '🏅', check: (d) => d.sessions.length >= 25 },
  { id: 'fifty_workouts', name: 'Half century', description: 'Finish 50 workouts.', emoji: '🥈', check: (d) => d.sessions.length >= 50 },
  { id: 'hundred_workouts', name: 'Century', description: 'Finish 100 workouts.', emoji: '🥇', check: (d) => d.sessions.length >= 100 },
  { id: 'full_week', name: 'Full week', description: 'Complete all 6 workouts in one week.', emoji: '📅', check: (d) => d.sessions.some((s) => weekSummary(d.sessions, s.date).workouts >= 6) },
  { id: 'streak_3', name: 'Three in a row', description: 'Reach a 3-day streak.', emoji: '🔗', check: (d) => Math.max(currentStreak(d), bestStreak(d)) >= 3 },
  { id: 'streak_7', name: 'One week strong', description: 'Reach a 7-day streak.', emoji: '⚡', check: (d) => Math.max(currentStreak(d), bestStreak(d)) >= 7 },
  { id: 'streak_14', name: 'Two weeks', description: 'Reach a 14-day streak.', emoji: '🌟', check: (d) => Math.max(currentStreak(d), bestStreak(d)) >= 14 },
  { id: 'streak_30', name: 'Thirty days', description: 'Reach a 30-day streak.', emoji: '🏔️', check: (d) => Math.max(currentStreak(d), bestStreak(d)) >= 30 },
  { id: 'reps_1000', name: 'One thousand', description: 'Log 1,000 total reps.', emoji: '🔢', check: (d) => totalReps(d.sessions) >= 1000 },
  { id: 'reps_10000', name: 'Ten thousand', description: 'Log 10,000 total reps.', emoji: '💯', check: (d) => totalReps(d.sessions) >= 10000 },
  { id: 'first_pushup', name: 'Floor conquered', description: 'Reach the full push-up rung.', emoji: '💪', check: (d) => (d.levels.push ?? 0) >= 4 },
  { id: 'first_pullup', name: 'Over the bar', description: 'Reach the full pull-up rung.', emoji: '🧗', check: (d) => (d.levels.pull ?? 0) >= 4 },
  { id: 'first_dip', name: 'Dip master', description: 'Reach the top of the dip ladder.', emoji: '🔱', check: (d) => (d.levels.dip ?? 0) >= 4 },
  { id: 'bulgarian', name: 'Single-leg strong', description: 'Reach the Bulgarian split squat.', emoji: '🦵', check: (d) => (d.levels.squat ?? 0) >= 3 },
  { id: 'full_plank_minute', name: 'Iron core', description: 'Reach the long plank rung.', emoji: '🧱', check: (d) => (d.levels.plank ?? 0) >= 2 },
  { id: 'weigh_in_7', name: 'On the scale', description: 'Log your weight 7 times.', emoji: '⚖️', check: (d) => d.weights.length >= 7 },
  { id: 'lost_5', name: 'First five', description: 'Weigh 5 lb less than your start weight.', emoji: '📉', check: (d) => latestWeight(d) !== null && d.profile.startWeightLb - (latestWeight(d) as number) >= 5 },
  { id: 'lost_10', name: 'Ten down', description: 'Weigh 10 lb less than your start weight.', emoji: '🎉', check: (d) => latestWeight(d) !== null && d.profile.startWeightLb - (latestWeight(d) as number) >= 10 },
  { id: 'lost_25', name: 'Twenty-five down', description: 'Weigh 25 lb less than your start weight.', emoji: '🏆', check: (d) => latestWeight(d) !== null && d.profile.startWeightLb - (latestWeight(d) as number) >= 25 },
  { id: 'goal_weight', name: 'Summit', description: 'Reach your goal weight.', emoji: '🚩', check: (d) => latestWeight(d) !== null && (latestWeight(d) as number) <= d.profile.goalWeightLb },
  { id: 'long_session', name: 'Long haul', description: 'Finish a 60-minute workout.', emoji: '⏱️', check: (d) => d.sessions.some((s) => s.durationSec >= 3600) },
  { id: 'early_bird', name: 'Early bird', description: 'Finish a workout before 8 am.', emoji: '🌅', check: (d) => d.sessions.some((s) => new Date(s.finishedAt).getHours() < 8) },
  { id: 'both_places', name: 'Anywhere', description: 'Train at the gym and at home.', emoji: '🏠', check: (d) => d.sessions.some((s) => s.location === 'gym') && d.sessions.some((s) => s.location === 'home') },
];

function latestWeight(d: AppData): number | null {
  if (d.weights.length === 0) return null;
  return [...d.weights].sort((a, b) => (a.date < b.date ? 1 : -1))[0].lb;
}

export const ACHIEVEMENTS: Achievement[] = defs.map(({ id, name, description, emoji }) => ({ id, name, description, emoji }));

/** Ids of achievements that are now satisfied but not yet unlocked. */
export function newlyUnlocked(data: AppData): string[] {
  return defs.filter((a) => !data.unlocked[a.id] && a.check(data)).map((a) => a.id);
}
