import { useEffect, useState } from 'react';
import { CircleCheck, CircleAlert, X } from 'lucide-react';

export default function Toast({ text, ok = true, duration = 6000 }) {
  const [shown, setShown] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShown(false), duration);
    return () => clearTimeout(t);
  }, [duration]);

  if (!shown) return null;
  return (
    <div className={ok ? 'toast' : 'toast bad'} role="status">
      {ok ? <CircleCheck size={18} /> : <CircleAlert size={18} />}
      <span>{text}</span>
      <button className="iconBtn" onClick={() => setShown(false)} aria-label="Dismiss"><X size={15} /></button>
    </div>
  );
}
