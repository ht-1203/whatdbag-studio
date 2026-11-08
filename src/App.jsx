import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Camera, Clapperboard, CalendarDays, WandSparkles, FolderPlus, LogOut, Plus, Download, Menu, X,
} from 'lucide-react';
import { supabase } from './lib/supabase';
import { useStudioSync } from './hooks/useStudioSync';
import { AuthScreen, NewPasswordScreen, SetupScreen } from './components/Auth';
import SyncBadge from './components/SyncBadge';
import Dashboard from './pages/Dashboard';
import ShotList from './pages/ShotList';
import ReelsPlanner from './pages/ReelsPlanner';
import Calendar from './pages/Calendar';
import AIStudio from './pages/AIStudio';
import Campaigns, { exportBackup } from './pages/Campaigns';

const SECTIONS = [
  ['Dashboard', LayoutDashboard],
  ['Shot List', Camera],
  ['Reels Planner', Clapperboard],
  ['Calendar', CalendarDays],
  ['AI Studio', WandSparkles],
  ['Campaigns', FolderPlus],
];
const PAGE_KEY = 'whatdbag.page';

export default function App() {
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
  if (!session) return <AuthScreen />;
  return <Studio session={session} />;
}

function Studio({ session }) {
  const sync = useStudioSync(session.user.id);
  const { data, setData } = sync;
  const [page, setPageState] = useState(() => {
    try {
      const saved = localStorage.getItem(PAGE_KEY);
      return SECTIONS.some(([n]) => n === saved) ? saved : 'Dashboard';
    } catch {
      return 'Dashboard';
    }
  });
  const [menuOpen, setMenuOpen] = useState(false);

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

  if (!data) {
    return (
      <div className="auth">
        <div className="spinner" aria-label="Loading" />
        <p className="loadingText">{sync.status === 'error' ? sync.message : 'Loading your private studio…'}</p>
        {sync.status === 'error' && <button className="lightButton" onClick={() => window.location.reload()}>Try again</button>}
      </div>
    );
  }

  const campaign = data.campaigns.find((c) => c.id === data.active) ?? data.campaigns[0];
  const update = (fn) =>
    setData((d) => ({ ...d, campaigns: d.campaigns.map((c) => (c.id === d.active ? fn(c) : c)) }));
  const props = { campaign, update, go, data, setData };

  return (
    <div className="shell">
      <aside className={menuOpen ? 'sidebar open' : 'sidebar'} aria-label="Main navigation">
        <div className="brand">
          whatdbag<span>.</span>
          <small>STUDIO / PRIVATE</small>
        </div>
        <nav>
          {SECTIONS.map(([name, Icon]) => (
            <button key={name} className={page === name ? 'nav active' : 'nav'} aria-current={page === name ? 'page' : undefined} onClick={() => go(name)}>
              <Icon size={18} />
              {name}
            </button>
          ))}
        </nav>
        <div className="sidebottom">
          <div className="tiny">{session.user.email}</div>
          <button className="nav" onClick={() => supabase.auth.signOut()}>
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      </aside>
      {menuOpen && <div className="backdrop" onClick={() => setMenuOpen(false)} />}

      <main>
        <header>
          <button className="mobileMenu" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen}>
            {menuOpen ? <X /> : <Menu />}
          </button>
          <div className="headTitle">
            <div className="eyebrow">CONTENT OPERATIONS</div>
            <h2>{page}</h2>
          </div>
          <div className="headerRight">
            <SyncBadge sync={sync} />
            <button className="secondary small hideMobile" onClick={() => exportBackup(data)}>
              <Download size={15} /> Backup
            </button>
          </div>
        </header>

        <div className="content">
          <div className="campaignBar">
            <label htmlFor="active-campaign">ACTIVE CAMPAIGN</label>
            <select id="active-campaign" value={campaign.id} onChange={(e) => setData((d) => ({ ...d, active: e.target.value }))}>
              {data.campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button className="secondary small" onClick={() => go('Campaigns')}><Plus size={15} /> New</button>
          </div>

          {page === 'Dashboard' && <Dashboard {...props} campaignCount={data.campaigns.length} />}
          {page === 'Shot List' && <ShotList key={campaign.id} {...props} />}
          {page === 'Reels Planner' && <ReelsPlanner {...props} />}
          {page === 'Calendar' && <Calendar {...props} />}
          {page === 'AI Studio' && <AIStudio key={campaign.id} {...props} />}
          {page === 'Campaigns' && <Campaigns {...props} />}

          <footer>whatdbag studio · Private content operations · Cloud sync enabled</footer>
        </div>
      </main>
    </div>
  );
}
