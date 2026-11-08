import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { today } from '../lib/data';
import { useI18n, statusLabel } from '../lib/i18n';

const iso = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

export default function Calendar({ campaign, go, data }) {
  const { t, locale } = useI18n();
  const sundayFirst = data.settings.weekStart === 'sun';
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const { y, m } = cursor;

  // 2023-01-01 was a Sunday; step from there to get localized short weekday names.
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Date(2023, 0, 1 + i + (sundayFirst ? 0 : 1)).toLocaleDateString(locale, { weekday: 'short' }),
  );
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const firstDay = new Date(y, m, 1).getDay();
  const lead = sundayFirst ? firstDay : (firstDay + 6) % 7;
  const cells = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const byDate = {};
  for (const r of campaign.reels) if (r.date) (byDate[r.date] ??= []).push(r);

  const shift = (dir) => setCursor(({ y, m }) => {
    const d = new Date(y, m + dir, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  const scheduled = campaign.reels.filter((r) => r.date).sort((a, b) => a.date.localeCompare(b.date));
  const unscheduled = campaign.reels.filter((r) => !r.date);
  const todayIso = today();

  return (
    <>
      <h3>{t('cal.title')}</h3>
      <p>{t('cal.subtitle')}</p>

      <div className="panel">
        <div className="calHead">
          <button className="iconBtn" onClick={() => shift(-1)} aria-label={t('cal.prev')}><ChevronLeft /></button>
          <strong>{new Date(y, m, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' })}</strong>
          <button className="iconBtn" onClick={() => shift(1)} aria-label={t('cal.next')}><ChevronRight /></button>
          <button className="secondary small" onClick={() => setCursor({ y: now.getFullYear(), m: now.getMonth() })}>{t('cal.today')}</button>
        </div>
        <div className="calGrid">
          {weekdays.map((d) => <div key={d} className="calDow">{d}</div>)}
          {cells.map((d, i) => {
            if (!d) return <div key={`x${i}`} className="calCell blank" />;
            const key = iso(y, m, d);
            return (
              <div key={key} className={key === todayIso ? 'calCell today' : 'calCell'}>
                <span className="calDay">{d}</span>
                {(byDate[key] ?? []).map((r) => (
                  <button key={r.id} className={`calItem s-${r.status}`} title={`${r.title} · ${statusLabel(t, r.status)}`} onClick={() => go('Reels Planner')}>
                    {r.title}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <div className="twoCol">
        <div className="panel">
          <h3>{t('cal.scheduled', { n: scheduled.length })}</h3>
          <div className="calendarList">
            {scheduled.map((r) => {
              const overdue = r.date < todayIso && r.status !== 'Published';
              return (
                <div className={overdue ? 'calendarRow overdue' : 'calendarRow'} key={r.id}>
                  <strong>{r.date}{overdue && ` · ${t('cal.overdue')}`}</strong>
                  <span>{r.title}</span>
                  <span className={`status s-${r.status}`}>{statusLabel(t, r.status)}</span>
                </div>
              );
            })}
            {!scheduled.length && <p>{t('cal.noDates')}</p>}
          </div>
        </div>
        <div className="panel">
          <h3>{t('cal.unscheduled', { n: unscheduled.length })}</h3>
          <div className="calendarList">
            {unscheduled.map((r) => (
              <div className="calendarRow" key={r.id}>
                <span>{r.title}</span>
                <span className={`status s-${r.status}`}>{statusLabel(t, r.status)}</span>
              </div>
            ))}
          </div>
          <h3 className="mt">{t('cal.cadence')}</h3>
          <p>{t('cal.cadenceText')}</p>
        </div>
      </div>
    </>
  );
}
