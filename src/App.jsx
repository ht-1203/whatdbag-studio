import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Camera, Clapperboard, CalendarDays, WandSparkles, FolderPlus, MessageCircle, Settings as SettingsIcon,
  LogOut, Plus, Download, Menu, X,
} from 'lucide-react';
import { supabase, authRedirect } from './lib/supabase';
import { I18nProvider, useI18n } from './lib/i18n';
import { applyTheme, loadLocalPrefs, saveLocalPrefs } from './lib/prefs';
import { exportBackup } from './lib/backup';
import { useStudioSync } from './hooks/useStudioSync';
import { useTeamChat } from './hooks/useTeamChat';
import { AuthScreen, NewPasswordScreen, SetupScreen } from './components/Auth';
import SyncBadge from './components/SyncBadge';
import Toast from './components/Toast';
import Dashboard from './pages/Dashboard';
import ShotList from './pages/ShotList';
import ReelsPlanner from './pages/ReelsPlanner';
import Calendar from './pages/Calendar';
import AIStudio from './pages/AIStudio';
import Campaigns from './pages/Campaigns';
import Settings from './pages/Settings';
import Chat from './pages/Chat';

const SECTIONS = [
  ['Dashboard', LayoutDashboard],
  ['Shot List', Camera],
  ['Reels Planner', Clapperboard],
  ['Calendar', CalendarDays],
  ['AI Studio', WandSparkles],
  ['Campaigns', FolderPlus],
  ['Chat', MessageCircle],
];
const PAGE_KEY = 'whatdbag.page';
const MOBILE_QUERY = '(max-width: 900px)';
const EDGE = 40; // px from the left edge where an opening swipe may start
const SWIPE = 60; // horizontal distance that counts as a swipe

// Mobile only: swipe right from the left edge opens the menu, swipe left closes it.
function useSwipeMenu(open, setOpen) {
  useEffect(() => {
    let start = null;
    const onStart = (e) => {
      if (e.touches.length !== 1 || !window.matchMedia(MOBILE_QUERY).matches) return;
      const { clientX: x, clientY: y } = e.touches[0];
      start = open || x <= EDGE ? { x, y } : null;
    };
    const onEnd = (e) => {
      if (!start) return;
      const { clientX, clientY } = e.changedTouches[0];
      const dx = clientX - start.x;
      const dy = Math.abs(clientY - start.y);
      start = null;
      if (Math.abs(dx) < SWIPE || dy > Math.abs(dx)) return; // too short or mostly vertical
      if (!open && dx > 0) setOpen(true);
      if (open && dx < 0) setOpen(false);
    };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchend', onEnd);
    };
  }, [open, setOpen]);
}

function usePageVisible() {
  const [visible, setVisible] = useState(() => document.visibilityState === 'visible');
  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);
  return visible;
}

