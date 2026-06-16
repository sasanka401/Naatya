import { Menu, Clapperboard, Bell, Check, Trash2 } from 'lucide-react';
import { useProduction } from '../lib/production-context';
import { useAuth } from '../lib/auth-context';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Props {
  title: string;
  onMenuClick: () => void;
}

export function Topbar({ title, onMenuClick }: Props) {
  const { productions, selectedId, setSelectedId } = useProduction();
  const { user } = useAuth();
  const initial = (user?.email?.[0] ?? 'U').toUpperCase();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  async function fetchNotifications() {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) {
      setNotifications(data);
    }
  }

  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    const channel = supabase
      .channel(`user-notifications-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `profile_id=eq.${user.id}`
      }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  async function markAsRead(id: string) {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);
    fetchNotifications();
  }

  async function markAllAsRead() {
    if (!user) return;
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('profile_id', user.id);
    fetchNotifications();
  }

  async function deleteNotification(id: string) {
    await supabase
      .from('notifications')
      .delete()
      .eq('id', id);
    fetchNotifications();
  }

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

        {/* Notification Bell */}
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setIsOpen(!isOpen)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--naatya-text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.5rem',
              borderRadius: '50%',
              position: 'relative'
            }}
            title="Notifications"
          >
            <Bell size={20} style={{ color: unreadCount > 0 ? 'var(--naatya-accent)' : 'inherit' }} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '2px',
                right: '2px',
                background: 'var(--naatya-accent)',
                color: '#fff',
                borderRadius: '50%',
                width: '16px',
                height: '16px',
                fontSize: '0.65rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                boxShadow: '0 0 0 2px var(--naatya-bg)'
              }}>
                {unreadCount}
              </span>
            )}
          </button>

          {isOpen && (
            <div 
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '0.5rem',
                width: '320px',
                background: '#1e293b',
                border: '1px solid var(--naatya-border)',
                borderRadius: '12px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                zIndex: 50,
                overflow: 'hidden'
              }}
            >
              <div style={{
                padding: '0.75rem 1rem',
                borderBottom: '1px solid var(--naatya-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(255, 255, 255, 0.02)'
              }}>
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Notifications</span>
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--naatya-accent)',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      fontWeight: 500
                    }}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--naatya-text-muted)', fontSize: '0.8rem' }}>
                    No notifications yet
                  </div>
                ) : (
                  notifications.map(n => (
                    <div 
                      key={n.id}
                      style={{
                        padding: '0.75rem 1rem',
                        borderBottom: '1px solid var(--naatya-border)',
                        background: n.read ? 'transparent' : 'rgba(99, 102, 241, 0.05)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem',
                        position: 'relative'
                      }}
                    >
                      <p style={{
                        fontSize: '0.8rem',
                        color: n.read ? 'var(--naatya-text-muted)' : 'var(--naatya-text)',
                        lineHeight: '1.4',
                        margin: 0,
                        paddingRight: '2rem'
                      }}>
                        {n.message}
                      </p>
                      <span style={{ fontSize: '0.65rem', color: 'var(--naatya-text-muted)' }}>
                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      
                      <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', display: 'flex', gap: '0.25rem' }}>
                        {!n.read && (
                          <button 
                            onClick={() => markAsRead(n.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10b981', padding: '0.1rem' }}
                            title="Mark as read"
                          >
                            <Check size={12} />
                          </button>
                        )}
                        <button 
                          onClick={() => deleteNotification(n.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0.1rem' }}
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="user-avatar">{initial}</div>
      </div>
    </header>
  );
}

