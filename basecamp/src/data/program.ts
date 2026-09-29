import type { DayType, PhaseParams, WorkoutTemplate } from '../types';

/** Weekly split, Monday first. */
export const WEEK_SPLIT: DayType[] = ['upperA', 'lowerA', 'cardioCore', 'upperB', 'lowerB', 'hiit', 'rest'];

export const DAY_LABEL: Record<DayType, string> = {
  upperA: 'Upper A',
  lowerA: 'Lower A',
  cardioCore: 'Cardio + Core',
  upperB: 'Upper B',
  lowerB: 'Lower B',
  upperC: 'Upper C',
  lowerC: 'Lower C',
  hiit: 'HIIT Circuit',
  nightMobility: 'Night mobility',
  nightCore: 'Night core & posture',
  nightWalk: 'Evening walk & stretch',
  morningWake: 'Morning wake-up',
  rest: 'Rest',
};

/** Every selectable main-workout type, in menu order. */
export const DAY_TYPES: DayType[] = ['upperA', 'upperB', 'upperC', 'lowerA', 'lowerB', 'lowerC', 'cardioCore', 'hiit', 'rest'];

/** Short companion routines that can sit next to the main workout. */
export const EXTRA_TYPES: DayType[] = ['nightMobility', 'nightCore', 'nightWalk', 'morningWake'];

export function isExtraType(t: DayType): boolean {
  return EXTRA_TYPES.includes(t);
}

export const DAY_SHORT: Record<DayType, string> = {
  upperA: 'UP A', lowerA: 'LO A', cardioCore: 'CAR', upperB: 'UP B', lowerB: 'LO B', upperC: 'UP C', lowerC: 'LO C', hiit: 'HIIT', nightMobility: 'MOB', nightCore: 'CORE', nightWalk: 'WALK', morningWake: 'WAKE', rest: 'REST',
};

export const PHASES: Record<'foundation' | 'build' | 'push', PhaseParams> = {
  foundation: {
    id: 'foundation', name: 'Foundation', rounds: 3, roundRest: 90, switchRest: 20,
    reps: [6, 10], seconds: [20, 40], cardioMinutes: 20,
    description: 'Weeks 1 to 2. Learn the movements, build the habit, leave 2 reps in the tank.',
  },
  build: {
    id: 'build', name: 'Build', rounds: 4, roundRest: 75, switchRest: 15,
    reps: [8, 12], seconds: [30, 50], cardioMinutes: 25,
    description: 'Weeks 3 to 6. More rounds, shorter rest, climb the ladders.',
  },
  push: {
    id: 'push', name: 'Push', rounds: 5, roundRest: 60, switchRest: 15,
    reps: [10, 15], seconds: [40, 60], cardioMinutes: 30,
    description: 'Week 7 onward. Higher rep ranges and denser circuits.',
  },
};

export const DELOAD_EVERY = 5;

