import { useState, useEffect } from 'react';
import { ShieldCheck, LogOut, Check, X, Link, FileText, LayoutDashboard, AlertOctagon, Users, Clapperboard, Pencil, Trash2, Plus, Search, Menu } from 'lucide-react';
import { showToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { Modal } from '../components/Modal';
import type { Profile, Production, ApprovalStatus, MemberStatus } from '../lib/types';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'approvals' | 'surveillance' | 'directory' | 'productions'>('overview');
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, totalCrew: 0, totalCast: 0, totalProductions: 0, totalAlarms: 0 });
  const [pendingApprovals, setPendingApprovals] = useState<Profile[]>([]);
  const [alarms, setAlarms] = useState<SecurityAlarm[]>([]);
  const [directory, setDirectory] = useState<any[]>([]);
  const [productions, setProductions] = useState<Production[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Search and filter states for User Directory
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'crew' | 'cast'>('all');

  // User editing states
  const [editUser, setEditUser] = useState<Profile | null>(null);
  const [editRole, setEditRole] = useState<'Director' | 'Cast'>('Cast');
  const [editDetailedRole, setEditDetailedRole] = useState('');
  const [editApprovalStatus, setEditApprovalStatus] = useState<ApprovalStatus>('pending_onboarding');
  const [editIsAdmin, setEditIsAdmin] = useState(false);
  const [editName, setEditName] = useState('');
  const [editStageName, setEditStageName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editStatus, setEditStatus] = useState<MemberStatus>('Free');
  const [saving, setSaving] = useState(false);

  // Production creation & editing states
  const [showAddProdModal, setShowAddProdModal] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [editProd, setEditProd] = useState<Production | null>(null);
  const [showEditProdModal, setShowEditProdModal] = useState(false);
  const [editProdName, setEditProdName] = useState('');

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
        .select('*, members(*)')
        .order('email', { ascending: true });
      setDirectory((data as any[]) ?? []);
    }

    if (activeTab === 'productions') {
      const { data } = await supabase
        .from('productions')
        .select('*')
        .order('created_at', { ascending: false });
      setProductions((data as Production[]) ?? []);
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

  function handleOpenEditModal(p: any) {
    setEditUser(p);
    setEditRole(p.role);
    setEditDetailedRole(p.detailed_role ?? '');
    setEditApprovalStatus(p.approval_status);
    setEditIsAdmin(p.is_admin);
    setEditName(p.members?.name ?? '');
    setEditStageName(p.members?.stage_name ?? '');
    setEditPhone(p.members?.phone ?? '');
    setEditAddress(p.members?.address ?? '');
    setEditStatus(p.members?.status ?? 'Free');
  }

  async function handleSaveUser() {
    if (!editUser) return;
    setSaving(true);

    try {
      let currentMemberId = editUser.member_id;

      // 1. If member_id doesn't exist, create one in the members table
      if (!currentMemberId) {
        const { data: newMember, error: memberErr } = await supabase
          .from('members')
          .insert({
            name: editName.trim() || editUser.email.split('@')[0],
            role: editDetailedRole || 'Actor',
            phone: editPhone.trim(),
            stage_name: editStageName.trim(),
            address: editAddress.trim(),
            status: editStatus
          })
          .select('id')
          .single();

        if (memberErr) throw new Error(`Failed to create member record: ${memberErr.message}`);
        currentMemberId = newMember.id;
      } else {
        // Update existing member record
        const { error: memberErr } = await supabase
          .from('members')
          .update({
            name: editName.trim(),
            role: editDetailedRole || 'Actor',
            phone: editPhone.trim(),
            stage_name: editStageName.trim(),
            address: editAddress.trim(),
            status: editStatus
          })
          .eq('id', currentMemberId);

        if (memberErr) throw new Error(`Failed to update member details: ${memberErr.message}`);
      }

      // 2. Update profiles record
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({
          role: editRole,
          detailed_role: editDetailedRole,
          approval_status: editApprovalStatus,
          is_admin: editIsAdmin,
          member_id: currentMemberId
        })
        .eq('id', editUser.id);

      if (profileErr) throw new Error(`Failed to update profile: ${profileErr.message}`);

      showToast('User updated successfully!', 'success');
      setEditUser(null);
      loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Update failed', 'danger');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteUser(profile: Profile) {
    const confirmDel = window.confirm(
      `Are you sure you want to permanently delete user ${profile.email}?\n\nThis will delete their authentication account, profile, linked crew/cast member record, and all their data.`
    );
    if (!confirmDel) return;

    const { error } = await supabase.rpc('delete_user_by_admin', { target_user_id: profile.id });
    if (error) {
      showToast(`Failed to delete user: ${error.message}`, 'danger');
    } else {
      showToast(`User ${profile.email} deleted successfully.`, 'success');
      loadAllData();
    }
  }

  async function handleAddProduction() {
    if (!newProdName.trim()) {
      showToast('Please enter a production name.', 'warning');
      return;
    }
    setSaving(true);

    const { error } = await supabase
      .from('productions')
      .insert({ name: newProdName.trim() });

    setSaving(false);
    if (error) {
      showToast(`Failed to create production: ${error.message}`, 'danger');
    } else {
      showToast('Production created successfully!', 'success');
      setNewProdName('');
      setShowAddProdModal(false);
      loadAllData();
    }
  }

  async function handleEditProduction() {
    if (!editProd || !editProdName.trim()) {
      showToast('Please enter a production name.', 'warning');
      return;
    }
    setSaving(true);

    const { error } = await supabase
      .from('productions')
      .update({ name: editProdName.trim() })
      .eq('id', editProd.id);

    setSaving(false);
    if (error) {
      showToast(`Failed to rename production: ${error.message}`, 'danger');
    } else {
      showToast('Production renamed successfully!', 'success');
      setEditProd(null);
      setEditProdName('');
      setShowEditProdModal(false);
      loadAllData();
    }
  }

  async function handleDeleteProduction(prod: Production) {
    const confirmDel = window.confirm(
      `WARNING: Are you absolutely sure you want to delete the production "${prod.name}"?\n\nThis will also delete all associated crew members, rehearsals, scripts, inventory items, and security logs. This action is permanent and cannot be undone.`
    );
    if (!confirmDel) return;

    const { error } = await supabase
      .from('productions')
      .delete()
      .eq('id', prod.id);

    if (error) {
      showToast(`Failed to delete production: ${error.message}`, 'danger');
    } else {
      showToast(`Production "${prod.name}" deleted successfully.`, 'success');
      loadAllData();
    }
  }

  const filteredDirectory = directory.filter(p => {
    const search = searchQuery.toLowerCase();
    const emailMatch = p.email.toLowerCase().includes(search);
    const memberNameMatch = p.members?.name?.toLowerCase().includes(search) ?? false;
    const stageNameMatch = p.members?.stage_name?.toLowerCase().includes(search) ?? false;
    const phoneMatch = p.members?.phone?.includes(search) ?? false;
    const matchesSearch = emailMatch || memberNameMatch || stageNameMatch || phoneMatch;

    const isCrewRole = ['Director', 'Writer', 'Producer', 'Cameraman', 'Lighting Technician', 'Sound Engineer', 'Makeup Artist'].includes(p.detailed_role ?? '');
    const isCastRole = ['Actor', 'Actress', 'Supporting Actor', 'Supporting Actress'].includes(p.detailed_role ?? '');
    
    let matchesRole = true;
    if (filterRole === 'crew') {
      matchesRole = isCrewRole;
    } else if (filterRole === 'cast') {
      matchesRole = isCastRole;
    }

    return matchesSearch && matchesRole;
  });

  return (
    <div className="app-wrapper" style={{ minHeight: '100vh', display: 'flex' }}>
      {/* 1. Admin sidebar layout */}
      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`} style={{ background: '#1e293b', borderRight: '1px solid #334155' }}>
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
            onClick={() => { setActiveTab('overview'); setSidebarOpen(false); }}
            style={activeTab === 'overview' ? { background: '#334155', color: '#fff' } : { color: '#94a3b8' }}
          >
            <LayoutDashboard size={18} /> Overview
          </button>

          <button
            className={`sidebar-link${activeTab === 'approvals' ? ' active' : ''}`}
            onClick={() => { setActiveTab('approvals'); setSidebarOpen(false); }}
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
            onClick={() => { setActiveTab('surveillance'); setSidebarOpen(false); }}
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
            onClick={() => { setActiveTab('directory'); setSidebarOpen(false); }}
            style={activeTab === 'directory' ? { background: '#334155', color: '#fff' } : { color: '#94a3b8' }}
          >
            <Users size={18} /> User Directory
          </button>

          <button
            className={`sidebar-link${activeTab === 'productions' ? ' active' : ''}`}
            onClick={() => { setActiveTab('productions'); setSidebarOpen(false); }}
            style={activeTab === 'productions' ? { background: '#334155', color: '#fff' } : { color: '#94a3b8' }}
          >
            <Clapperboard size={18} /> Productions
          </button>
        </nav>

        <div className="sidebar-footer" style={{ borderTop: '1px solid #334155', padding: '1rem' }}>
          <button className="sidebar-link" onClick={handleLogout} style={{ width: '100%', color: '#f87171' }}>
            <LogOut size={18} /> Log Out Console
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="sidebar-overlay show" onClick={() => setSidebarOpen(false)} />}

      {/* 2. Admin content panel */}
      <main className="main-content" style={{ flex: 1, background: '#f8fafc' }}>
        <header className="top-navbar" style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem', height: 'var(--topbar-height)', position: 'sticky', top: 0, zIndex: 1020 }}>
          <div className="flex items-center gap-3">
            <button className="hamburger" onClick={() => setSidebarOpen(o => !o)}><Menu size={22} /></button>
            <span className="page-title" style={{ fontWeight: 600, color: '#0f172a' }}>Admin Console</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="user-badge">
              <span className="text-muted text-xs">Logged in as admin</span>
            </div>
            <div className="user-avatar" style={{ background: 'linear-gradient(135deg, #64748b, #475569)' }}>A</div>
          </div>
        </header>
        
        {/* Overview view */}
        {activeTab === 'overview' && (
          <div className="content-area">
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
              <div 
                className="card text-center stats-card-clickable" 
                style={{ padding: '1.5rem', cursor: 'pointer', transition: 'transform 0.2s' }}
                onClick={() => { setActiveTab('directory'); setFilterRole('all'); }}
              >
                <Users size={28} className="text-primary mx-auto mb-2" />
                <h6 className="text-muted text-xs font-semibold uppercase">Total Profiles</h6>
                <h3 className="font-bold text-2xl mt-1">{stats.totalUsers}</h3>
              </div>

              <div 
                className="card text-center stats-card-clickable" 
                style={{ padding: '1.5rem', cursor: 'pointer', transition: 'transform 0.2s' }}
                onClick={() => { setActiveTab('directory'); setFilterRole('crew'); }}
              >
                <ShieldCheck size={28} className="text-accent mx-auto mb-2" />
                <h6 className="text-muted text-xs font-semibold uppercase">Crew Members</h6>
                <h3 className="font-bold text-2xl mt-1">{stats.totalCrew}</h3>
              </div>

              <div 
                className="card text-center stats-card-clickable" 
                style={{ padding: '1.5rem', cursor: 'pointer', transition: 'transform 0.2s' }}
                onClick={() => { setActiveTab('directory'); setFilterRole('cast'); }}
              >
                <Users size={28} className="text-success mx-auto mb-2" />
                <h6 className="text-muted text-xs font-semibold uppercase">Cast Members</h6>
                <h3 className="font-bold text-2xl mt-1">{stats.totalCast}</h3>
              </div>

              <div 
                className="card text-center stats-card-clickable" 
                style={{ padding: '1.5rem', cursor: 'pointer', transition: 'transform 0.2s' }}
                onClick={() => { setActiveTab('productions'); }}
              >
                <Clapperboard size={28} className="text-primary mx-auto mb-2" />
                <h6 className="text-muted text-xs font-semibold uppercase">Active Productions</h6>
                <h3 className="font-bold text-2xl mt-1">{stats.totalProductions}</h3>
              </div>

              <div 
                className="card text-center stats-card-clickable" 
                style={{ padding: '1.5rem', borderLeft: '4px solid var(--naatya-danger)', cursor: 'pointer', transition: 'transform 0.2s' }}
                onClick={() => { setActiveTab('surveillance'); }}
              >
                <AlertOctagon size={28} className="text-danger mx-auto mb-2" />
                <h6 className="text-muted text-xs font-semibold uppercase">Security Alarms</h6>
                <h3 className="font-bold text-2xl mt-1 text-danger">{stats.totalAlarms}</h3>
              </div>
            </div>
          </div>
        )}

        {/* Approvals tab */}
        {activeTab === 'approvals' && (
          <div className="content-area">
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
          <div className="content-area">
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
          <div className="content-area">
            <div className="card mb-6">
              <div className="card-header">
                <h5>Registered Users Directory</h5>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="search-wrap">
                    <span className="search-icon"><Search size={14} /></span>
                    <input 
                      placeholder="Search email, name, phone..." 
                      value={searchQuery} 
                      onChange={e => setSearchQuery(e.target.value)} 
                    />
                  </div>
                  <select
                    className="form-input"
                    style={{ width: '160px', padding: '0.35rem 0.5rem', height: 'auto', fontSize: '0.85rem' }}
                    value={filterRole}
                    onChange={e => setFilterRole(e.target.value as any)}
                  >
                    <option value="all">All Roles</option>
                    <option value="crew">Crew Members</option>
                    <option value="cast">Cast Members</option>
                  </select>
                </div>
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
                      <th>Full Name</th>
                      <th>Broad Role</th>
                      <th>Detailed Role</th>
                      <th>Phone</th>
                      <th>Admin Status</th>
                      <th>Verification Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && (
                      <tr><td colSpan={8} style={{ textAlign: 'center', padding: '1.5rem' }}>Loading user directory...</td></tr>
                    )}
                    {!loading && filteredDirectory.length === 0 && (
                      <tr><td colSpan={8} style={{ textAlign: 'center', padding: '1.5rem' }}>No users found matching filters.</td></tr>
                    )}
                    {!loading && filteredDirectory.map(p => (
                      <tr key={p.id}>
                        <td className="font-semibold">{p.email}</td>
                        <td>{p.members?.name || '—'}</td>
                        <td>{p.role}</td>
                        <td>{p.detailed_role ?? '—'}</td>
                        <td>{p.members?.phone || '—'}</td>
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
                        <td>
                          <div className="flex gap-2">
                            <button 
                              className="btn-action btn-edit" 
                              onClick={() => handleOpenEditModal(p)} 
                              title="Edit User"
                            >
                              <Pencil size={13} />
                            </button>
                            <button 
                              className="btn-action btn-del" 
                              onClick={() => handleDeleteUser(p)} 
                              title="Delete User"
                              style={{ color: 'var(--naatya-danger)' }}
                            >
                              <Trash2 size={13} />
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

        {/* Productions tab */}
        {activeTab === 'productions' && (
          <div className="content-area">
            <div className="card mb-6">
              <div className="card-header">
                <h5><Clapperboard size={16} className="text-primary" /> Manage Active Productions</h5>
                <button
                  className="btn-primary"
                  onClick={() => {
                    setNewProdName('');
                    setShowAddProdModal(true);
                  }}
                >
                  <Plus size={15} /> Add Production
                </button>
              </div>
              <div className="card-body">
                <p className="text-muted text-sm">
                  Create, rename, or delete production rooms. Note that deleting a production deletes all its associated rehearsals, inventory items, scripts, and logs.
                </p>
              </div>
            </div>

            <div className="card">
              <div className="table-wrap">
                <table className="naatya-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Production Name</th>
                      <th>Created At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && (
                      <tr><td colSpan={4} style={{ textAlign: 'center', padding: '1.5rem' }}>Loading productions...</td></tr>
                    )}
                    {!loading && productions.length === 0 && (
                      <tr><td colSpan={4} style={{ textAlign: 'center', padding: '1.5rem' }}>No productions found.</td></tr>
                    )}
                    {!loading && productions.map((p, i) => (
                      <tr key={p.id}>
                        <td className="text-muted text-xs">{i + 1}</td>
                        <td className="font-semibold">{p.name}</td>
                        <td className="text-muted">
                          {p.created_at ? new Date(p.created_at).toLocaleString() : '—'}
                        </td>
                        <td>
                          <div className="flex gap-2">
                            <button
                              className="btn-action btn-edit"
                              onClick={() => {
                                setEditProd(p);
                                setEditProdName(p.name);
                                setShowEditProdModal(true);
                              }}
                              title="Rename Production"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              className="btn-action btn-del"
                              onClick={() => handleDeleteProduction(p)}
                              title="Delete Production"
                              style={{ color: 'var(--naatya-danger)' }}
                            >
                              <Trash2 size={13} />
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
      </main>

      {/* Edit User Modal */}
      {editUser && (
        <Modal
          title={`Edit Profile: ${editUser.email}`}
          onClose={() => setEditUser(null)}
          onSave={handleSaveUser}
          saveLabel={saving ? 'Saving...' : 'Save Changes'}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '70vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
            <div>
              <h6 className="font-semibold text-sm mb-3 border-b pb-1 text-primary">System Credentials & Roles</h6>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Broad Access Role</label>
                  <select
                    className="form-input"
                    value={editRole}
                    onChange={e => setEditRole(e.target.value as any)}
                  >
                    <option value="Director">Director</option>
                    <option value="Cast">Cast</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Detailed Production Role</label>
                  <select
                    className="form-input"
                    value={editDetailedRole}
                    onChange={e => setEditDetailedRole(e.target.value)}
                  >
                    <option value="">Select Role...</option>
                    <option value="Director">Director</option>
                    <option value="Writer">Writer</option>
                    <option value="Producer">Producer</option>
                    <option value="Cameraman">Cameraman</option>
                    <option value="Lighting Technician">Lighting Technician</option>
                    <option value="Sound Engineer">Sound Engineer</option>
                    <option value="Makeup Artist">Makeup Artist</option>
                    <option value="Actor">Actor</option>
                    <option value="Actress">Actress</option>
                    <option value="Supporting Actor">Supporting Actor</option>
                    <option value="Supporting Actress">Supporting Actress</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Verification Status</label>
                  <select
                    className="form-input"
                    value={editApprovalStatus}
                    onChange={e => setEditApprovalStatus(e.target.value as any)}
                  >
                    <option value="pending_onboarding">Pending Onboarding Setup</option>
                    <option value="pending_admin">Pending Admin Review</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', marginTop: '1.8rem' }}>
                  <label className="flex items-center gap-2 font-semibold text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editIsAdmin}
                      onChange={e => setEditIsAdmin(e.target.checked)}
                      style={{ width: '16px', height: '16px' }}
                    />
                    Is System Administrator
                  </label>
                </div>
              </div>
            </div>

            <div>
              <h6 className="font-semibold text-sm mb-3 border-b pb-1 text-accent">Personal Member Profile</h6>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    className="form-input"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    placeholder="e.g. Priya Sharma"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Stage Name (Optional)</label>
                  <input
                    className="form-input"
                    value={editStageName}
                    onChange={e => setEditStageName(e.target.value)}
                    placeholder="e.g. Priya"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    className="form-input"
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Availability Status</label>
                  <select
                    className="form-input"
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value as any)}
                  >
                    <option value="Free">Free</option>
                    <option value="Busy">Busy</option>
                    <option value="On Leave">On Leave</option>
                  </select>
                </div>
              </div>
              <div className="form-group mt-3">
                <label className="form-label">Address</label>
                <textarea
                  className="form-input"
                  value={editAddress}
                  onChange={e => setEditAddress(e.target.value)}
                  placeholder="Enter full physical address..."
                  style={{ minHeight: '60px', resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Production Modal */}
      {showAddProdModal && (
        <Modal
          title="Create New Production"
          onClose={() => setShowAddProdModal(false)}
          onSave={handleAddProduction}
          saveLabel={saving ? 'Creating...' : 'Create Production'}
        >
          <div className="form-group">
            <label className="form-label">Production Name</label>
            <input
              className="form-input"
              value={newProdName}
              onChange={e => setNewProdName(e.target.value)}
              placeholder="e.g. Hamlet 2026"
              autoFocus
            />
          </div>
        </Modal>
      )}

      {/* Edit Production Modal */}
      {showEditProdModal && editProd && (
        <Modal
          title={`Rename Production: ${editProd.name}`}
          onClose={() => {
            setShowEditProdModal(false);
            setEditProd(null);
          }}
          onSave={handleEditProduction}
          saveLabel={saving ? 'Saving...' : 'Rename'}
        >
          <div className="form-group">
            <label className="form-label">New Production Name</label>
            <input
              className="form-input"
              value={editProdName}
              onChange={e => setEditProdName(e.target.value)}
              placeholder="e.g. Macbeth 2026"
              autoFocus
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
