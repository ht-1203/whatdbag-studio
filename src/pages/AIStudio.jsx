import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { parseShotNumbers, pad2 } from '../lib/data';
import { useI18n } from '../lib/i18n';

const STYLES = ['Minimal Cinematic', 'Fashion Editorial', 'Soft Lifestyle', 'Product Detail', 'Street Documentary'];
const DURATIONS = ['10', '15', '20', '30'];

// The prompt stays in English whatever the UI language: AI editing tools follow it most reliably.
function buildPrompt({ style, duration, reel, shots }) {
  const focus = reel
    ? ` The Reel is titled "${reel.title}". Use these planned shots in a sensible order:\n${shots
        .map((s) => `- Shot ${pad2(s.n)}: ${s.title}`)
        .join('\n')}\n`
    : ' Automatically select strong shots and sequence them with intentional pacing.';
  const caption = reel?.caption ? `\nCaption / hook to match: ${reel.caption}` : '';
  return `Create a ${duration}-second ${style} fashion product film for whatdbag serie 1 using only the uploaded original footage.${focus} Highlight the canvas texture, red strap, silhouette, logo and practical capacity. Use restrained cuts, consistent warm-neutral color grading, natural lighting and licensed understated music. Preserve the exact real product shape, colors and branding. Avoid flashy effects, artificial products, heavy transitions and excessive text. Export vertical 9:16 at 1080x1920. End on a clean hero shot.${caption}`;
}

export default function AIStudio({ campaign }) {
  const { t } = useI18n();
  const [style, setStyle] = useState(STYLES[0]);
  const [duration, setDuration] = useState('15');
  const [reelId, setReelId] = useState('');
  const [copied, setCopied] = useState(false);

  const reel = campaign.reels.find((r) => r.id === reelId);
  const shots = reel
    ? parseShotNumbers(reel.shots)
        .map((n) => ({ n, title: campaign.shots[n - 1]?.title }))
        .filter((s) => s.title)
    : [];
  const prompt = buildPrompt({ style, duration, reel, shots });

  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      alert(t('ai.copyFailed'));
    }
  }

  return (
    <>
      <h3>{t('ai.title')}</h3>
      <p>{t('ai.subtitle')}</p>
      <div className="panel">
        <div className="split three">
          <div>
            <label htmlFor="ai-reel">{t('ai.reel')}</label>
            <select id="ai-reel" value={reelId} onChange={(e) => setReelId(e.target.value)}>
              <option value="">{t('ai.anyReel')}</option>
              {campaign.reels.map((r, i) => <option key={r.id} value={r.id}>{pad2(i + 1)} · {r.title}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="ai-style">{t('ai.style')}</label>
            <select id="ai-style" value={style} onChange={(e) => setStyle(e.target.value)}>
              {STYLES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="ai-dur">{t('ai.duration')}</label>
            <select id="ai-dur" value={duration} onChange={(e) => setDuration(e.target.value)}>
              {DURATIONS.map((s) => <option key={s} value={s}>{t('ai.seconds', { n: s })}</option>)}
            </select>
          </div>
        </div>
        <textarea className="prompt" readOnly rows={10} value={prompt} aria-label={t('ai.prompt')} />
        <p className="fine">{t('ai.englishNote')}</p>
        <button className="primary compact" onClick={copy}>
          {copied ? <><Check size={16} /> {t('ai.copied')}</> : <><Copy size={16} /> {t('ai.copy')}</>}
        </button>
      </div>
      <div className="panel">
        <h3>{t('ai.workflow')}</h3>
        <ol className="steps">
          {[1, 2, 3, 4, 5, 6].map((n) => <li key={n}>{t(`ai.step${n}`)}</li>)}
        </ol>
      </div>
    </>
  );
}
