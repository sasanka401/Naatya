import { useState, useEffect } from 'react';
import { ShieldCheck, Check, X, Link, FileText } from 'lucide-react';
import { showToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/types';

export function AdminApprovals() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPending();
  }, []);

  async function loadPending() {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('approval_status', 'pending_admin')
      .order('created_at', { ascending: true });

    if (error) {
      showToast(`Failed to load pending approvals: ${error.message}`, 'danger');
    } else {
      setProfiles(data as Profile[]);
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
      setProfiles(prev => prev.filter(p => p.id !== profile.id));
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
      setProfiles(prev => prev.filter(p => p.id !== profile.id));
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

  return (
    <div className="content-area">
      <div className="card mb-6">
        <div className="card-header">
          <h5>
            <ShieldCheck size={16} className="text-primary" /> Admin Approvals — Crew Verification
          </h5>
        </div>
        <div className="card-body">
          <p className="text-muted text-sm">
            Review portfolio submissions from technical and creative crew members (Directors, Writers, Cameramen, etc.) 
            and approve or reject their access to Naatya.
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
                <th>Registered Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--naatya-text-muted)' }}>
                    Loading pending applications...
                  </td>
                </tr>
              )}

              {!loading && profiles.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--naatya-text-muted)' }}>
                    No pending crew applications to review.
                  </td>
                </tr>
              )}

              {!loading &&
                profiles.map(p => (
                  <tr key={p.id}>
                    <td className="font-semibold">{p.email}</td>
                    <td>
                      <span className="role-badge" style={{ background: 'var(--naatya-accent)', color: '#fff' }}>
                        {p.detailed_role ?? p.role}
                      </span>
                    </td>
                    <td>
                      {p.portfolio_link ? (
                        <a
                          href={p.portfolio_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary font-semibold text-sm hover:underline"
                        >
                          <Link size={13} /> Visit Link
                        </a>
                      ) : (
                        <span className="text-muted text-sm">— None —</span>
                      )}
                    </td>
                    <td>
                      {p.portfolio_path ? (
                        <button
                          onClick={() => handleDownloadFile(p.portfolio_path!)}
                          className="flex items-center gap-1 text-accent font-semibold text-sm hover:underline"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                          <FileText size={13} /> View CV/File
                        </button>
                      ) : (
                        <span className="text-muted text-sm">— None —</span>
                      )}
                    </td>
                    <td className="text-muted text-sm">
                      {p.created_at ? new Date(p.created_at).toLocaleDateString() : ''}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(p)}
                          className="btn-action btn-edit"
                          style={{
                            background: 'var(--naatya-success)',
                            color: '#fff',
                            padding: '0.35rem 0.65rem',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                          title="Approve User"
                        >
                          <Check size={12} /> Approve
                        </button>
                        <button
                          onClick={() => handleReject(p)}
                          className="btn-action btn-del"
                          style={{
                            background: 'var(--naatya-danger)',
                            color: '#fff',
                            padding: '0.35rem 0.65rem',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                          title="Reject User"
                        >
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
  );
}
