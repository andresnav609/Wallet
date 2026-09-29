import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { buildWorkout } from '../engine/builder';
import { addDays, formatLong, startOfWeek, todayKey, WEEKDAY_SHORT, fromKey } from '../engine/dates';
import { dayStatus, dayTypeFor, extraTypeFor, isDeloadWeek, phaseForWeek, phaseName, trainingTimeOf, upcoming, weekNumber } from '../engine/schedule';
import { ringsFor } from '../engine/stats';
import { allSuggestions } from '../engine/progression';
import { DAY_LABEL, DAY_SHORT, EXTRA_TYPES, PHASES, REST_DAY_TIPS, TEMPLATES } from '../data/program';
import { PATTERN_LABEL } from '../data/exercises';
import { Ring } from '../components/Ring';
import { Segmented } from '../components/Controls';
import { WorkoutPreview } from '../components/WorkoutPreview';
import { Sheet } from '../components/Sheet';
import { DayTypePicker } from '../components/DayTypePicker';
import { unlockAudio } from '../lib/audio';
import { greeting } from '../lib/format';
import type { Habits, Location } from '../types';
import { IconChevronRight, IconPlay } from '../components/Icons';
import { formatDuration } from '../engine/dates';

const HABIT_DEFS: { key: keyof Habits; emoji: string; label: string; step: number; unit: string }[] = [
  { key: 'steps', emoji: '👟', label: 'Steps', step: 1000, unit: '' },
  { key: 'water', emoji: '💧', label: 'Water', step: 1, unit: ' cups' },
  { key: 'protein', emoji: '🍗', label: 'Protein', step: 10, unit: ' g' },
  { key: 'sleep', emoji: '😴', label: 'Sleep', step: 0.5, unit: ' h' },
];

