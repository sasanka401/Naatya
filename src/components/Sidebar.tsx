import {
  LayoutDashboard, Users, Drama, Package, CalendarDays, FileText, UserCog, UserCircle, ShieldCheck, LogOut, Layers
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '../lib/auth-context';

type Page = 'dashboard' | 'members' | 'characters' | 'inventory' | 'rehearsals' | 'scripts' | 'team' | 'profile' | 'security';

interface Props {
  current: Page;
  onNavigate: (p: Page) => void;
  onLogout: () => void;
  open: boolean;
  onClose: () => void;
}

const links: { page: Page; label: string; Icon: LucideIcon }[] = [
  { page: 'dashboard',  label: 'Dashboard',   Icon: LayoutDashboard },
  { page: 'members',    label: 'Cast & Crew',  Icon: Users },
  { page: 'characters', label: 'Characters',   Icon: Drama },
  { page: 'inventory',  label: 'Inventory',    Icon: Package },
  { page: 'rehearsals', label: 'Rehearsals',   Icon: CalendarDays },
  { page: 'scripts',    label: 'Scripts',      Icon: FileText },
];

export function Sidebar({ current, onNavigate, onLogout, open, onClose }: Props) {
  const { user, profile, isDirector } = useAuth();

  function nav(p: Page) {
    onNavigate(p);
    onClose();
  }

  return (
    <>
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon"><Layers size={22} color="#fff" /></div>
          <span className="sidebar-brand-text">NAATYA</span>
        </div>

        {user && (
          <div style={{ padding: '0 1.25rem 1rem', borderBottom: '1px solid var(--naatya-border)', marginBottom: '0.5rem' }}>
            <div className="text-sm font-semibold" style={{ wordBreak: 'break-all' }}>{user.email}</div>
            <span className="role-badge" style={{ marginTop: '0.35rem', display: 'inline-block' }}>
              {profile?.role ?? 'Cast'}
            </span>
          </div>
        )}

        <nav className="sidebar-nav">
          <div className="nav-section">Main</div>
          {links
            .filter(({ page }) => {
              if (page !== 'scripts') return true;
              const dRole = profile?.detailed_role ?? '';
              return ['Director', 'Writer', 'Actor', 'Actress', 'Supporting Actor', 'Supporting Actress'].includes(dRole) || profile?.role === 'Director';
            })
            .map(({ page, label, Icon }) => (
              <button
                key={page}
                className={`sidebar-link${current === page ? ' active' : ''}`}
                onClick={() => nav(page)}
              >
                <Icon size={18} /> {label}
              </button>
            ))}

          <div className="nav-section" style={{ marginTop: '0.5rem' }}>Account</div>
          <button
            className={`sidebar-link${current === 'profile' ? ' active' : ''}`}
            onClick={() => nav('profile')}
          >
            <UserCircle size={18} /> My Profile
          </button>

          <div className="nav-section" style={{ marginTop: '0.5rem' }}>System</div>
          {isDirector && (
            <button
              className={`sidebar-link${current === 'team' ? ' active' : ''}`}
              onClick={() => nav('team')}
            >
              <UserCog size={18} /> Team
            </button>
          )}
          <button
            className={`sidebar-link${current === 'security' ? ' active' : ''}`}
            onClick={() => nav('security')}
          >
            <ShieldCheck size={18} /> Security
          </button>
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-link" onClick={onLogout} style={{ width: '100%' }}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>
      {open && <div className="sidebar-overlay show" onClick={onClose} />}
    </>
  );
}
