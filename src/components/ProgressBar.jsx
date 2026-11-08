export default function ProgressBar({ value, max, thin = false }) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div
      className={thin ? 'progress thin' : 'progress'}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div style={{ width: `${pct}%` }} />
    </div>
  );
}
