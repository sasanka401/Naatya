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
import { Onboarding } from './pages/Onboarding';
import { AccountRejected } from './pages/AccountRejected';
import { AdminDashboard } from './pages/AdminDashboard';
import { supabase } from './lib/supabase';
import { AuthProvider, useAuth } from './lib/auth-context';
import { ProductionProvider, useProduction } from './lib/production-context';

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
  const { user, profile, loading } = useAuth();
  const [page, setPage] = useState<Page>(() => {
    const redirect = localStorage.getItem('redirect_to_profile');
    if (redirect === 'true') {
      localStorage.removeItem('redirect_to_profile');
      return 'profile';
    }
    return 'dashboard';
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const { setSelectedId } = useProduction();

  // Redirect to scripts page and switch production when landing with a pending invite code
  useEffect(() => {
    if (!profile) return;
    const pendingCode = sessionStorage.getItem('pending_invite_code');
    if (!pendingCode) return;

    async function resolveInvite() {
      if (!pendingCode) return;
      const { data, error } = await supabase
        .from('script_room_invites')
        .select('production_id')
        .eq('code', pendingCode.trim())
        .maybeSingle();

      if (!error && data?.production_id) {
        setSelectedId(data.production_id);
        setPage('scripts');
      }
    }
    
    resolveInvite();
  }, [profile]);

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
  // Realtime surveillance alerts for Directors/Writers
  useEffect(() => {
    if (!profile) return;

    const isDirectorOrWriter = ['Director', 'Writer'].includes(profile.detailed_role ?? '') || profile.role === 'Director';
    if (!isDirectorOrWriter) return;

    // Realtime channel for Script Room entries
    const presenceChannel = supabase
      .channel('script-presence-alerts')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'script_room_presence'
      }, async (payload) => {
        const { data } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', payload.new.profile_id)
          .maybeSingle();
        
        if (data?.email) {
          showToast(`User ${data.email} has just entered the Script Room.`, 'info');
        }
      })
      .subscribe();

    // Realtime channel for Security alarms (screenshots/blurs)
    const alarmChannel = supabase
      .channel('security-alarm-alerts')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'security_alarms'
      }, (payload) => {
        showToast(`SECURITY ALERT: ${payload.new.user_email} attempted ${payload.new.action_attempted}!`, 'danger');
      })
      .subscribe();

    return () => {
      supabase.removeChannel(presenceChannel);
      supabase.removeChannel(alarmChannel);
    };
  }, [profile]);
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

  // Redirect Admins directly to the Admin Dashboard Console
  if (profile?.is_admin) {
    return (
      <>
        <AdminDashboard />
        <ToastContainer />
      </>
    );
  }

  // Handle rejected profiles
  if (profile?.approval_status === 'rejected') {
    return (
      <>
        <AccountRejected />
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

      {profile && !profile.is_admin &&
        (profile.approval_status === 'pending_onboarding' || !profile.detailed_role) && (
        <div className="onboarding-overlay">
          <Onboarding />
        </div>
      )}

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
