import type { AppData } from '../types';
import { defaultData } from '../store/useStore';

export function downloadJSON(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function validateBackup(raw: unknown): AppData {
  if (!raw || typeof raw !== 'object') throw new Error('Not a Base Camp backup file.');
  const obj = raw as Partial<AppData>;
  if (!obj.profile || !Array.isArray(obj.sessions)) throw new Error('Backup is missing profile or sessions.');
  const base = defaultData();
  return {
    ...base,
    ...obj,
    profile: { ...base.profile, ...obj.profile, goals: { ...base.profile.goals, ...(obj.profile.goals ?? {}) } },
    levels: { ...base.levels, ...(obj.levels ?? {}) },
    active: null,
    onboarded: true,
  };
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsText(file);
  });
}
