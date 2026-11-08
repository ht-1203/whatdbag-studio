import { useState } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { REEL_STATUSES, makeReel, pad2, parseShotNumbers } from '../lib/data';
import { useI18n, statusLabel } from '../lib/i18n';

export default function ReelsPlanner({ campaign, update }) {
  const { t } = useI18n();
  const [filter, setFilter] = useState('All');
  const shotCount = campaign.shots.length;

  const editReel = (id, patch) =>
    update((c) => ({ ...c, reels: c.reels.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));

  const move = (index, dir) =>
    update((c) => {
      const reels = [...c.reels];
      const j = index + dir;
      if (j < 0 || j >= reels.length) return c;
      [reels[index], reels[j]] = [reels[j], reels[index]];
      return { ...c, reels };
    });

  return (
    <>
      <div className="sectionHead">
        <div>
          <h3>{t('reels.title')}</h3>
          <p>{t('reels.subtitle', { n: campaign.reels.length })}</p>
        </div>
        <button className="primary compact" onClick={() => update((c) => ({ ...c, reels: [...c.reels, makeReel(t('reels.newReel'))] }))}>
          <Plus size={16} /> {t('reels.add')}
        </button>
      </div>

      <div className="filters">
        {['All', ...REEL_STATUSES].map((s) => (
          <button key={s} className={filter === s ? 'chip selected' : 'chip'} onClick={() => setFilter(s)}>
            {s === 'All' ? t('common.all') : statusLabel(t, s)}{' '}
            <span className="chipCount">{s === 'All' ? campaign.reels.length : campaign.reels.filter((r) => r.status === s).length}</span>
          </button>
        ))}
      </div>

      <div className="reelsGrid">
        {campaign.reels.map((r, i) => {
          if (filter !== 'All' && r.status !== filter) return null;
          const numbers = parseShotNumbers(r.shots);
          return (
            <div className="reel" key={r.id}>
              <div className="reelTop">
                <span>{t('reels.reel')} {pad2(i + 1)}</span>
                <div className="reelTools">
                  <button className="iconBtn" title={t('reels.moveUp')} aria-label={t('reels.moveUp')} disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={15} /></button>
                  <button className="iconBtn" title={t('reels.moveDown')} aria-label={t('reels.moveDown')} disabled={i === campaign.reels.length - 1} onClick={() => move(i, 1)}><ArrowDown size={15} /></button>
                  <button
                    className="iconBtn"
                    title={t('reels.delete')}
                    aria-label={t('reels.delete')}
                    onClick={() => confirm(t('reels.deleteConfirm', { title: r.title })) && update((c) => ({ ...c, reels: c.reels.filter((x) => x.id !== r.id) }))}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <input className="reelTitle" value={r.title} onChange={(e) => editReel(r.id, { title: e.target.value })} aria-label={t('reels.titleLabel')} />

              <label htmlFor={`shots-${r.id}`}>{t('reels.shotNumbers')}</label>
              <input id={`shots-${r.id}`} value={r.shots} placeholder={t('reels.shotPlaceholder')} onChange={(e) => editReel(r.id, { shots: e.target.value })} />
              {numbers.length > 0 && (
                <ul className="shotRefs">
                  {numbers.map((n) => {
                    const shot = campaign.shots[n - 1];
                    return (
                      <li key={n} className={!shot ? 'missing' : shot.done ? 'captured' : ''} title={shot ? shot.title : t('reels.shotMissing', { n })}>
                        {pad2(n)} {shot ? shot.title : '—'}
                      </li>
                    );
                  })}
                </ul>
              )}
              {numbers.some((n) => n > shotCount || n < 1) && <p className="warn">{t('reels.outOfRange', { max: shotCount })}</p>}

              <div className="split">
                <div>
                  <label htmlFor={`status-${r.id}`}>{t('reels.status')}</label>
                  <select id={`status-${r.id}`} value={r.status} onChange={(e) => editReel(r.id, { status: e.target.value })}>
                    {REEL_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(t, s)}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor={`date-${r.id}`}>{t('reels.publishDate')}</label>
                  <input id={`date-${r.id}`} type="date" value={r.date} onChange={(e) => editReel(r.id, { date: e.target.value })} />
                </div>
              </div>

              <label htmlFor={`cap-${r.id}`}>{t('reels.caption')}</label>
              <textarea id={`cap-${r.id}`} rows={3} value={r.caption} onChange={(e) => editReel(r.id, { caption: e.target.value })} placeholder={t('reels.captionPlaceholder')} />
              <div className="charCount">{r.caption.length} / 2,200</div>
            </div>
          );
        })}
      </div>
      {campaign.reels.length === 0 && <p className="empty">{t('reels.empty')}</p>}
    </>
  );
}
