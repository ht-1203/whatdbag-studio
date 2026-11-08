import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// null when credentials are missing; the app shows a setup screen instead.
export const supabase = url && key ? createClient(url, key) : null;

// Set VITE_ALLOW_SIGNUP=false after creating your account to hide the button.
export const allowSignup = import.meta.env.VITE_ALLOW_SIGNUP !== 'false';

export const TABLE = 'studio_data';
