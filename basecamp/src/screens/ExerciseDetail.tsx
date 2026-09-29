import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { EXERCISE_MAP, getLadder, PATTERN_LABEL } from '../data/exercises';
import { useStore } from '../store/useStore';
import { bestRound, bestSessionTotal } from '../engine/stats';
import { formatShort } from '../engine/dates';
import { IconChevronLeft } from '../components/Icons';
import { StatTile } from '../components/Controls';
import { Sparkline } from '../components/Charts';
import { useToast } from '../components/Toast';

export function ExerciseDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const store = useStore();
  const ex = id ? EXERCISE_MAP[id] : undefined;

  const history = useMemo(() => {
    if (!ex) return [];
    return store.sessions
      .filter((s) => s.sets.some((x) => x.exerciseId === ex.id))
      .sort((a, b) => b.finishedAt - a.finishedAt)
      .map((s) => ({ session: s, values: s.sets.filter((x) => x.exerciseId === ex.id).map((x) => x.value) }));
  }, [ex, store.sessions]);

  if (!ex) return <div className="page"><div className="empty">Exercise not found.</div></div>;

  const ladder = getLadder(ex.pattern);
  const myLevel = store.levels[ex.pattern] ?? 0;
  const unit = ex.mode === 'time' ? ' s' : '';
  const prRound = bestRound(store.sessions, ex.id);
  const prSession = bestSessionTotal(store.sessions, ex.id);
  const spark = [...history].reverse().map((h) => Math.max(...h.values));

  return (
    <div className="page">
      <button className="icon-btn" onClick={() => nav(-1)} aria-label="Back" style={{ marginLeft: -10 }}><IconChevronLeft /></button>
      <h1 className="page-title">{ex.name}</h1>
      <div className="row wrap mb12">
        <span className="pill accent">{PATTERN_LABEL[ex.pattern]}</span>
        <span className="pill">{ex.mode === 'time' ? 'Timed' : 'Reps'}{ex.unilateral ? ' · per side' : ''}</span>
        <span className="pill">{ex.location === 'both' ? 'Gym & home' : ex.location === 'gym' ? 'Gym' : 'Home'}</span>
        {ladder && ex.level === myLevel && <span className="pill good">Current level</span>}
      </div>
      {ex.note && <p className="muted small mb12">{ex.note}</p>}

      <div className="grid2 mb12">
        <StatTile value={prRound > 0 ? `${prRound}${unit}` : '–'} label="Best round" />
        <StatTile value={prSession > 0 ? `${prSession}${unit}` : '–'} label="Best session total" />
      </div>

      <div className="card">
        <div className="bold mb8">Form cues</div>
        <ol className="cues">{ex.cues.map((c) => <li key={c}>{c}</li>)}</ol>
        <div className="divider" />
        <div className="small"><span className="bold">Muscles:</span> <span className="muted">{ex.muscles.join(', ')}</span></div>
        <div className="small mt8"><span className="bold">Equipment:</span> <span className="muted">{ex.equipment.join(', ')}</span></div>
      </div>

      {ladder && (
        <>
          <div className="section-title">{ladder.name} ladder</div>
          <div className="card">
            <p className="small muted mb12">{ladder.description}</p>
            <div className="ladder">
              {ladder.rungs.map((r, i) => {
                const gymEx = EXERCISE_MAP[r.gym];
                const homeEx = EXERCISE_MAP[r.home];
                const same = r.gym === r.home;
                return (
                  <div key={i} className={`rung${i === myLevel ? ' current' : i < myLevel ? ' past' : ''}`}>
                    <div className="idx">{i < myLevel ? '✓' : i + 1}</div>
                    <div className="grow">
                      <div className="bold small">{r.label}</div>
                      {(!same || gymEx.name !== r.label) && <div className="tiny muted">{same ? gymEx.name : `Gym: ${gymEx.name} · Home: ${homeEx.name}`}</div>}
                    </div>
                    {i !== myLevel && (
                      <button className="btn sm" onClick={() => { store.setLevel(ex.pattern, i, 'manual'); toast(`${ladder.name} level set to ${r.label}`); }}>Use</button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      <div className="section-title">History</div>
      <div className="card">
        {history.length === 0 && <div className="empty">No sessions with this move yet.</div>}
        {spark.length > 1 && (
          <div className="row mb12" style={{ justifyContent: 'space-between' }}>
            <span className="small muted">Best round per session</span>
            <Sparkline values={spark} />
          </div>
        )}
        {history.map(({ session, values }) => (
          <button key={session.id} className="list-row tappable" style={{ width: '100%', textAlign: 'left' }} onClick={() => nav(`/progress/session/${session.id}`)}>
            <div>
              <div className="bold small">{formatShort(session.date)} · {session.name}</div>
              <div className="small muted">{values.map((v) => `${v}${unit}`).join(' · ')}</div>
            </div>
            <div className="bold">{values.reduce((a, b) => a + b, 0)}{unit}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
