import { useRef, useState } from 'react';
import { Sun, Moon, Monitor, Download, Upload, LogOut, ShieldCheck, Smartphone, Info, Trash2, KeyRound } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useI18n } from '../lib/i18n';
import { PAGE_IDS } from '../lib/prefs';
import { emptyStudio } from '../lib/data';
import { exportBackup, mergeBackup, readBackup } from '../lib/backup';
import { version } from '../../package.json';

const REPO_URL = 'https://github.com/ht-1203/whatdbag-studio';

export default function Settings({ data, setData, session }) {
  const { t } = useI18n();
  const prefs = data.settings;
  const setPref = (key, value) => setData((d) => ({ ...d, settings: { ...d.settings, [key]: value } }));

  return (
    <div className="settings">
      <Section title={t('settings.appearance')}>
        <Row label={t('settings.theme')} hint={t('settings.themeHint')}>
          <Segmented
            value={prefs.theme}
            onChange={(v) => setPref('theme', v)}
            options={[
              ['system', t('settings.themeSystem'), Monitor],
              ['light', t('settings.themeLight'), Sun],
              ['dark', t('settings.themeDark'), Moon],
            ]}
          />
        </Row>
        <Row label={t('settings.language')}>
          <Segmented value={prefs.lang} onChange={(v) => setPref('lang', v)} options={[['en', 'English'], ['th', 'ไทย']]} />
        </Row>
      </Section>

      <Section title={t('settings.preferences')}>
        <Row label={t('settings.weekStart')}>
          <Segmented value={prefs.weekStart} onChange={(v) => setPref('weekStart', v)} options={[['mon', t('settings.monday')], ['sun', t('settings.sunday')]]} />
        </Row>
        <Row label={t('settings.startPage')} hint={t('settings.startPageHint')}>
          <select value={prefs.startPage} onChange={(e) => setPref('startPage', e.target.value)} aria-label={t('settings.startPage')}>
            <option value="last">{t('settings.lastPage')}</option>
            {PAGE_IDS.map((p) => <option key={p} value={p}>{t(`nav.${p}`)}</option>)}
          </select>
        </Row>
      </Section>

      <Section title={t('settings.account')}>
        <Row label={t('settings.signedInAs')}>
          <span className="settingValue">{session.user.email}</span>
        </Row>
        <ChangePassword />
        <div className="settingActions">
          <button className="secondary small" onClick={() => supabase.auth.signOut()}><LogOut size={15} /> {t('app.signOut')}</button>
          <button
            className="secondary small"
            onClick={() => confirm(t('settings.signOutAllConfirm')) && supabase.auth.signOut({ scope: 'global' })}
          >
            <LogOut size={15} /> {t('settings.signOutAll')}
          </button>
        </div>
      </Section>

      <Section title={t('settings.data')}>
        <BackupRestore data={data} setData={setData} />
        <div className="dangerZone">
          <div>
            <strong>{t('settings.resetTitle')}</strong>
            <p>{t('settings.resetHint')}</p>
          </div>
          <button
            className="secondary small danger"
            onClick={() => {
              if (prompt(t('settings.resetConfirm')) !== 'DELETE') return;
              setData((d) => emptyStudio(d.settings));
            }}
          >
            <Trash2 size={15} /> {t('settings.resetButton')}
          </button>
        </div>
      </Section>

      <Section title={t('settings.install')} icon={Smartphone}>
        <ol className="steps">
          <li>{t('settings.install1')}</li>
          <li>{t('settings.install2')}</li>
          <li>{t('settings.install3')}</li>
        </ol>
        <p className="fine">{t('settings.installHint')}</p>
      </Section>

      <Section title={t('settings.privacy')} icon={ShieldCheck}>
        <ul className="steps">
          <li>{t('terms.private')}</li>
          <li>{t('terms.stored')}</li>
          <li>{t('terms.notStored')}</li>
          <li>{t('terms.backups')}</li>
          <li>{t('terms.asIs')}</li>
        </ul>
      </Section>

      <Section title={t('settings.about')} icon={Info}>
        <Row label={t('settings.version')}><span className="settingValue">{version}</span></Row>
        <Row label={t('settings.source')}>
          <a className="settingValue" href={REPO_URL} target="_blank" rel="noreferrer">GitHub</a>
        </Row>
      </Section>
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <section className="panel settingSection">
      <h3>{Icon && <Icon size={18} />} {title}</h3>
      {children}
    </section>
  );
}

function Row({ label, hint, children }) {
  return (
    <div className="settingRow">
      <div>
        <div className="settingLabel">{label}</div>
        {hint && <div className="settingHint">{hint}</div>}
      </div>
      <div className="settingControl">{children}</div>
    </div>
  );
}

function Segmented({ value, onChange, options }) {
  return (
    <div className="segmented" role="radiogroup">
      {options.map(([v, label, Icon]) => (
        <button key={v} role="radio" aria-checked={value === v} className={value === v ? 'selected' : ''} onClick={() => onChange(v)}>
          {Icon && <Icon size={14} />} {label}
        </button>
      ))}
    </div>
  );
}

function ChangePassword() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (pw !== pw2) return setMsg({ ok: false, text: t('settings.pwMismatch') });
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setMsg({ ok: false, text: error.message });
    setMsg({ ok: true, text: t('settings.pwChanged') });
    setPw('');
    setPw2('');
  }

  if (!open) {
    return (
      <Row label={t('settings.password')}>
        <button className="secondary small" onClick={() => setOpen(true)}><KeyRound size={14} /> {t('settings.changePassword')}</button>
      </Row>
    );
  }
  return (
    <form className="pwForm" onSubmit={submit}>
      <label htmlFor="pw1">{t('settings.newPassword')}</label>
      <input id="pw1" type="password" minLength={8} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} required />
      <label htmlFor="pw2">{t('settings.confirmPassword')}</label>
      <input id="pw2" type="password" minLength={8} autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} required />
      {msg && <p className={msg.ok ? 'formMsg ok' : 'formMsg'}>{msg.text}</p>}
      <div className="settingActions">
        <button className="primary small compact" type="submit" disabled={busy}>{busy ? t('auth.wait') : t('settings.savePassword')}</button>
        <button className="secondary small" type="button" onClick={() => { setOpen(false); setMsg(null); }}>{t('common.cancel')}</button>
      </div>
    </form>
  );
}

function BackupRestore({ data, setData }) {
  const { t } = useI18n();
  const fileRef = useRef(null);

  async function importFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    let restored;
    try {
      restored = await readBackup(file);
    } catch {
      return alert(t('backup.invalid'));
    }
    const mode = confirm(t('backup.mergePrompt', { n: restored.campaigns.length }))
      ? 'merge'
      : confirm(t('backup.replacePrompt')) ? 'replace' : null;
    if (mode) setData((d) => mergeBackup(d, restored, mode));
  }

  return (
    <>
      <Row label={t('backup.title')} hint={t('backup.hint')}>
        <div className="settingActions">
          <button className="secondary small" onClick={() => exportBackup(data)}><Download size={14} /> {t('backup.download')}</button>
          <button className="secondary small" onClick={() => fileRef.current?.click()}><Upload size={14} /> {t('backup.restore')}</button>
        </div>
      </Row>
      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importFile} />
    </>
  );
}
