const LABELS = {
  loading: 'Loading…',
  saving: 'Saving…',
  synced: 'Synced',
  error: 'Not saved',
  conflict: 'Conflict',
};

export default function SyncBadge({ sync }) {
  const { status, message, retry, keepMine, takeTheirs } = sync;
  return (
    <div className="syncWrap">
      <span className={`sync ${status}`} title={message || LABELS[status]} role="status">
        <span className="dot" />
        {LABELS[status]}
      </span>
      {status === 'error' && (
        <button className="secondary small" onClick={retry}>Retry</button>
      )}
      {status === 'conflict' && (
        <div className="conflict" role="alert">
          <p>{message} Which version do you want to keep?</p>
          <div className="actions">
            <button className="secondary small" onClick={takeTheirs}>Load other device</button>
            <button className="primary small" onClick={keepMine}>Keep this device</button>
          </div>
        </div>
      )}
    </div>
  );
}