/** Circuit templates. Rounds and rep ranges come from the phase unless a block overrides them. */
export const TEMPLATES: Record<Exclude<DayType, 'rest'>, WorkoutTemplate> = {
  upperA: {
    dayType: 'upperA', name: 'Upper A', focus: 'Push focus: chest, triceps, back', emoji: '💪',
    blocks: [
      { name: 'Circuit', slots: [
        { pattern: 'push' },
        { pattern: 'row' },
        { pattern: 'dip' },
        { pattern: 'pull' },
        { pattern: 'plank' },
        { fixed: { gym: 'band_face_pull', home: 'band_face_pull' } },
      ] },
      { name: 'Finisher', rounds: 2, slots: [
        { fixed: { gym: 'band_pull_apart', home: 'band_pull_apart' } },
        { fixed: { gym: 'superman', home: 'superman' } },
      ] },
    ],
    warmup: ['2 min easy walk or march', '10 arm circles each way', '10 band pull-aparts', '10 wall push-ups', '10 scapular push-ups'],
    cooldown: ['Doorway chest stretch, 30 s each side', 'Lat stretch on the bar, 30 s', 'Triceps stretch, 20 s each'],
  },
  lowerA: {
    dayType: 'lowerA', name: 'Lower A', focus: 'Squat focus: quads, glutes, core', emoji: '🦵',
    blocks: [
      { name: 'Circuit', slots: [
        { pattern: 'squat' },
        { pattern: 'hinge' },
        { pattern: 'lunge' },
        { pattern: 'calf' },
        { pattern: 'kneeRaise' },
        { pattern: 'sidePlank' },
      ] },
      { name: 'Finisher', rounds: 2, slots: [
        { fixed: { gym: 'glute_bridge_march', home: 'glute_bridge_march' }, seconds: [30, 45] },
        { fixed: { gym: 'band_lateral_walk', home: 'band_lateral_walk' } },
      ] },
    ],
    warmup: ['3 min easy bike or walk', '10 leg swings each leg', '10 bodyweight box squats', '10 glute bridges', '20 s wall sit'],
    cooldown: ['Couch stretch, 30 s each side', 'Hamstring stretch, 30 s each', 'Calf stretch on a step, 30 s each'],
  },
  cardioCore: {
    dayType: 'cardioCore', name: 'Cardio + Core', focus: 'Steady low-impact cardio, then core', emoji: '🚶',
    blocks: [
      { name: 'Steady cardio', rounds: 1, switchRest: 0, roundRest: 60, slots: [
        { fixed: { gym: 'treadmill_incline_walk', home: 'brisk_walk' } },
      ] },
      { name: 'Core circuit', rounds: 3, slots: [
        { pattern: 'plank' },
        { pattern: 'antiExtension' },
        { pattern: 'sidePlank' },
        { pattern: 'kneeRaise' },
        { fixed: { gym: 'superman', home: 'superman' } },
      ] },
    ],
    warmup: ['Start the cardio block easy for the first 3 minutes'],
    cooldown: ['Slow walk 3 min', 'Cat-cow, 10 reps', 'Child pose, 45 s'],
  },
  upperB: {
    dayType: 'upperB', name: 'Upper B', focus: 'Pull focus: back, biceps, shoulders', emoji: '🧗',
    blocks: [
      { name: 'Circuit', slots: [
        { pattern: 'pull' },
        { pattern: 'pike' },
        { pattern: 'row' },
        { pattern: 'push' },
        { fixed: { gym: 'band_pull_apart', home: 'band_pull_apart' } },
        { pattern: 'antiExtension' },
      ] },
      { name: 'Finisher', rounds: 2, slots: [
        { fixed: { gym: 'band_face_pull', home: 'band_face_pull' } },
        { fixed: { gym: 'dead_hang', home: 'dead_hang' }, seconds: [15, 30] },
      ] },
    ],
    warmup: ['2 min easy walk or march', '10 arm circles each way', '20 s dead hang', '10 band face pulls', '10 wall push-ups'],
    cooldown: ['Lat stretch on the bar, 30 s', 'Doorway chest stretch, 30 s each', 'Neck side stretch, 20 s each'],
  },
  lowerB: {
    dayType: 'lowerB', name: 'Lower B', focus: 'Hinge focus: glutes, hamstrings, hips', emoji: '🍑',
    blocks: [
      { name: 'Circuit', slots: [
        { pattern: 'hinge' },
        { pattern: 'stepup' },
        { pattern: 'squat' },
        { fixed: { gym: 'side_lying_leg_raise', home: 'side_lying_leg_raise' } },
        { pattern: 'calf' },
        { fixed: { gym: 'wall_sit', home: 'wall_sit' }, seconds: [30, 60] },
      ] },
      { name: 'Finisher', rounds: 2, slots: [
        { fixed: { gym: 'band_lateral_walk', home: 'band_lateral_walk' } },
        { fixed: { gym: 'superman', home: 'superman' } },
      ] },
    ],
    warmup: ['3 min easy bike or walk', '10 hip circles each way', '10 glute bridges', '10 band lateral walks each way', '10 bodyweight squats'],
    cooldown: ['Figure-4 glute stretch, 30 s each', 'Hamstring stretch, 30 s each', 'Hip flexor stretch, 30 s each'],
  },
  upperC: {
    dayType: 'upperC', name: 'Upper C', focus: 'Arms & shoulders: dips, overhead push, rows', emoji: '🏋️',
    blocks: [
      { name: 'Circuit', slots: [
        { pattern: 'dip' },
        { pattern: 'row' },
        { pattern: 'pike' },
        { pattern: 'pull' },
        { pattern: 'push' },
        { pattern: 'kneeRaise' },
      ] },
      { name: 'Finisher', rounds: 2, slots: [
        { fixed: { gym: 'dead_hang', home: 'dead_hang' }, seconds: [15, 30] },
        { fixed: { gym: 'band_pull_apart', home: 'band_pull_apart' } },
      ] },
    ],
    warmup: ['2 min easy walk or march', '10 arm circles each way', '10 wall push-ups', '10 band pull-aparts', '20 s dead hang'],
    cooldown: ['Triceps stretch, 20 s each', 'Doorway chest stretch, 30 s each', 'Lat stretch on the bar, 30 s'],
  },
  lowerC: {
    dayType: 'lowerC', name: 'Lower C', focus: 'Single-leg & balance: lunges, step-ups, glutes', emoji: '🦶',
    blocks: [
      { name: 'Circuit', slots: [
        { pattern: 'lunge' },
        { pattern: 'stepup' },
        { pattern: 'hinge' },
        { pattern: 'squat' },
        { pattern: 'sidePlank' },
        { pattern: 'calf' },
      ] },
      { name: 'Finisher', rounds: 2, slots: [
        { fixed: { gym: 'wall_sit', home: 'wall_sit' }, seconds: [30, 60] },
        { fixed: { gym: 'band_lateral_walk', home: 'band_lateral_walk' } },
      ] },
    ],
    warmup: ['3 min easy bike or walk', '10 leg swings each leg', '10 glute bridges', '10 reverse lunges, slow', '10 calf raises'],
    cooldown: ['Couch stretch, 30 s each side', 'Figure-4 glute stretch, 30 s each', 'Calf stretch on a step, 30 s each'],
  },
  hiit: {
    dayType: 'hiit', name: 'HIIT Circuit', focus: 'Low-impact intervals: 40 s on, 20 s off', emoji: '🔥',
    blocks: [
      { name: 'Intervals', switchRest: 20, roundRest: 60, slots: [
        { fixed: { gym: 'bike_sprint', home: 'fast_march' }, seconds: [40, 40] },
        { fixed: { gym: 'squat_to_stand', home: 'squat_to_stand' }, seconds: [40, 40] },
        { fixed: { gym: 'bench_mountain_climber', home: 'bench_mountain_climber' }, seconds: [40, 40] },
        { fixed: { gym: 'shadow_boxing', home: 'shadow_boxing' }, seconds: [40, 40] },
        { fixed: { gym: 'fast_stepup', home: 'fast_stepup' }, seconds: [40, 40] },
        { fixed: { gym: 'plank_taps_interval', home: 'plank_taps_interval' }, seconds: [40, 40] },
        { fixed: { gym: 'glute_bridge_march', home: 'glute_bridge_march' }, seconds: [40, 40] },
        { fixed: { gym: 'wall_sit', home: 'wall_sit' }, seconds: [40, 40] },
      ] },
    ],
    warmup: ['3 min easy bike or march', '10 bodyweight squats', '10 arm swings', '10 step-ups each leg, slow'],
    cooldown: ['Walk 3 min until breathing is normal', 'Quad stretch, 30 s each', 'Chest and shoulder stretch, 30 s'],
  },
  nightMobility: {
    dayType: 'nightMobility', name: 'Night mobility', focus: 'Unwind: hips, hamstrings, chest, then long holds and breathing', emoji: '🌙', extra: true,
    blocks: [
      { name: 'Flow', rounds: 3, switchRest: 5, roundRest: 30, slots: [
        { fixed: { gym: 'cat_cow', home: 'cat_cow' } },
        { fixed: { gym: 'worlds_greatest_stretch', home: 'worlds_greatest_stretch' } },
        { fixed: { gym: 'hip_flexor_stretch', home: 'hip_flexor_stretch' } },
        { fixed: { gym: 'hamstring_stretch', home: 'hamstring_stretch' } },
        { fixed: { gym: 'figure4_stretch', home: 'figure4_stretch' } },
        { fixed: { gym: 'doorway_chest_stretch', home: 'doorway_chest_stretch' } },
        { fixed: { gym: 'child_pose', home: 'child_pose' } },
      ] },
      { name: 'Deep holds', rounds: 1, switchRest: 5, roundRest: 0, slots: [
        { fixed: { gym: 'hip_flexor_stretch', home: 'hip_flexor_stretch' }, seconds: [60, 60] },
        { fixed: { gym: 'hamstring_stretch', home: 'hamstring_stretch' }, seconds: [60, 60] },
        { fixed: { gym: 'figure4_stretch', home: 'figure4_stretch' }, seconds: [60, 60] },
        { fixed: { gym: 'calf_stretch', home: 'calf_stretch' }, seconds: [45, 45] },
        { fixed: { gym: 'thoracic_rotation', home: 'thoracic_rotation' }, seconds: [45, 45] },
        { fixed: { gym: 'child_pose', home: 'child_pose' }, seconds: [60, 60] },
      ] },
      { name: 'Wind down', rounds: 1, switchRest: 0, roundRest: 0, slots: [
        { fixed: { gym: 'box_breathing', home: 'box_breathing' }, seconds: [120, 120] },
      ] },
    ],
    warmup: [],
    cooldown: [],
  },
  nightCore: {
    dayType: 'nightCore', name: 'Night core & posture', focus: 'Easy core, glutes and upper back, posture work, then stretch', emoji: '🌙', extra: true,
    blocks: [
      { name: 'Core circuit', rounds: 3, switchRest: 10, roundRest: 45, slots: [
        { pattern: 'antiExtension' },
        { fixed: { gym: 'glute_bridge', home: 'glute_bridge' }, reps: [12, 15] },
        { pattern: 'sidePlank' },
        { fixed: { gym: 'band_pull_apart', home: 'band_pull_apart' }, reps: [15, 20] },
        { pattern: 'plank' },
        { fixed: { gym: 'superman', home: 'superman' }, seconds: [30, 30] },
      ] },
      { name: 'Posture', rounds: 2, switchRest: 5, roundRest: 30, slots: [
        { fixed: { gym: 'band_face_pull', home: 'band_face_pull' }, reps: [12, 15] },
        { fixed: { gym: 'thoracic_rotation', home: 'thoracic_rotation' } },
        { fixed: { gym: 'doorway_chest_stretch', home: 'doorway_chest_stretch' } },
        { fixed: { gym: 'cat_cow', home: 'cat_cow' } },
      ] },
      { name: 'Stretch', rounds: 1, switchRest: 5, roundRest: 0, slots: [
        { fixed: { gym: 'child_pose', home: 'child_pose' }, seconds: [60, 60] },
        { fixed: { gym: 'hamstring_stretch', home: 'hamstring_stretch' }, seconds: [45, 45] },
        { fixed: { gym: 'box_breathing', home: 'box_breathing' }, seconds: [120, 120] },
      ] },
    ],
    warmup: [],
    cooldown: [],
  },
  nightWalk: {
    dayType: 'nightWalk', name: 'Evening walk & stretch', focus: '25 min easy walk, then a full legs and hips stretch', emoji: '🚶', extra: true,
    blocks: [
      { name: 'Walk', rounds: 1, switchRest: 0, roundRest: 30, slots: [
        { fixed: { gym: 'brisk_walk', home: 'brisk_walk' }, seconds: [1500, 1500] },
      ] },
      { name: 'Stretch', rounds: 1, switchRest: 5, roundRest: 0, slots: [
        { fixed: { gym: 'calf_stretch', home: 'calf_stretch' }, seconds: [45, 45] },
        { fixed: { gym: 'hamstring_stretch', home: 'hamstring_stretch' }, seconds: [45, 45] },
        { fixed: { gym: 'hip_flexor_stretch', home: 'hip_flexor_stretch' }, seconds: [45, 45] },
        { fixed: { gym: 'figure4_stretch', home: 'figure4_stretch' }, seconds: [45, 45] },
        { fixed: { gym: 'child_pose', home: 'child_pose' }, seconds: [60, 60] },
        { fixed: { gym: 'box_breathing', home: 'box_breathing' }, seconds: [90, 90] },
      ] },
    ],
    warmup: [],
    cooldown: [],
  },
  morningWake: {
    dayType: 'morningWake', name: 'Morning wake-up', focus: 'Loosen up, switch on, then an easy walk', emoji: '🌅', extra: true,
    blocks: [
      { name: 'Wake up', rounds: 3, switchRest: 5, roundRest: 30, slots: [
        { fixed: { gym: 'cat_cow', home: 'cat_cow' }, seconds: [30, 30] },
        { fixed: { gym: 'hip_circles', home: 'hip_circles' } },
        { fixed: { gym: 'glute_bridge', home: 'glute_bridge' }, reps: [10, 12] },
        { fixed: { gym: 'bw_squat', home: 'bw_squat' }, reps: [8, 10] },
        { fixed: { gym: 'wall_pushup', home: 'wall_pushup' }, reps: [8, 10] },
        { fixed: { gym: 'band_pull_apart', home: 'band_pull_apart' }, reps: [12, 15] },
        { fixed: { gym: 'thoracic_rotation', home: 'thoracic_rotation' } },
        { fixed: { gym: 'worlds_greatest_stretch', home: 'worlds_greatest_stretch' } },
      ] },
      { name: 'Easy walk', rounds: 1, switchRest: 0, roundRest: 30, slots: [
        { fixed: { gym: 'brisk_walk', home: 'brisk_walk' }, seconds: [600, 600] },
      ] },
      { name: 'Breathe', rounds: 1, switchRest: 0, roundRest: 0, slots: [
        { fixed: { gym: 'box_breathing', home: 'box_breathing' }, seconds: [90, 90] },
      ] },
    ],
    warmup: [],
    cooldown: [],
  },
};

export const REST_DAY_TIPS = [
  'Walk 20 to 30 minutes at an easy pace.',
  'Do 5 minutes of gentle mobility: hips, shoulders, ankles.',
  'Hit your protein and water targets; recovery is where muscle is built.',
  'Sleep 7 or more hours tonight.',
];
