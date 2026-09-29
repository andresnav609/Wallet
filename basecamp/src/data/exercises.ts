import type { Exercise, Ladder, Pattern } from '../types';

type Ex = Omit<Exercise, 'id'> & { id: string };
const list: Ex[] = [];
function ex(e: Ex) {
  list.push(e);
}

/* ------------------------------------------------------------------ */
/* PUSH                                                                */
/* ------------------------------------------------------------------ */
ex({ id: 'wall_pushup', name: 'Wall push-up', pattern: 'push', mode: 'reps', location: 'both', level: 0,
  muscles: ['Chest', 'Shoulders', 'Triceps'], equipment: ['Wall'],
  cues: ['Hands on the wall at shoulder height, a bit wider than shoulders.', 'Walk feet back until you lean in at a strong angle.', 'Squeeze glutes so the body stays one straight line.', 'Lower until your nose almost touches the wall, then press away.'],
  note: 'Teaches the straight-body position before adding load.' });
ex({ id: 'incline_pushup_high', name: 'High incline push-up', pattern: 'push', mode: 'reps', location: 'gym', level: 1,
  muscles: ['Chest', 'Shoulders', 'Triceps'], equipment: ['Smith machine bar (chest height)'],
  cues: ['Set the Smith bar around chest height and grip it slightly wider than shoulders.', 'Body straight from head to heels, glutes tight.', 'Lower chest to the bar with elbows at about 45 degrees.', 'Press back up without letting the hips sag.'] });
ex({ id: 'incline_pushup_counter', name: 'Counter push-up', pattern: 'push', mode: 'reps', location: 'home', level: 1,
  muscles: ['Chest', 'Shoulders', 'Triceps'], equipment: ['Kitchen counter or dresser'],
  cues: ['Hands on the counter edge, slightly wider than shoulders.', 'Step back so you are on your toes, body in one line.', 'Lower chest to the edge, elbows about 45 degrees from the body.', 'Drive the counter away and squeeze chest at the top.'] });
ex({ id: 'incline_pushup_bench', name: 'Low incline push-up', pattern: 'push', mode: 'reps', location: 'both', level: 2,
  muscles: ['Chest', 'Shoulders', 'Triceps'], equipment: ['Bench'],
  cues: ['Hands on the bench, arms straight, toes on the floor.', 'Brace your core as if someone is about to poke your stomach.', 'Lower slowly for 2 seconds, chest to the bench.', 'Press up fully; lock the elbows softly at the top.'] });
ex({ id: 'knee_pushup', name: 'Knee push-up', pattern: 'push', mode: 'reps', location: 'both', level: 3,
  muscles: ['Chest', 'Shoulders', 'Triceps'], equipment: ['Floor / mat'],
  cues: ['Knees down, feet up, hands under shoulders and slightly wider.', 'Hips stay in line with shoulders and knees; no piking.', 'Lower chest to a fist height off the floor.', 'Push the floor away and exhale at the top.'] });
ex({ id: 'pushup', name: 'Push-up', pattern: 'push', mode: 'reps', location: 'both', level: 4,
  muscles: ['Chest', 'Shoulders', 'Triceps', 'Core'], equipment: ['Floor / mat'],
  cues: ['Hands under shoulders, fingers spread, screw hands into the floor.', 'Body is a plank: glutes and abs on the whole time.', 'Elbows track back at 45 degrees, chest reaches the floor.', 'Full lockout at the top of every rep.'],
  note: 'A big milestone. Own it at 12 clean reps before moving on.' });
ex({ id: 'diamond_pushup', name: 'Diamond push-up', pattern: 'push', mode: 'reps', location: 'both', level: 5,
  muscles: ['Triceps', 'Chest', 'Shoulders'], equipment: ['Floor / mat'],
  cues: ['Thumbs and index fingers touch under the chest.', 'Elbows stay close to the ribs on the way down.', 'Lower until the chest touches your hands.', 'Keep the body rigid; do not let the hips drop.'] });
ex({ id: 'decline_pushup', name: 'Decline push-up', pattern: 'push', mode: 'reps', location: 'both', level: 6,
  muscles: ['Upper chest', 'Shoulders', 'Triceps'], equipment: ['Bench'],
  cues: ['Feet on the bench, hands on the floor under shoulders.', 'Push your head through so the forehead leads toward the floor.', 'Keep hips high and in line; do not sag.', 'Press away hard and pause at the top.'] });

/* ------------------------------------------------------------------ */
/* PULL (vertical)                                                     */
/* ------------------------------------------------------------------ */
ex({ id: 'dead_hang', name: 'Dead hang', pattern: 'pull', mode: 'time', location: 'both', level: 0, range: [15, 40],
  muscles: ['Grip', 'Lats', 'Shoulders'], equipment: ['Pull-up bar'],
  cues: ['Grip the bar just wider than shoulders, thumbs wrapped.', 'Hang with straight arms, shoulders relaxed up by the ears.', 'Breathe slowly; keep legs still.', 'Step off before your grip fails, not after.'],
  note: 'Builds grip and shoulder tolerance for everything else on this ladder.' });
ex({ id: 'scap_pull', name: 'Scapular pull', pattern: 'pull', mode: 'reps', location: 'both', level: 1, range: [5, 10],
  muscles: ['Lats', 'Lower traps', 'Grip'], equipment: ['Pull-up bar'],
  cues: ['Start in a dead hang with straight arms.', 'Without bending the elbows, pull the shoulder blades down and back.', 'Your body rises an inch or two; hold 1 second.', 'Lower slowly back to the relaxed hang.'] });
ex({ id: 'pullup_negative', name: 'Pull-up negative', pattern: 'pull', mode: 'reps', location: 'both', level: 2, range: [3, 6],
  muscles: ['Lats', 'Biceps', 'Upper back'], equipment: ['Pull-up bar', 'Box or bench'],
  cues: ['Use a box to start with your chin over the bar.', 'Lower yourself as slowly as you can, aiming for 3 to 5 seconds.', 'Keep chest up and shoulders away from the ears.', 'Step back onto the box; do not jump.'],
  note: 'Slow lowering is the fastest route to your first pull-up.' });
ex({ id: 'assisted_pullup_machine', name: 'Assisted pull-up (machine)', pattern: 'pull', mode: 'reps', location: 'gym', level: 3,
  muscles: ['Lats', 'Biceps', 'Upper back'], equipment: ['Assisted pull-up machine'],
  cues: ['Set the assist so the top of the rep is hard but clean.', 'Pull elbows down toward the back pockets.', 'Chin over the bar, then lower with control for 2 seconds.', 'Reduce the assist by one plate when you hit the top of the range.'] });
ex({ id: 'assisted_pullup_band', name: 'Band-assisted pull-up', pattern: 'pull', mode: 'reps', location: 'home', level: 3,
  muscles: ['Lats', 'Biceps', 'Upper back'], equipment: ['Pull-up bar', 'Assist band'],
  cues: ['Loop the band over the bar and put one knee or foot in it.', 'Start from a full hang, then drive elbows down.', 'Chin over the bar without kicking.', 'Lower slowly; switch to a thinner band as you get stronger.'] });
ex({ id: 'pullup', name: 'Pull-up', pattern: 'pull', mode: 'reps', location: 'both', level: 4, range: [3, 8],
  muscles: ['Lats', 'Biceps', 'Upper back', 'Core'], equipment: ['Pull-up bar'],
  cues: ['Full hang at the bottom, shoulders packed before you pull.', 'Lead with the chest, elbows drive down and back.', 'Chin clearly over the bar, no chin poke.', 'Control the descent to a straight-arm hang.'],
  note: 'The milestone. Every earlier rung exists to get here.' });
