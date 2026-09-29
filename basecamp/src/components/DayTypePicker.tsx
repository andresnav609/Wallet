import type { DayType } from '../types';
import { DAY_LABEL, DAY_TYPES, TEMPLATES } from '../data/program';

export function dayEmoji(t: DayType): string {
  return t === 'rest' ? '😌' : TEMPLATES[t].emoji;
}

export function dayFocus(t: DayType): string {
  return t === 'rest' ? 'Recovery, walk, mobility' : TEMPLATES[t].focus;
}

/** Vertical list of workout types with the current one highlighted. */
export function DayTypePicker({ value, onChange }: { value: DayType; onChange: (t: DayType) => void }) {
  return (
    <div className="stack" style={{ gap: 6 }} role="listbox" aria-label="Workout type">
      {DAY_TYPES.map((t) => (
        <button
          key={t}
          role="option"
          aria-selected={value === t}
          className={`rung${value === t ? ' current' : ''}`}
          style={{ width: '100%', textAlign: 'left' }}
          onClick={() => onChange(t)}
        >
          <span style={{ fontSize: 22, width: 28, textAlign: 'center' }}>{dayEmoji(t)}</span>
          <span className="grow">
            <span className="bold small">{DAY_LABEL[t]}</span>
            <span className="tiny muted" style={{ display: 'block' }}>{dayFocus(t)}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
