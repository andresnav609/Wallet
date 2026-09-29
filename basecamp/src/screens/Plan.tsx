import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { addDays, formatDuration, formatLong, fromKey, MONTH_NAMES, pad, todayKey, WEEKDAY_SHORT } from '../engine/dates';
import { dayStatus, dayTypeFor, isDeloadWeek, phaseName, phaseForWeek, weekNumber } from '../engine/schedule';
import { buildWorkout } from '../engine/builder';
import { DAY_LABEL, DAY_SHORT } from '../data/program';
import { Sheet } from '../components/Sheet';
import { WorkoutPreview } from '../components/WorkoutPreview';
import { IconChevronLeft, IconChevronRight } from '../components/Icons';
import { unlockAudio } from '../lib/audio';
import { useToast } from '../components/Toast';

export function Plan() {
  const store = useStore();
  const nav = useNavigate();
  const toast = useToast();
  const today = todayKey();
  const [cursor, setCursor] = useState(() => today.slice(0, 7)); // YYYY-MM
  const [selected, setSelected] = useState<string | null>(null);
  const [moveTo, setMoveTo] = useState('');

  const [y, m] = cursor.split('-').map(Number);
  const days = useMemo(() => {
    const first = `${y}-${pad(m)}-01`;
    const offset = (fromKey(first).getDay() + 6) % 7;
    const start = addDays(first, -offset);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [y, m]);

  const shift = (n: number) => {
    const d = new Date(y, m - 1 + n, 1);
    setCursor(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
  };

  const sel = selected;
  const selType = sel ? dayTypeFor(store, sel) : 'rest';
  const selStatus = sel ? dayStatus(store, sel, today) : 'rest';
  const selWorkout = useMemo(() => (sel ? buildWorkout({ data: store, date: sel }) : null), [sel, store.levels, store.planOverrides, store.sessions, store.profile]);
  const selSessions = sel ? store.sessions.filter((s) => s.date === sel) : [];
  const selWeek = sel ? weekNumber(store.profile.startDate, sel) : 1;

  const doMove = () => {
    if (!sel || !moveTo || moveTo === sel) return;
    store.movePlan(sel, moveTo, selType);
    toast(`${DAY_LABEL[selType]} moved to ${formatLong(moveTo)}`);
    setSelected(null);
    setMoveTo('');
  };

  const startThis = async () => {
    if (!selWorkout) return;
    await unlockAudio();
    store.startSession({ ...selWorkout, date: today });
    nav('/workout');
  };

  const monthDone = store.sessions.filter((s) => s.date.startsWith(cursor)).length;

  return (
    <div className="page">
      <h1 className="page-title">Plan</h1>
      <p className="page-sub">Tap any day to preview it, move it or skip it.</p>

      <div className="card">
        <div className="card-row mb12">
          <button className="icon-btn" onClick={() => shift(-1)} aria-label="Previous month"><IconChevronLeft /></button>
          <div className="bold" style={{ fontSize: 17 }}>{MONTH_NAMES[m - 1]} {y}</div>
          <button className="icon-btn" onClick={() => shift(1)} aria-label="Next month"><IconChevronRight /></button>
        </div>
        <div className="cal-head">{WEEKDAY_SHORT.map((d) => <div key={d}>{d}</div>)}</div>
        <div className="cal">
          {days.map((d) => {
            const inMonth = d.startsWith(cursor);
            const st = dayStatus(store, d, today);
            const t = dayTypeFor(store, d);
            const cls = ['cal-day', inMonth ? '' : 'other', d === today ? 'today' : '', st === 'today' ? 'todaytype' : st === 'before' ? '' : st].filter(Boolean).join(' ');
            return (
              <button key={d} className={cls} onClick={() => { setSelected(d); setMoveTo(''); }} aria-label={`${formatLong(d)}, ${DAY_LABEL[t]}, ${st}`}>
                <span>{fromKey(d).getDate()}</span>
                <span className="t">{t === 'rest' ? '·' : DAY_SHORT[t]}</span>
              </button>
            );
          })}
        </div>
        <div className="legend">
          <span><i style={{ background: 'var(--good)' }} />Done</span>
          <span><i style={{ background: 'var(--danger)' }} />Missed</span>
          <span><i style={{ background: 'var(--warn)' }} />Skipped</span>
          <span><i style={{ background: 'var(--accent)' }} />Planned</span>
        </div>
        <div className="small muted mt12">{monthDone} workout{monthDone === 1 ? '' : 's'} done this month.</div>
      </div>

      <Sheet open={!!sel} onClose={() => setSelected(null)} title={sel ? formatLong(sel) : ''}>
        {sel && (
          <div className="stack">
            <div className="row wrap">
              <span className="pill accent">{DAY_LABEL[selType]}</span>
              <span className="pill">Week {selWeek} · {phaseName(phaseForWeek(selWeek))}{isDeloadWeek(selWeek) ? ' · Deload' : ''}</span>
              <span className={`pill ${selStatus === 'done' ? 'good' : selStatus === 'missed' ? 'danger' : selStatus === 'skipped' ? 'warn' : ''}`}>{selStatus === 'before' ? 'before start' : selStatus}</span>
            </div>
            {selSessions.length > 0 && (
              <div className="card" style={{ padding: 12 }}>
                {selSessions.map((s) => (
                  <button key={s.id} className="list-row tappable" style={{ width: '100%', textAlign: 'left' }} onClick={() => nav(`/progress/session/${s.id}`)}>
                    <div>
                      <div className="bold">{s.name} · {formatDuration(s.durationSec)}</div>
                      <div className="small muted">{s.totalReps} reps{s.rpe ? ` · felt ${s.rpe}/10` : ''}</div>
                    </div>
                    <IconChevronRight className="faint" />
                  </button>
                ))}
              </div>
            )}
            {selWorkout ? (
              <>
                <div className="small muted">{selWorkout.focus} · ~{selWorkout.estMinutes} min</div>
                <WorkoutPreview workout={selWorkout} compact />
                {sel === today && !store.active && (
                  <button className="btn primary block xl" onClick={startThis}>Start workout</button>
                )}
                {sel !== today && selStatus !== 'done' && !store.active && (
                  <button className="btn block" onClick={startThis}>Do this workout today</button>
                )}
                <div className="divider" />
                <div className="field">
                  <label htmlFor="move-to">Move to another day</label>
                  <div className="row">
                    <input id="move-to" type="date" className="input grow" value={moveTo} onChange={(e) => setMoveTo(e.target.value)} />
                    <button className="btn" onClick={doMove} disabled={!moveTo || moveTo === sel}>Move</button>
                  </div>
                  <div className="tiny faint">The two days swap, so the week keeps every session.</div>
                </div>
                {selStatus !== 'done' && (
                  <button className={`btn block ${selStatus === 'skipped' ? '' : 'danger'}`} onClick={() => { store.toggleSkip(sel); setSelected(null); }}>
                    {selStatus === 'skipped' ? 'Unskip this day' : 'Skip this day'}
                  </button>
                )}
              </>
            ) : (
              <div className="empty">Rest day. Walk, stretch, eat well, sleep.</div>
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
}
