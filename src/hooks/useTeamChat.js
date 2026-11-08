import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { uid } from '../lib/data';

const TABLE = 'chat_messages';
const PAGE = 50;
const TYPING_TTL = 3500; // ms a "typing" ping stays visible
const READ_KEY = 'whatdbag.chatRead';

export const MAX_MESSAGE = 2000;

export const displayNameOf = (user) =>
  (user.user_metadata?.display_name || user.email?.split('@')[0] || 'Someone').slice(0, 40);

const byTime = (a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id);

// Adds or replaces messages by id, keeping the list in time order.
function mergeMessages(list, incoming) {
  const map = new Map(list.map((m) => [m.id, m]));
  for (const m of incoming) map.set(m.id, { ...map.get(m.id), ...m, pending: false, failed: false });
  return [...map.values()].sort(byTime);
}

const readStoredTime = () => {
  try {
    return localStorage.getItem(READ_KEY) || '';
  } catch {
    return '';
  }
};

/**
 * One shared room for everyone signed in. Messages arrive through Supabase
 * Realtime (postgres changes); who's online and who's typing use Presence and
 * Broadcast on the same channel, so nothing extra is stored for them.
 *
 * status: connecting | live | offline | missing (table not set up) | error
 */
export function useTeamChat(session, active) {
  const me = session.user;
  const myName = displayNameOf(me);
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('connecting');
  const [error, setError] = useState('');
  const [online, setOnline] = useState([]);
  const [typing, setTyping] = useState({});
  const [hasMore, setHasMore] = useState(false);
  const [lastRead, setLastRead] = useState(readStoredTime);

  const channelRef = useRef(null);
  const lastTypingSent = useRef(0);
  const wasOffline = useRef(false);
  const loadedOnce = useRef(false);
  const [attempt, setAttempt] = useState(0);

  const fetchLatest = useCallback(async () => {
    const { data, error: err } = await supabase
      .from(TABLE)
      .select('id, user_id, sender_name, body, created_at')
      .order('created_at', { ascending: false })
      .limit(PAGE);
    if (err) {
      // 42P01 / PGRST205: the table hasn't been created yet.
      if (err.code === '42P01' || err.code === 'PGRST205' || /does not exist|schema cache/i.test(err.message)) {
        setStatus('missing');
      } else {
        setStatus('error');
        setError(err.message);
      }
      return false;
    }
    setMessages((list) => mergeMessages(list, data));
    // Only the first page decides whether older history exists; catch-up fetches don't.
    if (!loadedOnce.current) setHasMore(data.length === PAGE);
    loadedOnce.current = true;
    return true;
  }, []);

  useEffect(() => {
    let live = true;
    let channel;
    (async () => {
      const ok = await fetchLatest();
      if (!live || !ok) return;
      channel = supabase.channel('team-chat', { config: { presence: { key: me.id } } });
      channelRef.current = channel;
      channel
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: TABLE }, ({ new: m }) => {
          setMessages((list) => mergeMessages(list, [m]));
          setTyping((tp) => {
            if (!tp[m.user_id]) return tp;
            const { [m.user_id]: _, ...rest } = tp;
            return rest;
          });
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: TABLE }, ({ old }) => {
          setMessages((list) => list.filter((m) => m.id !== old.id));
        })
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          setOnline(
            Object.entries(state)
              .map(([id, metas]) => ({ id, name: metas[metas.length - 1]?.name ?? '' }))
              .sort((a, b) => (a.id === me.id ? -1 : b.id === me.id ? 1 : a.name.localeCompare(b.name))),
          );
        })
        .on('broadcast', { event: 'typing' }, ({ payload }) => {
          if (payload.id === me.id) return;
          setTyping((tp) => ({ ...tp, [payload.id]: { name: payload.name, at: Date.now() } }));
        })
        .subscribe(async (s) => {
          if (!live) return;
          if (s === 'SUBSCRIBED') {
            setStatus('live');
            await channel.track({ name: myName });
            // Catch up on anything sent while the connection was down.
            if (wasOffline.current) fetchLatest();
            wasOffline.current = false;
          } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') {
            setStatus('offline');
            wasOffline.current = true;
          }
        });
    })();
    return () => {
      live = false;
      channelRef.current = null;
      if (channel) supabase.removeChannel(channel);
    };
  }, [me.id, attempt]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep presence up to date when the display name changes.
  useEffect(() => {
    if (status === 'live') channelRef.current?.track({ name: myName });
  }, [myName, status]);

  // Drop stale typing indicators.
  useEffect(() => {
    if (!Object.keys(typing).length) return;
    const t = setInterval(() => {
      const now = Date.now();
      setTyping((tp) => {
        const fresh = Object.fromEntries(Object.entries(tp).filter(([, v]) => now - v.at < TYPING_TTL));
        return Object.keys(fresh).length === Object.keys(tp).length ? tp : fresh;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [typing]);

  // While the chat is on screen, everything in it counts as read.
  const newest = messages[messages.length - 1]?.created_at ?? '';
  useEffect(() => {
    if (!active || !newest || newest <= lastRead) return;
    setLastRead(newest);
    try {
      localStorage.setItem(READ_KEY, newest);
    } catch { /* storage unavailable */ }
  }, [active, newest, lastRead]);

  const unread = active ? 0 : messages.filter((m) => m.user_id !== me.id && m.created_at > lastRead).length;

  const insert = useCallback(async (msg) => {
    const { error: err } = await supabase
      .from(TABLE)
      .insert({ id: msg.id, user_id: msg.user_id, sender_name: msg.sender_name, body: msg.body });
    setMessages((list) =>
      list.map((m) => (m.id === msg.id ? { ...m, pending: false, failed: Boolean(err), error: err?.message } : m)),
    );
  }, []);

  const send = useCallback(
    (text) => {
      const body = text.trim().slice(0, MAX_MESSAGE);
      if (!body) return;
      // The id is made here so the realtime echo of this insert replaces the optimistic copy.
      const msg = { id: uid(), user_id: me.id, sender_name: myName, body, created_at: new Date().toISOString(), pending: true };
      setMessages((list) => [...list, msg]);
      lastTypingSent.current = 0;
      insert(msg);
    },
    [me.id, myName, insert],
  );

  const retry = useCallback(
    (id) => {
      const msg = messages.find((m) => m.id === id);
      if (!msg) return;
      setMessages((list) => list.map((m) => (m.id === id ? { ...m, pending: true, failed: false } : m)));
      insert(msg);
    },
    [messages, insert],
  );

  const remove = useCallback(async (id) => {
    const msg = messages.find((m) => m.id === id);
    setMessages((list) => list.filter((m) => m.id !== id));
    if (msg?.failed) return; // never reached the server
    const { error: err } = await supabase.from(TABLE).delete().eq('id', id);
    if (err && msg) setMessages((list) => mergeMessages(list, [msg]));
  }, [messages]);

  const loadEarlier = useCallback(async () => {
    const oldest = messages.find((m) => !m.pending && !m.failed);
    if (!oldest) return;
    const { data, error: err } = await supabase
      .from(TABLE)
      .select('id, user_id, sender_name, body, created_at')
      .lt('created_at', oldest.created_at)
      .order('created_at', { ascending: false })
      .limit(PAGE);
    if (err) return;
    setMessages((list) => mergeMessages(list, data));
    setHasMore(data.length === PAGE);
  }, [messages]);

  // Throttled so typing a long message sends at most one ping every 2 seconds.
  const notifyTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingSent.current < 2000 || status !== 'live') return;
    lastTypingSent.current = now;
    channelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { id: me.id, name: myName } });
  }, [me.id, myName, status]);

  return {
    me: { id: me.id, name: myName },
    messages, status, error, online, hasMore, unread,
    typing: Object.values(typing).map((v) => v.name),
    send, retry, remove, loadEarlier, notifyTyping,
    reconnect: () => {
      setStatus('connecting');
      setAttempt((a) => a + 1);
    },
  };
}
