import { Clock, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { showToast } from '../components/Toast';

export function PendingApproval() {
  async function handleLogout() {
    await supabase.auth.signOut();
    showToast('Logged out successfully.', 'info');
    window.location.reload();
  }

  return (
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: '460px', textAlign: 'center' }}>
        <div className="login-logo" style={{ background: 'linear-gradient(135deg, var(--naatya-accent), var(--naatya-warning))' }}>
          <Clock size={32} color="#fff" />
        </div>
        <h1 className="login-title" style={{ background: 'linear-gradient(135deg, var(--naatya-accent), var(--naatya-warning))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Approval Pending
        </h1>
        <p className="login-subtitle">Your portfolio is under review</p>

        <div className="card-body mt-4">
          <p className="text-muted text-sm leading-relaxed mb-6">
            Thank you for setting up your profile! Because you chose a leadership/technical crew role,
            your profile must be verified by an App Management Admin before full dashboard access is granted.
          </p>

          <p className="text-sm font-semibold mb-6" style={{ color: 'var(--naatya-accent)' }}>
            We will review your portfolio details shortly.
          </p>

          <button className="btn-google" onClick={handleLogout} style={{ border: '1px solid var(--naatya-border)' }}>
            <LogOut size={16} /> Logout from Account
          </button>
        </div>
      </div>
    </div>
  );
}
