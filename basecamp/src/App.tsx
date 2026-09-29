import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useStore } from './store/useStore';
import { TabBar } from './components/TabBar';
import { ToastProvider } from './components/Toast';
import { Today } from './screens/Today';
import { Plan } from './screens/Plan';
import { Exercises } from './screens/Exercises';
import { ExerciseDetail } from './screens/ExerciseDetail';
import { Progress } from './screens/Progress';
import { Profile } from './screens/Profile';
import { Player } from './screens/Player';
import { Onboarding } from './screens/Onboarding';
import { SessionDetail } from './screens/SessionDetail';

export default function App() {
  const hydrated = useStore((s) => s.hydrated);
  const onboarded = useStore((s) => s.onboarded);
  const location = useLocation();

  if (!hydrated) {
    return (
      <div className="shell">
        <div className="page center" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="muted pulse">Loading Base Camp…</div>
        </div>
      </div>
    );
  }
  if (!onboarded) return <Onboarding />;

  const inPlayer = location.pathname.startsWith('/workout');

  return (
    <ToastProvider>
      <div className="shell">
        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/plan" element={<Plan />} />
          <Route path="/exercises" element={<Exercises />} />
          <Route path="/exercises/:id" element={<ExerciseDetail />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/progress/session/:id" element={<SessionDetail />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/workout" element={<Player />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        {!inPlayer && <TabBar />}
      </div>
    </ToastProvider>
  );
}
