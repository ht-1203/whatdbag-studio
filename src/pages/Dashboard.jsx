import { REEL_STATUSES, today } from '../lib/data';
import ProgressBar from '../components/ProgressBar';

export default function Dashboard({ campaign, campaignCount, go }) {
  const total = campaign.shots.length;
  const done = campaign.shots.filter((s) => s.done).length;
  const published = campaign.reels.filter((r) => r.status === 'Published').length;
  const groups = [...new Set(campaign.shots.map((s) => s.group))];
  const upcoming = campaign.reels
    .filter((r) => r.date && r.date >= today() && r.status !== 'Published')
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);

  return (
    <>
      <div className="hero">
        <div className="eyebrow">YOUR CREATIVE WORKSPACE</div>
        <h1>
          Make more.
          <br />
          <em>Stay consistent.</em>
        </h1>
        <p>One shoot day. Multiple stories. A repeatable content system for whatdbag.</p>
        <button className="lightButton" onClick={() => go('Shot List')}>Continue production →</button>
      </div>

      <div className="metrics">
        <Metric value={campaignCount} label="Campaigns" />
        <Metric value={`${done}/${total}`} label="Shots captured" />
        <Metric value={campaign.reels.length} label="Planned Reels" />
        <Metric value={published} label="Published" />
      </div>

      <div className="twoCol">
        <div className="panel">
          <h3>Production progress</h3>
          <ProgressBar value={done} max={total} />
          <p>{done} of {total} shots complete · {total ? Math.round((done / total) * 100) : 0}%</p>
          <div className="groupBars">
            {groups.map((g) => {
              const shots = campaign.shots.filter((s) => s.group === g);
              const d = shots.filter((s) => s.done).length;
              return (
                <div key={g} className="groupBar">
                  <div className="groupBarHead"><span>{g}</span><span>{d}/{shots.length}</span></div>
                  <ProgressBar value={d} max={shots.length} thin />
                </div>
              );
            })}
          </div>
        </div>

        <div className="panel">
          <h3>Reels pipeline</h3>
          <div className="pipeline">
            {REEL_STATUSES.map((s) => (
              <div key={s} className="pipeStage">
                <strong>{campaign.reels.filter((r) => r.status === s).length}</strong>
                <span>{s}</span>
              </div>
            ))}
          </div>
          <h3 className="mt">Up next</h3>
          {upcoming.length ? (
            <div className="calendarList">
              {upcoming.map((r) => (
                <div className="calendarRow" key={r.id}>
                  <strong>{r.date}</strong>
                  <span>{r.title}</span>
                  <span className={`status s-${r.status}`}>{r.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <p>Nothing scheduled. Set publish dates in the Reels Planner.</p>
          )}
          <button className="secondary" onClick={() => go('Reels Planner')}>Open Reels Planner →</button>
        </div>
      </div>
    </>
  );
}

function Metric({ value, label }) {
  return (
    <div className="metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
