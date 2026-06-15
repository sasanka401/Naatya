import { Menu, Clapperboard } from 'lucide-react';
import { useProduction } from '../lib/production-context';
import { useAuth } from '../lib/auth-context';

interface Props {
  title: string;
  onMenuClick: () => void;
}

export function Topbar({ title, onMenuClick }: Props) {
  const { productions, selectedId, setSelectedId } = useProduction();
  const { user } = useAuth();
  const initial = (user?.email?.[0] ?? 'U').toUpperCase();

  return (
    <header className="top-navbar">
      <div className="flex items-center gap-3">
        <button className="hamburger" onClick={onMenuClick}><Menu size={22} /></button>
        <span className="page-title">{title}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Clapperboard size={16} className="text-primary" />
          <select
            className="prod-select"
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            title="Switch production"
          >
            <option value="all">All Productions</option>
            {productions.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="user-avatar">{initial}</div>
      </div>
    </header>
  );
}
