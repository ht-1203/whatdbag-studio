import { useRef, useState } from 'react';
import { Plus, Trash2, RefreshCw, Download, Upload } from 'lucide-react';
import { duplicateCampaign, makeCampaign, normalizeStudio, today, uid } from '../lib/data';

export function exportBackup(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `whatdbag-studio-backup-${today()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export default function Campaigns({ data, setData, go }) {
  const [newName, setNewName] = useState('');
  const fileRef = useRef(null);

  function add(e) {
    e.preventDefault();
    const c = makeCampaign(newName.trim() || `Campaign ${data.campaigns.length + 1}`);
    setData((d) => ({ ...d, campaigns: [...d.campaigns, c], active: c.id }));
    setNewName('');
    go('Shot List');
  }

  const rename = (id, name) =>
    setData((d) => ({ ...d, campaigns: d.campaigns.map((c) => (c.id === id ? { ...c, name } : c)) }));

  function remove(c) {
    if (!confirm(`Permanently delete “${c.name}”? This cannot be undone (unless you have a backup).`)) return;
    setData((d) => {
      const campaigns = d.campaigns.filter((x) => x.id !== c.id);
      return { ...d, campaigns, active: d.active === c.id ? campaigns[0].id : d.active };
    });
  }

  async function importFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!Array.isArray(parsed?.campaigns)) throw new Error('Not a whatdbag studio backup.');
      const restored = normalizeStudio(parsed);
      const mode = confirm(
        `Backup contains ${restored.campaigns.length} campaign(s).\n\nOK = add them alongside your current campaigns\nCancel = choose whether to replace everything`,
      )
        ? 'merge'
        : confirm('Replace ALL current campaigns with the backup?') ? 'replace' : null;
      if (!mode) return;
      setData((d) => {
        if (mode === 'replace') return restored;
        const ids = new Set(d.campaigns.map((c) => c.id));
        const extra = restored.campaigns.map((c) => (ids.has(c.id) ? { ...c, id: uid(), name: `${c.name} (restored)` } : c));
        return { ...d, campaigns: [...d.campaigns, ...extra] };
      });
    } catch (err) {
      alert(`Import failed: ${err.message}`);
    }
  }

  return (
    <>
      <h3>Reusable campaigns</h3>
      <p>Create a fresh shot checklist and Reel plan for every shoot day, collection or location.</p>
      <form className="panel" onSubmit={add}>
        <label htmlFor="new-campaign">NEW CAMPAIGN NAME</label>
        <div className="addRow">
          <input id="new-campaign" placeholder="e.g. Ari — December / Serie 2" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <button className="primary compact" type="submit"><Plus size={16} /> Create</button>
        </div>
      </form>

      <div className="campaignGrid">
        {data.campaigns.map((c) => {
          const done = c.shots.filter((s) => s.done).length;
          return (
            <div className={c.id === data.active ? 'campaignCard active' : 'campaignCard'} key={c.id}>
              <small>{c.created}{c.id === data.active && ' · ACTIVE'}</small>
              <input className="campaignName" value={c.name} onChange={(e) => rename(c.id, e.target.value)} aria-label="Campaign name" />
              <p>{done}/{c.shots.length} shots · {c.reels.length} Reels · {c.reels.filter((r) => r.status === 'Published').length} published</p>
              <div className="actions">
                <button className="secondary small" onClick={() => { setData((d) => ({ ...d, active: c.id })); go('Dashboard'); }}>Open</button>
                <button className="secondary small" onClick={() => { const copy = duplicateCampaign(c); setData((d) => ({ ...d, campaigns: [...d.campaigns, copy], active: copy.id })); }}>
                  <RefreshCw size={14} /> Duplicate
                </button>
                {data.campaigns.length > 1 && (
                  <button className="secondary small danger" onClick={() => remove(c)} aria-label={`Delete ${c.name}`}><Trash2 size={14} /></button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="panel">
        <h3>Backup &amp; restore</h3>
        <p>Backups contain private campaign data — store them somewhere secure.</p>
        <div className="actions">
          <button className="secondary" onClick={() => exportBackup(data)}><Download size={15} /> Download backup</button>
          <button className="secondary" onClick={() => fileRef.current?.click()}><Upload size={15} /> Restore from file</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importFile} />
        </div>
      </div>
    </>
  );
}