ex({ id: 'chinup', name: 'Chin-up', pattern: 'pull', mode: 'reps', location: 'both', level: 5, range: [5, 10],
  muscles: ['Biceps', 'Lats', 'Upper back'], equipment: ['Pull-up bar'],
  cues: ['Palms facing you, hands shoulder width.', 'Pull until the chin clears the bar and the chest nearly touches.', 'Squeeze the biceps at the top for a second.', 'Lower for 2 seconds; no swinging.'] });

/* ------------------------------------------------------------------ */
/* ROW (horizontal pull)                                               */
/* ------------------------------------------------------------------ */
ex({ id: 'inverted_row_high', name: 'Inverted row (bar high)', pattern: 'row', mode: 'reps', location: 'gym', level: 0,
  muscles: ['Upper back', 'Lats', 'Biceps'], equipment: ['Smith machine bar (hip height)'],
  cues: ['Set the bar at hip height and hang under it, body nearly upright.', 'Squeeze glutes so the body is one line.', 'Pull chest to the bar, elbows back, shoulder blades together.', 'Lower with control; move feet forward to make it harder.'] });
ex({ id: 'band_row', name: 'Band row', pattern: 'row', mode: 'reps', location: 'home', level: 0,
  muscles: ['Upper back', 'Lats', 'Biceps'], equipment: ['Resistance band'],
  cues: ['Anchor the band at chest height (door or pull-up bar post).', 'Step back until there is tension with straight arms.', 'Pull elbows past the ribs, squeeze the shoulder blades.', 'Return slowly, arms fully straight, no shrugging.'] });
ex({ id: 'inverted_row_waist', name: 'Inverted row (bar at waist)', pattern: 'row', mode: 'reps', location: 'gym', level: 1,
  muscles: ['Upper back', 'Lats', 'Biceps'], equipment: ['Smith machine bar (waist height)'],
  cues: ['Bar at waist height, heels on the floor, knees bent.', 'Hang with straight arms, then pull chest to the bar.', 'Keep hips up; do not let the body pike.', 'Pause with the bar at the chest, lower for 2 seconds.'] });
ex({ id: 'band_row_single', name: 'Single-arm band row', pattern: 'row', mode: 'reps', location: 'home', level: 1, unilateral: true,
  muscles: ['Upper back', 'Lats', 'Biceps'], equipment: ['Resistance band'],
  cues: ['Anchor the band at chest height and hold with one hand.', 'Stagger the stance, brace the core so the torso does not twist.', 'Pull the elbow back past the ribs, squeeze the back.', 'Control the return; switch sides after the set.'] });
ex({ id: 'inverted_row_knee', name: 'Inverted row (knees bent)', pattern: 'row', mode: 'reps', location: 'gym', level: 2,
  muscles: ['Upper back', 'Lats', 'Biceps', 'Core'], equipment: ['Smith machine bar (knee height)'],
  cues: ['Bar at knee height, feet flat, knees bent 90 degrees.', 'Straight line from knees to shoulders.', 'Pull until the chest touches the bar.', 'Lower slowly and stretch the back at the bottom.'] });
ex({ id: 'table_row', name: 'Table row', pattern: 'row', mode: 'reps', location: 'home', level: 2,
  muscles: ['Upper back', 'Lats', 'Biceps', 'Core'], equipment: ['Sturdy table'],
  cues: ['Lie under a sturdy table, grip the edge, knees bent.', 'Body in one line from knees to shoulders.', 'Pull chest to the edge, elbows back.', 'Lower slowly; check the table is stable before starting.'] });
ex({ id: 'inverted_row_straight', name: 'Inverted row (legs straight)', pattern: 'row', mode: 'reps', location: 'gym', level: 3,
  muscles: ['Upper back', 'Lats', 'Biceps', 'Core'], equipment: ['Smith machine bar'],
  cues: ['Bar at knee height, heels on the floor, legs straight.', 'Body rigid from heels to head.', 'Pull chest to bar, hold 1 second.', 'Lower under control; feet on a bench is the next step.'] });
ex({ id: 'table_row_straight', name: 'Table row (legs straight)', pattern: 'row', mode: 'reps', location: 'home', level: 3,
  muscles: ['Upper back', 'Lats', 'Biceps', 'Core'], equipment: ['Sturdy table'],
  cues: ['Same as the table row with legs straight and heels on the floor.', 'Squeeze glutes hard to keep the hips up.', 'Pull chest to the edge, hold 1 second.', 'Lower for 2 seconds.'] });
ex({ id: 'inverted_row_elevated', name: 'Feet-elevated inverted row', pattern: 'row', mode: 'reps', location: 'gym', level: 4,
  muscles: ['Upper back', 'Lats', 'Biceps', 'Core'], equipment: ['Smith machine bar', 'Bench'],
  cues: ['Heels on a bench, body horizontal under the bar.', 'Keep the whole body tight; hips do not drop.', 'Chest to the bar every rep.', 'Slow 2 second descent.'] });
ex({ id: 'table_row_elevated', name: 'Feet-elevated table row', pattern: 'row', mode: 'reps', location: 'home', level: 4,
  muscles: ['Upper back', 'Lats', 'Biceps', 'Core'], equipment: ['Sturdy table', 'Chair'],
  cues: ['Heels on a chair, body horizontal under the table edge.', 'Rigid body, pull chest to the edge.', 'Hold 1 second at the top.', 'Lower slowly.'] });

/* ------------------------------------------------------------------ */
/* DIP                                                                 */
/* ------------------------------------------------------------------ */
ex({ id: 'bench_dip_knees', name: 'Bench dip (knees bent)', pattern: 'dip', mode: 'reps', location: 'both', level: 0,
  muscles: ['Triceps', 'Chest', 'Shoulders'], equipment: ['Bench'],
  cues: ['Hands on the bench edge, fingers forward, feet flat, knees bent.', 'Keep hips close to the bench.', 'Bend elbows straight back until the upper arm is parallel to the floor.', 'Press up and lock out; stop if the front of the shoulder pinches.'] });
ex({ id: 'bench_dip_straight', name: 'Bench dip (legs straight)', pattern: 'dip', mode: 'reps', location: 'both', level: 1,
  muscles: ['Triceps', 'Chest', 'Shoulders'], equipment: ['Bench'],
  cues: ['Same set-up with legs straight and heels on the floor.', 'Shoulders down and back, chest open.', 'Lower to 90 degrees at the elbow.', 'Drive through the palms to the top.'] });
ex({ id: 'bench_dip_elevated', name: 'Bench dip (feet elevated)', pattern: 'dip', mode: 'reps', location: 'both', level: 2,
  muscles: ['Triceps', 'Chest', 'Shoulders'], equipment: ['Bench', 'Second bench or chair'],
  cues: ['Heels on a second bench or chair, hands on the first.', 'Lower slowly for 2 seconds.', 'Elbows point back, not out.', 'Full lockout at the top.'] });
ex({ id: 'assisted_dip_machine', name: 'Assisted dip (machine)', pattern: 'dip', mode: 'reps', location: 'gym', level: 3,
  muscles: ['Chest', 'Triceps', 'Shoulders'], equipment: ['Assisted dip machine'],
  cues: ['Set the assist so 8 reps are hard but clean.', 'Lean slightly forward, elbows track back.', 'Lower until the upper arm is parallel to the floor.', 'Press to a full lockout; reduce assist over time.'] });
ex({ id: 'bench_dip_negatives', name: 'Bench dip (feet elevated, slow negatives)', pattern: 'dip', mode: 'reps', location: 'home', level: 3, range: [5, 10],
  muscles: ['Triceps', 'Chest', 'Shoulders'], equipment: ['Bench', 'Chair'],
  cues: ['Feet elevated, lower for a full 4 seconds.', 'Press back up at normal speed.', 'Keep the shoulders packed down the whole rep.', 'Stop the set when the tempo breaks down.'] });
