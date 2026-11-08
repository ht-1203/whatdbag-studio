export const PAGE_IDS = ['Dashboard', 'Shot List', 'Reels Planner', 'Calendar', 'AI Studio', 'Campaigns', 'Settings'];
export const THEMES = ['system', 'light', 'dark'];
export const LANGS = ['en', 'th'];

const KEY = 'whatdbag.prefs';

const browserLang = () => (globalThis.navigator?.language?.toLowerCase().startsWith('th') ? 'th' : 'en');

export const defaultPrefs = () => ({ theme: 'system', lang: browserLang(), weekStart: 'mon', startPage: 'last' });

export function normalizePrefs(raw) {
  const p = raw && typeof raw === 'object' ? raw : {};
  const d = defaultPrefs();
  return {
    theme: THEMES.includes(p.theme) ? p.theme : d.theme,
    lang: LANGS.includes(p.lang) ? p.lang : d.lang,
    weekStart: p.weekStart === 'sun' ? 'sun' : 'mon',
    startPage: p.startPage === 'last' || PAGE_IDS.includes(p.startPage) ? p.startPage : d.startPage,
  };
}

// Settings live in the synced studio data; this copy lets the sign-in screen
// use the right theme and language before that data has loaded.
export function loadLocalPrefs() {
  try {
    return normalizePrefs(JSON.parse(localStorage.getItem(KEY)));
  } catch {
    return defaultPrefs();
  }
}

export function saveLocalPrefs(prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch { /* storage unavailable */ }
}

export function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = theme;
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#141312' : '#1c1b1a');
}
