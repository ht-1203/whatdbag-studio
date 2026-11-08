import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Where links in auth emails (confirm, reset) should land: this app, not the bare domain.
export const appUrl = window.location.origin + import.meta.env.BASE_URL;

// Read before createClient: the client strips these params from the URL once it handles them.
export const authRedirect = readAuthRedirect();

// null when credentials are missing; the app shows a setup screen instead.
export const supabase = url && key ? createClient(url, key) : null;

// Set VITE_ALLOW_SIGNUP=false after creating your account to hide the button.
export const allowSignup = import.meta.env.VITE_ALLOW_SIGNUP !== 'false';

export const TABLE = 'studio_data';

function readAuthRedirect() {
  const params = new URLSearchParams(`${window.location.hash.slice(1)}&${window.location.search.slice(1)}`);
  const error = params.get('error_description');
  if (error) return { ok: false, text: error.replace(/\+/g, ' ') };
  const messages = {
    signup: 'Email confirmed — welcome to whatdbag studio.',
    email_change: 'Your new email address is confirmed.',
    invite: 'Invitation accepted — welcome to whatdbag studio.',
  };
  const text = messages[params.get('type')];
  return text ? { ok: true, text } : null;
}