ex({ id: 'dip', name: 'Parallel bar dip', pattern: 'dip', mode: 'reps', location: 'gym', level: 4, range: [3, 8],
  muscles: ['Chest', 'Triceps', 'Shoulders'], equipment: ['Dip bars'],
  cues: ['Start at the top with locked arms, shoulders down.', 'Lean forward slightly and lower until the upper arm is parallel.', 'Elbows track back, chest stays up.', 'Press through the palms to full lockout.'] });
ex({ id: 'bench_dip_weighted', name: 'Bench dip (feet elevated, backpack)', pattern: 'dip', mode: 'reps', location: 'home', level: 4,
  muscles: ['Triceps', 'Chest', 'Shoulders'], equipment: ['Bench', 'Chair', 'Loaded backpack'],
  cues: ['Add a backpack across the lap for extra load.', 'Same strict form: elbows back, full range.', 'Lower for 2 seconds.', 'Add weight only when you hit the top of the range.'] });

/* ------------------------------------------------------------------ */
/* PIKE (overhead push)                                                */
/* ------------------------------------------------------------------ */
ex({ id: 'pike_pushup_elevated', name: 'Elevated pike push-up', pattern: 'pike', mode: 'reps', location: 'both', level: 0,
  muscles: ['Shoulders', 'Triceps', 'Upper chest'], equipment: ['Bench'],
  cues: ['Hands on a bench, walk feet in so hips point up in an A shape.', 'Look between your feet, not forward.', 'Bend elbows and lower the top of the head toward the bench.', 'Press back to straight arms.'] });
ex({ id: 'pike_pushup', name: 'Pike push-up', pattern: 'pike', mode: 'reps', location: 'both', level: 1,
  muscles: ['Shoulders', 'Triceps', 'Upper chest'], equipment: ['Floor / mat'],
  cues: ['Hands on the floor, hips as high as possible, knees soft.', 'Lower the head to the floor in front of the hands.', 'Elbows go forward and out slightly, not flared wide.', 'Push back up to the A shape.'] });
ex({ id: 'pike_pushup_feet_elevated', name: 'Feet-elevated pike push-up', pattern: 'pike', mode: 'reps', location: 'both', level: 2,
  muscles: ['Shoulders', 'Triceps'], equipment: ['Bench'],
  cues: ['Feet on the bench, hips stacked over the shoulders.', 'Lower the head to the floor, elbows forward.', 'Keep the core braced so the back does not arch.', 'Press to full lockout.'] });
ex({ id: 'wall_handstand_hold', name: 'Wall handstand hold', pattern: 'pike', mode: 'time', location: 'both', level: 3, range: [15, 40],
  muscles: ['Shoulders', 'Core'], equipment: ['Wall'],
  cues: ['Walk feet up the wall from a plank until hands are close to the wall.', 'Push tall through the shoulders, ribs in.', 'Breathe; hold with straight arms.', 'Walk back down under control.'] });

/* ------------------------------------------------------------------ */
/* SQUAT                                                               */
/* ------------------------------------------------------------------ */
ex({ id: 'box_squat', name: 'Box squat', pattern: 'squat', mode: 'reps', location: 'both', level: 0,
  muscles: ['Quads', 'Glutes', 'Hamstrings'], equipment: ['Bench or box'],
  cues: ['Stand in front of the bench, feet shoulder width, toes slightly out.', 'Push hips back and sit down under control; do not drop.', 'Touch the bench lightly, keep the chest up.', 'Drive through the whole foot to stand tall.'],
  note: 'Friendly on the knees; teaches sitting back instead of forward.' });
ex({ id: 'bw_squat', name: 'Bodyweight squat', pattern: 'squat', mode: 'reps', location: 'both', level: 1,
  muscles: ['Quads', 'Glutes', 'Hamstrings'], equipment: ['None'],
  cues: ['Feet shoulder width, toes slightly out, weight mid-foot.', 'Sit down between the heels, knees tracking over toes.', 'Go as deep as you can with a flat back.', 'Stand up and squeeze the glutes at the top.'] });
ex({ id: 'split_squat', name: 'Split squat', pattern: 'squat', mode: 'reps', location: 'both', level: 2, unilateral: true,
  muscles: ['Quads', 'Glutes'], equipment: ['None'],
  cues: ['Long stance, front foot flat, back heel up.', 'Drop the back knee straight down toward the floor.', 'Front shin stays fairly vertical; torso tall.', 'Push through the front foot to stand.'] });
ex({ id: 'bulgarian_split_squat', name: 'Bulgarian split squat', pattern: 'squat', mode: 'reps', location: 'both', level: 3, unilateral: true,
  muscles: ['Quads', 'Glutes'], equipment: ['Bench'],
  cues: ['Rear foot on the bench, front foot far enough forward to stay balanced.', 'Lower the back knee toward the floor.', 'Slight forward lean is fine; keep the front heel down.', 'Drive up through the front foot.'] });
ex({ id: 'assisted_pistol', name: 'Assisted pistol squat', pattern: 'squat', mode: 'reps', location: 'both', level: 4, unilateral: true, range: [3, 8],
  muscles: ['Quads', 'Glutes', 'Balance'], equipment: ['Post, band or Smith bar to hold'],
  cues: ['Hold a post or band lightly for balance.', 'Lift one leg forward and sit down on the other.', 'Go as low as you can with the heel down.', 'Use the arms as little as possible to stand.'] });

/* ------------------------------------------------------------------ */
/* HINGE                                                               */
/* ------------------------------------------------------------------ */
ex({ id: 'glute_bridge', name: 'Glute bridge', pattern: 'hinge', mode: 'reps', location: 'both', level: 0, range: [10, 15],
  muscles: ['Glutes', 'Hamstrings'], equipment: ['Floor / mat'],
  cues: ['On your back, knees bent, heels close to the glutes.', 'Push through the heels and lift the hips.', 'Squeeze the glutes hard at the top; ribs down, no back arch.', 'Lower slowly, tap the floor, repeat.'] });
ex({ id: 'hip_thrust', name: 'Hip thrust', pattern: 'hinge', mode: 'reps', location: 'both', level: 1, range: [10, 15],
  muscles: ['Glutes', 'Hamstrings'], equipment: ['Bench'],
  cues: ['Upper back on the bench, feet flat, shins vertical at the top.', 'Chin tucked, look forward not up.', 'Drive hips up until the torso is level, squeeze 1 second.', 'Lower with control; add a pause at the top to make it harder.'] });
ex({ id: 'single_leg_bridge', name: 'Single-leg glute bridge', pattern: 'hinge', mode: 'reps', location: 'both', level: 2, unilateral: true,
  muscles: ['Glutes', 'Hamstrings'], equipment: ['Floor / mat'],
  cues: ['Set up like the glute bridge, one foot lifted.', 'Drive through the working heel; keep hips level.', 'Squeeze at the top without arching the back.', 'Lower slowly.'] });
ex({ id: 'single_leg_hip_thrust', name: 'Single-leg hip thrust', pattern: 'hinge', mode: 'reps', location: 'both', level: 3, unilateral: true,
  muscles: ['Glutes', 'Hamstrings'], equipment: ['Bench'],
  cues: ['Upper back on the bench, one foot on the floor, other knee tucked.', 'Drive through the heel and keep the pelvis level.', 'Squeeze at the top for 1 second.', 'Lower under control.'] });
ex({ id: 'smith_rdl', name: 'Smith machine RDL (light)', pattern: 'hinge', mode: 'reps', location: 'gym', level: 4,
  muscles: ['Hamstrings', 'Glutes', 'Lower back'], equipment: ['Smith machine'],
  cues: ['Light bar, feet hip width, soft knees.', 'Push the hips back and slide the bar down the thighs.', 'Flat back, stop when hamstrings feel a deep stretch.', 'Drive hips forward to stand; do not shrug.'] });