export function Today() {
  const nav = useNavigate();
  const store = useStore();
  const today = todayKey();
  const [location, setLocation] = useState<Location>(store.profile.defaultLocation);
  const [preview, setPreview] = useState(false);
  const [changing, setChanging] = useState(false);
  const [changingExtra, setChangingExtra] = useState(false);
  const [previewExtra, setPreviewExtra] = useState(false);
  const todayType = dayTypeFor(store, today);
  const trainingTime = trainingTimeOf(store);
  const extraType = extraTypeFor(store, today);
  const extraWorkout = useMemo(() => buildWorkout({ data: store, date: today, location, dayType: extraType }), [store.levels, store.profile, today, location, extraType]);
  const doneExtra = store.sessions.filter((s) => s.date === today && s.extra).sort((a, b) => b.finishedAt - a.finishedAt)[0];
  const extraWhen = trainingTime === 'night' ? 'This morning' : 'Tonight';

  const workout = useMemo(() => buildWorkout({ data: store, date: today, location }), [store.levels, store.planOverrides, store.sessions, store.profile, today, location]);
  const status = dayStatus(store, today, today);
  const doneSession = store.sessions.filter((s) => s.date === today && !s.extra).sort((a, b) => b.finishedAt - a.finishedAt)[0];
  const week = weekNumber(store.profile.startDate, today);
  const phase = phaseForWeek(week);
  const deload = isDeloadWeek(week);
  const rings = ringsFor(store, today);
  const suggestions = allSuggestions(store);
  const habits = store.habits[today] ?? {};
  const next = upcoming(store, today, 3);
  const weekStart = startOfWeek(today);

  const start = async () => {
    if (!workout) return;
    await unlockAudio();
    store.startSession(workout);
    nav('/workout');
  };
  const startExtra = async () => {
    if (!extraWorkout) return;
    await unlockAudio();
    store.startSession(extraWorkout);
    nav('/workout');
  };

  return (
    <div className="page">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <div className="muted small">{greeting()}{store.profile.name ? `, ${store.profile.name}` : ''}</div>
          <h1 className="page-title">{formatLong(today)}</h1>
        </div>
        <div className="stack" style={{ gap: 4, alignItems: 'flex-end' }}>
          <span className="pill accent">Week {week} · {phaseName(phase)}</span>
          {deload && <span className="pill warn">Deload</span>}
        </div>
      </div>
      <p className="page-sub">{PHASES[phase].description}</p>

      {store.active && (
        <button className="card accent" style={{ width: '100%', textAlign: 'left', marginBottom: 12 }} onClick={() => nav('/workout')}>
          <div className="card-row">
            <div>
              <div className="bold">Workout in progress</div>
              <div className="muted small">{store.active.workout.name} · tap to resume</div>
            </div>
            <IconPlay />
          </div>
        </button>
      )}

      {suggestions.length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="bold mb8">Ready to move up?</div>
          <div className="stack">
            {suggestions.map((s) => (
              <div key={s.pattern} className="stack" style={{ gap: 6 }}>
                <div>
                  <span className="bold">{PATTERN_LABEL[s.pattern]}:</span> {s.fromName} → <span className="bold">{s.toName}</span>
                  <div className="small muted">{s.reason}</div>
                </div>
                <div className="row">
                  <button className="btn primary sm" onClick={() => store.acceptSuggestion(s)}>{s.direction === 'up' ? 'Move up' : 'Move down'}</button>
                  <button className="btn sm" onClick={() => store.dismissSuggestion(s.pattern)}>Not yet</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {workout ? (
        <div className="card accent">
          <div className="card-row">
            <div>
              <div className="muted small">{trainingTime === 'night' ? "Tonight's workout" : "Today's workout"}</div>
              <div className="big">{workout.emoji} {workout.name}</div>
              <div className="muted small">{workout.focus}</div>
            </div>
          </div>
          <div className="row wrap mt12">
            <span className="pill white">~{workout.estMinutes} min</span>
            <span className="pill white">{workout.blocks.reduce((a, b) => a + b.exercises.length, 0)} moves</span>
            <span className="pill white">{workout.blocks[0].rounds} rounds</span>
          </div>
          {doneSession && (
            <div className="mt12 small" style={{ background: 'rgba(255,255,255,0.15)', padding: '8px 12px', borderRadius: 10 }}>
              ✅ Done today in {formatDuration(doneSession.durationSec)}
              {doneSession.rpe ? ` · felt ${doneSession.rpe}/10` : ''}
            </div>
          )}
          <div className="mt12">
            <Segmented block value={location} onChange={setLocation} options={[{ value: 'gym', label: '🏋️ Gym' }, { value: 'home', label: '🏠 Home' }]} />
          </div>
          <div className="row mt12">
            <button className="btn white xl grow" onClick={start} disabled={!!store.active}>
              <IconPlay /> {doneSession ? 'Again' : 'Start'}
            </button>
            <button className="btn xl" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }} onClick={() => setPreview(true)} aria-label="Preview workout">
              Preview
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="muted small">Today</div>
          <div className="big">😌 Rest day</div>
          <ul className="cues mt8">
            {REST_DAY_TIPS.map((t) => <li key={t}>{t}</li>)}
          </ul>
          {status === 'skipped' && <div className="pill warn mt12">Skipped</div>}
          {!store.active && <button className="btn block mt12" onClick={() => setChanging(true)}>Train today instead</button>}
        </div>
      )}
      {workout && !doneSession && !store.active && (
        <button className="btn ghost sm" style={{ width: '100%', marginTop: 6 }} onClick={() => setChanging(true)}>Not feeling {workout.name}? Change today's workout</button>
      )}

      {extraWorkout && (
        <div className="card mt12">
          <div className="card-row">
            <div className="grow">
              <div className="row" style={{ gap: 6 }}>
                <span className="muted small">{extraWhen}</span>
                <span className={`pill ${trainingTime === 'both' ? 'accent' : ''}`}>{trainingTime === 'both' ? 'Planned' : 'Optional'}</span>
              </div>
              <div className="bold" style={{ fontSize: 20 }}>{extraWorkout.emoji} {extraWorkout.name}</div>
              <div className="small muted">{extraWorkout.focus} · ~{extraWorkout.estMinutes} min</div>
            </div>
          </div>
          {doneExtra ? (
            <div className="pill good mt12">✅ Done · {formatDuration(doneExtra.durationSec)}</div>
          ) : (
            <div className="row mt12">
              <button className="btn primary grow" onClick={startExtra} disabled={!!store.active}><IconPlay size={20} /> Start</button>
              <button className="btn" onClick={() => setPreviewExtra(true)}>Preview</button>
              <button className="btn" onClick={() => setChangingExtra(true)} aria-label="Change routine">Change</button>
            </div>
          )}
        </div>
      )}

      <div className="section-title"><span>This week</span><Link className="link" to="/plan">Plan</Link></div>
      <div className="week-strip">
        {Array.from({ length: 7 }, (_, i) => {
          const d = addDays(weekStart, i);
          const st = dayStatus(store, d, today);
          const t = dayTypeFor(store, d);
          return (
            <Link key={d} to="/plan" className={`week-day${d === today ? ' today' : ''}`} style={{ textDecoration: 'none', color: 'inherit' }} aria-label={`${WEEKDAY_SHORT[i]} ${DAY_LABEL[t]} ${st}`}>
              <span className="d">{WEEKDAY_SHORT[i]}</span>
              <span className="n">{fromKey(d).getDate()}</span>
              <span className={`dot ${st === 'today' || st === 'before' ? 'planned' : st}`} />
              <span className="tiny faint">{DAY_SHORT[t]}</span>
            </Link>
          );
        })}
      </div>

      <div className="section-title">Rings</div>
      <div className="card">
        <div className="rings">
          <Ring value={rings.workoutsDone} max={rings.workoutsPlanned} color="var(--ring-1)" label="Workouts" center={`${rings.workoutsDone}`} sub={`of ${rings.workoutsPlanned}`} />
          <Ring value={rings.minutes} max={rings.minutesGoal} color="var(--ring-2)" label="Minutes" center={`${rings.minutes}`} sub={`of ${rings.minutesGoal}`} />
          <Ring value={rings.streak} max={rings.streakGoal} color="var(--ring-3)" label="Streak" center={`${rings.streak}`} sub="days" />
        </div>
      </div>

      <div className="section-title">Daily habits</div>
      <div className="card">
        {HABIT_DEFS.map((h) => {
          const goal = store.profile.goals[h.key];
          const val = habits[h.key] ?? 0;
          const fmt = (v: number) => `${h.key === 'sleep' ? v.toFixed(1).replace(/\.0$/, '') : v.toLocaleString()}${h.unit}`;
          return (
            <div key={h.key} className="habit">
              <div className="emoji" aria-hidden>{h.emoji}</div>
              <div className="grow">
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span className="bold small">{h.label}</span>
                  <span className="small muted">{fmt(val)} / {fmt(goal)}</span>
                </div>
                <div className="bar"><div style={{ width: `${Math.min(100, (val / goal) * 100)}%` }} /></div>
              </div>
              <div className="ctrl">
                <button aria-label={`Less ${h.label}`} onClick={() => store.setHabit(today, h.key, Math.max(0, +(val - h.step).toFixed(1)))}>−</button>
                <button aria-label={`More ${h.label}`} onClick={() => store.setHabit(today, h.key, +(val + h.step).toFixed(1))}>+</button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="section-title">Coming up</div>
      <div className="card">
        {next.map((u) => (
          <Link key={u.date} to="/plan" className="list-row tappable" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div>
              <div className="bold">{TEMPLATES[u.dayType as keyof typeof TEMPLATES].emoji} {DAY_LABEL[u.dayType]}</div>
              <div className="small muted">{formatLong(u.date)}</div>
            </div>
            <IconChevronRight className="faint" />
          </Link>
        ))}
      </div>

      <Sheet open={changingExtra} onClose={() => setChangingExtra(false)} title={`${extraWhen}'s routine`}>
        <p className="small muted mb12">30-minute companion routines. Change the default for every day in Profile → Training time.</p>
        <DayTypePicker value={extraType} types={EXTRA_TYPES} onChange={(t) => { store.setExtraDay(today, t); setChangingExtra(false); }} />
      </Sheet>

      <Sheet open={previewExtra} onClose={() => setPreviewExtra(false)} title={extraWorkout ? `${extraWorkout.emoji} ${extraWorkout.name}` : ''}>
        {extraWorkout && (
          <>
            <div className="muted small mb12">{extraWorkout.focus} · ~{extraWorkout.estMinutes} min</div>
            <WorkoutPreview workout={extraWorkout} compact />
            <button className="btn primary block xl mt16" onClick={() => { setPreviewExtra(false); void startExtra(); }} disabled={!!store.active}>Start</button>
          </>
        )}
      </Sheet>

      <Sheet open={changing} onClose={() => setChanging(false)} title="Today's workout">
        <p className="small muted mb12">Only today changes. To change every week, edit the weekly schedule in Profile.</p>
        <DayTypePicker value={todayType} onChange={(t) => { store.setPlanDay(today, t); setChanging(false); }} />
      </Sheet>

      <Sheet open={preview} onClose={() => setPreview(false)} title={workout ? `${workout.emoji} ${workout.name}` : ''}>
        {workout && (
          <>
            <div className="muted small mb12">{workout.focus} · ~{workout.estMinutes} min · {workout.location === 'gym' ? 'Gym' : 'Home'}</div>
            <WorkoutPreview workout={workout} />
            <button className="btn primary block xl mt16" onClick={() => { setPreview(false); void start(); }} disabled={!!store.active}>Start workout</button>
          </>
        )}
      </Sheet>
    </div>
  );
}
