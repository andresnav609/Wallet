import type { AppData, BuiltWorkout, DayType, Location, Slot, WorkoutBlock, WorkoutExercise } from '../types';
import { getExercise, getLadder } from '../data/exercises';
import { PHASES, TEMPLATES } from '../data/program';
import { dayTypeFor, isDeloadWeek, phaseForWeek, weekNumber } from './schedule';

interface BuildInput {
  data: Pick<AppData, 'profile' | 'levels' | 'planOverrides' | 'sessions'>;
  date: string;
  location?: Location;
  dayType?: DayType;
}

function resolveSlot(slot: Slot, location: Location, levels: AppData['levels']): { exerciseId: string; level?: number } {
  if (slot.fixed) return { exerciseId: slot.fixed[location] };
  if (!slot.pattern) throw new Error('Slot needs a pattern or a fixed exercise');
  const ladder = getLadder(slot.pattern);
  if (!ladder) throw new Error(`No ladder for ${slot.pattern}`);
  const level = Math.min(Math.max(levels[slot.pattern] ?? 0, 0), ladder.rungs.length - 1);
  return { exerciseId: ladder.rungs[level][location], level };
}

/** Most recent RPE logged within the last 10 days, if any. */
export function recentRpe(sessions: AppData['sessions'], date: string): number | undefined {
  const cutoff = new Date(date);
  cutoff.setDate(cutoff.getDate() - 10);
  const cutoffKey = cutoff.toISOString().slice(0, 10);
  const recent = sessions
    .filter((s) => s.rpe !== undefined && s.date < date && s.date >= cutoffKey)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  return recent[0]?.rpe;
}

export function estimateMinutes(blocks: WorkoutBlock[], warmupItems: number): number {
  let sec = warmupItems > 0 ? 300 : 0; // warm-up
  for (const b of blocks) {
    let round = 0;
    for (const e of b.exercises) {
      const avg = (e.target[0] + e.target[1]) / 2;
      const per = e.mode === 'time' ? avg + 5 : avg * 3.5 + 10;
      round += (e.unilateral ? per * 2 : per) + b.switchRest;
    }
    sec += b.rounds * round + (b.rounds - 1) * b.roundRest;
  }
  sec += 180; // cool-down
  return Math.round(sec / 60);
}

export function buildWorkout({ data, date, location, dayType }: BuildInput): BuiltWorkout | null {
  const type = dayType ?? dayTypeFor(data, date);
  if (type === 'rest') return null;
  const loc = location ?? data.profile.defaultLocation;
  const tpl = TEMPLATES[type];
  const week = weekNumber(data.profile.startDate, date);
  const deload = isDeloadWeek(week);
  const phaseId = phaseForWeek(week);
  const phase = PHASES[phaseId];
  const notes: string[] = [];

  let rounds = phase.rounds;
  let roundRestAdj = 0;
  if (deload) {
    rounds = Math.max(2, rounds - 1);
    roundRestAdj += 30;
    notes.push('Deload week: one round fewer and longer rests. Move well, do not chase reps.');
  }

  const rpe = recentRpe(data.sessions, date);
  if (rpe !== undefined && !deload) {
    if (rpe >= 9) {
      rounds = Math.max(2, rounds - 1);
      roundRestAdj += 15;
      notes.push(`Last session felt very hard (${rpe}/10): one round fewer and extra rest today.`);
    } else if (rpe === 8) {
      roundRestAdj += 15;
      notes.push(`Last session felt hard (${rpe}/10): 15 s extra rest between rounds.`);
    } else if (rpe <= 4) {
      rounds = Math.min(5, rounds + 1);
      notes.push(`Last session felt easy (${rpe}/10): one extra round today.`);
    }
  }

  const blocks: WorkoutBlock[] = tpl.blocks.map((b) => {
    const exercises: WorkoutExercise[] = b.slots.map((slot) => {
      const { exerciseId, level } = resolveSlot(slot, loc, data.levels);
      const ex = getExercise(exerciseId);
      let target: [number, number];
      if (ex.pattern === 'cardio') {
        const mins = deload ? Math.max(15, phase.cardioMinutes - 5) : phase.cardioMinutes;
        target = [mins * 60, mins * 60];
      } else if (slot.seconds && ex.mode === 'time') target = slot.seconds;
      else if (slot.reps && ex.mode === 'reps') target = slot.reps;
      else if (ex.range) target = ex.range;
      else target = ex.mode === 'time' ? phase.seconds : phase.reps;
      return {
        exerciseId,
        name: ex.name,
        pattern: ex.pattern,
        level,
        mode: ex.mode,
        target,
        unilateral: !!ex.unilateral,
      };
    });
    const blockRounds = b.rounds ?? rounds;
    return {
      name: b.name,
      rounds: b.rounds !== undefined && deload && b.rounds > 1 ? Math.max(2, b.rounds - 1) : blockRounds,
      roundRest: (b.roundRest ?? data.profile.roundRest) + roundRestAdj,
      switchRest: b.switchRest ?? data.profile.switchRest,
      exercises,
    };
  });

  return {
    date,
    dayType: type,
    name: tpl.name,
    focus: tpl.focus,
    emoji: tpl.emoji,
    location: loc,
    phase: phaseId,
    phaseName: phase.name,
    week,
    deload,
    blocks,
    warmup: tpl.warmup,
    cooldown: tpl.cooldown,
    estMinutes: estimateMinutes(blocks, tpl.warmup.length),
    notes,
  };
}
