import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { parseShotNumbers, pad2 } from '../lib/data';

const STYLES = ['Minimal Cinematic', 'Fashion Editorial', 'Soft Lifestyle', 'Product Detail', 'Street Documentary'];
const DURATIONS = ['10', '15', '20', '30'];

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
      alert('Copy failed — select the text and copy it manually.');
    }
  }

  return (
    <>
      <h3>AI Editing Prompt Generator</h3>
      <p>Copy a prompt for a compatible AI editing tool. Actual video rendering happens in your chosen editor.</p>
      <div className="panel">
        <div className="split three">
          <div>
            <label htmlFor="ai-reel">REEL (OPTIONAL)</label>
            <select id="ai-reel" value={reelId} onChange={(e) => setReelId(e.target.value)}>
              <option value="">Any — let the AI choose</option>
              {campaign.reels.map((r, i) => <option key={r.id} value={r.id}>{pad2(i + 1)} · {r.title}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="ai-style">VISUAL STYLE</label>
            <select id="ai-style" value={style} onChange={(e) => setStyle(e.target.value)}>
              {STYLES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="ai-dur">DURATION</label>
            <select id="ai-dur" value={duration} onChange={(e) => setDuration(e.target.value)}>
              {DURATIONS.map((s) => <option key={s} value={s}>{s} seconds</option>)}
            </select>
          </div>
        </div>
        <textarea className="prompt" readOnly rows={10} value={prompt} aria-label="Generated prompt" />
        <button className="primary compact" onClick={copy}>
          {copied ? <><Check size={16} /> Copied</> : <><Copy size={16} /> Copy prompt</>}
        </button>
      </div>
      <div className="panel">
        <h3>Editing workflow</h3>
        <ol className="steps">
          <li>Group footage by the Reel&apos;s shot numbers</li>
          <li>Import to CapCut Auto Cut or a compatible editor</li>
          <li>Review the AI draft</li>
          <li>Verify real bag colors and logo</li>
          <li>Export 1080×1920</li>
          <li>Mark the Reel as Ready</li>
        </ol>
      </div>
    </>
  );
}
