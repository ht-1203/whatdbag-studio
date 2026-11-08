import { useState } from 'react';
import { supabase, allowSignup, appUrl } from '../lib/supabase';

export function Brand() {
  return (
    <h1 className="authBrand">
      whatdbag<span>.</span>
      <br />
      studio
    </h1>
  );
}

export function SetupScreen() {
  return (
    <div className="auth">
      <div className="authCard">
        <div className="eyebrow">SETUP REQUIRED</div>
        <Brand />
        <p>
          Add your Supabase credentials to <code>.env</code> (or your hosting provider&apos;s
          environment variables) to enable private sign-in and cloud sync.
        </p>
        <p className="fine">See README.md for step-by-step setup.</p>
      </div>
    </div>
  );
}

export function AuthScreen({ notice }) {
  const [mode, setMode] = useState('signin'); // signin | signup | reset
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  // A confirmed email that didn't sign this browser in (e.g. opened elsewhere) still gets a clear answer.
  const [msg, setMsg] = useState(
    notice?.ok ? { text: `${notice.text} Please sign in.`, ok: true } : notice ?? { text: '', ok: false },
  );

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
    if (mode === 'signup') setMsg({ text: 'Account created. Check your email if confirmation is enabled.', ok: true });
    if (mode === 'reset') setMsg({ text: 'If that email has an account, a reset link is on its way.', ok: true });
  }

  const titles = { signin: 'Sign in', signup: 'Create account', reset: 'Send reset link' };

  return (
    <div className="auth">
      <div className="authCard">
        <div className="eyebrow">PRIVATE WORKSPACE</div>
        <Brand />
        <p>Your content production, organized.</p>
        <form onSubmit={submit}>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          {mode !== 'reset' && (
            <>
              <label htmlFor="password">Password</label>
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
            {busy ? 'Please wait…' : titles[mode]}
          </button>
        </form>
        {msg.text && (
          <p className={msg.ok ? 'authMsg ok' : 'authMsg'} role="status">
            {msg.text}
          </p>
        )}
        <div className="authLinks">
          {mode !== 'signin' && <button type="button" className="link" onClick={() => setMode('signin')}>Back to sign in</button>}
          {mode === 'signin' && <button type="button" className="link" onClick={() => setMode('reset')}>Forgot password?</button>}
          {mode === 'signin' && allowSignup && <button type="button" className="link" onClick={() => setMode('signup')}>Create account</button>}
        </div>
        <p className="fine">Private data is protected by Supabase Row Level Security.</p>
      </div>
    </div>
  );
}

export function NewPasswordScreen({ onDone }) {
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
        <div className="eyebrow">RESET PASSWORD</div>
        <Brand />
        <form onSubmit={submit}>
          <label htmlFor="newpw">New password</label>
          <input id="newpw" type="password" minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit" className="primary" disabled={busy}>{busy ? 'Saving…' : 'Save new password'}</button>
        </form>
        {err && <p className="authMsg" role="alert">{err}</p>}
      </div>
    </div>
  );
}
