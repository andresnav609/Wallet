/** Small WebAudio beeper. Call `unlockAudio()` from a user gesture first (iOS). */
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  return ctx;
}

export async function unlockAudio(): Promise<void> {
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') {
    try {
      await c.resume();
    } catch {
      /* ignore */
    }
  }
  // Play a silent buffer to satisfy iOS autoplay rules.
  const buf = c.createBuffer(1, 1, 22050);
  const src = c.createBufferSource();
  src.buffer = buf;
  src.connect(c.destination);
  src.start(0);
}

export function beep(freq = 880, durationMs = 120, volume = 0.3): void {
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') void c.resume();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + durationMs / 1000);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + durationMs / 1000);
}

export function countdownBeep(): void {
  beep(880, 120);
}
export function finalBeep(): void {
  beep(1320, 350, 0.4);
}
export function successChime(): void {
  beep(660, 120);
  setTimeout(() => beep(880, 120), 130);
  setTimeout(() => beep(1320, 250), 260);
}
