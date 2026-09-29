import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, type FinishResult } from '../store/useStore';
import type { ActiveSession, SetLog } from '../types';
import { getExercise } from '../data/exercises';
import { formatClock, formatDuration } from '../engine/dates';
import { detectPRs, sessionTotals } from '../engine/stats';
import { ACHIEVEMENTS } from '../engine/achievements';
import { EXERCISE_MAP } from '../data/exercises';
import { useWakeLock } from '../lib/wakelock';
import { useTicker } from '../lib/useTicker';
import { countdownBeep, finalBeep, successChime, unlockAudio } from '../lib/audio';
import { haptic } from '../lib/haptics';
import { formatTarget } from '../lib/format';
import { Sheet } from '../components/Sheet';
import { IconClose } from '../components/Icons';
import { StatTile } from '../components/Controls';

type Pos = { block: number; round: number; exIndex: number };

export function Player() {
  const nav = useNavigate();
  const active = useStore((s) => s.active);
  const profile = useStore((s) => s.profile);
  const sessions = useStore((s) => s.sessions);
  const updateActive = useStore((s) => s.updateActive);
  const cancelSession = useStore((s) => s.cancelSession);
  const finishSession = useStore((s) => s.finishSession);

  const [exitOpen, setExitOpen] = useState(false);
  const [result, setResult] = useState<FinishResult | null>(null);
  const [rpe, setRpe] = useState<number | undefined>();
  const [notes, setNotes] = useState('');
  const [showCues, setShowCues] = useState(false);

  useWakeLock(!!active);
  const running = !!active && active.step !== 'done';
  const now = useTicker(running, 250);
  const lastBeep = useRef<string>('');

  useEffect(() => {
    if (!active && !result) nav('/', { replace: true });
  }, [active, result, nav]);

  useEffect(() => {
    const unlock = () => { void unlockAudio(); };
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  const w = active?.workout;
  const block = w ? w.blocks[active!.block] : undefined;
  const ex = block ? block.exercises[active!.exIndex] : undefined;
  const totalSets = useMemo(() => (w ? w.blocks.reduce((a, b) => a + b.rounds * b.exercises.length, 0) : 0), [w]);

  const sound = profile.sound;
  const buzz = profile.vibration;

  /* -------- state transitions -------- */
  const defaultCounter = useCallback((a: ActiveSession, pos: Pos): number => {
    const e = a.workout.blocks[pos.block].exercises[pos.exIndex];
    if (e.mode === 'time') return 0;
    const prev = [...a.sets].reverse().find((s) => s.exerciseId === e.exerciseId);
    if (prev) return prev.value;
    const lastSession = [...sessions].reverse().find((s) => s.sets.some((x) => x.exerciseId === e.exerciseId));
    if (lastSession) {
      const vals = lastSession.sets.filter((x) => x.exerciseId === e.exerciseId).map((x) => x.value);
      return Math.max(...vals);
    }
    return e.target[0];
  }, [sessions]);

  const beginExercise = useCallback((a: ActiveSession, pos: Pos): Partial<ActiveSession> => {
    const e = a.workout.blocks[pos.block].exercises[pos.exIndex];
    const t = Date.now();
    return {
      ...pos,
      step: 'exercise',
      counter: defaultCounter(a, pos),
      timerEndsAt: e.mode === 'time' ? t + e.target[1] * 1000 : undefined,
      timerTotal: e.mode === 'time' ? e.target[1] : undefined,
    };
  }, [defaultCounter]);

  const advance = useCallback((a: ActiveSession, sets: SetLog[]): Partial<ActiveSession> => {
    const b = a.workout.blocks[a.block];
    let next: Pos | null = null;
    let restSec = 0;
    let step: 'switch' | 'rest' = 'switch';
    if (a.exIndex + 1 < b.exercises.length) {
      next = { block: a.block, round: a.round, exIndex: a.exIndex + 1 };
      restSec = b.switchRest;
      step = 'switch';
    } else if (a.round + 1 < b.rounds) {
      next = { block: a.block, round: a.round + 1, exIndex: 0 };
      restSec = b.roundRest;
      step = 'rest';
    } else if (a.block + 1 < a.workout.blocks.length) {
      next = { block: a.block + 1, round: 0, exIndex: 0 };
      restSec = a.workout.blocks[a.block + 1].roundRest;
      step = 'rest';
    }
    if (!next) return { sets, step: 'done', timerEndsAt: undefined, timerTotal: undefined };
    if (restSec <= 0) return { sets, ...beginExercise({ ...a, sets }, next) };
    const t = Date.now();
    return { sets, ...next, step, timerEndsAt: t + restSec * 1000, timerTotal: restSec };
  }, [beginExercise]);

  const logAndAdvance = useCallback((value: number) => {
    updateActive((a) => {
      const e = a.workout.blocks[a.block].exercises[a.exIndex];
      const set: SetLog = { block: a.block, round: a.round, exerciseId: e.exerciseId, pattern: e.pattern, level: e.level, mode: e.mode, value, target: e.target };
      return advance(a, [...a.sets, set]);
    });
    if (buzz) haptic.done();
  }, [updateActive, advance, buzz]);

  const skipTimer = useCallback(() => {
    updateActive((a) => {
      if (a.step === 'exercise') {
        // timed exercise finished early: log elapsed seconds
        const elapsed = a.timerTotal && a.timerEndsAt ? Math.max(0, Math.round(a.timerTotal - (a.timerEndsAt - Date.now()) / 1000)) : 0;
        const e = a.workout.blocks[a.block].exercises[a.exIndex];
        const set: SetLog = { block: a.block, round: a.round, exerciseId: e.exerciseId, pattern: e.pattern, level: e.level, mode: e.mode, value: elapsed, target: e.target };
        return advance(a, [...a.sets, set]);
      }
      return beginExercise(a, { block: a.block, round: a.round, exIndex: a.exIndex });
    });
  }, [updateActive, advance, beginExercise]);

  const addTime = useCallback((sec: number) => {
    updateActive((a) => (a.timerEndsAt ? { timerEndsAt: Math.max(Date.now(), a.timerEndsAt) + sec * 1000, timerTotal: (a.timerTotal ?? 0) + sec } : {}));
  }, [updateActive]);

  /* -------- timer end + beeps -------- */
  const remaining = active?.timerEndsAt ? (active.timerEndsAt - now) / 1000 : null;
  useEffect(() => {
    if (!active || remaining === null || active.step === 'done') return;
    const sec = Math.ceil(remaining);
    const key = `${active.timerEndsAt}-${sec}`;
    if (remaining <= 0) {
      if (lastBeep.current !== `${active.timerEndsAt}-end`) {
        lastBeep.current = `${active.timerEndsAt}-end`;
        if (sound) finalBeep();
        if (buzz) haptic.done();
      }
      updateActive((a) => {
        if (a.step === 'exercise') {
          const e = a.workout.blocks[a.block].exercises[a.exIndex];
          const set: SetLog = { block: a.block, round: a.round, exerciseId: e.exerciseId, pattern: e.pattern, level: e.level, mode: e.mode, value: e.target[1], target: e.target };
          return advance(a, [...a.sets, set]);
        }
        return beginExercise(a, { block: a.block, round: a.round, exIndex: a.exIndex });
      });
      return;
    }
    if (sec <= 3 && sec >= 1 && lastBeep.current !== key) {
      lastBeep.current = key;
      if (sound) countdownBeep();
      if (buzz) haptic.tick();
    }
  }, [remaining, active, sound, buzz, updateActive, advance, beginExercise]);

  /* -------- finish -------- */
  const finishNow = () => {
    setExitOpen(false);
    updateActive({ step: 'done', timerEndsAt: undefined, timerTotal: undefined });
  };
  const discard = () => {
    setExitOpen(false);
    cancelSession();
    nav('/', { replace: true });
  };
  const save = () => {
    if (!active) return;
    const r = finishSession(active.sets, rpe, notes.trim());
    setResult(r);
    if (sound) successChime();
    if (buzz) haptic.finish();
  };

  if (result) {
    const s = result.session;
    return (
      <div className="player work fade-in" style={{ overflowY: 'auto' }}>
        <div className="player-main" style={{ justifyContent: 'flex-start', paddingTop: 24 }}>
          <div style={{ fontSize: 56 }}>🏁</div>
          <div className="player-name">Workout saved</div>
          <div className="muted">{s.name} · {formatDuration(s.durationSec)}</div>
          <div className="grid3" style={{ width: '100%' }}>
            <StatTile value={formatDuration(s.durationSec)} label="Time" />
            <StatTile value={s.totalReps} label="Total reps" />
            <StatTile value={`${Math.round(s.totalHoldSec)} s`} label="Holds" />
          </div>
          {result.prs.length > 0 && (
            <div className="card" style={{ width: '100%', textAlign: 'left' }}>
              <div className="bold mb8">🏆 New personal records</div>
              {result.prs.map((p, i) => (
                <div key={i} className="small">{EXERCISE_MAP[p.exerciseId]?.name}: {p.kind === 'round' ? 'best round' : 'session total'} <span className="bold">{p.value}</span>{p.previous ? ` (was ${p.previous})` : ''}</div>
              ))}
            </div>
          )}
          {result.achievements.length > 0 && (
            <div className="card" style={{ width: '100%', textAlign: 'left' }}>
              <div className="bold mb8">Achievements unlocked</div>
              {result.achievements.map((id) => {
                const a = ACHIEVEMENTS.find((x) => x.id === id);
                return <div key={id} className="small">{a?.emoji} <span className="bold">{a?.name}</span> · {a?.description}</div>;
              })}
            </div>
          )}
          {result.prs.length === 0 && result.achievements.length === 0 && <div className="muted small">Consistency is the record today. Keep showing up.</div>}
        </div>
        <button className="btn primary block xl" onClick={() => nav('/', { replace: true })}>Back to Today</button>
      </div>
    );
  }

  if (!active || !w || !block || !ex) return null;

  const elapsed = (now - active.startedAt) / 1000;
  const doneSets = active.sets.length;
  const progress = totalSets > 0 ? doneSets / totalSets : 0;

  if (active.step === 'done') {
    const totals = sessionTotals(active.sets);
    const prs = detectPRs(sessions, active.sets);
    return (
      <div className="player work fade-in" style={{ overflowY: 'auto' }}>
        <div className="player-top">
          <div className="bold">Finish workout</div>
          <button className="icon-btn" onClick={() => setExitOpen(true)} aria-label="Options"><IconClose /></button>
        </div>
        <div className="player-main" style={{ justifyContent: 'flex-start', gap: 16 }}>
          <div className="grid3" style={{ width: '100%' }}>
            <StatTile value={formatDuration(elapsed)} label="Time" />
            <StatTile value={totals.totalReps} label="Total reps" />
            <StatTile value={`${doneSets}/${totalSets}`} label="Sets" />
          </div>
          {prs.length > 0 && <div className="pill good">🏆 {prs.length} new record{prs.length > 1 ? 's' : ''}</div>}
          <div style={{ width: '100%', textAlign: 'left' }}>
            <div className="bold">How hard did that feel?</div>
            <div className="small muted mb8">1 = very easy · 10 = maximum effort. This tunes your next session.</div>
            <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button key={n} className={`btn ${rpe === n ? 'primary' : ''}`} style={{ minHeight: 52, fontSize: 18 }} onClick={() => setRpe(n)} aria-pressed={rpe === n}>{n}</button>
              ))}
            </div>
          </div>
          <div className="field" style={{ width: '100%' }}>
            <label htmlFor="notes">Notes (optional)</label>
            <textarea id="notes" className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="How did it go? Anything to remember?" />
          </div>
        </div>
        <div className="stack">
          <button className="btn primary block xl" onClick={save}>{rpe ? 'Save workout' : 'Save without rating'}</button>
          <button className="btn ghost block" onClick={() => setExitOpen(true)}>Discard</button>
        </div>
        <Sheet open={exitOpen} onClose={() => setExitOpen(false)} title="Discard this workout?">
          <div className="stack">
            <p className="muted small">Nothing from this session will be saved.</p>
            <button className="btn danger block" onClick={discard}>Discard workout</button>
            <button className="btn block" onClick={() => setExitOpen(false)}>Keep going</button>
          </div>
        </Sheet>
      </div>
    );
  }

  const isRest = active.step === 'rest' || active.step === 'switch';
  const nextInfo = (() => {
    if (isRest) return null;
    // Look ahead for the "next" card during an exercise.
    if (active.exIndex + 1 < block.exercises.length) return { label: 'Next', name: block.exercises[active.exIndex + 1].name, sub: formatTarget(block.exercises[active.exIndex + 1]) };
    if (active.round + 1 < block.rounds) return { label: 'Next', name: `Rest ${block.roundRest} s`, sub: `then round ${active.round + 2} of ${block.rounds}` };
    if (active.block + 1 < w.blocks.length) return { label: 'Next', name: w.blocks[active.block + 1].name, sub: `${w.blocks[active.block + 1].rounds} rounds` };
    return { label: 'Next', name: 'Finish', sub: 'last set!' };
  })();
  const fullEx = getExercise(ex.exerciseId);
  const timerWarn = remaining !== null && remaining <= 3;
  const cardioBlock = ex.pattern === 'cardio';

  return (
    <div className={`player ${isRest ? 'rest' : 'work'}`}>
      <div className="player-top">
        <button className="icon-btn" onClick={() => setExitOpen(true)} aria-label="Exit workout"><IconClose /></button>
        <div className="center">
          <div className="bold">{block.name} · Round {active.round + 1}/{block.rounds}</div>
          <div className="tiny muted">{w.name} · {w.location === 'gym' ? 'Gym' : 'Home'}</div>
        </div>
        <div className="mono bold" aria-label="Elapsed time">{formatDuration(elapsed)}</div>
      </div>
      <div className="progress-track" aria-hidden><div style={{ width: `${progress * 100}%` }} /></div>

      <div className="player-main">
        {isRest ? (
          <>
            <div className="muted bold" style={{ letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: 14 }}>{active.step === 'rest' ? 'Rest' : 'Switch'}</div>
            <div className={`player-timer${timerWarn ? ' warn' : ''}`} aria-live="off">{formatClock(remaining ?? 0)}</div>
            <div className="muted" style={{ fontSize: 15 }}>Next up</div>
            <div className="player-name">{ex.name}</div>
            <div className="player-target" style={{ color: 'rgba(255,255,255,0.8)' }}>{formatTarget(ex)}{ex.level !== undefined ? ` · rung ${ex.level + 1}` : ''}</div>
            <ul className="cues">{fullEx.cues.slice(0, 2).map((c) => <li key={c}>{c}</li>)}</ul>
          </>
        ) : ex.mode === 'time' ? (
          <>
            <div className="player-name">{ex.name}</div>
            <div className="player-target">{formatTarget(ex)}{ex.unilateral ? ' · switch sides halfway' : ''}</div>
            <div className={`player-timer${timerWarn ? ' warn' : ''}`}>{formatClock(remaining ?? 0)}</div>
            {cardioBlock && <div className="muted small">Steady pace. Talk test: short sentences only.</div>}
            <button className="btn ghost sm" onClick={() => setShowCues((v) => !v)}>{showCues ? 'Hide cues' : 'Show cues'}</button>
            {showCues && <ul className="cues">{fullEx.cues.map((c) => <li key={c}>{c}</li>)}</ul>}
          </>
        ) : (
          <>
            <div className="player-name">{ex.name}</div>
            <div className="player-target">Target {formatTarget(ex)}{ex.level !== undefined ? ` · rung ${ex.level + 1}` : ''}</div>
            <div className="counter-row">
              <button className="counter-btn" onClick={() => { updateActive((a) => ({ counter: Math.max(0, a.counter - 1) })); if (buzz) haptic.tap(); }} aria-label="One rep less">−</button>
              <div className="player-counter" aria-live="polite" aria-label={`${active.counter} reps`}>{active.counter}</div>
              <button className="counter-btn" onClick={() => { updateActive((a) => ({ counter: a.counter + 1 })); if (buzz) haptic.tap(); }} aria-label="One rep more">+</button>
            </div>
            <div className="small muted">{ex.unilateral ? 'Reps per side' : 'Reps this round'}</div>
            <button className="btn ghost sm" onClick={() => setShowCues((v) => !v)}>{showCues ? 'Hide cues' : 'Show cues'}</button>
            {showCues && <ul className="cues">{fullEx.cues.map((c) => <li key={c}>{c}</li>)}</ul>}
          </>
        )}
      </div>

      {nextInfo && (
        <div className="player-next mb12">
          <div className="grow">
            <div className="tiny faint">{nextInfo.label}</div>
            <div className="bold ellipsis">{nextInfo.name}</div>
          </div>
          <div className="small muted">{nextInfo.sub}</div>
        </div>
      )}

      <div className="player-actions">
        {isRest ? (
          <>
            <button className="btn xl" style={{ background: 'rgba(255,255,255,0.14)', color: '#fff' }} onClick={() => addTime(15)}>+15 s</button>
            <button className="btn xl white" onClick={skipTimer}>Skip rest</button>
          </>
        ) : ex.mode === 'time' ? (
          <>
            <button className="btn xl" onClick={() => addTime(15)}>+15 s</button>
            <button className="btn xl primary" onClick={skipTimer}>Done</button>
          </>
        ) : (
          <>
            <button className="btn xl" onClick={() => logAndAdvance(0)}>Skip</button>
            <button className="btn xl primary" style={{ flex: 2 }} onClick={() => logAndAdvance(active.counter)}>Done ✓</button>
          </>
        )}
      </div>

      <Sheet open={exitOpen} onClose={() => setExitOpen(false)} title="Leave workout?">
        <div className="stack">
          <p className="muted small">{doneSets} of {totalSets} sets done · {formatDuration(elapsed)} elapsed.</p>
          <button className="btn primary block" onClick={finishNow} disabled={doneSets === 0}>Finish now and save</button>
          <button className="btn danger block" onClick={discard}>Discard workout</button>
          <button className="btn block" onClick={() => setExitOpen(false)}>Keep going</button>
        </div>
      </Sheet>
    </div>
  );
}
