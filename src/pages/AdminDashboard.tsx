import { useState, useEffect } from 'react';
import { ShieldCheck, LogOut, Check, X, Link, FileText, LayoutDashboard, AlertOctagon, Users, Clapperboard } from 'lucide-react';
import { showToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/types';

interface Stats {
  totalUsers: number;
  totalCrew: number;
  totalCast: number;
  totalProductions: number;
  totalAlarms: number;
}

interface SecurityAlarm {
  id: string;
  user_email: string;
  action_attempted: string;
  created_at: string;
}

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'approvals' | 'surveillance' | 'directory'>('overview');
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, totalCrew: 0, totalCast: 0, totalProductions: 0, totalAlarms: 0 });
  const [pendingApprovals, setPendingApprovals] = useState<Profile[]>([]);
  const [alarms, setAlarms] = useState<SecurityAlarm[]>([]);
  const [directory, setDirectory] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllData();
  }, [activeTab]);

  async function loadAllData() {
    setLoading(true);
    
    // Fetch stats
    const [profilesRes, productionsRes, alarmsRes] = await Promise.all([
      supabase.from('profiles').select('detailed_role, approval_status'),
      supabase.from('productions').select('id', { count: 'exact' }),
      supabase.from('security_alarms').select('id', { count: 'exact' }),
    ]);

    let totalUsers = 0;
    let totalCrew = 0;
    let totalCast = 0;

    if (profilesRes.data) {
      totalUsers = profilesRes.data.length;
      profilesRes.data.forEach(p => {
        // Detailed role mapping or broad role mapping
        const isCrewRole = ['Director', 'Writer', 'Producer', 'Cameraman', 'Lighting Technician', 'Sound Engineer', 'Makeup Artist'].includes(p.detailed_role ?? '');
        const isCastRole = ['Actor', 'Actress', 'Supporting Actor', 'Supporting Actress'].includes(p.detailed_role ?? '');
        if (isCrewRole) totalCrew++;
        else if (isCastRole) totalCast++;
      });
    }

    setStats({
      totalUsers,
      totalCrew,
      totalCast,
      totalProductions: productionsRes.count ?? 0,
      totalAlarms: alarmsRes.count ?? 0
    });

    if (activeTab === 'approvals') {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('approval_status', 'pending_admin')
        .order('created_at', { ascending: true });
      setPendingApprovals((data as Profile[]) ?? []);
    }

    if (activeTab === 'surveillance') {
      const { data } = await supabase
        .from('security_alarms')
        .select('*')
        .order('created_at', { ascending: false });
      setAlarms((data as SecurityAlarm[]) ?? []);
    }

    if (activeTab === 'directory') {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('email', { ascending: true });
      setDirectory((data as Profile[]) ?? []);
    }

    setLoading(false);
  }

  async function handleApprove(profile: Profile) {
    const { error } = await supabase
      .from('profiles')
      .update({ approval_status: 'approved' })
      .eq('id', profile.id);

    if (error) {
      showToast(`Approval failed: ${error.message}`, 'danger');
    } else {
      showToast(`Approved ${profile.email} successfully!`, 'success');
      setPendingApprovals(prev => prev.filter(p => p.id !== profile.id));
    }
  }

  async function handleReject(profile: Profile) {
    const { error } = await supabase
      .from('profiles')
      .update({ approval_status: 'rejected' })
      .eq('id', profile.id);

    if (error) {
      showToast(`Rejection failed: ${error.message}`, 'danger');
    } else {
      showToast(`Rejected crew request from ${profile.email}.`, 'info');
      setPendingApprovals(prev => prev.filter(p => p.id !== profile.id));
    }
  }

  async function handleDownloadFile(path: string) {
    const { data, error } = await supabase.storage
      .from('portfolios')
      .createSignedUrl(path, 300);

    if (error || !data) {
      showToast(`Could not open file: ${error?.message ?? 'unknown error'}`, 'danger');
    } else {
      window.open(data.signedUrl, '_blank');
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    showToast('Logged out from Admin Console.', 'info');
    window.location.reload();
  }

  return (
    <div className="app-wrapper" style={{ minHeight: '100vh', display: 'flex' }}>
      {/* 1. Admin sidebar layout */}
      <aside className="sidebar open" style={{ background: '#1e293b', borderRight: '1px solid #334155' }}>
        <div className="sidebar-brand" style={{ borderBottom: '1px solid #334155', paddingBottom: '1.25rem' }}>
          <div className="sidebar-brand-icon" style={{ background: 'linear-gradient(135deg, #64748b, #475569)' }}>
            <ShieldCheck size={22} color="#fff" />
          </div>
          <span className="sidebar-brand-text" style={{ color: '#f1f5f9' }}>ADMIN PORTAL</span>
        </div>

        <nav className="sidebar-nav" style={{ flex: 1, padding: '1.25rem' }}>
          <div className="nav-section" style={{ color: '#94a3b8' }}>System Management</div>
          
          <button
            className={`sidebar-link${activeTab === 'overview' ? ' active' : ''}`}
            onClick={() => setActiveTab('overview')}
            style={activeTab === 'overview' ? { background: '#334155', color: '#fff' } : { color: '#94a3b8' }}
          >
            <LayoutDashboard size={18} /> Overview
          </button>

          <button
            className={`sidebar-link${activeTab === 'approvals' ? ' active' : ''}`}
            onClick={() => setActiveTab('approvals')}
            style={activeTab === 'approvals' ? { background: '#334155', color: '#fff' } : { color: '#94a3b8' }}
          >
            <ShieldCheck size={18} /> Crew Approvals
            {pendingApprovals.length > 0 && (
              <span className="badge badge-busy" style={{ marginLeft: 'auto', background: 'var(--naatya-danger)' }}>
                {pendingApprovals.length}
              </span>
            )}
          </button>

          <button
            className={`sidebar-link${activeTab === 'surveillance' ? ' active' : ''}`}
            onClick={() => setActiveTab('surveillance')}
            style={activeTab === 'surveillance' ? { background: '#334155', color: '#fff' } : { color: '#94a3b8' }}
          >
            <AlertOctagon size={18} /> System Alarms
            {stats.totalAlarms > 0 && (
              <span className="badge badge-busy" style={{ marginLeft: 'auto', background: 'var(--naatya-accent)' }}>
                {stats.totalAlarms}
              </span>
            )}
          </button>

          <button
            className={`sidebar-link${activeTab === 'directory' ? ' active' : ''}`}
            onClick={() => setActiveTab('directory')}
            style={activeTab === 'directory' ? { background: '#334155', color: '#fff' } : { color: '#94a3b8' }}
          >
            <Users size={18} /> User Directory
          </button>
        </nav>

        <div className="sidebar-footer" style={{ borderTop: '1px solid #334155', padding: '1rem' }}>
          <button className="sidebar-link" onClick={handleLogout} style={{ width: '100%', color: '#f87171' }}>
            <LogOut size={18} /> Log Out Console
          </button>
        </div>
      </aside>

      {/* 2. Admin content panel */}
      <main className="main-content" style={{ flex: 1, padding: '2rem', background: '#f8fafc', marginLeft: 'var(--sidebar-width)' }}>
        
        {/* Overview view */}
        {activeTab === 'overview' && (
          <div>
            <div className="card mb-6" style={{ background: '#fff', border: '1px solid #e2e8f0' }}>
              <div className="card-header" style={{ borderBottom: '1px solid #f1f5f9' }}>
                <h4 className="flex items-center gap-2" style={{ fontWeight: 700, fontSize: '1.25rem', color: '#0f172a' }}>
                  <ShieldCheck size={20} className="text-primary" /> Admin Console Overview
                </h4>
              </div>
              <div className="card-body">
                <p className="text-muted text-sm leading-relaxed">
                  Welcome to the Naatya Global Admin Console. Here you can manage system access, approve crew member portfolios,
                  monitor active anti-leak alarms across production rooms, and audit user directory credentials.
                </p>
              </div>
            </div>

            {/* Stats grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              <div className="card text-center" style={{ padding: '1.5rem' }}>
                <Users size={28} className="text-primary mx-auto mb-2" />
                <h6 className="text-muted text-xs font-semibold uppercase">Total Profiles</h6>
                <h3 className="font-bold text-2xl mt-1">{stats.totalUsers}</h3>
              </div>

              <div className="card text-center" style={{ padding: '1.5rem' }}>
                <ShieldCheck size={28} className="text-accent mx-auto mb-2" />
                <h6 className="text-muted text-xs font-semibold uppercase">Crew Members</h6>
                <h3 className="font-bold text-2xl mt-1">{stats.totalCrew}</h3>
              </div>

              <div className="card text-center" style={{ padding: '1.5rem' }}>
                <Users size={28} className="text-success mx-auto mb-2" />
                <h6 className="text-muted text-xs font-semibold uppercase">Cast Members</h6>
                <h3 className="font-bold text-2xl mt-1">{stats.totalCast}</h3>
              </div>

              <div className="card text-center" style={{ padding: '1.5rem' }}>
                <Clapperboard size={28} className="text-primary mx-auto mb-2" />
                <h6 className="text-muted text-xs font-semibold uppercase">Active Productions</h6>
                <h3 className="font-bold text-2xl mt-1">{stats.totalProductions}</h3>
              </div>

              <div className="card text-center" style={{ padding: '1.5rem', borderLeft: '4px solid var(--naatya-danger)' }}>
                <AlertOctagon size={28} className="text-danger mx-auto mb-2" />
                <h6 className="text-muted text-xs font-semibold uppercase">Security Alarms</h6>
                <h3 className="font-bold text-2xl mt-1 text-danger">{stats.totalAlarms}</h3>
              </div>
            </div>
          </div>
        )}

        {/* Approvals tab */}
        {activeTab === 'approvals' && (
          <div>
            <div className="card mb-6">
              <div className="card-header">
                <h5>Crew Verification & Portfolio Review</h5>
              </div>
              <div className="card-body">
                <p className="text-muted text-sm">
                  Review portfolio link and CV uploads. Approved profiles gain immediate access to technical/creative crew tools.
                </p>
              </div>
            </div>

            <div className="card">
              <div className="table-wrap">
                <table className="naatya-table">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Requested Role</th>
                      <th>Portfolio Link</th>
                      <th>Uploaded File</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: '1.5rem' }}>Loading pending reviews...</td></tr>
                    )}
                    {!loading && pendingApprovals.length === 0 && (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: '1.5rem' }}>No pending applications.</td></tr>
                    )}
                    {!loading && pendingApprovals.map(p => (
                      <tr key={p.id}>
                        <td className="font-semibold">{p.email}</td>
                        <td><span className="role-badge" style={{ background: 'var(--naatya-accent)', color: '#fff' }}>{p.detailed_role}</span></td>
                        <td>
                          {p.portfolio_link ? (
                            <a href={p.portfolio_link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                              <Link size={13} /> Visit Portfolio
                            </a>
                          ) : '—'}
                        </td>
                        <td>
                          {p.portfolio_path ? (
                            <button onClick={() => handleDownloadFile(p.portfolio_path!)} className="flex items-center gap-1 text-accent hover:underline" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                              <FileText size={13} /> Open CV
                            </button>
                          ) : '—'}
                        </td>
                        <td>
                          <div className="flex gap-2">
                            <button onClick={() => handleApprove(p)} className="btn-action btn-edit" style={{ background: 'var(--naatya-success)', color: '#fff', padding: '0.35rem 0.65rem' }}>
                              <Check size={12} /> Approve
                            </button>
                            <button onClick={() => handleReject(p)} className="btn-action btn-del" style={{ background: 'var(--naatya-danger)', color: '#fff', padding: '0.35rem 0.65rem' }}>
                              <X size={12} /> Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Global surveillance alarms tab */}
        {activeTab === 'surveillance' && (
          <div>
            <div className="card mb-6">
              <div className="card-header">
                <h5 className="text-danger flex items-center gap-1"><AlertOctagon size={16} /> Global Security Alarms Log</h5>
              </div>
              <div className="card-body">
                <p className="text-muted text-sm">
                  Audits screenshot triggers, screen recording attempts, print requests, and tab blurs across all productions.
                </p>
              </div>
            </div>

            <div className="card">
              <div className="table-wrap">
                <table className="naatya-table text-sm">
                  <thead>
                    <tr>
                      <th>Offender Email</th>
                      <th>Action Attempted</th>
                      <th>Alert Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && (
                      <tr><td colSpan={3} style={{ textAlign: 'center', padding: '1.5rem' }}>Loading alarms...</td></tr>
                    )}
                    {!loading && alarms.length === 0 && (
                      <tr><td colSpan={3} style={{ textAlign: 'center', padding: '1.5rem' }}>No security violations recorded.</td></tr>
                    )}
                    {!loading && alarms.map(a => (
                      <tr key={a.id} style={{ borderLeft: '4px solid var(--naatya-danger)' }}>
                        <td className="font-semibold text-danger">{a.user_email}</td>
                        <td className="font-semibold">{a.action_attempted}</td>
                        <td className="text-muted">{new Date(a.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Directory Tab */}
        {activeTab === 'directory' && (
          <div>
            <div className="card mb-6">
              <div className="card-header">
                <h5>Registered Users Directory</h5>
              </div>
              <div className="card-body">
                <p className="text-muted text-sm">
                  Review and audit all profiles registered in the system, showing their role types, admin flags, and onboarding status.
                </p>
              </div>
            </div>

            <div className="card">
              <div className="table-wrap">
                <table className="naatya-table">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Broad Role</th>
                      <th>Detailed Role</th>
                      <th>Admin Status</th>
                      <th>Verification Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: '1.5rem' }}>Loading user directory...</td></tr>
                    )}
                    {!loading && directory.map(p => (
                      <tr key={p.id}>
                        <td className="font-semibold">{p.email}</td>
                        <td>{p.role}</td>
                        <td>{p.detailed_role ?? '—'}</td>
                        <td>
                          {p.is_admin ? (
                            <span className="badge badge-free" style={{ background: '#3b82f6', color: '#fff' }}>Admin</span>
                          ) : (
                            <span className="text-muted text-xs">User</span>
                          )}
                        </td>
                        <td>
                          {p.approval_status === 'approved' && <span className="badge badge-free">Approved</span>}
                          {p.approval_status === 'pending_onboarding' && <span className="badge badge-free" style={{ background: '#94a3b8' }}>Pending Setup</span>}
                          {p.approval_status === 'pending_admin' && <span className="badge badge-busy" style={{ background: 'var(--naatya-accent)' }}>Pending Admin Review</span>}
                          {p.approval_status === 'rejected' && <span className="badge badge-busy">Rejected</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
