import {
  LayoutDashboard, Users, Package, CalendarDays, ShieldCheck, LogOut, Layers
} from 'lucide-react';

type Page = 'dashboard' | 'members' | 'inventory' | 'rehearsals' | 'security';

interface Props {
  current: Page;
  onNavigate: (p: Page) => void;
  onLogout: () => void;
  open: boolean;
  onClose: () => void;
}

const links: { page: Page; label: string; Icon: React.FC<{ size?: number }> }[] = [
  { page: 'dashboard',  label: 'Dashboard',   Icon: LayoutDashboard },
  { page: 'members',    label: 'Cast & Crew',  Icon: Users },
  { page: 'inventory',  label: 'Inventory',    Icon: Package },
  { page: 'rehearsals', label: 'Rehearsals',   Icon: CalendarDays },
];

export function Sidebar({ current, onNavigate, onLogout, open, onClose }: Props) {
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

        <nav className="sidebar-nav">
          <div className="nav-section">Main</div>
          {links.map(({ page, label, Icon }) => (
            <button
              key={page}
              className={`sidebar-link${current === page ? ' active' : ''}`}
              onClick={() => nav(page)}
            >
              <Icon size={18} /> {label}
            </button>
          ))}
          <div className="nav-section" style={{ marginTop: '0.5rem' }}>System</div>
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
