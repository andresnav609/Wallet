import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { EXERCISE_MAP } from '../data/exercises';
import { formatDuration, formatLong } from '../engine/dates';
import { IconChevronLeft } from '../components/Icons';
import { StatTile } from '../components/Controls';
import { formatValue } from '../lib/format';
import { ACHIEVEMENTS } from '../engine/achievements';
import { useToast } from '../components/Toast';

export function SessionDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const session = useStore((s) => s.sessions.find((x) => x.id === id));
  const deleteSession = useStore((s) => s.deleteSession);
  if (!session) return <div className="page"><div className="empty">Session not found.</div></div>;

  const blocks = [...new Set(session.sets.map((s) => s.block))];
  const exOrder = (b: number) => [...new Set(session.sets.filter((s) => s.block === b).map((s) => s.exerciseId))];
  const rounds = (b: number) => Math.max(...session.sets.filter((s) => s.block === b).map((s) => s.round)) + 1;

  return (
    <div className="page">
      <button className="icon-btn" onClick={() => nav(-1)} aria-label="Back" style={{ marginLeft: -10 }}><IconChevronLeft /></button>
      <h1 className="page-title">{session.name}</h1>
      <p className="page-sub">{formatLong(session.date)} · {session.location === 'gym' ? 'Gym' : 'Home'} · Week {session.week}{session.deload ? ' (deload)' : ''}</p>
      <div className="grid3 mb12">
        <StatTile value={formatDuration(session.durationSec)} label="Duration" />
        <StatTile value={session.totalReps} label="Total reps" />
        <StatTile value={session.rpe ? `${session.rpe}/10` : '–'} label="Felt like" />
      </div>
      {session.prs.length > 0 && (
        <div className="card mb12">
          <div className="bold mb8">🏆 Personal records</div>
          {session.prs.map((p, i) => (
            <div key={i} className="small">{EXERCISE_MAP[p.exerciseId]?.name ?? p.exerciseId}: {p.kind === 'round' ? 'best round' : 'session total'} {p.value} (was {p.previous})</div>
          ))}
        </div>
      )}
      {session.achievements.length > 0 && (
        <div className="card mb12">
          <div className="bold mb8">Achievements unlocked</div>
          {session.achievements.map((a) => {
            const def = ACHIEVEMENTS.find((x) => x.id === a);
            return <div key={a} className="small">{def?.emoji} {def?.name ?? a}</div>;
          })}
        </div>
      )}
      {blocks.map((b) => (
        <div key={b} className="card mb12">
          <div className="bold mb8">Block {b + 1} · {rounds(b)} rounds</div>
          {exOrder(b).map((exId) => {
            const sets = session.sets.filter((s) => s.block === b && s.exerciseId === exId);
            return (
              <div key={exId} className="list-row">
                <div className="grow">
                  <div className="bold small">{EXERCISE_MAP[exId]?.name ?? exId}</div>
                  <div className="small muted">target {sets[0].target[0]}–{sets[0].target[1]}</div>
                </div>
                <div className="mono small">{sets.map((s) => formatValue(s.mode, s.value)).join(' · ')}</div>
              </div>
            );
          })}
        </div>
      ))}
      {session.notes && <div className="card mb12"><div className="bold mb8">Notes</div><div className="small muted">{session.notes}</div></div>}
      <button className="btn danger block" onClick={() => { if (confirm('Delete this workout from your history?')) { deleteSession(session.id); toast('Workout deleted'); nav(-1); } }}>Delete workout</button>
    </div>
  );
}
