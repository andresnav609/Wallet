import type { ReactNode } from 'react';

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className={`switch${on ? ' on' : ''}`} onClick={() => onChange(!on)} />
  );
}

export function Segmented<T extends string>({ value, options, onChange, block }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; block?: boolean }) {
  return (
    <div className={`segmented${block ? ' block' : ''}`} role="tablist">
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" aria-selected={value === o.value} className={value === o.value ? 'active' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ListRow({ label, value, onClick, children }: { label: ReactNode; value?: ReactNode; onClick?: () => void; children?: ReactNode }) {
  return (
    <div className={`list-row${onClick ? ' tappable' : ''}`} onClick={onClick} role={onClick ? 'button' : undefined}>
      <div className="grow">{label}</div>
      {value !== undefined && <div className="muted">{value}</div>}
      {children}
    </div>
  );
}

export function StatTile({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="stat-tile">
      <div className="v">{value}</div>
      <div className="l">{label}</div>
    </div>
  );
}
