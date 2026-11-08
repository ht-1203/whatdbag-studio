import { useState } from 'react';
import { Plus, Trash2, RefreshCw } from 'lucide-react';
import { duplicateCampaign, makeCampaign } from '../lib/data';
import { useI18n } from '../lib/i18n';

export default function Campaigns({ data, setData, go }) {
  const { t } = useI18n();
  const [newName, setNewName] = useState('');

  function add(e) {
    e.preventDefault();
    const c = makeCampaign(newName.trim() || t('camp.defaultName', { n: data.campaigns.length + 1 }));
    setData((d) => ({ ...d, campaigns: [...d.campaigns, c], active: c.id }));
    setNewName('');
    go('Shot List');
  }

  const rename = (id, name) =>
    setData((d) => ({ ...d, campaigns: d.campaigns.map((c) => (c.id === id ? { ...c, name } : c)) }));

  function remove(c) {
    if (!confirm(t('camp.deleteConfirm', { name: c.name }))) return;
    setData((d) => {
      const campaigns = d.campaigns.filter((x) => x.id !== c.id);
      return { ...d, campaigns, active: d.active === c.id ? campaigns[0].id : d.active };
    });
  }

  return (
    <>
      <h3>{t('camp.title')}</h3>
      <p>{t('camp.subtitle')}</p>
      <form className="panel" onSubmit={add}>
        <label htmlFor="new-campaign">{t('camp.newName')}</label>
        <div className="addRow">
          <input id="new-campaign" placeholder={t('camp.placeholder')} value={newName} onChange={(e) => setNewName(e.target.value)} />
          <button className="primary compact" type="submit"><Plus size={16} /> {t('camp.create')}</button>
        </div>
      </form>

      <div className="campaignGrid">
        {data.campaigns.map((c) => {
          const done = c.shots.filter((s) => s.done).length;
          const isActive = c.id === data.active;
          return (
            <div className={isActive ? 'campaignCard active' : 'campaignCard'} key={c.id}>
              <small>{c.created}{isActive && ` · ${t('camp.active')}`}</small>
              <input className="campaignName" value={c.name} onChange={(e) => rename(c.id, e.target.value)} aria-label={t('camp.nameLabel')} />
              <p>
                {t('camp.stats', {
                  done,
                  total: c.shots.length,
                  reels: c.reels.length,
                  published: c.reels.filter((r) => r.status === 'Published').length,
                })}
              </p>
              <div className="actions">
                <button className="secondary small" onClick={() => { setData((d) => ({ ...d, active: c.id })); go('Dashboard'); }}>{t('camp.open')}</button>
                <button className="secondary small" onClick={() => { const copy = duplicateCampaign(c); setData((d) => ({ ...d, campaigns: [...d.campaigns, copy], active: copy.id })); }}>
                  <RefreshCw size={14} /> {t('camp.duplicate')}
                </button>
                {data.campaigns.length > 1 && (
                  <button className="secondary small danger" onClick={() => remove(c)} aria-label={t('camp.delete', { name: c.name })}><Trash2 size={14} /></button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="fine mt">
        {t('camp.backupMoved')}{' '}
        <button className="link" onClick={() => go('Settings')}>{t('nav.Settings')}</button>
      </p>
    </>
  );
}
