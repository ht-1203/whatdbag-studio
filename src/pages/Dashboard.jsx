import { REEL_STATUSES, today } from '../lib/data';
import { useI18n, groupLabel, statusLabel } from '../lib/i18n';
import ProgressBar from '../components/ProgressBar';

export default function Dashboard({ campaign, campaignCount, go }) {
  const { t } = useI18n();
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
        <div className="eyebrow">{t('dash.eyebrow')}</div>
        <h1>
          {t('dash.title1')}
          <br />
          <em>{t('dash.title2')}</em>
        </h1>
        <p>{t('dash.subtitle')}</p>
        <button className="lightButton" onClick={() => go('Shot List')}>{t('dash.continue')} →</button>
      </div>

      <div className="metrics">
        <Metric value={campaignCount} label={t('dash.campaigns')} />
        <Metric value={`${done}/${total}`} label={t('dash.shotsCaptured')} />
        <Metric value={campaign.reels.length} label={t('dash.plannedReels')} />
        <Metric value={published} label={t('dash.published')} />
      </div>

      <div className="twoCol">
        <div className="panel">
          <h3>{t('dash.progress')}</h3>
          <ProgressBar value={done} max={total} />
          <p>{t('dash.progressText', { done, total, pct: total ? Math.round((done / total) * 100) : 0 })}</p>
          <div className="groupBars">
            {groups.map((g) => {
              const shots = campaign.shots.filter((s) => s.group === g);
              const d = shots.filter((s) => s.done).length;
              return (
                <div key={g} className="groupBar">
                  <div className="groupBarHead"><span>{groupLabel(t, g)}</span><span>{d}/{shots.length}</span></div>
                  <ProgressBar value={d} max={shots.length} thin />
                </div>
              );
            })}
          </div>
        </div>

        <div className="panel">
          <h3>{t('dash.pipeline')}</h3>
          <div className="pipeline">
            {REEL_STATUSES.map((s) => (
              <div key={s} className="pipeStage">
                <strong>{campaign.reels.filter((r) => r.status === s).length}</strong>
                <span>{statusLabel(t, s)}</span>
              </div>
            ))}
          </div>
          <h3 className="mt">{t('dash.upNext')}</h3>
          {upcoming.length ? (
            <div className="calendarList">
              {upcoming.map((r) => (
                <div className="calendarRow" key={r.id}>
                  <strong>{r.date}</strong>
                  <span>{r.title}</span>
                  <span className={`status s-${r.status}`}>{statusLabel(t, r.status)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p>{t('dash.nothingScheduled')}</p>
          )}
          <button className="secondary" onClick={() => go('Reels Planner')}>{t('dash.openReels')} →</button>
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
