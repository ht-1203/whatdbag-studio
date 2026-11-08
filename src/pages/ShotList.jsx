import { useState } from 'react';
import { Plus, Trash2, Search } from 'lucide-react';
import { DEFAULT_GROUPS, makeShot, pad2 } from '../lib/data';
import ProgressBar from '../components/ProgressBar';

export default function ShotList({ campaign, update }) {
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const used = [...new Set(campaign.shots.map((s) => s.group))];
  const groups = used.length ? used : DEFAULT_GROUPS;
  const [newGroup, setNewGroup] = useState(groups[0]);

  const total = campaign.shots.length;
  const done = campaign.shots.filter((s) => s.done).length;
  const q = query.trim().toLowerCase();

  const editShot = (id, patch) =>
    update((c) => ({ ...c, shots: c.shots.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));

  const visible = (s) =>
    (filter === 'All' || filter === s.group || (filter === 'Incomplete' && !s.done)) &&
    (!q || s.title.toLowerCase().includes(q) || s.notes.toLowerCase().includes(q));

  function addShot(e) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    update((c) => ({ ...c, shots: [...c.shots, makeShot(newGroup, newTitle.trim())] }));
    setNewTitle('');
  }

  function removeShot(s, number) {
    if (!confirm(`Delete shot ${pad2(number)} “${s.title}”? Reels that reference shot numbers after it will shift.`)) return;
    update((c) => ({ ...c, shots: c.shots.filter((x) => x.id !== s.id) }));
  }

  return (
    <>
      <div className="sectionHead">
        <div>
          <h3>{total}-shot production checklist</h3>
          <p>8–12 seconds per shot · 9:16 · Shoot 2 takes where possible</p>
        </div>
        <span className="count">{done}/{total} captured</span>
      </div>
      <ProgressBar value={done} max={total} />

      <div className="toolbar">
        <div className="filters">
          {['All', ...groups, 'Incomplete'].map((x) => (
            <button key={x} className={filter === x ? 'chip selected' : 'chip'} onClick={() => setFilter(x)}>
              {x}
            </button>
          ))}
        </div>
        <div className="searchBox">
          <Search size={15} />
          <input placeholder="Search shots or notes" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search shots" />
        </div>
      </div>

      <div className="shotGrid">
        {campaign.shots.map((s, i) =>
          visible(s) ? (
            <div key={s.id} className={s.done ? 'shot done' : 'shot'}>
              <div className="shotHead">
                <label>
                  <input type="checkbox" checked={s.done} onChange={(e) => editShot(s.id, { done: e.target.checked })} />
                  <span className="shotNo">{pad2(i + 1)}</span>
                  <span>{s.title}</span>
                </label>
                <button className="iconBtn" title="Delete shot" aria-label={`Delete shot ${i + 1}`} onClick={() => removeShot(s, i + 1)}>
                  <Trash2 size={14} />
                </button>
              </div>
              <small>{s.group}</small>
              <input
                placeholder="Notes / location / file name"
                value={s.notes}
                onChange={(e) => editShot(s.id, { notes: e.target.value })}
                aria-label={`Notes for shot ${i + 1}`}
              />
            </div>
          ) : null,
        )}
      </div>
      {!campaign.shots.some(visible) && <p className="empty">No shots match this filter.</p>}

      <form className="panel addShot" onSubmit={addShot}>
        <h3>Add a shot</h3>
        <div className="addRow">
          <select value={newGroup} onChange={(e) => setNewGroup(e.target.value)} aria-label="Shot group">
            {groups.map((g) => <option key={g}>{g}</option>)}
          </select>
          <input placeholder="Describe the shot" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} aria-label="Shot description" />
          <button className="primary compact" type="submit"><Plus size={16} /> Add</button>
        </div>
      </form>
    </>
  );
}