ex({ id: 'band_rdl', name: 'Band Romanian deadlift', pattern: 'hinge', mode: 'reps', location: 'home', level: 4,
  muscles: ['Hamstrings', 'Glutes', 'Lower back'], equipment: ['Resistance band'],
  cues: ['Stand on the band, hold the ends, soft knees.', 'Push hips back, flat back, hands slide down the thighs.', 'Feel the hamstrings stretch, then drive hips forward.', 'Stand tall and squeeze the glutes.'] });

/* ------------------------------------------------------------------ */
/* LUNGE                                                               */
/* ------------------------------------------------------------------ */
ex({ id: 'assisted_reverse_lunge', name: 'Assisted reverse lunge', pattern: 'lunge', mode: 'reps', location: 'both', level: 0, unilateral: true,
  muscles: ['Quads', 'Glutes'], equipment: ['Something to hold (post, bar, wall)'],
  cues: ['Hold a support lightly with one hand.', 'Step back and lower the rear knee toward the floor.', 'Front knee tracks over the toes; torso tall.', 'Push through the front foot to return.'] });
ex({ id: 'reverse_lunge', name: 'Reverse lunge', pattern: 'lunge', mode: 'reps', location: 'both', level: 1, unilateral: true,
  muscles: ['Quads', 'Glutes'], equipment: ['None'],
  cues: ['Step back, rear knee to an inch above the floor.', 'Keep the front heel down and the front shin vertical.', 'Drive through the front foot to stand.', 'Alternate or do all reps on one side, your call.'] });
ex({ id: 'forward_lunge', name: 'Forward lunge', pattern: 'lunge', mode: 'reps', location: 'both', level: 2, unilateral: true,
  muscles: ['Quads', 'Glutes'], equipment: ['None'],
  cues: ['Step forward into a long stance.', 'Lower straight down; front knee over the toes.', 'Push back to standing through the front heel.', 'Control the landing; no stomping.'] });
ex({ id: 'walking_lunge', name: 'Walking lunge', pattern: 'lunge', mode: 'reps', location: 'both', level: 3, unilateral: true,
  muscles: ['Quads', 'Glutes', 'Balance'], equipment: ['Floor space'],
  cues: ['Step forward and lower the back knee close to the floor.', 'Stand through the front foot and step straight into the next lunge.', 'Tall torso, eyes forward.', 'Keep the steps long enough that the front knee stays behind the toes.'] });
ex({ id: 'deficit_reverse_lunge', name: 'Deficit reverse lunge', pattern: 'lunge', mode: 'reps', location: 'both', level: 4, unilateral: true,
  muscles: ['Quads', 'Glutes'], equipment: ['Low step or plate'],
  cues: ['Stand on a low step, step back and down past the step level.', 'Extra range: rear knee lower than the front foot.', 'Lower for 2 seconds, drive up through the front foot.', 'Hold a support if balance is shaky.'] });

/* ------------------------------------------------------------------ */
/* STEP-UP                                                             */
/* ------------------------------------------------------------------ */
ex({ id: 'stepup_low', name: 'Low step-up', pattern: 'stepup', mode: 'reps', location: 'both', level: 0, unilateral: true,
  muscles: ['Quads', 'Glutes'], equipment: ['Low step or stair'],
  cues: ['Whole foot on the step.', 'Drive through the heel; do not push off the back foot.', 'Stand fully tall on top.', 'Lower slowly, back foot touches down lightly.'] });
ex({ id: 'stepup_bench', name: 'Bench step-up', pattern: 'stepup', mode: 'reps', location: 'both', level: 1, unilateral: true,
  muscles: ['Quads', 'Glutes'], equipment: ['Bench'],
  cues: ['Foot flat on the bench, shin vertical.', 'Lean slightly forward and push through the heel.', 'Finish tall, hips level.', 'Lower under control for 2 seconds.'] });
ex({ id: 'stepup_high', name: 'High box step-up', pattern: 'stepup', mode: 'reps', location: 'both', level: 2, unilateral: true,
  muscles: ['Quads', 'Glutes'], equipment: ['High box'],
  cues: ['Box at or above knee height.', 'Push through the top foot only; no bounce.', 'Stand fully tall at the top.', 'Lower slowly, control the landing.'] });
ex({ id: 'stepup_slow', name: 'Slow-lowering step-up', pattern: 'stepup', mode: 'reps', location: 'both', level: 3, unilateral: true, range: [6, 10],
  muscles: ['Quads', 'Glutes'], equipment: ['Bench or box'],
  cues: ['Step up normally.', 'Lower yourself over a full 3 seconds.', 'Keep the knee tracking over the middle toes.', 'Tap the floor lightly and go again.'] });

/* ------------------------------------------------------------------ */
/* CALF                                                                */
/* ------------------------------------------------------------------ */
ex({ id: 'calf_raise', name: 'Standing calf raise', pattern: 'calf', mode: 'reps', location: 'both', level: 0, range: [12, 20],
  muscles: ['Calves'], equipment: ['None'],
  cues: ['Feet hip width, hold a wall lightly.', 'Rise onto the balls of the feet as high as possible.', 'Pause 1 second at the top.', 'Lower slowly for 2 seconds.'] });
ex({ id: 'single_calf_raise', name: 'Single-leg calf raise', pattern: 'calf', mode: 'reps', location: 'both', level: 1, unilateral: true, range: [10, 15],
  muscles: ['Calves'], equipment: ['Wall for balance'],
  cues: ['One foot off the floor, fingertips on the wall.', 'Rise all the way up, pause at the top.', 'Lower slowly.', 'Switch sides after the set.'] });
ex({ id: 'single_calf_raise_step', name: 'Single-leg calf raise on step', pattern: 'calf', mode: 'reps', location: 'both', level: 2, unilateral: true, range: [10, 15],
  muscles: ['Calves'], equipment: ['Step'],
  cues: ['Ball of the foot on the step edge, heel hanging.', 'Drop the heel below the step for a stretch.', 'Rise as high as possible, pause.', 'Slow and controlled, no bouncing.'] });
ex({ id: 'single_calf_raise_tempo', name: 'Tempo single-leg calf raise', pattern: 'calf', mode: 'reps', location: 'both', level: 3, unilateral: true, range: [8, 12],
  muscles: ['Calves'], equipment: ['Step'],
  cues: ['3 seconds up, 1 second hold, 3 seconds down.', 'Full range every rep.', 'Keep the ankle straight; do not roll out.', 'Stop when the tempo breaks.'] });

/* ------------------------------------------------------------------ */
/* PLANK                                                               */
/* ------------------------------------------------------------------ */
ex({ id: 'knee_plank', name: 'Knee plank', pattern: 'plank', mode: 'time', location: 'both', level: 0,
  muscles: ['Core', 'Shoulders'], equipment: ['Floor / mat'],
  cues: ['Forearms on the floor, elbows under shoulders, knees down.', 'Straight line from knees to head.', 'Squeeze glutes and pull the ribs down.', 'Breathe; stop when the hips sag.'] });
ex({ id: 'plank', name: 'Plank', pattern: 'plank', mode: 'time', location: 'both', level: 1,
  muscles: ['Core', 'Shoulders', 'Glutes'], equipment: ['Floor / mat'],
  cues: ['Forearms down, toes tucked, body in one line.', 'Push the floor away so the upper back rounds slightly.', 'Glutes tight, tailbone tucked.', 'Slow breathing; quality over seconds.'] });
ex({ id: 'plank_long', name: 'Long plank', pattern: 'plank', mode: 'time', location: 'both', level: 2, range: [45, 75],
  muscles: ['Core', 'Shoulders', 'Glutes'], equipment: ['Floor / mat'],
  cues: ['Same position, longer hold.', 'Reset your brace every 10 seconds.', 'Do not let the head drop.', 'Stop before form breaks.'] });
