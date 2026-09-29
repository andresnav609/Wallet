import type { AppData, Pattern, Session, Suggestion } from '../types';
import { LADDERS, getLadder } from '../data/exercises';

/** Sessions that contain sets for `pattern` at `level`, newest first. */
function sessionsForPattern(sessions: Session[], pattern: Pattern, level: number, since?: string): Session[] {
  return sessions
    .filter((s) => (since ? s.date >= since : true))
    .filter((s) => s.sets.some((x) => x.pattern === pattern && x.level === level))
    .sort((a, b) => (a.finishedAt < b.finishedAt ? 1 : -1));
}

function outcome(session: Session, pattern: Pattern, level: number): 'top' | 'bottom' | 'mid' {
  const sets = session.sets.filter((x) => x.pattern === pattern && x.level === level);
  if (sets.length === 0) return 'mid';
  const allTop = sets.every((x) => x.value >= x.target[1]);
  if (allTop) return 'top';
  const anyBelow = sets.some((x) => x.value < x.target[0]);
  if (anyBelow) return 'bottom';
  return 'mid';
}

/**
 * Auto-progression rule:
 *  - top of the range in every round, two sessions in a row  -> move up
 *  - below the bottom of the range in any round, two sessions in a row -> move down
 */
export function suggestionFor(data: Pick<AppData, 'levels' | 'levelSince' | 'sessions'>, pattern: Pattern): Suggestion | null {
  const ladder = getLadder(pattern);
  if (!ladder) return null;
  const level = data.levels[pattern] ?? 0;
  const recent = sessionsForPattern(data.sessions, pattern, level, data.levelSince[pattern]).slice(0, 2);
  if (recent.length < 2) return null;
  const outcomes = recent.map((s) => outcome(s, pattern, level));
  if (outcomes.every((o) => o === 'top') && level < ladder.rungs.length - 1) {
    return {
      pattern,
      direction: 'up',
      from: level,
      to: level + 1,
      fromName: ladder.rungs[level].label,
      toName: ladder.rungs[level + 1].label,
      reason: 'Top of the range in every round, two sessions in a row.',
    };
  }
  if (outcomes.every((o) => o === 'bottom') && level > 0) {
    return {
      pattern,
      direction: 'down',
      from: level,
      to: level - 1,
      fromName: ladder.rungs[level].label,
      toName: ladder.rungs[level - 1].label,
      reason: 'Missed the bottom of the range two sessions in a row.',
    };
  }
  return null;
}

export function allSuggestions(data: Pick<AppData, 'levels' | 'levelSince' | 'sessions'>): Suggestion[] {
  return LADDERS.map((l) => suggestionFor(data, l.pattern)).filter((s): s is Suggestion => s !== null);
}
