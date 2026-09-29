# Base Camp

A personal calisthenics training app: a progressive 6-day program, a full-screen
workout player with accurate timers, and progress tracking. It is a PWA, so it installs
on a phone from the browser and works offline. All data stays on the device in IndexedDB.

## Run it

```bash
cd basecamp
pnpm install
pnpm dev        # http://localhost:5173, use --host to open it from your phone on the same Wi-Fi
pnpm test       # training-engine tests (vitest)
pnpm build      # production build in dist/
pnpm preview    # serve dist/ locally
```

## Install on an iPhone

1. Open the deployed URL in Safari (GitHub Pages: `https://<user>.github.io/<repo>/`).
2. Share → **Add to Home Screen**. It opens full screen with safe-area padding.
3. First launch asks for weight, goal and start date. Everything is editable in Profile.

Deployment is automated by `.github/workflows/basecamp-pages.yml` on every push to `main`
that touches `basecamp/`. In the repository settings, set **Pages → Source → GitHub Actions** once.

## How the program works

- **Split (Mon → Sun):** Upper A, Lower A, Cardio + Core, Upper B, Lower B, HIIT circuit, Rest.
- **Circuits:** every workout is one or two blocks of moves done back to back, with a short
  switch timer between moves and a longer rest after each round.
- **Ladders:** each movement pattern (push, pull-up, row, dip, overhead push, squat, hinge,
  lunge, step-up, calf, plank, knee raise, deep core, side plank) is a ladder of rungs with a
  gym and a home variant. Your level per ladder lives in `levels` and drives what the builder
  puts into a workout.
- **Auto-progression:** top of the rep range in every round, two sessions in a row → suggest
  the next rung. Below the bottom of the range in any round, two sessions in a row → suggest
  the previous rung. Suggestions appear on Today and can be accepted or dismissed.
- **Phases:** Foundation (weeks 1–2, 3 rounds), Build (3–6, 4 rounds), Push (7+, 5 rounds).
  Every 5th week is a deload (one round fewer, longer rests).
- **RPE:** after a workout you rate it 1–10. A 9–10 removes a round and adds rest next time,
  an 8 adds rest, a 4 or lower adds a round.

Low impact by design: no running, no jumping. Cardio is incline walking, bike or brisk walking.

## Code map

```
src/data/exercises.ts   exercise library, cues, ladders, default levels
src/data/program.ts     weekly split, phase parameters, workout templates
src/engine/             pure functions: schedule, builder, progression, stats, achievements
src/store/              zustand store persisted to IndexedDB (photos in a separate store)
src/screens/            Today, Plan, Exercises, ExerciseDetail, Progress, SessionDetail, Profile, Player
src/components/         tab bar, sheet, rings, charts, controls
src/lib/                audio beeps, haptics, wake lock, backup import/export
scripts/shots.mjs       Playwright walkthrough that screenshots every screen (needs Chromium)
```

Timers store an absolute end timestamp, so they stay correct when the phone locks or the
app is backgrounded. The active session is persisted on every change and resumes on relaunch.