ex({ id: 'plank_shoulder_tap', name: 'Plank shoulder taps', pattern: 'plank', mode: 'reps', location: 'both', level: 3, range: [10, 20],
  muscles: ['Core', 'Shoulders'], equipment: ['Floor / mat'],
  cues: ['High plank on the hands, feet wider for balance.', 'Tap the opposite shoulder without the hips rotating.', 'Slow and controlled; count each tap.', 'Keep the glutes tight.'] });
ex({ id: 'long_lever_plank', name: 'Long-lever plank', pattern: 'plank', mode: 'time', location: 'both', level: 4, range: [20, 40],
  muscles: ['Core', 'Shoulders'], equipment: ['Floor / mat'],
  cues: ['Forearm plank with elbows placed further forward, in front of the face.', 'Brace hard; this is much harder than it looks.', 'Glutes on, no arch.', 'Breathe short and steady.'] });

/* ------------------------------------------------------------------ */
/* KNEE RAISE                                                          */
/* ------------------------------------------------------------------ */
ex({ id: 'lying_knee_tuck', name: 'Lying knee tuck', pattern: 'kneeRaise', mode: 'reps', location: 'both', level: 0, range: [8, 15],
  muscles: ['Abs', 'Hip flexors'], equipment: ['Floor / mat'],
  cues: ['On your back, hands under the hips for support.', 'Pull the knees to the chest and lift the hips slightly.', 'Lower slowly until the feet hover above the floor.', 'Keep the lower back pressed into the floor.'] });
ex({ id: 'captains_chair_knee', name: "Captain's chair knee raise", pattern: 'kneeRaise', mode: 'reps', location: 'gym', level: 1,
  muscles: ['Abs', 'Hip flexors'], equipment: ["Captain's chair"],
  cues: ['Forearms on the pads, back against the rest.', 'Pull the knees up and curl the pelvis at the top.', 'Lower slowly for 2 seconds.', 'No swinging.'] });
ex({ id: 'lying_leg_raise', name: 'Lying leg raise', pattern: 'kneeRaise', mode: 'reps', location: 'home', level: 1,
  muscles: ['Abs', 'Hip flexors'], equipment: ['Floor / mat'],
  cues: ['Legs straight or slightly bent, hands under the hips.', 'Raise the legs to vertical, lifting the hips at the top.', 'Lower slowly, stop before the back arches.', 'Bend the knees more if it is too hard.'] });
ex({ id: 'captains_chair_leg', name: "Captain's chair leg raise", pattern: 'kneeRaise', mode: 'reps', location: 'gym', level: 2,
  muscles: ['Abs', 'Hip flexors'], equipment: ["Captain's chair"],
  cues: ['Legs straight, toes pointed.', 'Raise the legs to parallel or higher.', 'Curl the pelvis at the top.', 'Slow descent.'] });
ex({ id: 'hanging_knee_raise', name: 'Hanging knee raise', pattern: 'kneeRaise', mode: 'reps', location: 'home', level: 2,
  muscles: ['Abs', 'Hip flexors', 'Grip'], equipment: ['Pull-up bar'],
  cues: ['Hang from the bar, shoulders packed.', 'Drive the knees up and curl the pelvis.', 'Lower slowly, no swinging.', 'Stop when the grip fades.'] });
ex({ id: 'hanging_leg_raise', name: 'Hanging leg raise', pattern: 'kneeRaise', mode: 'reps', location: 'both', level: 3, range: [5, 10],
  muscles: ['Abs', 'Hip flexors', 'Grip'], equipment: ['Pull-up bar'],
  cues: ['Straight legs, raise to horizontal or higher.', 'Lead with the pelvis curling up.', 'Lower for 3 seconds.', 'Keep the shoulders active.'] });

/* ------------------------------------------------------------------ */
/* ANTI-EXTENSION (dead bug / hollow)                                  */
/* ------------------------------------------------------------------ */
ex({ id: 'dead_bug', name: 'Dead bug', pattern: 'antiExtension', mode: 'reps', location: 'both', level: 0, unilateral: true, range: [6, 10],
  muscles: ['Deep core'], equipment: ['Floor / mat'],
  cues: ['On your back, arms up, knees over hips.', 'Press the lower back into the floor and keep it there.', 'Extend the opposite arm and leg slowly, exhale.', 'Return and switch sides.'] });
ex({ id: 'bird_dog', name: 'Bird dog', pattern: 'antiExtension', mode: 'reps', location: 'both', level: 1, unilateral: true, range: [6, 10],
  muscles: ['Deep core', 'Glutes', 'Back'], equipment: ['Floor / mat'],
  cues: ['On hands and knees, back flat.', 'Reach the opposite arm and leg long, hold 2 seconds.', 'Do not let the hips rotate.', 'Return slowly and switch.'] });
ex({ id: 'hollow_hold_tuck', name: 'Tuck hollow hold', pattern: 'antiExtension', mode: 'time', location: 'both', level: 2,
  muscles: ['Abs', 'Deep core'], equipment: ['Floor / mat'],
  cues: ['On your back, lower back pressed down.', 'Lift shoulders and feet, knees bent.', 'Arms by the sides, chin tucked.', 'Hold and breathe.'] });
ex({ id: 'hollow_hold', name: 'Hollow hold', pattern: 'antiExtension', mode: 'time', location: 'both', level: 3,
  muscles: ['Abs', 'Deep core'], equipment: ['Floor / mat'],
  cues: ['Legs straight and low, arms overhead.', 'Lower back glued to the floor the whole time.', 'Raise the legs if the back lifts.', 'Breathe short and steady.'] });
ex({ id: 'hollow_rock', name: 'Hollow rock', pattern: 'antiExtension', mode: 'reps', location: 'both', level: 4, range: [10, 20],
  muscles: ['Abs', 'Deep core'], equipment: ['Floor / mat'],
  cues: ['From the hollow position rock gently back and forth.', 'The shape does not change; only the rocking moves you.', 'Small, controlled rocks.', 'Stop when the back starts to arch.'] });

/* ------------------------------------------------------------------ */
/* SIDE PLANK                                                          */
/* ------------------------------------------------------------------ */
ex({ id: 'knee_side_plank', name: 'Knee side plank', pattern: 'sidePlank', mode: 'time', location: 'both', level: 0, unilateral: true,
  muscles: ['Obliques', 'Glutes'], equipment: ['Floor / mat'],
  cues: ['On your side, elbow under the shoulder, knees bent.', 'Lift the hips so knees to shoulders make a line.', 'Top hand on the hip; do not lean forward.', 'Switch sides after the hold.'] });
ex({ id: 'side_plank', name: 'Side plank', pattern: 'sidePlank', mode: 'time', location: 'both', level: 1, unilateral: true,
  muscles: ['Obliques', 'Glutes'], equipment: ['Floor / mat'],
  cues: ['Feet stacked or staggered, elbow under the shoulder.', 'Lift the hips high; body in one line.', 'Push the floor away with the forearm.', 'Breathe; switch sides.'] });
ex({ id: 'side_plank_leg_lift', name: 'Side plank with leg lift', pattern: 'sidePlank', mode: 'time', location: 'both', level: 2, unilateral: true,
  muscles: ['Obliques', 'Glutes'], equipment: ['Floor / mat'],
  cues: ['Full side plank, lift the top leg and hold it.', 'Keep the hips high and stacked.', 'Foot stays flexed.', 'Switch sides.'] });
ex({ id: 'side_plank_dips', name: 'Side plank hip dips', pattern: 'sidePlank', mode: 'reps', location: 'both', level: 3, unilateral: true, range: [8, 15],
  muscles: ['Obliques', 'Glutes'], equipment: ['Floor / mat'],
  cues: ['From a side plank, lower the hip toward the floor.', 'Tap lightly and drive back up.', 'Controlled, no bouncing.', 'Switch sides.'] });

