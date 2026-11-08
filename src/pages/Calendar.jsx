import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { today } from '../lib/data';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const iso = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

export default function Calendar({ campaign, go }) {
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const { y, m } = cursor;

  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const lead = (new Date(y, m, 1).getDay() + 6) % 7; // Monday-first offset
  const cells = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const byDate = {};
  for (const r of campaign.reels) if (r.date) (byDate[r.date] ??= []).push(r);

  const shift = (dir) => setCursor(({ y, m }) => {
    const d = new Date(y, m + dir, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  const scheduled = campaign.reels.filter((r) => r.date).sort((a, b) => a.date.localeCompare(b.date));
  const unscheduled = campaign.reels.filter((r) => !r.date);
  const t = today();

  return (
    <>
      <h3>Publishing calendar</h3>
      <p>Set dates in the Reels Planner to schedule content. This calendar tracks your plan; it does not auto-post to Instagram.</p>

      <div className="panel">
        <div className="calHead">
          <button className="iconBtn" onClick={() => shift(-1)} aria-label="Previous month"><ChevronLeft /></button>
          <strong>{new Date(y, m, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</strong>
          <button className="iconBtn" onClick={() => shift(1)} aria-label="Next month"><ChevronRight /></button>
          <button className="secondary small" onClick={() => setCursor({ y: now.getFullYear(), m: now.getMonth() })}>Today</button>
        </div>
        <div className="calGrid">
          {WEEKDAYS.map((d) => <div key={d} className="calDow">{d}</div>)}
          {cells.map((d, i) => {
            if (!d) return <div key={`x${i}`} className="calCell blank" />;
            const key = iso(y, m, d);
            return (
              <div key={key} className={key === t ? 'calCell today' : 'calCell'}>
                <span className="calDay">{d}</span>
                {(byDate[key] ?? []).map((r) => (
                  <button key={r.id} className={`calItem s-${r.status}`} title={`${r.title} · ${r.status}`} onClick={() => go('Reels Planner')}>
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
          <h3>Scheduled ({scheduled.length})</h3>
          <div className="calendarList">
            {scheduled.map((r) => (
              <div className={r.date < t && r.status !== 'Published' ? 'calendarRow overdue' : 'calendarRow'} key={r.id}>
                <strong>{r.date}</strong>
                <span>{r.title}</span>
                <span className={`status s-${r.status}`}>{r.status}</span>
              </div>
            ))}
            {!scheduled.length && <p>No dates scheduled yet.</p>}
          </div>
        </div>
        <div className="panel">
          <h3>Unscheduled ({unscheduled.length})</h3>
          <div className="calendarList">
            {unscheduled.map((r) => (
              <div className="calendarRow" key={r.id}>
                <span>{r.title}</span>
                <span className={`status s-${r.status}`}>{r.status}</span>
              </div>
            ))}
          </div>
          <h3 className="mt">Recommended cadence</h3>
          <p>Monday / Wednesday / Friday: Reels. Tuesday / Thursday / Weekend: Stories as needed. Review results every four weeks.</p>
        </div>
      </div>
    </>
  );
}
