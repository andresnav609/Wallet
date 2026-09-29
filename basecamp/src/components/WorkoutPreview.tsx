import { Link } from 'react-router-dom';
import type { BuiltWorkout } from '../types';
import { formatTarget } from '../lib/format';
import { getLadder } from '../data/exercises';

export function WorkoutPreview({ workout, compact = false }: { workout: BuiltWorkout; compact?: boolean }) {
  return (
    <div className="stack">
      {workout.notes.length > 0 && (
        <div className="stack" style={{ gap: 6 }}>
          {workout.notes.map((n) => (
            <div key={n} className="pill warn" style={{ whiteSpace: 'normal', display: 'flex' }}>{n}</div>
          ))}
        </div>
      )}
      {workout.blocks.map((b, bi) => (
        <div key={bi}>
          <div className="section-title" style={{ margin: '6px 0 4px' }}>
            <span>{b.name}</span>
            <span className="faint" style={{ textTransform: 'none', letterSpacing: 0 }}>
              {b.rounds} round{b.rounds > 1 ? 's' : ''}{b.rounds > 1 ? ` · ${b.roundRest} s rest` : ''}
            </span>
          </div>
          {b.exercises.map((e, ei) => {
            const ladder = e.level !== undefined ? getLadder(e.pattern) : undefined;
            return (
              <Link key={ei} to={`/exercises/${e.exerciseId}`} className="ex-row" style={{ textDecoration: 'none', color: 'inherit', padding: compact ? '8px 0' : undefined }}>
                <div className="ico">{ei + 1}</div>
                <div className="grow">
                  <div className="bold ellipsis">{e.name}</div>
                  <div className="small muted">
                    {formatTarget(e)}
                    {ladder ? ` · rung ${(e.level ?? 0) + 1}/${ladder.rungs.length}` : ''}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ))}
      {!compact && (
        <>
          <div className="section-title" style={{ margin: '6px 0 4px' }}>Warm-up</div>
          <ul className="cues" style={{ paddingLeft: 18 }}>
            {workout.warmup.map((w) => <li key={w}>{w}</li>)}
          </ul>
          <div className="section-title" style={{ margin: '6px 0 4px' }}>Cool-down</div>
          <ul className="cues" style={{ paddingLeft: 18 }}>
            {workout.cooldown.map((w) => <li key={w}>{w}</li>)}
          </ul>
        </>
      )}
    </div>
  );
}
