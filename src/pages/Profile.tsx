import { useState, useEffect } from 'react';
import { UserCircle, Contact, Trash2 } from 'lucide-react';
import { showToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';
import type { Member, MemberStatus } from '../lib/types';

export function Profile() {
  const { user, profile } = useAuth();
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [stageName, setStageName] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleDeleteAccount() {
    const confirmDelete = window.confirm(
      "WARNING: Are you absolutely sure you want to permanently delete your account and all your data? This action is irreversible and you will be logged out instantly."
    );
    if (!confirmDelete) return;

    setDeleting(true);
    const { error } = await supabase.rpc('delete_own_account');
    
    if (error) {
      showToast(`Account deletion failed: ${error.message}`, 'danger');
      setDeleting(false);
    } else {
      showToast('Account deleted successfully.', 'success');
      await supabase.auth.signOut();
      window.location.reload();
    }
  }

  useEffect(() => {
    load();
  }, [profile?.member_id]);

  async function load() {
    setLoading(true);
    if (profile?.member_id) {
      const { data } = await supabase.from('members').select('*').eq('id', profile.member_id).maybeSingle();
      if (data) {
        setMember(data as Member);
        setName(data.name || '');
        setPhone(data.phone || '');
        setStageName(data.stage_name || '');
        setAddress(data.address || '');
      }
    } else {
      setMember(null);
    }
    setLoading(false);
  }

  async function updateStatus(status: MemberStatus) {
    if (!member) return;
    const { error } = await supabase.from('members').update({ status }).eq('id', member.id);
    if (error) { showToast(`Update failed: ${error.message}`, 'danger'); return; }
    setMember({ ...member, status });
    showToast(`Your availability is now "${status}".`, 'success');
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!member) return;
    setSaving(true);

    const { error } = await supabase
      .from('members')
      .update({
        name: name.trim(),
        phone: phone.trim(),
        stage_name: stageName.trim(),
        address: address.trim()
      })
      .eq('id', member.id);

    setSaving(false);
    if (error) {
      showToast(`Save failed: ${error.message}`, 'danger');
    } else {
      showToast('Profile updated successfully!', 'success');
      setMember({
        ...member,
        name: name.trim(),
        phone: phone.trim(),
        stage_name: stageName.trim(),
        address: address.trim()
      });
      setEditing(false);
    }
  }

  return (
    <div className="content-area">
      <div className="card mb-6">
        <div className="card-header">
          <h5><UserCircle size={16} className="text-primary" /> Account</h5>
        </div>
        <div className="card-body">
          <div className="profile-grid">
            <div className="profile-field">
              <div className="label">Email</div>
              <div className="value" style={{ wordBreak: 'break-all' }}>{user?.email}</div>
            </div>
            <div className="profile-field">
              <div className="label">Access Role</div>
              <div className="value">
                <span className="role-badge">{profile?.role ?? 'Cast'}</span>
              </div>
            </div>
            <div className="profile-field">
              <div className="label">Member Since</div>
              <div className="value">
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h5><Contact size={16} className="text-accent" /> Cast &amp; Crew Profile</h5>
        </div>
        <div className="card-body">
          {loading && <p className="text-muted text-sm">Loading...</p>}

          {!loading && !member && (
            <p className="text-muted text-sm">
              Your account isn't linked to a Cast &amp; Crew record yet. Ask your Director to
              link it from the Team page so your name and role show up here.
            </p>
          )}

          {!loading && member && (
            <>
              {editing ? (
                <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">Full Name</label>
                      <input
                        className="form-input"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Stage Name (Optional)</label>
                      <input
                        className="form-input"
                        value={stageName}
                        onChange={e => setStageName(e.target.value)}
                        placeholder="e.g. Robin Hood"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phone Number</label>
                      <input
                        className="form-input"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="+91 XXXXX XXXXX"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Production Role</label>
                      <input
                        className="form-input"
                        value={member.role}
                        disabled
                        style={{ opacity: 0.7, cursor: 'not-allowed' }}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Address</label>
                    <textarea
                      className="form-input"
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      placeholder="Enter full address"
                      style={{ minHeight: '80px', resize: 'vertical', fontFamily: 'inherit' }}
                    />
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button type="submit" className="btn-primary" disabled={saving}>
                      {saving ? 'Saving...' : 'Save Profile'}
                    </button>
                    <button type="button" className="btn-google" style={{ width: 'auto', border: '1px solid var(--naatya-border)' }} onClick={() => setEditing(false)}>
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="profile-grid mb-6">
                    <div className="profile-field">
                      <div className="label">Name</div>
                      <div className="value">{member.name || '—'}</div>
                    </div>
                    <div className="profile-field">
                      <div className="label">Stage Name</div>
                      <div className="value">{member.stage_name || '—'}</div>
                    </div>
                    <div className="profile-field">
                      <div className="label">Production Role</div>
                      <div className="value">{member.role || '—'}</div>
                    </div>
                    <div className="profile-field">
                      <div className="label">Phone</div>
                      <div className="value">{member.phone || '—'}</div>
                    </div>
                    <div className="profile-field" style={{ gridColumn: 'span 2' }}>
                      <div className="label">Address</div>
                      <div className="value" style={{ whiteSpace: 'pre-wrap' }}>{member.address || '—'}</div>
                    </div>
                    <div className="profile-field">
                      <div className="label">Current Status</div>
                      <div className="value">{member.status || '—'}</div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center gap-4 flex-wrap mt-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
                    <div>
                      <label className="form-label mb-2 block">Update my availability</label>
                      <div className="rsvp-row">
                        {(['Free', 'Busy', 'On Leave'] as MemberStatus[]).map(s => (
                          <button
                            key={s}
                            className={`rsvp-btn${member.status === s ? ' active-yes' : ''}`}
                            onClick={() => updateStatus(s)}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button className="btn-primary" onClick={() => setEditing(true)} style={{ height: 'fit-content' }}>
                      Edit Profile Details
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <div className="card mt-6" style={{ borderColor: 'var(--naatya-danger)', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.05)' }}>
        <div className="card-header" style={{ background: 'rgba(239, 68, 68, 0.03)', borderBottom: '1px solid rgba(239, 68, 68, 0.1)' }}>
          <h5 className="text-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--naatya-danger)' }}>
            <Trash2 size={16} /> Danger Zone
          </h5>
        </div>
        <div className="card-body">
          <p className="text-muted text-sm mb-4">
            Permanently delete your account, login credentials, profile status, and associated cast &amp; crew records. This action is irreversible.
          </p>
          <button
            className="btn-login"
            style={{ 
              background: 'linear-gradient(135deg, var(--naatya-danger), #b91c1c)', 
              width: 'auto', 
              padding: '0.6rem 1.5rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
            onClick={handleDeleteAccount}
            disabled={deleting}
          >
            {deleting ? 'Deleting Account...' : 'Delete My Account'}
          </button>
        </div>
      </div>
    </div>
  );
}
