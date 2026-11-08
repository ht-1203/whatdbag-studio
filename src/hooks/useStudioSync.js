import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase, TABLE } from '../lib/supabase';
import { normalizeStudio } from '../lib/data';
import { loadLocalPrefs } from '../lib/prefs';

const SAVE_DELAY = 700;

/**
 * Loads the signed-in user's studio row, saves edits (debounced), and guards
 * against one device silently overwriting another: every save first checks
 * that the row's updated_at still matches the version this device last saw.
 *
 * status: loading | synced | saving | error | conflict
 */
export function useStudioSync(userId) {
  const [data, setDataState] = useState(null);
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const [rev, setRev] = useState(0);

  const seenVersion = useRef(null); // updated_at of the row we last loaded or wrote
  const dirty = useRef(false);
  const latest = useRef(null);
  latest.current = data;

  const fail = (msg) => {
    setStatus('error');
    setMessage(msg);
  };

  const load = useCallback(async () => {
    const { data: row, error } = await supabase
      .from(TABLE)
      .select('payload, updated_at')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return row;
  }, [userId]);

  const applyRow = useCallback((row) => {
    seenVersion.current = row?.updated_at ?? null;
    dirty.current = !row; // brand-new account: save the starter campaign
    setDataState(normalizeStudio(row?.payload, loadLocalPrefs()));
    setStatus(row ? 'synced' : 'saving');
    setMessage('');
    if (!row) setRev((r) => r + 1);
  }, []);

  // Initial load
  useEffect(() => {
    if (!userId) return;
    let live = true;
    setStatus('loading');
    setDataState(null);
    load()
      .then((row) => live && applyRow(row))
      .catch((e) => live && fail(`Load failed: ${e.message}`));
    return () => {
      live = false;
    };
  }, [userId, load, applyRow]);

  const write = useCallback(
    async (force = false) => {
      if (!force) {
        const { data: row, error } = await supabase
          .from(TABLE)
          .select('updated_at')
          .eq('user_id', userId)
          .maybeSingle();
        if (error) return fail(`Save failed: ${error.message}`);
        if ((row?.updated_at ?? null) !== seenVersion.current) {
          setStatus('conflict');
          setMessage('This studio was changed on another device.');
          return;
        }
      }
      const payload = latest.current;
      const { data: saved, error } = await supabase
        .from(TABLE)
        .upsert(
          { user_id: userId, payload, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' },
        )
        .select('updated_at')
        .single();
      if (error) return fail(`Save failed: ${error.message}`);
      seenVersion.current = saved.updated_at;
      // Only clear the flag if nothing changed while the request was in flight.
      if (latest.current === payload) {
        dirty.current = false;
        setStatus('synced');
        setMessage('');
      } else {
        setRev((r) => r + 1);
      }
    },
    [userId],
  );

  // Debounced autosave
  useEffect(() => {
    if (!rev || !dirty.current) return;
    setStatus((s) => (s === 'conflict' ? s : 'saving'));
    const t = setTimeout(() => {
      if (dirty.current) write();
    }, SAVE_DELAY);
    return () => clearTimeout(t);
  }, [rev, write]);

  const setData = useCallback((updater) => {
    setDataState((d) => (typeof updater === 'function' ? updater(d) : updater));
    dirty.current = true;
    setRev((r) => r + 1);
  }, []);

  // Pull changes from other devices when this tab regains focus.
  useEffect(() => {
    if (!userId) return;
    const onFocus = async () => {
      if (dirty.current || document.visibilityState !== 'visible') return;
      try {
        const row = await load();
        if (!dirty.current && row && row.updated_at !== seenVersion.current) applyRow(row);
      } catch {
        /* offline: keep local copy */
      }
    };
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', onFocus);
    };
  }, [userId, load, applyRow]);

  // Warn before closing the tab with unsaved edits.
  useEffect(() => {
    const onUnload = (e) => {
      if (!dirty.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, []);

  const retry = useCallback(() => {
    setStatus('saving');
    write();
  }, [write]);

  const keepMine = useCallback(() => {
    setStatus('saving');
    write(true);
  }, [write]);

  const takeTheirs = useCallback(async () => {
    try {
      applyRow(await load());
    } catch (e) {
      fail(`Load failed: ${e.message}`);
    }
  }, [load, applyRow]);

  return { data, setData, status, message, retry, keepMine, takeTheirs };
}
