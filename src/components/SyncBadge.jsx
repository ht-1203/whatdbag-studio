import { useI18n } from '../lib/i18n';

export default function SyncBadge({ sync }) {
  const { t } = useI18n();
  const { status, message, retry, keepMine, takeTheirs } = sync;
  const label = t(`sync.${status}`);
  return (
    <div className="syncWrap">
      <span className={`sync ${status}`} title={message || label} role="status">
        <span className="dot" />
        {label}
      </span>
      {status === 'error' && (
        <button className="secondary small" onClick={retry}>{t('sync.retry')}</button>
      )}
      {status === 'conflict' && (
        <div className="conflict" role="alert">
          <p>{t('sync.conflictText')}</p>
          <div className="actions">
            <button className="secondary small" onClick={takeTheirs}>{t('sync.loadOther')}</button>
            <button className="primary small" onClick={keepMine}>{t('sync.keepMine')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
