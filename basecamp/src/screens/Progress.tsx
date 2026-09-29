import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { EXERCISE_MAP } from '../data/exercises';
import { ACHIEVEMENTS } from '../engine/achievements';
import { bestStreak, currentStreak, lastWeeks, bestRound } from '../engine/stats';
import { formatDuration, formatShort, todayKey } from '../engine/dates';
import { formatLength, formatWeight, fromIn, fromLb, lengthUnit, toIn, toLb, weightUnit } from '../engine/units';
import { BarChart, LineChart } from '../components/Charts';
import { Segmented, StatTile } from '../components/Controls';
import { Sheet } from '../components/Sheet';
import { useToast } from '../components/Toast';
import { deletePhotoBlob, getPhotoBlob, savePhotoBlob } from '../store/db';
import { IconChevronRight, IconPlus } from '../components/Icons';

type Range = 30 | 90 | 365;

export function Progress() {
  const store = useStore();
  const toast = useToast();
  const units = store.profile.units;
  const today = todayKey();
  const [range, setRange] = useState<Range>(90);
  const [weightSheet, setWeightSheet] = useState(false);
  const [measureSheet, setMeasureSheet] = useState(false);
  const [wDraft, setWDraft] = useState({ date: today, value: '' });
  const [mDraft, setMDraft] = useState({ date: today, waist: '', chest: '', arm: '', hips: '' });
  const [volumeMode, setVolumeMode] = useState<'reps' | 'minutes'>('reps');
  const [photoOpen, setPhotoOpen] = useState<string | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);

  const cutoff = useMemo(() => { const d = new Date(); d.setDate(d.getDate() - range); return d.toISOString().slice(0, 10); }, [range]);
  const weights = store.weights.filter((w) => w.date >= cutoff);
  const latest = store.weights[store.weights.length - 1];
  const change = latest ? latest.lb - store.profile.startWeightLb : 0;
  const toGo = latest ? latest.lb - store.profile.goalWeightLb : 0;
  const weeks = lastWeeks(store.sessions, 8, today);
  const latestM = [...store.measurements].reverse().find(Boolean);
  const waistPts = store.measurements.filter((m) => m.waist !== undefined).map((m) => ({ x: formatShort(m.date), y: fromIn(m.waist as number, units) }));

  const prs = useMemo(() => {
    const ids = [...new Set(store.sessions.flatMap((s) => s.sets.map((x) => x.exerciseId)))].filter((id) => EXERCISE_MAP[id]?.pattern !== 'cardio');
    return ids.map((id) => ({ id, name: EXERCISE_MAP[id]?.name ?? id, mode: EXERCISE_MAP[id]?.mode, best: bestRound(store.sessions, id) })).filter((p) => p.best > 0).sort((a, b) => b.best - a.best).slice(0, 8);
  }, [store.sessions]);

  const saveWeight = () => {
    const v = Number(wDraft.value);
    if (!v) return;
    store.logWeight({ date: wDraft.date, lb: toLb(v, units) });
    setWeightSheet(false);
    setWDraft({ date: today, value: '' });
    toast('Weight logged');
  };
  const saveMeasure = () => {
    const n = (s: string) => (s.trim() ? toIn(Number(s), units) : undefined);
    store.logMeasurement({ date: mDraft.date, waist: n(mDraft.waist), chest: n(mDraft.chest), arm: n(mDraft.arm), hips: n(mDraft.hips) });
    setMeasureSheet(false);
    setMDraft({ date: today, waist: '', chest: '', arm: '', hips: '' });
    toast('Measurements logged');
  };

  const addPhoto = async (file: File) => {
    try {
      const blob = await downscale(file, 1280);
      const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      await savePhotoBlob(id, blob);
      store.addPhoto({ id, date: today });
      toast('Photo saved on this device');
    } catch {
      toast('Could not save that photo');
    }
  };
  const removePhoto = async (id: string) => {
    if (!confirm('Delete this photo?')) return;
    await deletePhotoBlob(id);
    store.deletePhoto(id);
    setPhotoOpen(null);
  };

  const sessions = [...store.sessions].sort((a, b) => b.finishedAt - a.finishedAt);
  const fmtW = (v: number) => (units === 'metric' ? `${v.toFixed(1)}` : `${v.toFixed(1)}`);

  return (
    <div className="page">
      <h1 className="page-title">Progress</h1>
      <p className="page-sub">Weight, measurements, volume, records and history.</p>

      <div className="section-title"><span>Weight</span><button className="link" onClick={() => setWeightSheet(true)}>+ Log</button></div>
      <div className="card">
        <div className="grid3 mb12">
          <StatTile value={latest ? fromLb(latest.lb, units).toFixed(1) : '–'} label={`Current (${weightUnit(units)})`} />
          <StatTile value={latest ? `${change > 0 ? '+' : ''}${fromLb(change, units).toFixed(1)}` : '–'} label="Since start" />
          <StatTile value={latest ? `${Math.max(0, fromLb(toGo, units)).toFixed(1)}` : '–'} label="To goal" />
        </div>
        <div className="mb12"><Segmented block value={String(range) as '30' | '90' | '365'} onChange={(v) => setRange(Number(v) as Range)} options={[{ value: '30', label: '30 d' }, { value: '90', label: '90 d' }, { value: '365', label: '1 y' }]} /></div>
        <LineChart ariaLabel="Body weight over time with goal line" points={weights.map((w) => ({ x: formatShort(w.date), y: fromLb(w.lb, units) }))} goal={fromLb(store.profile.goalWeightLb, units)} format={fmtW} />
        {store.weights.length > 0 && (
          <details className="mt12">
            <summary className="small muted">All entries ({store.weights.length})</summary>
            {[...store.weights].reverse().map((w) => (
              <div key={w.date} className="list-row">
                <span className="small">{formatShort(w.date)}</span>
                <span className="row"><span className="bold">{formatWeight(w.lb, units)}</span><button className="btn sm" onClick={() => store.deleteWeight(w.date)} aria-label={`Delete ${w.date}`}>✕</button></span>
              </div>
            ))}
          </details>
        )}
      </div>

      <div className="section-title"><span>Measurements</span><button className="link" onClick={() => setMeasureSheet(true)}>+ Log</button></div>
      <div className="card">
        <div className="grid4 mb12">
          {(['waist', 'chest', 'arm', 'hips'] as const).map((k) => (
            <StatTile key={k} value={latestM?.[k] !== undefined ? formatLength(latestM[k] as number, units, 1) : '–'} label={k[0].toUpperCase() + k.slice(1)} />
          ))}
        </div>
        {waistPts.length > 1 ? <LineChart ariaLabel="Waist over time" points={waistPts} height={140} format={(v) => v.toFixed(1)} color="var(--ring-2)" /> : <div className="tiny faint">Log your waist a few times to see the trend.</div>}
      </div>

      <div className="section-title"><span>Progress photos</span><button className="link" onClick={() => photoInput.current?.click()}>+ Add</button></div>
      <input ref={photoInput} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) void addPhoto(f); e.target.value = ''; }} />
      <div className="card">
        {store.photos.length === 0 ? (
          <button className="empty" style={{ width: '100%' }} onClick={() => photoInput.current?.click()}><IconPlus /> <div>Photos stay on this device and are never uploaded.</div></button>
        ) : (
          <div className="photo-grid">
            {store.photos.map((p) => <PhotoThumb key={p.id} id={p.id} date={p.date} onClick={() => setPhotoOpen(p.id)} />)}
          </div>
        )}
      </div>

      <div className="section-title"><span>Weekly volume</span>
        <Segmented value={volumeMode} onChange={setVolumeMode} options={[{ value: 'reps', label: 'Reps' }, { value: 'minutes', label: 'Minutes' }]} />
      </div>
      <div className="card">
        <BarChart ariaLabel={`Weekly ${volumeMode} for the last 8 weeks`} bars={weeks.map((w) => ({ label: formatShort(w.start), value: volumeMode === 'reps' ? w.reps : w.minutes }))} color={volumeMode === 'reps' ? 'var(--accent)' : 'var(--ring-2)'} />
      </div>

      <div className="section-title">Streaks</div>
      <div className="card"><div className="grid2"><StatTile value={`${currentStreak(store, today)} d`} label="Current streak" /><StatTile value={`${bestStreak(store, today)} d`} label="Best streak" /></div></div>

      <div className="section-title">Personal records</div>
      <div className="card">
        {prs.length === 0 && <div className="empty">Finish a workout to set your first records.</div>}
        {prs.map((p) => (
          <Link key={p.id} to={`/exercises/${p.id}`} className="list-row tappable" style={{ textDecoration: 'none', color: 'inherit' }}>
            <span className="small bold">{p.name}</span>
            <span className="row"><span className="bold">{p.best}{p.mode === 'time' ? ' s' : ''}</span><IconChevronRight className="faint" /></span>
          </Link>
        ))}
      </div>

      <div className="section-title">Achievements · {Object.keys(store.unlocked).length}/{ACHIEVEMENTS.length}</div>
      <div className="ach-grid">
        {ACHIEVEMENTS.map((a) => (
          <div key={a.id} className={`ach${store.unlocked[a.id] ? '' : ' locked'}`} title={a.description} aria-label={`${a.name}: ${a.description}${store.unlocked[a.id] ? ', unlocked' : ', locked'}`}>
            <div className="e">{a.emoji}</div>
            <div className="n">{a.name}</div>
            <div className="tiny faint">{store.unlocked[a.id] ? formatShort(store.unlocked[a.id]) : a.description}</div>
          </div>
        ))}
      </div>

      <div className="section-title">History · {sessions.length}</div>
      <div className="card">
        {sessions.length === 0 && <div className="empty">No workouts yet.</div>}
        {sessions.slice(0, 30).map((s) => (
          <Link key={s.id} to={`/progress/session/${s.id}`} className="list-row tappable" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div>
              <div className="bold small">{s.name} · {formatShort(s.date)}</div>
              <div className="small muted">{formatDuration(s.durationSec)} · {s.totalReps} reps{s.rpe ? ` · ${s.rpe}/10` : ''}{s.prs.length ? ` · 🏆 ${s.prs.length}` : ''}</div>
            </div>
            <IconChevronRight className="faint" />
          </Link>
        ))}
      </div>

      <Sheet open={weightSheet} onClose={() => setWeightSheet(false)} title="Log weight">
        <div className="stack">
          <div className="field"><label htmlFor="w-date">Date</label><input id="w-date" type="date" className="input" value={wDraft.date} onChange={(e) => setWDraft({ ...wDraft, date: e.target.value })} /></div>
          <div className="field"><label htmlFor="w-val">Weight ({weightUnit(units)})</label><input id="w-val" className="input" inputMode="decimal" autoFocus value={wDraft.value} onChange={(e) => setWDraft({ ...wDraft, value: e.target.value })} placeholder={latest ? fromLb(latest.lb, units).toFixed(1) : ''} /></div>
          <button className="btn primary block xl" onClick={saveWeight} disabled={!Number(wDraft.value)}>Save</button>
        </div>
      </Sheet>
      <Sheet open={measureSheet} onClose={() => setMeasureSheet(false)} title="Log measurements">
        <div className="stack">
          <div className="field"><label htmlFor="m-date">Date</label><input id="m-date" type="date" className="input" value={mDraft.date} onChange={(e) => setMDraft({ ...mDraft, date: e.target.value })} /></div>
          <div className="grid2">
            {(['waist', 'chest', 'arm', 'hips'] as const).map((k) => (
              <div key={k} className="field"><label htmlFor={`m-${k}`}>{k[0].toUpperCase() + k.slice(1)} ({lengthUnit(units)})</label><input id={`m-${k}`} className="input" inputMode="decimal" value={mDraft[k]} onChange={(e) => setMDraft({ ...mDraft, [k]: e.target.value })} /></div>
            ))}
          </div>
          <button className="btn primary block xl" onClick={saveMeasure}>Save</button>
        </div>
      </Sheet>
      <Sheet open={!!photoOpen} onClose={() => setPhotoOpen(null)}>
        {photoOpen && (
          <div className="stack">
            <PhotoFull id={photoOpen} />
            <div className="small muted center">{formatShort(store.photos.find((p) => p.id === photoOpen)?.date ?? today)}</div>
            <button className="btn danger block" onClick={() => void removePhoto(photoOpen)}>Delete photo</button>
          </div>
        )}
      </Sheet>
    </div>
  );
}

function usePhotoUrl(id: string): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let u: string | null = null;
    void getPhotoBlob(id).then((b) => { if (b) { u = URL.createObjectURL(b); setUrl(u); } });
    return () => { if (u) URL.revokeObjectURL(u); };
  }, [id]);
  return url;
}

function PhotoThumb({ id, date, onClick }: { id: string; date: string; onClick: () => void }) {
  const url = usePhotoUrl(id);
  return (
    <button className="photo" onClick={onClick} aria-label={`Photo from ${formatShort(date)}`}>
      {url && <img src={url} alt="" />}
      <span className="date">{formatShort(date)}</span>
    </button>
  );
}

function PhotoFull({ id }: { id: string }) {
  const url = usePhotoUrl(id);
  return url ? <img src={url} alt="Progress photo" style={{ width: '100%', borderRadius: 14, maxHeight: '60dvh', objectFit: 'contain' }} /> : null;
}

async function downscale(file: File, max: number): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/jpeg', 0.85));
}
