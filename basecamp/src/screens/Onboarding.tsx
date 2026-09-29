import { useState } from 'react';
import { useStore } from '../store/useStore';
import type { Location } from '../types';
import { Segmented } from '../components/Controls';
import { todayKey } from '../engine/dates';

export function Onboarding() {
  const complete = useStore((s) => s.completeOnboarding);
  const [name, setName] = useState('');
  const [weight, setWeight] = useState('235');
  const [goal, setGoal] = useState('190');
  const [heightFt, setHeightFt] = useState('5');
  const [heightIn, setHeightIn] = useState('9');
  const [location, setLocation] = useState<Location>('gym');
  const [startDate, setStartDate] = useState(todayKey());

  const submit = () => {
    const w = Number(weight) || 235;
    complete({
      name: name.trim(),
      startWeightLb: w,
      goalWeightLb: Number(goal) || w - 30,
      heightIn: (Number(heightFt) || 5) * 12 + (Number(heightIn) || 0),
      defaultLocation: location,
      startDate,
    });
  };

  return (
    <div className="shell">
      <div className="page" style={{ paddingBottom: 40 }}>
        <div style={{ fontSize: 44, marginTop: 24 }}>⛺</div>
        <h1 className="page-title">Welcome to Base Camp</h1>
        <p className="page-sub">A few details so the program fits you. You can change everything later in Profile.</p>
        <div className="card stack">
          <div className="field">
            <label htmlFor="ob-name">Your name</label>
            <input id="ob-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional" autoComplete="given-name" />
          </div>
          <div className="grid2">
            <div className="field">
              <label htmlFor="ob-w">Current weight (lb)</label>
              <input id="ob-w" className="input" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="ob-g">Goal weight (lb)</label>
              <input id="ob-g" className="input" inputMode="decimal" value={goal} onChange={(e) => setGoal(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>Height</label>
            <div className="grid2">
              <div className="input-row"><input className="input" inputMode="numeric" value={heightFt} onChange={(e) => setHeightFt(e.target.value)} aria-label="Feet" /><span className="unit">ft</span></div>
              <div className="input-row"><input className="input" inputMode="numeric" value={heightIn} onChange={(e) => setHeightIn(e.target.value)} aria-label="Inches" /><span className="unit">in</span></div>
            </div>
          </div>
          <div className="field">
            <label>Where do you usually train?</label>
            <Segmented block value={location} onChange={setLocation} options={[{ value: 'gym', label: 'Gym' }, { value: 'home', label: 'Home' }]} />
          </div>
          <div className="field">
            <label htmlFor="ob-d">Program start (week 1)</label>
            <input id="ob-d" className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
        </div>
        <div className="card mt12">
          <div className="bold">Your plan</div>
          <p className="small muted mt8">
            6 days a week, 45 to 60 minutes: Upper A, Lower A, Cardio + Core, Upper B, Lower B, HIIT circuit, then rest.
            Every move sits on a progression ladder that moves with you. Low impact only: no running, no jumping.
          </p>
        </div>
        <button className="btn primary block xl mt16" onClick={submit}>Set up camp</button>
      </div>
    </div>
  );
}
