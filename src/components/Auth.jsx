import { useState } from 'react';
import { supabase, allowSignup, appUrl } from '../lib/supabase';
import { useI18n } from '../lib/i18n';

export function Brand() {
  return (
    <h1 className="authBrand">
      whatdbag<span>.</span>
      <br />
      studio
    </h1>
  );
}

// Lets someone pick a language before signing in; it carries over into the app.
function LangSwitch({ prefs, setPrefs }) {
  if (!prefs) return null;
  return (
    <div className="langSwitch">
      {[['en', 'EN'], ['th', 'ไทย']].map(([v, label]) => (
        <button key={v} type="button" className={prefs.lang === v ? 'selected' : ''} onClick={() => setPrefs({ ...prefs, lang: v })}>
          {label}
        </button>
      ))}
    </div>
  );
}

export function SetupScreen() {
  const { t } = useI18n();
  return (
    <div className="auth">
      <div className="authCard">
        <div className="eyebrow">{t('auth.setupEyebrow')}</div>
        <Brand />
        <p>{t('auth.setupText')}</p>
        <p className="fine">{t('auth.setupHint')}</p>
      </div>
    </div>
  );
}

export function AuthScreen({ notice, prefs, setPrefs }) {
  const { t } = useI18n();
  const [mode, setMode] = useState('signin'); // signin | signup | reset
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  // A confirmed email that didn't sign this browser in (e.g. opened elsewhere) still gets a clear answer.
  const [msg, setMsg] = useState(() => {
    if (!notice) return { text: '', ok: false };
    return notice.ok ? { text: `${t(notice.key)} ${t('auth.pleaseSignIn')}`, ok: true } : notice;
  });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMsg({ text: '', ok: false });
    let res;
    if (mode === 'signin') res = await supabase.auth.signInWithPassword({ email, password });
    else if (mode === 'signup') res = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: appUrl } });
    else res = await supabase.auth.resetPasswordForEmail(email, { redirectTo: appUrl });
    setBusy(false);
    if (res.error) return setMsg({ text: res.error.message, ok: false });
    if (mode === 'signup') setMsg({ text: t('auth.created'), ok: true });
    if (mode === 'reset') setMsg({ text: t('auth.resetSent'), ok: true });
  }

  const titles = { signin: t('auth.signIn'), signup: t('auth.createAccount'), reset: t('auth.sendReset') };

  return (
    <div className="auth">
      <div className="authCard">
        <div className="authTop">
          <div className="eyebrow">{t('auth.eyebrow')}</div>
          <LangSwitch prefs={prefs} setPrefs={setPrefs} />
        </div>
        <Brand />
        <p>{t('auth.tagline')}</p>
        <form onSubmit={submit}>
          <label htmlFor="email">{t('auth.email')}</label>
          <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          {mode !== 'reset' && (
            <>
              <label htmlFor="password">{t('auth.password')}</label>
              <input
                id="password"
                type="password"
                minLength={mode === 'signup' ? 8 : undefined}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </>
          )}
          <button type="submit" className="primary" disabled={busy}>
            {busy ? t('auth.wait') : titles[mode]}
          </button>
        </form>
        {msg.text && (
          <p className={msg.ok ? 'authMsg ok' : 'authMsg'} role="status">
            {msg.text}
          </p>
        )}
        <div className="authLinks">
          {mode !== 'signin' && <button type="button" className="link" onClick={() => setMode('signin')}>{t('auth.backToSignIn')}</button>}
          {mode === 'signin' && <button type="button" className="link" onClick={() => setMode('reset')}>{t('auth.forgot')}</button>}
          {mode === 'signin' && allowSignup && <button type="button" className="link" onClick={() => setMode('signup')}>{t('auth.createAccount')}</button>}
        </div>
        <p className="fine">{t('auth.rls')}</p>
      </div>
    </div>
  );
}

export function NewPasswordScreen({ onDone }) {
  const { t } = useI18n();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setErr(error.message);
    else onDone();
  }

  return (
    <div className="auth">
      <div className="authCard">
        <div className="eyebrow">{t('auth.resetEyebrow')}</div>
        <Brand />
        <form onSubmit={submit}>
          <label htmlFor="newpw">{t('settings.newPassword')}</label>
          <input id="newpw" type="password" minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit" className="primary" disabled={busy}>{busy ? t('auth.wait') : t('settings.savePassword')}</button>
        </form>
        {err && <p className="authMsg" role="alert">{err}</p>}
      </div>
    </div>
  );
}
