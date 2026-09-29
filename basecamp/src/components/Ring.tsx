interface Props {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  color: string;
  label: string;
  center?: string;
  sub?: string;
}

export function Ring({ value, max, size = 84, stroke = 9, color, label, center, sub }: Props) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div className="ring-tile" role="img" aria-label={`${label}: ${value} of ${max}`}>
      <div className="ring" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--surface-3)" strokeWidth={stroke} fill="none" />
          <circle
            cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c * (1 - pct)} transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        <div className="ring-center">{center ?? value}</div>
      </div>
      <div className="lbl">{label}</div>
      {sub && <div className="val">{sub}</div>}
    </div>
  );
}
