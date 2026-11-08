import { createContext, useContext, useMemo } from 'react';
import { en, th } from './strings';

const DICTS = { en, th };
const I18nContext = createContext(null);

export function I18nProvider({ lang, children }) {
  const value = useMemo(() => {
    const dict = DICTS[lang] ?? en;
    // t('key', { n: 3 }) -> dictionary text with {n} filled in; falls back to English, then `fallback`, then the key.
    const t = (key, vars, fallback) => {
      let s = dict[key] ?? en[key] ?? fallback ?? key;
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
      return s;
    };
    return { lang, t, locale: lang === 'th' ? 'th-TH' : 'en-GB' };
  }, [lang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);

// Group and status names are stored in English; these translate them for display only.
export const groupLabel = (t, group) => t(`group.${group}`, null, group);
export const statusLabel = (t, status) => t(`status.${status}`, null, status);