/* ------------------------------------------------------------------ */
/* CARDIO (steady state, low impact)                                   */
/* ------------------------------------------------------------------ */
ex({ id: 'treadmill_incline_walk', name: 'Incline treadmill walk', pattern: 'cardio', mode: 'time', location: 'gym',
  muscles: ['Heart', 'Glutes', 'Calves'], equipment: ['Treadmill'],
  cues: ['Incline 6 to 10 percent, speed 2.8 to 3.5 mph.', 'Do not hold the rails; pump the arms.', 'You should be able to talk in short sentences.', 'Drop the incline if the shins burn.'],
  note: 'Zero impact, high calorie burn, easy on knees.' });
ex({ id: 'stationary_bike', name: 'Stationary bike', pattern: 'cardio', mode: 'time', location: 'gym',
  muscles: ['Heart', 'Quads'], equipment: ['Bike'],
  cues: ['Seat height: slight knee bend at the bottom.', 'Moderate resistance, 80 to 90 rpm.', 'Talk-test pace; steady breathing.', 'Sit tall, relax the shoulders.'] });
ex({ id: 'brisk_walk', name: 'Brisk walk', pattern: 'cardio', mode: 'time', location: 'home',
  muscles: ['Heart', 'Legs'], equipment: ['Outdoors or stairs'],
  cues: ['Walk fast enough that talking is a little hard.', 'Add hills or stairs if flat feels easy.', 'Arms swinging, shoulders relaxed.', 'Indoors: march in place with high knees between step-ups.'] });

/* ------------------------------------------------------------------ */
/* CONDITIONING (HIIT, low impact)                                     */
/* ------------------------------------------------------------------ */
ex({ id: 'bike_sprint', name: 'Bike sprint', pattern: 'conditioning', mode: 'time', location: 'gym',
  muscles: ['Heart', 'Quads'], equipment: ['Bike'],
  cues: ['Add resistance and pedal hard for the interval.', 'Stay seated, drive through the whole pedal stroke.', 'Breathe; aim for 8 out of 10 effort.', 'Spin easy during the rest.'] });
ex({ id: 'fast_march', name: 'Fast high-knee march', pattern: 'conditioning', mode: 'time', location: 'home',
  muscles: ['Heart', 'Hip flexors', 'Core'], equipment: ['None'],
  cues: ['March fast, knees to hip height, arms pumping.', 'Stay on the balls of the feet but keep one foot down always.', 'Tall torso, brace the core.', 'No jumping: this is a march, not a run.'] });
ex({ id: 'squat_to_stand', name: 'Squat to stand', pattern: 'conditioning', mode: 'time', location: 'both',
  muscles: ['Legs', 'Heart'], equipment: ['None'],
  cues: ['Fast controlled bodyweight squats, arms reach overhead as you stand.', 'Heels down, chest up.', 'Keep a steady rhythm for the whole interval.', 'Shorten the range if the knees complain.'] });
ex({ id: 'bench_mountain_climber', name: 'Bench mountain climber', pattern: 'conditioning', mode: 'time', location: 'both',
  muscles: ['Core', 'Shoulders', 'Heart'], equipment: ['Bench'],
  cues: ['Hands on the bench, body in a plank.', 'Drive one knee toward the chest, then the other; step, do not jump.', 'Hips stay low and level.', 'Steady pace you can hold for the whole interval.'] });
ex({ id: 'shadow_boxing', name: 'Shadow boxing', pattern: 'conditioning', mode: 'time', location: 'both',
  muscles: ['Shoulders', 'Core', 'Heart'], equipment: ['None (band optional)'],
  cues: ['Light stance, hands up.', 'Fast jab-cross combos, rotate the hips.', 'Keep moving the feet without jumping.', 'Hold a light band for extra shoulder work.'] });
ex({ id: 'fast_stepup', name: 'Fast step-ups', pattern: 'conditioning', mode: 'time', location: 'both',
  muscles: ['Legs', 'Heart'], equipment: ['Low step or bench'],
  cues: ['Low step, alternate the lead leg every few reps.', 'Whole foot on the step, drive through the heel.', 'Quick but controlled; never jump off.', 'Pump the arms.'] });
ex({ id: 'wall_sit', name: 'Wall sit', pattern: 'conditioning', mode: 'time', location: 'both',
  muscles: ['Quads', 'Glutes'], equipment: ['Wall'],
  cues: ['Back flat on the wall, thighs parallel or a little higher.', 'Knees over ankles, weight in the heels.', 'Hands off the thighs.', 'Breathe and hold.'] });
ex({ id: 'plank_taps_interval', name: 'Plank shoulder taps (interval)', pattern: 'conditioning', mode: 'time', location: 'both',
  muscles: ['Core', 'Shoulders'], equipment: ['Floor / mat'],
  cues: ['High plank, feet wide.', 'Tap opposite shoulders at a steady rhythm.', 'Hips stay square.', 'Drop to knees if the hips start twisting.'] });
ex({ id: 'bear_crawl_hold', name: 'Bear crawl hold', pattern: 'conditioning', mode: 'time', location: 'both',
  muscles: ['Core', 'Shoulders', 'Quads'], equipment: ['Floor / mat'],
  cues: ['Hands and toes, knees hovering an inch off the floor.', 'Flat back, neutral neck.', 'Breathe into the belly.', 'Add small forward and back steps if easy.'] });
ex({ id: 'glute_bridge_march', name: 'Glute bridge march', pattern: 'conditioning', mode: 'time', location: 'both',
  muscles: ['Glutes', 'Core'], equipment: ['Floor / mat'],
  cues: ['Hold the top of a glute bridge.', 'Lift one foot an inch, then the other; hips stay level.', 'Slow alternating steps.', 'Squeeze the glutes the whole time.'] });

/* ------------------------------------------------------------------ */
/* ACCESSORY                                                           */
/* ------------------------------------------------------------------ */
ex({ id: 'band_pull_apart', name: 'Band pull-apart', pattern: 'accessory', mode: 'reps', location: 'both', range: [12, 20],
  muscles: ['Rear delts', 'Upper back'], equipment: ['Light band'],
  cues: ['Hold the band at shoulder height, arms straight.', 'Pull the band apart until it touches the chest.', 'Squeeze the shoulder blades, then return slowly.', 'Keep the ribs down; no arching.'] });
ex({ id: 'band_face_pull', name: 'Band face pull', pattern: 'accessory', mode: 'reps', location: 'both', range: [12, 20],
  muscles: ['Rear delts', 'Rotator cuff', 'Upper back'], equipment: ['Band anchored high'],
  cues: ['Anchor the band above head height.', 'Pull toward the face with elbows high and wide.', 'Finish with the hands beside the ears.', 'Slow return.'] });
ex({ id: 'side_lying_leg_raise', name: 'Side-lying leg raise', pattern: 'accessory', mode: 'reps', location: 'both', unilateral: true, range: [12, 20],
  muscles: ['Glute medius'], equipment: ['Floor / mat'],
  cues: ['Lie on your side, body in one line.', 'Raise the top leg with the toes pointing slightly down.', 'Pause at the top.', 'Lower slowly; switch sides.'] });
ex({ id: 'band_lateral_walk', name: 'Band lateral walk', pattern: 'accessory', mode: 'reps', location: 'both', range: [10, 15],
  muscles: ['Glute medius', 'Hips'], equipment: ['Mini band or loop band'],
  cues: ['Band above the knees, quarter squat.', 'Step sideways, keep tension on the band.', 'Toes forward, knees pushed out.', 'Count steps per direction.'] });
ex({ id: 'superman', name: 'Superman hold', pattern: 'accessory', mode: 'time', location: 'both', range: [15, 30],
  muscles: ['Lower back', 'Glutes'], equipment: ['Floor / mat'],
  cues: ['Face down, arms forward.', 'Lift arms, chest and legs a few inches.', 'Look at the floor, neck neutral.', 'Breathe and hold.'] });

