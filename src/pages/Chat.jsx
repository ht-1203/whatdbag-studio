import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowDown, Copy, Check, MessageCircle, RotateCw, SendHorizontal, Trash2, Users } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { MAX_MESSAGE } from '../hooks/useTeamChat';

const GROUP_GAP = 5 * 60 * 1000; // messages closer than this from one person share a header
const NEAR_BOTTOM = 120; // px: within this, new messages auto-scroll into view
const AVATAR_COLORS = ['#bd5b60', '#c0843d', '#5f8f6b', '#4f7fb0', '#8a68b3', '#b0617f', '#3f8f8f', '#7d7a3a'];

const avatarColor = (id) => {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};
const initials = (name) => name.trim().slice(0, 1).toUpperCase() || '?';
const dayKey = (iso) => new Date(iso).toDateString();

function Avatar({ id, name, size = 32 }) {
  return (
    <span className="avatar" style={{ background: avatarColor(id), width: size, height: size, fontSize: size * 0.42 }} aria-hidden>
      {initials(name)}
    </span>
  );
}

// Plain text with http(s) links made clickable. No HTML is ever injected.
function Linkified({ text }) {
  return text.split(/(https?:\/\/[^\s<]+)/g).map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noreferrer noopener">{part}</a>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

export default function Chat({ chat }) {
  const { t, locale } = useI18n();
  const { me, messages, status, online, typing, hasMore } = chat;
  const panelRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const [height, setHeight] = useState(null);
  const [draft, setDraft] = useState('');
  const [showJump, setShowJump] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const stickToBottom = useRef(true);
  const prevCount = useRef(0);

  // Fill the screen down to the bottom edge, shrinking when the iPhone keyboard opens.
  useLayoutEffect(() => {
    const fit = () => {
      const panel = panelRef.current;
      if (!panel) return;
      const vv = window.visualViewport;
      // Bottom of what's actually visible (above the keyboard), in page layout coordinates.
      const visibleBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
      const top = panel.getBoundingClientRect().top;
      const bottomGap = parseFloat(getComputedStyle(panel).getPropertyValue('--chat-bottom-gap')) || 16;
      setHeight(Math.max(320, Math.round(visibleBottom - top - bottomGap)));
    };
    fit();
    window.addEventListener('resize', fit);
    window.visualViewport?.addEventListener('resize', fit);
    return () => {
      window.removeEventListener('resize', fit);
      window.visualViewport?.removeEventListener('resize', fit);
    };
  }, [status]);

  const scrollToBottom = (smooth) => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  };

  // Keep the newest message in view unless the reader has scrolled up to read history.
  useLayoutEffect(() => {
    const grew = messages.length > prevCount.current;
    const mineJustSent = grew && messages[messages.length - 1]?.user_id === me.id;
    if (stickToBottom.current || mineJustSent) scrollToBottom(prevCount.current !== 0);
    else if (grew) setShowJump(true);
    prevCount.current = messages.length;
  }, [messages, me.id]);

  useLayoutEffect(() => {
    if (stickToBottom.current) scrollToBottom(false);
  }, [height]);

  const onScroll = () => {
    const el = listRef.current;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM;
    stickToBottom.current = near;
    if (near) setShowJump(false);
  };

  async function loadOlder() {
    const el = listRef.current;
    const before = el.scrollHeight;
    setLoadingOlder(true);
    stickToBottom.current = false;
    await chat.loadEarlier();
    setLoadingOlder(false);
    // Hold the reader's place instead of jumping to the newly loaded top.
    requestAnimationFrame(() => {
      el.scrollTop += el.scrollHeight - before;
    });
  }

  // Grow the box with its text, up to about five lines.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, [draft]);

  function submit(e) {
    e?.preventDefault();
    if (!draft.trim()) return;
    chat.send(draft);
    setDraft('');
    stickToBottom.current = true;
    inputRef.current?.focus();
  }

  function onKeyDown(e) {
    // Enter sends; Shift+Enter adds a line. Wait while a Thai/IME composition is open.
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  }

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const dayLabel = (iso) => {
    const k = dayKey(iso);
    if (k === today.toDateString()) return t('chat.today');
    if (k === yesterday.toDateString()) return t('chat.yesterday');
    return new Date(iso).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
  };
  const timeOf = (iso) => new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

  if (status === 'missing' || status === 'error') return <ChatSetup chat={chat} />;

  const others = online.filter((p) => p.id !== me.id);
  const typingText =
    typing.length === 0 ? '' : typing.length === 1 ? t('chat.typingOne', { name: typing[0] }) : t('chat.typingMany', { n: typing.length });

  return (
    <div className="chatLayout">
      <section className="chatPanel" ref={panelRef} style={height ? { height } : undefined}>
        <header className="chatHead">
          <div className="chatTitle">
            <span className="chatIcon"><MessageCircle size={18} /></span>
            <div>
              <h3>{t('chat.title')}</h3>
              <p className={`chatConn ${status}`}>
                <span className="dot" />
                {status === 'live' ? t('chat.onlineCount', { n: online.length }) : t(`chat.status.${status}`)}
              </p>
            </div>
          </div>
          <div className="avatarStack" title={online.map((p) => p.name).join(', ')}>
            {online.slice(0, 4).map((p) => (
              <span key={p.id} className="stackItem"><Avatar id={p.id} name={p.name} size={28} /><i className="onlineDot" /></span>
            ))}
            {online.length > 4 && <span className="stackMore">+{online.length - 4}</span>}
          </div>
        </header>

        <div className="chatList" ref={listRef} onScroll={onScroll} role="log" aria-live="polite" aria-label={t('chat.title')}>
          {hasMore && (
            <button className="secondary small loadOlder" onClick={loadOlder} disabled={loadingOlder}>
              {loadingOlder ? t('chat.loading') : t('chat.loadOlder')}
            </button>
          )}

          {status === 'connecting' && messages.length === 0 && <div className="chatEmpty"><div className="spinner dark" /></div>}

          {status !== 'connecting' && messages.length === 0 && (
            <div className="chatEmpty">
              <span className="chatEmptyIcon"><MessageCircle size={28} /></span>
              <strong>{t('chat.emptyTitle')}</strong>
              <p>{t('chat.emptyText')}</p>
            </div>
          )}

          {messages.map((m, i) => {
            const prev = messages[i - 1];
            const next = messages[i + 1];
            const newDay = !prev || dayKey(prev.created_at) !== dayKey(m.created_at);
            const startsGroup = newDay || prev.user_id !== m.user_id || prev.sender_name !== m.sender_name
              || new Date(m.created_at) - new Date(prev.created_at) > GROUP_GAP;
            const endsGroup = !next || next.user_id !== m.user_id || next.sender_name !== m.sender_name || dayKey(next.created_at) !== dayKey(m.created_at)
              || new Date(next.created_at) - new Date(m.created_at) > GROUP_GAP;
            const mine = m.user_id === me.id;
            return (
              <Fragment key={m.id}>
                {newDay && <div className="dayDivider"><span>{dayLabel(m.created_at)}</span></div>}
                <div className={`msgRow ${mine ? 'mine' : 'theirs'} ${startsGroup ? 'groupStart' : ''} ${endsGroup ? 'groupEnd' : ''}`}>
                  {!mine && <div className="msgAvatar">{startsGroup && <Avatar id={m.user_id} name={m.sender_name} />}</div>}
                  <div className="msgBody">
                    {!mine && startsGroup && <div className="msgName">{m.sender_name}</div>}
                    <div className="msgLine">
                      {mine && !m.pending && (
                        <button className="msgDelete" onClick={() => confirm(t('chat.deleteConfirm')) && chat.remove(m.id)} aria-label={t('chat.delete')} title={t('chat.delete')}>
                          <Trash2 size={13} />
                        </button>
                      )}
                      <div className={`bubble ${m.pending ? 'pending' : ''} ${m.failed ? 'failed' : ''}`}>
                        <Linkified text={m.body} />
                      </div>
                    </div>
                    {m.failed ? (
                      <div className="msgMeta failedMeta">
                        {t('chat.notSent')} ·{' '}
                        <button className="link" onClick={() => chat.retry(m.id)}><RotateCw size={11} /> {t('chat.retry')}</button>
                      </div>
                    ) : endsGroup || m.pending ? (
                      <div className="msgMeta">{m.pending ? t('chat.sending') : timeOf(m.created_at)}</div>
                    ) : null}
                  </div>
                </div>
              </Fragment>
            );
          })}
        </div>

        {showJump && (
          <button className="jumpNew" onClick={() => { scrollToBottom(true); setShowJump(false); }}>
            <ArrowDown size={14} /> {t('chat.newMessages')}
          </button>
        )}

        <div className="typingLine" aria-live="polite">{typingText && <><span className="typingDots"><i /><i /><i /></span>{typingText}</>}</div>

        <form className="composer" onSubmit={submit}>
          <textarea
            ref={inputRef}
            rows={1}
            value={draft}
            maxLength={MAX_MESSAGE}
            placeholder={status === 'live' ? t('chat.placeholder') : t('chat.placeholderOffline')}
            aria-label={t('chat.placeholder')}
            onChange={(e) => {
              setDraft(e.target.value);
              chat.notifyTyping();
            }}
            onKeyDown={onKeyDown}
          />
          <button className="sendBtn" type="submit" disabled={!draft.trim()} aria-label={t('chat.send')} title={t('chat.send')}>
            <SendHorizontal size={18} />
          </button>
        </form>
        {draft.length > MAX_MESSAGE - 200 && <div className="charCount composerCount">{draft.length} / {MAX_MESSAGE}</div>}
      </section>

      <aside className="panel onlinePanel">
        <h3><Users size={17} /> {t('chat.onlineNow')} <span className="chipCount">{online.length}</span></h3>
        <ul className="onlineList">
          {online.map((p) => (
            <li key={p.id}>
              <span className="stackItem"><Avatar id={p.id} name={p.name} size={30} /><i className="onlineDot" /></span>
              <span>{p.name}{p.id === me.id && <em> · {t('chat.you')}</em>}</span>
            </li>
          ))}
        </ul>
        {others.length === 0 && status === 'live' && <p className="fine">{t('chat.aloneHint')}</p>}
        <p className="fine chatNote">{t('chat.visibilityNote')}</p>
      </aside>
    </div>
  );
}

const SETUP_SQL_HINT = 'supabase.sql';

function ChatSetup({ chat }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const sqlUrl = 'https://github.com/ht-1203/whatdbag-studio/blob/main/supabase.sql';
  return (
    <div className="panel chatSetup">
      <span className="chatEmptyIcon"><MessageCircle size={28} /></span>
      <h3>{chat.status === 'missing' ? t('chat.setupTitle') : t('chat.errorTitle')}</h3>
      {chat.status === 'missing' ? (
        <ol className="steps">
          <li>{t('chat.setup1')}</li>
          <li>
            {t('chat.setup2')}{' '}
            <a href={sqlUrl} target="_blank" rel="noreferrer">{SETUP_SQL_HINT}</a>{' '}
            <button
              className="secondary small"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(sqlUrl);
                  setCopied(true);
                } catch { /* clipboard unavailable */ }
              }}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />} {t('chat.copyLink')}
            </button>
          </li>
          <li>{t('chat.setup3')}</li>
        </ol>
      ) : (
        <p>{chat.error}</p>
      )}
      <button className="primary compact" onClick={chat.reconnect}><RotateCw size={15} /> {t('chat.tryAgain')}</button>
    </div>
  );
}