export default function App() {
  const [prefs, setPrefs] = useState(loadLocalPrefs);

  useEffect(() => {
    applyTheme(prefs.theme);
    document.documentElement.lang = prefs.lang;
    saveLocalPrefs(prefs);
    if (prefs.theme !== 'system') return;
    // Follow the OS switching between light and dark while the app is open.
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [prefs]);

  return (
    <I18nProvider lang={prefs.lang}>
      <Root prefs={prefs} setPrefs={setPrefs} />
    </I18nProvider>
  );
}

function Root({ prefs, setPrefs }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    if (!supabase) return setLoading(false);
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (!supabase) return <SetupScreen />;
  if (loading) return <div className="auth"><div className="spinner" aria-label="Loading" /></div>;
  if (recovering) return <NewPasswordScreen onDone={() => setRecovering(false)} />;
  if (!session) return <AuthScreen notice={authRedirect} prefs={prefs} setPrefs={setPrefs} />;
  return <Studio session={session} notice={authRedirect} prefs={prefs} setPrefs={setPrefs} />;
}

function Studio({ session, notice, prefs, setPrefs }) {
  const { t } = useI18n();
  const sync = useStudioSync(session.user.id);
  const { data, setData } = sync;
  const [page, setPageState] = useState(() => {
    if (prefs.startPage !== 'last') return prefs.startPage;
    try {
      const saved = localStorage.getItem(PAGE_KEY);
      return saved === 'Settings' || SECTIONS.some(([n]) => n === saved) ? saved : 'Dashboard';
    } catch {
      return 'Dashboard';
    }
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const visible = usePageVisible();
  const chat = useTeamChat(session, page === 'Chat' && visible);

  // Show unread chat messages in the browser tab and home-screen app title.
  useEffect(() => {
    document.title = chat.unread ? `(${chat.unread}) whatdbag Studio` : 'whatdbag Studio';
  }, [chat.unread]);

  // The synced settings are the source of truth once loaded (they may come from another device).
  const settings = data?.settings;
  useEffect(() => {
    if (settings && JSON.stringify(settings) !== JSON.stringify(prefs)) setPrefs(settings);
  }, [settings]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (p) => {
    setPageState(p);
    setMenuOpen(false);
    window.scrollTo({ top: 0 });
    try {
      localStorage.setItem(PAGE_KEY, p);
    } catch { /* storage unavailable */ }
  };

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  useSwipeMenu(menuOpen, setMenuOpen);

  if (!data) {
    return (
      <div className="auth">
        <div className="spinner" aria-label="Loading" />
        <p className="loadingText">{sync.status === 'error' ? sync.message : t('app.loadingStudio')}</p>
        {sync.status === 'error' && <button className="lightButton" onClick={() => window.location.reload()}>{t('app.tryAgain')}</button>}
      </div>
    );
  }

  const campaign = data.campaigns.find((c) => c.id === data.active) ?? data.campaigns[0];
  const update = (fn) =>
    setData((d) => ({ ...d, campaigns: d.campaigns.map((c) => (c.id === d.active ? fn(c) : c)) }));
  const props = { campaign, update, go, data, setData, session };
  const navButton = (name, Icon) => (
    <button key={name} className={page === name ? 'nav active' : 'nav'} aria-current={page === name ? 'page' : undefined} onClick={() => go(name)}>
      <Icon size={18} />
      {t(`nav.${name}`)}
      {name === 'Chat' && chat.unread > 0 && <span className="navBadge">{chat.unread > 99 ? '99+' : chat.unread}</span>}
    </button>
  );

  return (
    <div className="shell">
      {notice && <Toast ok={notice.ok} text={notice.key ? t(notice.key) : notice.text} />}
      <aside className={menuOpen ? 'sidebar open' : 'sidebar'} aria-label={t('app.mainNav')}>
        <div className="brand">
          whatdbag<span>.</span>
          <small>STUDIO / PRIVATE</small>
        </div>
        <nav>{SECTIONS.map(([name, Icon]) => navButton(name, Icon))}</nav>
        <div className="sidebottom">
          {navButton('Settings', SettingsIcon)}
          <div className="tiny">{session.user.email}</div>
          <button className="nav" onClick={() => supabase.auth.signOut()}>
            <LogOut size={17} />
            {t('app.signOut')}
          </button>
        </div>
      </aside>
      {menuOpen && <div className="backdrop" onClick={() => setMenuOpen(false)} />}

      <main>
        <header>
          <button className="mobileMenu" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? t('app.closeMenu') : t('app.openMenu')} aria-expanded={menuOpen}>
            {menuOpen ? <X /> : <Menu />}
          </button>
          <div className="headTitle">
            <div className="eyebrow">{t('app.eyebrow')}</div>
            <h2>{t(`nav.${page}`)}</h2>
          </div>
          <div className="headerRight">
            <SyncBadge sync={sync} />
            <button className="secondary small hideMobile" onClick={() => exportBackup(data)}>
              <Download size={15} /> {t('app.backup')}
            </button>
          </div>
        </header>

        <div className="content">
          {page !== 'Settings' && page !== 'Chat' && (
            <div className="campaignBar">
              <label htmlFor="active-campaign">{t('app.activeCampaign')}</label>
              <select id="active-campaign" value={campaign.id} onChange={(e) => setData((d) => ({ ...d, active: e.target.value }))}>
                {data.campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button className="secondary small" onClick={() => go('Campaigns')}><Plus size={15} /> {t('app.new')}</button>
            </div>
          )}

          {page === 'Dashboard' && <Dashboard {...props} campaignCount={data.campaigns.length} />}
          {page === 'Shot List' && <ShotList key={campaign.id} {...props} />}
          {page === 'Reels Planner' && <ReelsPlanner {...props} />}
          {page === 'Calendar' && <Calendar {...props} />}
          {page === 'AI Studio' && <AIStudio key={campaign.id} {...props} />}
          {page === 'Campaigns' && <Campaigns {...props} />}
          {page === 'Settings' && <Settings {...props} />}
          {page === 'Chat' && <Chat chat={chat} />}

          {page !== 'Chat' && <footer>{t('app.footer')}</footer>}
        </div>
      </main>
    </div>
  );
}