/* ------------------------------------------------------------------ */
/* MOBILITY (night / morning routines)                                 */
/* ------------------------------------------------------------------ */
ex({ id: 'cat_cow', name: 'Cat-cow', pattern: 'mobility', mode: 'time', location: 'both', range: [40, 40],
  muscles: ['Spine', 'Core'], equipment: ['Floor / mat'],
  cues: ['On hands and knees, wrists under shoulders, knees under hips.', 'Inhale: drop the belly, lift the chest and tailbone.', 'Exhale: round the back, tuck the chin and tailbone.', 'Slow, one breath per movement.'] });
ex({ id: 'worlds_greatest_stretch', name: "World's greatest stretch", pattern: 'mobility', mode: 'time', location: 'both', unilateral: true, range: [30, 30],
  muscles: ['Hips', 'Hamstrings', 'Thoracic spine'], equipment: ['Floor / mat'],
  cues: ['Long lunge, back knee down, hands inside the front foot.', 'Drop the inside elbow toward the floor, then rotate that arm to the ceiling.', 'Follow the hand with your eyes.', 'Switch sides after the hold.'] });
ex({ id: 'hip_flexor_stretch', name: 'Hip flexor stretch', pattern: 'mobility', mode: 'time', location: 'both', unilateral: true, range: [30, 30],
  muscles: ['Hip flexors', 'Quads'], equipment: ['Floor / mat'],
  cues: ['Half-kneeling, back knee on a cushion.', 'Squeeze the glute of the back leg and tuck the pelvis.', 'Shift forward gently until the front of the hip stretches.', 'Tall torso; no arching the lower back.'] });
ex({ id: 'hamstring_stretch', name: 'Hamstring stretch', pattern: 'mobility', mode: 'time', location: 'both', unilateral: true, range: [30, 30],
  muscles: ['Hamstrings'], equipment: ['Floor / mat, band optional'],
  cues: ['On your back, one leg up, hands or a band behind the thigh.', 'Pull gently until you feel the back of the thigh.', 'Keep the other leg flat and the head down.', 'Breathe out to sink a little deeper.'] });
ex({ id: 'figure4_stretch', name: 'Figure-4 glute stretch', pattern: 'mobility', mode: 'time', location: 'both', unilateral: true, range: [30, 30],
  muscles: ['Glutes', 'Hips'], equipment: ['Floor / mat'],
  cues: ['On your back, cross one ankle over the opposite knee.', 'Pull the bottom thigh toward the chest.', 'Push the crossed knee gently away.', 'Relax the shoulders and jaw.'] });
ex({ id: 'doorway_chest_stretch', name: 'Doorway chest stretch', pattern: 'mobility', mode: 'time', location: 'both', range: [30, 30],
  muscles: ['Chest', 'Front shoulders'], equipment: ['Doorway or post'],
  cues: ['Forearms on the door frame, elbows at shoulder height.', 'Step one foot through until the chest opens.', 'Ribs down; do not arch the back.', 'Breathe slowly.'] });
ex({ id: 'calf_stretch', name: 'Calf stretch', pattern: 'mobility', mode: 'time', location: 'both', unilateral: true, range: [30, 30],
  muscles: ['Calves', 'Ankles'], equipment: ['Wall or step'],
  cues: ['Hands on the wall, one leg back with the heel down.', 'Keep the back knee straight for the upper calf.', 'Bend it slightly for the lower calf.', 'Switch sides.'] });
ex({ id: 'thoracic_rotation', name: 'Open-book rotation', pattern: 'mobility', mode: 'time', location: 'both', unilateral: true, range: [30, 30],
  muscles: ['Thoracic spine', 'Chest'], equipment: ['Floor / mat'],
  cues: ['Lie on your side, knees bent at 90 degrees, arms stacked in front.', 'Open the top arm across to the other side, following it with your eyes.', 'Keep the knees together on the floor.', 'Return slowly and repeat; switch sides.'] });
ex({ id: 'hip_circles', name: 'Hip circles', pattern: 'mobility', mode: 'time', location: 'both', range: [30, 30],
  muscles: ['Hips'], equipment: ['None'],
  cues: ['Hands on hips, feet shoulder width.', 'Draw big slow circles with the hips.', 'Change direction halfway.', 'Knees soft, breathe normally.'] });
ex({ id: 'child_pose', name: "Child's pose", pattern: 'mobility', mode: 'time', location: 'both', range: [45, 45],
  muscles: ['Back', 'Hips', 'Lats'], equipment: ['Floor / mat'],
  cues: ['Knees wide, big toes together, sit back on the heels.', 'Walk the hands forward and rest the forehead down.', 'Breathe into the back of the ribs.', 'Let the shoulders melt toward the floor.'] });
ex({ id: 'box_breathing', name: 'Box breathing', pattern: 'mobility', mode: 'time', location: 'both', range: [60, 60],
  muscles: ['Nervous system'], equipment: ['None'],
  cues: ['Lie down or sit tall, one hand on the belly.', 'Inhale through the nose for 4, hold for 4.', 'Exhale through the mouth for 4, hold for 4.', 'Repeat until the timer ends; this is the signal to wind down.'] });

export const EXERCISES: Exercise[] = list;
export const EXERCISE_MAP: Record<string, Exercise> = Object.fromEntries(list.map((e) => [e.id, e]));

export function getExercise(id: string): Exercise {
  const e = EXERCISE_MAP[id];
  if (!e) throw new Error(`Unknown exercise: ${id}`);
  return e;
}

