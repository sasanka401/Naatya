import { useState } from 'react';
import { Layers, User, Lock, KeyRound, Eye, EyeOff } from 'lucide-react';
import { showToast } from '../components/Toast';
import { supabase } from '../lib/supabase';

interface Props {
  onLogin: () => void;
}

export function Login({ onLogin }: Props) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  function switchMode(next: 'login' | 'signup') {
    setMode(next);
    setShowPassword(false);
    setShowConfirmPassword(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!email || !password) {
      showToast('Please enter both email and password.', 'warning');
      return;
    }

    if (mode === 'signup') {
      if (!inviteCode.trim()) {
        showToast('An invite code is required to sign up.', 'warning');
        return;
      }
      if (password.length < 6) {
        showToast('Password must be at least 6 characters.', 'warning');
        return;
      }
      if (password !== confirmPassword) {
        showToast('Passwords do not match.', 'warning');
        return;
      }

      setLoading(true);

      const { data: invite, error: inviteError } = await supabase
        .from('invite_codes')
        .select('*')
        .eq('code', inviteCode.trim())
        .eq('used', false)
        .maybeSingle();

      if (inviteError || !invite) {
        setLoading(false);
        showToast('Invalid or already-used invite code.', 'danger');
        return;
      }

      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setLoading(false);
        showToast(error.message, 'danger');
        return;
      }

      if (data.session) {
        const { error: redeemError } = await supabase.rpc('redeem_invite', { invite_code: inviteCode.trim() });
        setLoading(false);
        if (redeemError) {
          showToast(`Account made, but code redemption failed: ${redeemError.message}`, 'warning');
        } else {
          showToast('Account created successfully!', 'success');
        }
        onLogin();
      } else {
        setLoading(false);
        showToast('Account created! Confirm your email, then log in to finish.', 'success');
        switchMode('login');
        setPassword('');
        setConfirmPassword('');
      }
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (!error && inviteCode.trim()) {
      await supabase.rpc('redeem_invite', { invite_code: inviteCode.trim() }).then(() => {});
    }

    setLoading(false);

    if (error) {
      showToast(error.message, 'danger');
      return;
    }

    showToast('Login successful! Welcome back.', 'success');
    onLogin();
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <Layers size={32} color="#fff" strokeWidth={2.25} />
        </div>
        <h1 className="login-title">NAATYA</h1>
        <p className="login-subtitle">Theatre Production Management System</p>

        <div className="login-mode-tabs" role="tablist" aria-label="Authentication mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            className={`login-mode-tab${mode === 'login' ? ' active' : ''}`}
            onClick={() => switchMode('login')}
          >
            Sign In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signup'}
            className={`login-mode-tab${mode === 'signup' ? ' active' : ''}`}
            onClick={() => switchMode('signup')}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">Email</label>
            <div className="input-wrap">
              <span className="input-icon"><User size={16} /></span>
              <input
                id="login-email"
                type="email"
                className="form-input"
                placeholder="Enter email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">Password</label>
            <div className="input-wrap">
              <span className="input-icon"><Lock size={16} /></span>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input has-toggle"
                placeholder="Enter password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
              <button
                type="button"
                className="input-toggle"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {mode === 'signup' && (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="login-confirm-password">Confirm Password</label>
                <div className="input-wrap">
                  <span className="input-icon"><Lock size={16} /></span>
                  <input
                    id="login-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="form-input has-toggle"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="input-toggle"
                    onClick={() => setShowConfirmPassword(v => !v)}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="login-invite-code">Invite Code</label>
                <div className="input-wrap">
                  <span className="input-icon"><KeyRound size={16} /></span>
                  <input
                    id="login-invite-code"
                    type="text"
                    className="form-input"
                    placeholder="Enter invite code from your Director"
                    value={inviteCode}
                    onChange={e => setInviteCode(e.target.value)}
                    autoComplete="off"
                  />
                </div>
              </div>
            </>
          )}

          <button type="submit" className="btn-login" disabled={loading}>
            {loading
              ? (mode === 'signup' ? 'Creating account...' : 'Signing in...')
              : (mode === 'signup' ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <p className="login-switch-text">
          {mode === 'login' ? (
            <>Don&apos;t have an account?{' '}
              <button type="button" className="login-switch-link" onClick={() => switchMode('signup')}>
                Sign up
              </button>
            </>
          ) : (
            <>Already have an account?{' '}
              <button type="button" className="login-switch-link" onClick={() => switchMode('login')}>
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
