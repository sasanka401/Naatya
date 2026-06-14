import { Menu } from 'lucide-react';

interface Props {
  title: string;
  onMenuClick: () => void;
}

export function Topbar({ title, onMenuClick }: Props) {
  return (
    <header className="top-navbar">
      <div className="flex items-center gap-3">
        <button className="hamburger" onClick={onMenuClick}><Menu size={22} /></button>
        <span className="page-title">{title}</span>
      </div>
      <div className="user-badge">
        <span className="text-sm" style={{ display: 'none' }}>Admin</span>
        <div className="user-avatar">A</div>
      </div>
    </header>
  );
}