/* ------------------------------------------------------------------ */
/* LADDERS                                                             */
/* ------------------------------------------------------------------ */
export const LADDERS: Ladder[] = [
  { pattern: 'push', name: 'Push', description: 'Horizontal pushing: chest, shoulders and triceps. From the wall to the floor.',
    rungs: [
      { label: 'Wall push-up', gym: 'wall_pushup', home: 'wall_pushup' },
      { label: 'High incline', gym: 'incline_pushup_high', home: 'incline_pushup_counter' },
      { label: 'Low incline', gym: 'incline_pushup_bench', home: 'incline_pushup_bench' },
      { label: 'Knee push-up', gym: 'knee_pushup', home: 'knee_pushup' },
      { label: 'Push-up', gym: 'pushup', home: 'pushup' },
      { label: 'Diamond', gym: 'diamond_pushup', home: 'diamond_pushup' },
      { label: 'Decline', gym: 'decline_pushup', home: 'decline_pushup' },
    ] },
  { pattern: 'pull', name: 'Pull-up', description: 'Vertical pulling. Grip first, then control, then strength.',
    rungs: [
      { label: 'Dead hang', gym: 'dead_hang', home: 'dead_hang' },
      { label: 'Scapular pulls', gym: 'scap_pull', home: 'scap_pull' },
      { label: 'Negatives', gym: 'pullup_negative', home: 'pullup_negative' },
      { label: 'Assisted', gym: 'assisted_pullup_machine', home: 'assisted_pullup_band' },
      { label: 'Pull-up', gym: 'pullup', home: 'pullup' },
      { label: 'Chin-up', gym: 'chinup', home: 'chinup' },
    ] },
  { pattern: 'row', name: 'Row', description: 'Horizontal pulling for a strong upper back and posture.',
    rungs: [
      { label: 'Upright row', gym: 'inverted_row_high', home: 'band_row' },
      { label: 'Waist row', gym: 'inverted_row_waist', home: 'band_row_single' },
      { label: 'Knees bent', gym: 'inverted_row_knee', home: 'table_row' },
      { label: 'Legs straight', gym: 'inverted_row_straight', home: 'table_row_straight' },
      { label: 'Feet elevated', gym: 'inverted_row_elevated', home: 'table_row_elevated' },
    ] },
  { pattern: 'dip', name: 'Dip', description: 'Triceps and chest. Bench dips first, bars later.',
    rungs: [
      { label: 'Bench, knees bent', gym: 'bench_dip_knees', home: 'bench_dip_knees' },
      { label: 'Bench, legs straight', gym: 'bench_dip_straight', home: 'bench_dip_straight' },
      { label: 'Feet elevated', gym: 'bench_dip_elevated', home: 'bench_dip_elevated' },
      { label: 'Assisted / negatives', gym: 'assisted_dip_machine', home: 'bench_dip_negatives' },
      { label: 'Full dip / weighted', gym: 'dip', home: 'bench_dip_weighted' },
    ] },
  { pattern: 'pike', name: 'Overhead push', description: 'Shoulder pressing with bodyweight, toward the handstand.',
    rungs: [
      { label: 'Elevated pike', gym: 'pike_pushup_elevated', home: 'pike_pushup_elevated' },
      { label: 'Pike push-up', gym: 'pike_pushup', home: 'pike_pushup' },
      { label: 'Feet elevated', gym: 'pike_pushup_feet_elevated', home: 'pike_pushup_feet_elevated' },
      { label: 'Wall handstand', gym: 'wall_handstand_hold', home: 'wall_handstand_hold' },
    ] },
  { pattern: 'squat', name: 'Squat', description: 'Knee-friendly squatting from a box to single-leg work.',
    rungs: [
      { label: 'Box squat', gym: 'box_squat', home: 'box_squat' },
      { label: 'Bodyweight squat', gym: 'bw_squat', home: 'bw_squat' },
      { label: 'Split squat', gym: 'split_squat', home: 'split_squat' },
      { label: 'Bulgarian split squat', gym: 'bulgarian_split_squat', home: 'bulgarian_split_squat' },
      { label: 'Assisted pistol', gym: 'assisted_pistol', home: 'assisted_pistol' },
    ] },
  { pattern: 'hinge', name: 'Hinge', description: 'Glutes and hamstrings. Bridges first, then thrusts and deadlifts.',
    rungs: [
      { label: 'Glute bridge', gym: 'glute_bridge', home: 'glute_bridge' },
      { label: 'Hip thrust', gym: 'hip_thrust', home: 'hip_thrust' },
      { label: 'Single-leg bridge', gym: 'single_leg_bridge', home: 'single_leg_bridge' },
      { label: 'Single-leg thrust', gym: 'single_leg_hip_thrust', home: 'single_leg_hip_thrust' },
      { label: 'Romanian deadlift', gym: 'smith_rdl', home: 'band_rdl' },
    ] },
  { pattern: 'lunge', name: 'Lunge', description: 'Single-leg strength and balance without impact.',
    rungs: [
      { label: 'Assisted reverse', gym: 'assisted_reverse_lunge', home: 'assisted_reverse_lunge' },
      { label: 'Reverse lunge', gym: 'reverse_lunge', home: 'reverse_lunge' },
      { label: 'Forward lunge', gym: 'forward_lunge', home: 'forward_lunge' },
      { label: 'Walking lunge', gym: 'walking_lunge', home: 'walking_lunge' },
      { label: 'Deficit reverse', gym: 'deficit_reverse_lunge', home: 'deficit_reverse_lunge' },
    ] },
  { pattern: 'stepup', name: 'Step-up', description: 'Quads and glutes with a box; the height is the progression.',
    rungs: [
      { label: 'Low step', gym: 'stepup_low', home: 'stepup_low' },
      { label: 'Bench height', gym: 'stepup_bench', home: 'stepup_bench' },
      { label: 'High box', gym: 'stepup_high', home: 'stepup_high' },
      { label: 'Slow lowering', gym: 'stepup_slow', home: 'stepup_slow' },
    ] },
  { pattern: 'calf', name: 'Calf raise', description: 'Ankle strength and calf shape, protects the knees too.',
    rungs: [
      { label: 'Two legs', gym: 'calf_raise', home: 'calf_raise' },
      { label: 'Single leg', gym: 'single_calf_raise', home: 'single_calf_raise' },
      { label: 'Single leg on step', gym: 'single_calf_raise_step', home: 'single_calf_raise_step' },
      { label: 'Tempo', gym: 'single_calf_raise_tempo', home: 'single_calf_raise_tempo' },
    ] },
  { pattern: 'plank', name: 'Plank', description: 'Front core bracing. Longer holds, then harder shapes.',
    rungs: [
      { label: 'Knee plank', gym: 'knee_plank', home: 'knee_plank' },
      { label: 'Plank', gym: 'plank', home: 'plank' },
      { label: 'Long plank', gym: 'plank_long', home: 'plank_long' },
      { label: 'Shoulder taps', gym: 'plank_shoulder_tap', home: 'plank_shoulder_tap' },
      { label: 'Long-lever plank', gym: 'long_lever_plank', home: 'long_lever_plank' },
    ] },
  { pattern: 'kneeRaise', name: 'Knee raise', description: 'Lower abs and hip flexors, lying first then hanging.',
    rungs: [
      { label: 'Lying knee tuck', gym: 'lying_knee_tuck', home: 'lying_knee_tuck' },
      { label: 'Knee raise', gym: 'captains_chair_knee', home: 'lying_leg_raise' },
      { label: 'Leg raise', gym: 'captains_chair_leg', home: 'hanging_knee_raise' },
      { label: 'Hanging leg raise', gym: 'hanging_leg_raise', home: 'hanging_leg_raise' },
    ] },
  { pattern: 'antiExtension', name: 'Deep core', description: 'Dead bugs to hollow holds: the core that protects your back.',
    rungs: [
      { label: 'Dead bug', gym: 'dead_bug', home: 'dead_bug' },
      { label: 'Bird dog', gym: 'bird_dog', home: 'bird_dog' },
      { label: 'Tuck hollow', gym: 'hollow_hold_tuck', home: 'hollow_hold_tuck' },
      { label: 'Hollow hold', gym: 'hollow_hold', home: 'hollow_hold' },
      { label: 'Hollow rock', gym: 'hollow_rock', home: 'hollow_rock' },
    ] },
  { pattern: 'sidePlank', name: 'Side plank', description: 'Obliques and hip stability.',
    rungs: [
      { label: 'Knee side plank', gym: 'knee_side_plank', home: 'knee_side_plank' },
      { label: 'Side plank', gym: 'side_plank', home: 'side_plank' },
      { label: 'Leg lift', gym: 'side_plank_leg_lift', home: 'side_plank_leg_lift' },
      { label: 'Hip dips', gym: 'side_plank_dips', home: 'side_plank_dips' },
    ] },
];

export const LADDER_MAP: Partial<Record<Pattern, Ladder>> = Object.fromEntries(LADDERS.map((l) => [l.pattern, l]));

export function getLadder(pattern: Pattern): Ladder | undefined {
  return LADDER_MAP[pattern];
}

export const PATTERN_LABEL: Record<Pattern, string> = {
  push: 'Push', pull: 'Pull-up', row: 'Row', dip: 'Dip', pike: 'Overhead push',
  squat: 'Squat', hinge: 'Hinge', lunge: 'Lunge', stepup: 'Step-up', calf: 'Calf',
  plank: 'Plank', kneeRaise: 'Knee raise', antiExtension: 'Deep core', sidePlank: 'Side plank',
  cardio: 'Cardio', conditioning: 'Conditioning', accessory: 'Accessory', mobility: 'Mobility',
};

/** Starting levels for a beginner who can do 1 to 5 push-ups. */
export const DEFAULT_LEVELS: Partial<Record<Pattern, number>> = {
  push: 2, pull: 0, row: 0, dip: 0, pike: 0, squat: 0, hinge: 0, lunge: 0, stepup: 0,
  calf: 0, plank: 0, kneeRaise: 0, antiExtension: 0, sidePlank: 0,
};
