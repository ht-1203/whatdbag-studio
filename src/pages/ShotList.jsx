import { useState } from 'react';
import { Plus, Trash2, Search } from 'lucide-react';
import { DEFAULT_GROUPS, makeShot, pad2 } from '../lib/data';
import { useI18n, groupLabel } from '../lib/i18n';
import ProgressBar from '../components/ProgressBar';

export default function ShotList({ campaign, update }) {
  const { t } = useI18n();
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
    if (!confirm(t('shots.deleteConfirm', { n: pad2(number), title: s.title }))) return;
    update((c) => ({ ...c, shots: c.shots.filter((x) => x.id !== s.id) }));
  }

  const filterLabel = (x) => (x === 'All' ? t('common.all') : x === 'Incomplete' ? t('shots.incomplete') : groupLabel(t, x));

  return (
    <>
      <div className="sectionHead">
        <div>
          <h3>{t('shots.title', { n: total })}</h3>
          <p>{t('shots.subtitle')}</p>
        </div>
        <span className="count">{t('shots.captured', { done, total })}</span>
      </div>
      <ProgressBar value={done} max={total} />

      <div className="toolbar">
        <div className="filters">
          {['All', ...groups, 'Incomplete'].map((x) => (
            <button key={x} className={filter === x ? 'chip selected' : 'chip'} onClick={() => setFilter(x)}>
              {filterLabel(x)}
            </button>
          ))}
        </div>
        <div className="searchBox">
          <Search size={15} />
          <input placeholder={t('shots.search')} value={query} onChange={(e) => setQuery(e.target.value)} aria-label={t('shots.search')} />
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
                <button className="iconBtn" title={t('shots.delete')} aria-label={t('shots.delete')} onClick={() => removeShot(s, i + 1)}>
                  <Trash2 size={14} />
                </button>
              </div>
              <small>{groupLabel(t, s.group)}</small>
              <input
                placeholder={t('shots.notes')}
                value={s.notes}
                onChange={(e) => editShot(s.id, { notes: e.target.value })}
                aria-label={t('shots.notes')}
              />
            </div>
          ) : null,
        )}
      </div>
      {!campaign.shots.some(visible) && <p className="empty">{t('shots.noMatch')}</p>}

      <form className="panel addShot" onSubmit={addShot}>
        <h3>{t('shots.addTitle')}</h3>
        <div className="addRow">
          <select value={newGroup} onChange={(e) => setNewGroup(e.target.value)} aria-label={t('shots.group')}>
            {groups.map((g) => <option key={g} value={g}>{groupLabel(t, g)}</option>)}
          </select>
          <input placeholder={t('shots.describe')} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} aria-label={t('shots.describe')} />
          <button className="primary compact" type="submit"><Plus size={16} /> {t('common.add')}</button>
        </div>
      </form>
    </>
  );
}
