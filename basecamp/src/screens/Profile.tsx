import { useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { ListRow, Segmented, Toggle } from '../components/Controls';
import { Sheet } from '../components/Sheet';
import { downloadJSON, readFileAsText, validateBackup } from '../lib/backup';
import { useToast } from '../components/Toast';
import { formatHeight, formatWeight, fromLb, toLb, weightUnit, bmi } from '../engine/units';
import { formatShort, todayKey } from '../engine/dates';
import { phaseName, phaseForWeek, weekNumber } from '../engine/schedule';
import { PHASES } from '../data/program';
import type { Profile as ProfileT } from '../types';

type Editing = null | 'name' | 'height' | 'weights' | 'startDate' | 'rest' | 'goals';

export function Profile() {
  const store = useStore();
  const p = store.profile;
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<Editing>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const units = p.units;
  const week = weekNumber(p.startDate, todayKey());
  const latest = [...store.weights].sort((a, b) => (a.date < b.date ? 1 : -1))[0];

  const open = (e: Editing) => {
    const ft = Math.floor(p.heightIn / 12);
    setDraft({
      name: p.name,
      ft: String(ft), in: String(Math.round(p.heightIn - ft * 12)), cm: String(Math.round(p.heightIn * 2.54)),
      start: fromLb(p.startWeightLb, units).toFixed(1), goal: fromLb(p.goalWeightLb, units).toFixed(1),
      startDate: p.startDate, roundRest: String(p.roundRest), switchRest: String(p.switchRest),
      steps: String(p.goals.steps), water: String(p.goals.water), protein: String(p.goals.protein), sleep: String(p.goals.sleep), weeklyMinutes: String(p.goals.weeklyMinutes),
    });
    setEditing(e);
  };
  const d = (k: string) => draft[k] ?? '';
  const setD = (k: string, v: string) => setDraft((x) => ({ ...x, [k]: v }));

  const save = () => {
    const patch: Partial<ProfileT> = {};
    if (editing === 'name') patch.name = d('name').trim();
    if (editing === 'height') patch.heightIn = units === 'metric' ? Number(d('cm')) / 2.54 : Number(d('ft')) * 12 + Number(d('in'));
    if (editing === 'weights') { patch.startWeightLb = toLb(Number(d('start')), units); patch.goalWeightLb = toLb(Number(d('goal')), units); }
    if (editing === 'startDate') patch.startDate = d('startDate');
    if (editing === 'rest') { patch.roundRest = Math.max(15, Number(d('roundRest')) || 60); patch.switchRest = Math.max(0, Number(d('switchRest')) || 0); }
    if (editing === 'goals') store.updateGoals({ steps: Number(d('steps')) || 8000, water: Number(d('water')) || 8, protein: Number(d('protein')) || 150, sleep: Number(d('sleep')) || 7.5, weeklyMinutes: Number(d('weeklyMinutes')) || 270 });
    store.updateProfile(patch);
    setEditing(null);
    toast('Saved');
  };

  const exportBackup = () => {
    downloadJSON(`basecamp-backup-${todayKey()}.json`, store.exportData());
    toast('Backup downloaded');
  };
  const importBackup = async (file: File) => {
    try {
      const data = validateBackup(JSON.parse(await readFileAsText(file)));
      if (!confirm(`Replace all current data with this backup (${data.sessions.length} workouts)?`)) return;
      store.importData(data);
      toast('Backup restored');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not read that file');
    }
  };

  const num = (id: string, label: string, key: string, unit?: string, step?: string) => (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="input-row"><input id={id} className="input" inputMode="decimal" step={step} value={d(key)} onChange={(e) => setD(key, e.target.value)} />{unit && <span className="unit">{unit}</span>}</div>
    </div>
  );

  return (
    <div className="page">
      <h1 className="page-title">Profile</h1>
      <p className="page-sub">Week {week} · {phaseName(phaseForWeek(week))} phase</p>

      <div className="card">
        <div className="grid3">
          <div className="stat-tile"><div className="v">{latest ? formatWeight(latest.lb, units, 0) : '–'}</div><div className="l">Current</div></div>
          <div className="stat-tile"><div className="v">{formatWeight(p.goalWeightLb, units, 0)}</div><div className="l">Goal</div></div>
          <div className="stat-tile"><div className="v">{latest ? bmi(latest.lb, p.heightIn).toFixed(1) : '–'}</div><div className="l">BMI</div></div>
        </div>
      </div>

      <div className="section-title">About you</div>
      <div className="card">
        <ListRow label="Name" value={p.name || 'Not set'} onClick={() => open('name')} />
        <ListRow label="Height" value={formatHeight(p.heightIn, units)} onClick={() => open('height')} />
        <ListRow label="Start / goal weight" value={`${formatWeight(p.startWeightLb, units, 0)} → ${formatWeight(p.goalWeightLb, units, 0)}`} onClick={() => open('weights')} />
        <ListRow label="Program start" value={formatShort(p.startDate)} onClick={() => open('startDate')} />
        <ListRow label="Units"><Segmented value={units} onChange={(v) => store.updateProfile({ units: v })} options={[{ value: 'imperial', label: 'lb' }, { value: 'metric', label: 'kg' }]} /></ListRow>
      </div>

      <div className="section-title">Training</div>
      <div className="card">
        <ListRow label="Default location"><Segmented value={p.defaultLocation} onChange={(v) => store.updateProfile({ defaultLocation: v })} options={[{ value: 'gym', label: 'Gym' }, { value: 'home', label: 'Home' }]} /></ListRow>
        <ListRow label="Rest between rounds / moves" value={`${p.roundRest} s / ${p.switchRest} s`} onClick={() => open('rest')} />
        <ListRow label="Sound"><Toggle on={p.sound} onChange={(v) => store.updateProfile({ sound: v })} label="Sound" /></ListRow>
        <ListRow label="Vibration"><Toggle on={p.vibration} onChange={(v) => store.updateProfile({ vibration: v })} label="Vibration" /></ListRow>
        <ListRow label="Daily & weekly goals" value="Edit" onClick={() => open('goals')} />
      </div>

      <div className="section-title">Phases</div>
      <div className="card">
        {Object.values(PHASES).map((ph) => (
          <div key={ph.id} className="list-row">
            <div>
              <div className="bold small">{ph.name}</div>
              <div className="small muted">{ph.description}</div>
              <div className="tiny faint">{ph.rounds} rounds · {ph.reps[0]}–{ph.reps[1]} reps · {ph.seconds[0]}–{ph.seconds[1]} s holds · {ph.roundRest} s rest</div>
            </div>
          </div>
        ))}
        <div className="small muted mt8">Every 5th week is a deload: one round fewer, longer rests.</div>
      </div>

      <div className="section-title">Data</div>
      <div className="card stack">
        <button className="btn block" onClick={exportBackup}>Export backup (JSON)</button>
        <button className="btn block" onClick={() => fileRef.current?.click()}>Import backup</button>
        <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) void importBackup(f); e.target.value = ''; }} />
        <div className="tiny faint">Photos are not included in the backup; they stay on this device only.</div>
        <button className="btn danger block" onClick={() => { if (confirm('Erase everything? This cannot be undone.') && confirm('Really erase all workouts, weights and settings?')) { store.resetAll(); } }}>Erase all data</button>
      </div>
      <div className="center tiny faint mt16">Base Camp · your data never leaves this device</div>

      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={
        editing === 'name' ? 'Name' : editing === 'height' ? 'Height' : editing === 'weights' ? 'Weights' : editing === 'startDate' ? 'Program start' : editing === 'rest' ? 'Rest times' : 'Goals'
      }>
        <div className="stack">
          {editing === 'name' && <div className="field"><label htmlFor="pf-name">Name</label><input id="pf-name" className="input" value={d('name')} onChange={(e) => setD('name', e.target.value)} /></div>}
          {editing === 'height' && (units === 'metric' ? num('pf-cm', 'Height', 'cm', 'cm') : (
            <div className="grid2">{num('pf-ft', 'Feet', 'ft', 'ft')}{num('pf-in', 'Inches', 'in', 'in')}</div>
          ))}
          {editing === 'weights' && <div className="grid2">{num('pf-sw', 'Start weight', 'start', weightUnit(units))}{num('pf-gw', 'Goal weight', 'goal', weightUnit(units))}</div>}
          {editing === 'startDate' && (
            <div className="field"><label htmlFor="pf-sd">Week 1 starts on the Monday of</label><input id="pf-sd" type="date" className="input" value={d('startDate')} onChange={(e) => setD('startDate', e.target.value)} /></div>
          )}
          {editing === 'rest' && (
            <>
              <div className="grid2">{num('pf-rr', 'Between rounds', 'roundRest', 's')}{num('pf-sr', 'Between moves', 'switchRest', 's')}</div>
              <div className="tiny faint">Phases and deloads still add their own adjustments on top.</div>
            </>
          )}
          {editing === 'goals' && (
            <>
              <div className="grid2">{num('pf-st', 'Steps per day', 'steps')}{num('pf-wa', 'Water (cups)', 'water')}</div>
              <div className="grid2">{num('pf-pr', 'Protein (g)', 'protein')}{num('pf-sl', 'Sleep (h)', 'sleep', undefined, '0.5')}</div>
              {num('pf-wm', 'Training minutes per week', 'weeklyMinutes', 'min')}
            </>
          )}
          <button className="btn primary block xl" onClick={save}>Save</button>
        </div>
      </Sheet>
    </div>
  );
}
