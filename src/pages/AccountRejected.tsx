import { XCircle, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { showToast } from '../components/Toast';

export function AccountRejected() {
  async function handleLogout() {
    await supabase.auth.signOut();
    showToast('Logged out successfully.', 'info');
    window.location.reload();
  }

  async function handleReapply() {
    // Reset status back to onboarding so they can correct details
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from('profiles')
      .update({ approval_status: 'pending_onboarding' })
      .eq('id', user.id);
      
    if (error) {
      showToast(`Error: ${error.message}`, 'danger');
    } else {
      showToast('You can now set up your profile details again.', 'success');
      window.location.reload();
    }
  }

  return (
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: '460px', textAlign: 'center' }}>
        <div className="login-logo" style={{ background: 'linear-gradient(135deg, var(--naatya-danger), #b91c1c)' }}>
          <XCircle size={32} color="#fff" />
        </div>
        <h1 className="login-title" style={{ background: 'linear-gradient(135deg, var(--naatya-danger), #b91c1c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Verification Failed
        </h1>
        <p className="login-subtitle">Your crew application was not approved</p>

        <div className="card-body mt-4">
          <p className="text-muted text-sm leading-relaxed mb-6">
            Unfortunately, our App Management Admin was unable to verify your profile based on the submitted portfolio link or files. 
          </p>

          <div className="flex flex-col gap-3">
            <button className="btn-login" onClick={handleReapply} style={{ background: 'linear-gradient(135deg, var(--naatya-primary), var(--naatya-primary-hover))' }}>
              Re-submit Portfolio Details
            </button>
            <button className="btn-google" onClick={handleLogout} style={{ border: '1px solid var(--naatya-border)' }}>
              <LogOut size={16} /> Logout from Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
