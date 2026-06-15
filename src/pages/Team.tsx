import { useState, useEffect } from 'react';
import { UserCog, ShieldCheck, KeyRound, Plus, Trash2, Copy, Clapperboard } from 'lucide-react';
import { showToast } from '../components/Toast';
import { logActivity } from '../lib/activity';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';
import { useProduction } from '../lib/production-context';
import type { Profile, Member, UserRole, InviteCode, Production } from '../lib/types';

function randomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export function Team() {
  const { user } = useAuth();
  const { productions, reload: reloadProductions } = useProduction();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [newInviteRole, setNewInviteRole] = useState<UserRole>('Cast');
  const [newProductionName, setNewProductionName] = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const [profilesRes, membersRes, invitesRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: true }),
      supabase.from('members').select('*').order('name', { ascending: true }),
      supabase.from('invite_codes').select('*').order('created_at', { ascending: false }),
    ]);

    if (profilesRes.error) showToast(`Failed to load users: ${profilesRes.error.message}`, 'danger');
    else setProfiles(profilesRes.data as Profile[]);

    if (membersRes.error) showToast(`Failed to load members: ${membersRes.error.message}`, 'danger');
    else setMembers(membersRes.data as Member[]);

    if (!invitesRes.error) setInvites(invitesRes.data as InviteCode[]);
    setLoading(false);
  }

  async function changeRole(profile: Profile, role: UserRole) {
    if (profile.id === user?.id && role !== 'Director') {
      showToast("You can't remove your own Director access.", 'warning');
      return;
    }

    const { error } = await supabase.from('profiles').update({ role }).eq('id', profile.id);
    if (error) { showToast(`Update failed: ${error.message}`, 'danger'); return; }

    setProfiles(prev => prev.map(p => p.id === profile.id ? { ...p, role } : p));
    showToast(`${profile.email} is now ${role}.`, 'success');
    logActivity(`${user?.email ?? 'Someone'} set ${profile.email}'s role to ${role}`);
  }

  async function changeMemberLink(profile: Profile, memberId: string) {
    const value = memberId || null;
    const { error } = await supabase.from('profiles').update({ member_id: value }).eq('id', profile.id);
    if (error) { showToast(`Update failed: ${error.message}`, 'danger'); return; }

    setProfiles(prev => prev.map(p => p.id === profile.id ? { ...p, member_id: value } : p));
    const member = members.find(m => m.id === value);
    showToast(`Linked ${profile.email} to ${member ? member.name : 'no one'}.`, 'success');
  }

  async function createInvite() {
    const code = randomCode();
    const { data, error } = await supabase.from('invite_codes')
      .insert({ code, role: newInviteRole })
      .select().single();
    if (error) { showToast(`Failed to create invite: ${error.message}`, 'danger'); return; }
    setInvites(prev => [data as InviteCode, ...prev]);
    showToast(`Invite code created: ${code}`, 'success');
  }

  async function deleteInvite(id: string) {
    const { error } = await supabase.from('invite_codes').delete().eq('id', id);
    if (error) { showToast(`Delete failed: ${error.message}`, 'danger'); return; }
    setInvites(prev => prev.filter(i => i.id !== id));
  }

  function copyCode(code: string) {
    navigator.clipboard?.writeText(code).then(
      () => showToast('Code copied to clipboard.', 'success'),
      () => showToast(`Code: ${code}`, 'info'),
    );
  }

  async function createProduction() {
    if (!newProductionName.trim()) { showToast('Enter a production name.', 'warning'); return; }
    const { error } = await supabase.from('productions').insert({ name: newProductionName.trim() });
    if (error) { showToast(`Failed: ${error.message}`, 'danger'); return; }
    showToast(`Production "${newProductionName}" created.`, 'success');
    logActivity(`${user?.email ?? 'Someone'} created production "${newProductionName}"`);
    setNewProductionName('');
    reloadProductions();
  }

  async function deleteProduction(p: Production) {
    if (!confirm(`Delete production "${p.name}"? This also deletes its members, props, rehearsals, and scripts.`)) return;
    const { error } = await supabase.from('productions').delete().eq('id', p.id);
    if (error) { showToast(`Delete failed: ${error.message}`, 'danger'); return; }
    showToast('Production deleted.', 'success');
    reloadProductions();
  }

  return (
    <div className="content-area">
      <div className="card mb-6">
        <div className="card-header">
          <h5><UserCog size={16} className="text-primary" /> Team &amp; Access Management</h5>
        </div>
        <div className="card-body">
          <p className="text-muted text-sm">
            Manage who has Director (full control) vs Cast (view-only) access, link each
            account to a Cast &amp; Crew record, generate invite codes, and manage productions.
          </p>
        </div>
      </div>

      {/* PRODUCTIONS */}
      <div className="card mb-6">
        <div className="card-header">
          <h5><Clapperboard size={16} className="text-primary" /> Productions</h5>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              className="form-input"
              style={{ width: 'auto' }}
              placeholder="New production name"
              value={newProductionName}
              onChange={e => setNewProductionName(e.target.value)}
            />
            <button className="btn-primary" onClick={createProduction}><Plus size={15} /> Add</button>
          </div>
        </div>
        <div className="card-body">
          {productions.length === 0 && <p className="text-muted text-sm">No productions yet.</p>}
          <div className="flex flex-col gap-2">
            {productions.map(p => (
              <div key={p.id} className="flex items-center justify-between" style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--naatya-border)' }}>
                <span className="font-semibold text-sm">{p.name}</span>
                <button className="btn-action btn-del" onClick={() => deleteProduction(p)} title="Delete"><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* INVITE CODES */}
      <div className="card mb-6">
        <div className="card-header">
          <h5><KeyRound size={16} className="text-accent" /> Invite Codes</h5>
          <div className="flex items-center gap-2 flex-wrap">
            <select className="form-select" style={{ width: 'auto' }} value={newInviteRole} onChange={e => setNewInviteRole(e.target.value as UserRole)}>
              <option value="Cast">Cast</option>
              <option value="Director">Director</option>
            </select>
            <button className="btn-primary" onClick={createInvite}><Plus size={15} /> Generate</button>
          </div>
        </div>
        <div className="table-wrap">
          <table className="naatya-table">
            <thead>
              <tr><th>Code</th><th>Role</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {invites.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--naatya-text-muted)' }}>No invite codes yet.</td></tr>
              )}
              {invites.map(inv => (
                <tr key={inv.id}>
                  <td className="font-semibold" style={{ fontFamily: 'monospace' }}>{inv.code}</td>
                  <td><span className="role-badge">{inv.role}</span></td>
                  <td>
                    {inv.used
                      ? <span className="badge badge-busy">Used</span>
                      : <span className="badge badge-free">Available</span>}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      {!inv.used && (
                        <button className="btn-action btn-edit" onClick={() => copyCode(inv.code)} title="Copy"><Copy size={13} /></button>
                      )}
                      <button className="btn-action btn-del" onClick={() => deleteInvite(inv.id)} title="Delete"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h5><ShieldCheck size={16} className="text-accent" /> Users</h5>
        </div>
        <div className="table-wrap">
          <table className="naatya-table">
            <thead>
              <tr>
                <th>Email</th><th>Role</th><th>Linked Member</th><th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--naatya-text-muted)' }}>Loading...</td></tr>
              )}
              {!loading && profiles.map(p => (
                <tr key={p.id}>
                  <td className="font-semibold">
                    {p.email}{p.id === user?.id && <span className="text-muted text-xs"> (you)</span>}
                  </td>
                  <td>
                    <select
                      className="form-select"
                      value={p.role}
                      onChange={e => changeRole(p, e.target.value as UserRole)}
                    >
                      <option value="Director">Director</option>
                      <option value="Cast">Cast</option>
                    </select>
                  </td>
                  <td>
                    <select
                      className="form-select"
                      value={p.member_id ?? ''}
                      onChange={e => changeMemberLink(p, e.target.value)}
                    >
                      <option value="">— Not linked —</option>
                      {members.map(m => (
                        <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                      ))}
                    </select>
                  </td>
                  <td className="text-muted text-sm">
                    {p.created_at ? new Date(p.created_at).toLocaleDateString() : ''}
                  </td>
                </tr>
              ))}
              {!loading && profiles.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--naatya-text-muted)' }}>No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
