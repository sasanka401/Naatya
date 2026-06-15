import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { ToastContainer, showToast } from './components/Toast';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Members } from './pages/Members';
import { Inventory } from './pages/Inventory';
import { Rehearsals } from './pages/Rehearsals';
import { Scripts } from './pages/Scripts';
import { Characters } from './pages/Characters';
import { Team } from './pages/Team';
import { Profile } from './pages/Profile';
import { Security } from './pages/Security';
import { supabase } from './lib/supabase';
import { AuthProvider, useAuth } from './lib/auth-context';
import { ProductionProvider } from './lib/production-context';

type Page = 'dashboard' | 'members' | 'characters' | 'inventory' | 'rehearsals' | 'scripts' | 'team' | 'profile' | 'security';

const pageTitles: Record<Page, string> = {
  dashboard:  'Dashboard',
  members:    'Cast & Crew Management',
  characters: 'Characters & Casting',
  inventory:  'Inventory Management',
  rehearsals: 'Rehearsal Scheduler',
  scripts:    'Script Library',
  team:       'Team & Access Management',
  profile:    'My Profile',
  security:   'Security Information',
};

function AppShell() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);

  // Security: blur on tab switch
  useEffect(() => {
    const handler = () => setTabHidden(document.hidden);
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  // Security: disable right-click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      e.preventDefault();
      showToast('Right-click is disabled for security.', 'warning');
    };
    document.addEventListener('contextmenu', handler);
    return () => document.removeEventListener('contextmenu', handler);
  }, []);

  // Security: block copy/cut
  useEffect(() => {
    const onCopy = (e: ClipboardEvent) => { e.preventDefault(); showToast('Copy is blocked for security.', 'warning'); };
    const onCut  = (e: ClipboardEvent) => { e.preventDefault(); showToast('Cut is blocked for security.', 'warning'); };
    document.addEventListener('copy', onCopy);
    document.addEventListener('cut', onCut);
    return () => { document.removeEventListener('copy', onCopy); document.removeEventListener('cut', onCut); };
  }, []);

  // Security: block dev tools shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && ['I','i','J','j','C','c'].includes(e.key)) ||
        ((e.ctrlKey || e.metaKey) && ['U','u'].includes(e.key))
      ) {
        e.preventDefault();
        showToast('Developer tools access is blocked.', 'warning');
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    showToast('Logged out successfully.', 'info');
  }

  if (loading) {
    return null;
  }

  if (!user) {
    return (
      <>
        <Login onLogin={() => { /* auth state listener handles the rest */ }} />
        <ToastContainer />
      </>
    );
  }

  return (
    <>
      <div className="app-wrapper">
        <Sidebar
          current={page}
          onNavigate={setPage}
          onLogout={handleLogout}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="main-content">
          <Topbar title={pageTitles[page]} onMenuClick={() => setSidebarOpen(o => !o)} />
          {page === 'dashboard'  && <Dashboard />}
          {page === 'members'    && <Members />}
          {page === 'characters' && <Characters />}
          {page === 'inventory'  && <Inventory />}
          {page === 'rehearsals' && <Rehearsals />}
          {page === 'scripts'    && <Scripts />}
          {page === 'team'       && <Team />}
          {page === 'profile'    && <Profile />}
          {page === 'security'   && <Security />}
        </main>
      </div>

      {/* Tab-switch blur overlay */}
      <div className={`blur-overlay${tabHidden ? ' active' : ''}`}>
        <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        <h4>Tab Switch Detected</h4>
        <p>Content hidden for security. Return to this tab to continue.</p>
      </div>

      <ToastContainer />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ProductionProvider>
        <AppShell />
      </ProductionProvider>
    </AuthProvider>
  );
}
