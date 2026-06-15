import { useState, useEffect } from 'react';
import { Users, Package, CalendarDays, CheckCircle, Clock, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useProduction } from '../lib/production-context';
import type { Rehearsal, ActivityLogEntry } from '../lib/types';

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

function formatDate(d: string) {
  if (!d) return { day: '', month: '' };
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const [, m, day] = d.split('-');
  return { day, month: months[parseInt(m) - 1] };
}

function formatTime(t: string) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function Dashboard() {
  const { selectedId, isAll } = useProduction();
  const [memberCount, setMemberCount] = useState(0);
  const [propCount, setPropCount] = useState(0);
  const [availablePropCount, setAvailablePropCount] = useState(0);
  const [rehearsalCount, setRehearsalCount] = useState(0);
  const [upcoming, setUpcoming] = useState<Rehearsal[]>([]);
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);

  useEffect(() => {
    loadStats();
  }, [selectedId]);

  async function loadStats() {
    const pf = <T,>(q: T): T => (isAll ? q : (q as any).eq('production_id', selectedId));

    const [members, props, availableProps, rehearsals, upcomingRehearsals, recentActivity] = await Promise.all([
      pf(supabase.from('members').select('*', { count: 'exact', head: true })),
      pf(supabase.from('inventory').select('*', { count: 'exact', head: true })),
      pf(supabase.from('inventory').select('*', { count: 'exact', head: true }).eq('status', 'Available')),
      pf(supabase.from('rehearsals').select('*', { count: 'exact', head: true })),
      pf(supabase.from('rehearsals').select('*').order('rehearsal_date', { ascending: true }).order('rehearsal_time', { ascending: true }).limit(4)),
      supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(6),
    ]);

    setMemberCount(members.count ?? 0);
    setPropCount(props.count ?? 0);
    setAvailablePropCount(availableProps.count ?? 0);
    setRehearsalCount(rehearsals.count ?? 0);
    setUpcoming((upcomingRehearsals.data ?? []) as Rehearsal[]);
    setActivities((recentActivity.data ?? []) as ActivityLogEntry[]);
  }

  return (
    <div className="content-area">
      <div className="stats-grid mb-6">
        <div className="stat-card c-primary">
          <div className="stat-icon"><Users size={22} /></div>
          <div className="stat-value">{memberCount}</div>
          <div className="stat-label">Total Members</div>
        </div>
        <div className="stat-card c-success">
          <div className="stat-icon"><Package size={22} /></div>
          <div className="stat-value">{propCount}</div>
          <div className="stat-label">Total Props</div>
        </div>
        <div className="stat-card c-warning">
          <div className="stat-icon"><CalendarDays size={22} /></div>
          <div className="stat-value">{rehearsalCount}</div>
          <div className="stat-label">Upcoming Rehearsals</div>
        </div>
        <div className="stat-card c-info">
          <div className="stat-icon"><CheckCircle size={22} /></div>
          <div className="stat-value">{availablePropCount}</div>
          <div className="stat-label">Available Props</div>
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-header">
            <h5><Clock size={16} className="text-primary" /> Recent Activities</h5>
          </div>
          <div className="card-body">
            {activities.length === 0 && (
              <p className="text-muted text-sm">No activity yet.</p>
            )}
            {activities.map(a => (
              <div className="activity-item" key={a.id}>
                <div className="activity-dot dot-primary" />
                <div>
                  <div className="activity-text">{a.message}</div>
                  <div className="activity-time">{timeAgo(a.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h5><Calendar size={16} className="text-accent" /> Upcoming Rehearsals</h5>
          </div>
          <div className="card-body">
            {upcoming.map(r => {
              const { day, month } = formatDate(r.rehearsal_date);
              return (
                <div className="rehearsal-item" key={r.id}>
                  <div className="rehearsal-date-badge">
                    <span className="day">{day}</span>
                    <span className="month">{month}</span>
                  </div>
                  <div className="rehearsal-info">
                    <div className="rehearsal-title">{r.title}</div>
                    <div className="rehearsal-meta">{formatTime(r.rehearsal_time)} · {r.venue}</div>
                  </div>
                </div>
              );
            })}
            {upcoming.length === 0 && (
              <p style={{ color: 'var(--naatya-text-muted)', fontSize: '0.85rem' }}>No rehearsals scheduled.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
