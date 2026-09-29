import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EXERCISES, getLadder, PATTERN_LABEL } from '../data/exercises';
import { useStore } from '../store/useStore';
import { bestRound } from '../engine/stats';
import { IconChevronRight, IconSearch } from '../components/Icons';
import { Segmented } from '../components/Controls';
import type { Location, Pattern } from '../types';

const GROUPS: { key: string; label: string; patterns: Pattern[] }[] = [
  { key: 'all', label: 'All', patterns: [] },
  { key: 'push', label: 'Push', patterns: ['push', 'dip', 'pike'] },
  { key: 'pull', label: 'Pull', patterns: ['pull', 'row'] },
  { key: 'legs', label: 'Legs', patterns: ['squat', 'hinge', 'lunge', 'stepup', 'calf'] },
  { key: 'core', label: 'Core', patterns: ['plank', 'kneeRaise', 'antiExtension', 'sidePlank'] },
  { key: 'cardio', label: 'Cardio', patterns: ['cardio', 'conditioning'] },
  { key: 'accessory', label: 'Accessory', patterns: ['accessory'] },
  { key: 'mobility', label: 'Mobility', patterns: ['mobility'] },
];

const PATTERN_ORDER: Pattern[] = GROUPS.flatMap((g) => g.patterns);

export function Exercises() {
  const levels = useStore((s) => s.levels);
  const sessions = useStore((s) => s.sessions);
  const [q, setQ] = useState('');
  const [group, setGroup] = useState('all');
  const [loc, setLoc] = useState<Location | 'all'>('all');

  const list = useMemo(() => {
    const g = GROUPS.find((x) => x.key === group)!;
    const needle = q.trim().toLowerCase();
    return EXERCISES.filter((e) => {
      if (g.patterns.length && !g.patterns.includes(e.pattern)) return false;
      if (loc !== 'all' && e.location !== 'both' && e.location !== loc) return false;
      if (needle && !`${e.name} ${PATTERN_LABEL[e.pattern]} ${e.muscles.join(' ')} ${e.equipment.join(' ')}`.toLowerCase().includes(needle)) return false;
      return true;
    }).sort((a, b) => (a.pattern === b.pattern ? (a.level ?? 99) - (b.level ?? 99) : PATTERN_ORDER.indexOf(a.pattern) - PATTERN_ORDER.indexOf(b.pattern)));
  }, [q, group, loc]);

  return (
    <div className="page">
      <h1 className="page-title">Exercises</h1>
      <p className="page-sub">{EXERCISES.length} moves across {new Set(EXERCISES.map((e) => e.pattern)).size} patterns.</p>
      <div className="search mb12">
        <IconSearch />
        <input className="input" placeholder="Search moves, muscles, equipment" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search exercises" />
      </div>
      <div className="chips">
        {GROUPS.map((g) => (
          <button key={g.key} className={`chip${group === g.key ? ' active' : ''}`} onClick={() => setGroup(g.key)}>{g.label}</button>
        ))}
      </div>
      <div className="mt8 mb12">
        <Segmented block value={loc} onChange={setLoc} options={[{ value: 'all', label: 'Anywhere' }, { value: 'gym', label: 'Gym' }, { value: 'home', label: 'Home' }]} />
      </div>
      <div className="card">
        {list.length === 0 && <div className="empty">Nothing matches.</div>}
        {list.map((e) => {
          const ladder = getLadder(e.pattern);
          const my = levels[e.pattern] ?? 0;
          const isCurrent = ladder && e.level === my;
          const pr = bestRound(sessions, e.id);
          return (
            <Link key={e.id} to={`/exercises/${e.id}`} className="ex-row" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="ico" style={isCurrent ? { background: 'var(--accent)', color: 'var(--on-accent)' } : undefined}>
                {e.level !== undefined ? `L${e.level + 1}` : e.mode === 'time' ? '⏱' : '#'}
              </div>
              <div className="grow">
                <div className="bold ellipsis">{e.name}</div>
                <div className="small muted ellipsis">
                  {PATTERN_LABEL[e.pattern]} · {e.location === 'both' ? 'Gym & home' : e.location === 'gym' ? 'Gym' : 'Home'}
                  {isCurrent ? ' · current level' : ''}
                  {pr > 0 ? ` · PR ${pr}${e.mode === 'time' ? ' s' : ''}` : ''}
                </div>
              </div>
              <IconChevronRight className="faint" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
