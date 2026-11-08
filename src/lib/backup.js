import { normalizeStudio, today, uid } from './data';

export function exportBackup(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `whatdbag-studio-backup-${today()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// Throws if the file isn't a studio backup.
export async function readBackup(file) {
  const parsed = JSON.parse(await file.text());
  if (!Array.isArray(parsed?.campaigns)) throw new Error('not-a-backup');
  return normalizeStudio(parsed);
}

// Settings stay as they are on this device; only campaigns come from the backup.
export function mergeBackup(current, restored, mode) {
  if (mode === 'replace') return { ...restored, settings: current.settings };
  const ids = new Set(current.campaigns.map((c) => c.id));
  const extra = restored.campaigns.map((c) => (ids.has(c.id) ? { ...c, id: uid(), name: `${c.name} (restored)` } : c));
  return { ...current, campaigns: [...current.campaigns, ...extra] };
}
