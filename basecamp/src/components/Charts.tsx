import { useMemo, useRef, useState } from 'react';

/* Single-series charts: thin marks, recessive grid, hover tooltip, direct label on the last point. */

export interface Point {
  x: string; // label (date)
  y: number;
}

interface LineProps {
  points: Point[];
  goal?: number;
  height?: number;
  format?: (v: number) => string;
  color?: string;
  ariaLabel: string;
}

const PAD = { l: 38, r: 14, t: 14, b: 24 };

export function LineChart({ points, goal, height = 180, format = (v) => String(Math.round(v)), color = 'var(--accent)', ariaLabel }: LineProps) {
  const width = 360;
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement>(null);

  const { xs, ys, path, area, min, max, yTicks } = useMemo(() => {
    const vals = points.map((p) => p.y);
    if (goal !== undefined) vals.push(goal);
    let lo = Math.min(...vals);
    let hi = Math.max(...vals);
    if (!isFinite(lo)) { lo = 0; hi = 1; }
    const span = Math.max(hi - lo, 1);
    lo -= span * 0.12;
    hi += span * 0.12;
    const n = points.length;
    const xs = points.map((_, i) => PAD.l + (n > 1 ? (i / (n - 1)) * (width - PAD.l - PAD.r) : (width - PAD.l - PAD.r) / 2));
    const ys = points.map((p) => PAD.t + (1 - (p.y - lo) / (hi - lo)) * (height - PAD.t - PAD.b));
    const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
    const area = n > 0 ? `${path} L${xs[n - 1].toFixed(1)},${height - PAD.b} L${xs[0].toFixed(1)},${height - PAD.b} Z` : '';
    const ticks = 3;
    const yTicks = Array.from({ length: ticks }, (_, i) => lo + ((hi - lo) * (i + 0.5)) / ticks);
    return { xs, ys, path, area, min: lo, max: hi, yTicks };
  }, [points, goal, height]);

  const yFor = (v: number) => PAD.t + (1 - (v - min) / (max - min)) * (height - PAD.t - PAD.b);

  const onMove = (clientX: number) => {
    const svg = ref.current;
    if (!svg || points.length === 0) return;
    const rect = svg.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * width;
    let best = 0;
    let bd = Infinity;
    xs.forEach((px, i) => {
      const d = Math.abs(px - x);
      if (d < bd) { bd = d; best = i; }
    });
    setHover(best);
  };

  if (points.length === 0) return <div className="empty">No data yet.</div>;
  const last = points.length - 1;

  return (
    <div style={{ position: 'relative' }}>
      <svg
        ref={ref} className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel}
        onPointerMove={(e) => onMove(e.clientX)} onPointerDown={(e) => onMove(e.clientX)} onPointerLeave={() => setHover(null)}
      >
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={width - PAD.r} y1={yFor(t)} y2={yFor(t)} stroke="var(--border)" strokeWidth={1} />
            <text x={PAD.l - 6} y={yFor(t) + 4} textAnchor="end" fontSize={10} fill="var(--text-3)">{format(t)}</text>
          </g>
        ))}
        {goal !== undefined && (
          <g>
            <line x1={PAD.l} x2={width - PAD.r} y1={yFor(goal)} y2={yFor(goal)} stroke="var(--text-3)" strokeWidth={1.5} strokeDasharray="4 4" />
            <text x={width - PAD.r} y={yFor(goal) - 4} textAnchor="end" fontSize={10} fill="var(--text-2)" fontWeight={600}>Goal {format(goal)}</text>
          </g>
        )}
        <path d={area} fill={color} opacity={0.08} />
        <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((_, i) => (
          <circle key={i} cx={xs[i]} cy={ys[i]} r={i === last || i === hover ? 4.5 : 0} fill={color} stroke="var(--surface)" strokeWidth={2} />
        ))}
        <text x={xs[last]} y={ys[last] - 10} textAnchor={last === 0 ? 'middle' : 'end'} fontSize={12} fontWeight={700} fill="var(--text)">{format(points[last].y)}</text>
        <text x={PAD.l} y={height - 6} fontSize={10} fill="var(--text-3)">{points[0].x}</text>
        <text x={width - PAD.r} y={height - 6} textAnchor="end" fontSize={10} fill="var(--text-3)">{points[last].x}</text>
        {hover !== null && <line x1={xs[hover]} x2={xs[hover]} y1={PAD.t} y2={height - PAD.b} stroke="var(--text-3)" strokeWidth={1} />}
      </svg>
      {hover !== null && (
        <div className="chart-tip" style={{ left: `${(xs[hover] / width) * 100}%`, top: `${(ys[hover] / height) * 100}%` }}>
          {points[hover].x}: {format(points[hover].y)}
        </div>
      )}
    </div>
  );
}

interface BarProps {
  bars: { label: string; value: number }[];
  height?: number;
  format?: (v: number) => string;
  color?: string;
  ariaLabel: string;
}

export function BarChart({ bars, height = 160, format = (v) => String(Math.round(v)), color = 'var(--accent)', ariaLabel }: BarProps) {
  const width = 360;
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...bars.map((b) => b.value));
  const n = bars.length;
  const slot = (width - PAD.l - PAD.r) / Math.max(n, 1);
  const bw = Math.min(28, slot - 6);
  const yFor = (v: number) => PAD.t + (1 - v / max) * (height - PAD.t - PAD.b);
  if (n === 0) return <div className="empty">No data yet.</div>;
  return (
    <div style={{ position: 'relative' }}>
      <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel} onPointerLeave={() => setHover(null)}>
        {[0.5, 1].map((f) => (
          <g key={f}>
            <line x1={PAD.l} x2={width - PAD.r} y1={yFor(max * f)} y2={yFor(max * f)} stroke="var(--border)" strokeWidth={1} />
            <text x={PAD.l - 6} y={yFor(max * f) + 4} textAnchor="end" fontSize={10} fill="var(--text-3)">{format(max * f)}</text>
          </g>
        ))}
        <line x1={PAD.l} x2={width - PAD.r} y1={height - PAD.b} y2={height - PAD.b} stroke="var(--text-3)" strokeWidth={1} />
        {bars.map((b, i) => {
          const x = PAD.l + slot * i + (slot - bw) / 2;
          const y = yFor(b.value);
          const h = height - PAD.b - y;
          return (
            <g key={i} onPointerEnter={() => setHover(i)} onPointerDown={() => setHover(i)}>
              <rect x={PAD.l + slot * i} y={PAD.t} width={slot} height={height - PAD.t - PAD.b} fill="transparent" />
              {h > 0 && <path d={`M${x},${height - PAD.b} v${-Math.max(0, h - 4)} a4,4 0 0 1 4,-4 h${bw - 8} a4,4 0 0 1 4,4 v${Math.max(0, h - 4)} z`} fill={color} opacity={hover === null || hover === i ? 1 : 0.55} />}
              <text x={x + bw / 2} y={height - 8} textAnchor="middle" fontSize={10} fill="var(--text-3)">{b.label}</text>
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div className="chart-tip" style={{ left: `${((PAD.l + slot * hover + slot / 2) / width) * 100}%`, top: `${(yFor(bars[hover].value) / height) * 100}%` }}>
          {bars[hover].label}: {format(bars[hover].value)}
        </div>
      )}
    </div>
  );
}

export function Sparkline({ values, color = 'var(--accent)' }: { values: number[]; color?: string }) {
  const w = 120;
  const h = 32;
  if (values.length < 2) return null;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = Math.max(hi - lo, 1);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * (w - 4) + 2},${h - 2 - ((v - lo) / span) * (h - 4)}`);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
