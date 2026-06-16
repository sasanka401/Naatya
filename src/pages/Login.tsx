import { useState, useEffect } from 'react';
import { Layers, User, Lock, Eye, EyeOff } from 'lucide-react';
import { showToast } from '../components/Toast';
import { supabase } from '../lib/supabase';

interface Props {
  onLogin: () => void;
}

export function Login({ onLogin }: Props) {
  const [mode, setMode] = useState<'login' | 'signup' | 'admin'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteCode = params.get('invite_code') || params.get('invite');
    if (inviteCode) {
      sessionStorage.setItem('pending_invite_code', inviteCode);
      setMode('signup');
      showToast('Invite code detected! Please sign up to join the production.', 'info');
    }
  }, []);

  function switchMode(next: 'login' | 'signup' | 'admin') {
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

    if (mode === 'admin') {
      setLoading(true);
      let { data, error } = await supabase.auth.signInWithPassword({ email, password });

      // If login fails and they are logging in as the dedicated admin email, auto-signup
      if (error && email.toLowerCase() === 'admin@naatya.com') {
        const signupRes = await supabase.auth.signUp({ email, password });
        if (!signupRes.error && signupRes.data.user) {
          const retryRes = await supabase.auth.signInWithPassword({ email, password });
          data = retryRes.data;
          error = retryRes.error;
        }
      }

      if (error || !data?.user) {
        setLoading(false);
        showToast(error?.message ?? 'Login failed', 'danger');
        return;
      }

      // Check if user is admin in database profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profileError || !profileData || !profileData.is_admin) {
        await supabase.auth.signOut();
        setLoading(false);
        showToast('Access Denied: You are not authorized as an Admin.', 'danger');
        return;
      }

      setLoading(false);
      showToast('Admin login successful! Welcome to the Admin Console.', 'success');
      onLogin();
      return;
    }

    if (mode === 'signup') {
      if (password.length < 6) {
        showToast('Password must be at least 6 characters.', 'warning');
        return;
      }
      if (password !== confirmPassword) {
        showToast('Passwords do not match.', 'warning');
        return;
      }

      setLoading(true);

      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setLoading(false);
        showToast(error.message, 'danger');
        return;
      }

      if (data.session) {
        setLoading(false);
        showToast('Account created successfully!', 'success');
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

    setLoading(false);

    if (error) {
      showToast(error.message, 'danger');
      return;
    }

    showToast('Login successful! Welcome back.', 'success');
    onLogin();
  }

  async function handleGoogleSignIn() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) {
      showToast(error.message, 'danger');
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className={`login-card${mode === 'admin' ? ' admin-card' : ''}`} style={mode === 'admin' ? { border: '2px solid #475569', boxShadow: '0 20px 50px rgba(71, 85, 105, 0.2)' } : undefined}>
        <div className="login-logo" style={mode === 'admin' ? { background: 'linear-gradient(135deg, #475569, #1e293b)', boxShadow: '0 8px 24px rgba(71, 85, 105, 0.35)' } : undefined}>
          {mode === 'admin' ? <Lock size={30} color="#fff" /> : <Layers size={32} color="#fff" strokeWidth={2.25} />}
        </div>
        <h1 className="login-title" style={mode === 'admin' ? { background: 'linear-gradient(135deg, #64748b, #334155)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } : undefined}>
          {mode === 'admin' ? 'ADMIN CONSOLE' : 'NAATYA'}
        </h1>
        <p className="login-subtitle">
          {mode === 'admin' ? 'System Directory & Approval Center' : 'Theatre Production Management System'}
        </p>

        {mode !== 'admin' && (
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
        )}

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
          )}

          <button type="submit" className="btn-login" style={mode === 'admin' ? { background: 'linear-gradient(135deg, #475569, #334155)' } : undefined} disabled={loading}>
            {loading
              ? (mode === 'signup' ? 'Creating account...' : mode === 'admin' ? 'Authenticating Admin...' : 'Signing in...')
              : (mode === 'signup' ? 'Create Account' : mode === 'admin' ? 'Login as Admin' : 'Sign In')}
          </button>
        </form>

        {mode !== 'admin' ? (
          <>
            <div className="login-divider">
              <span>or</span>
            </div>

            <button
              type="button"
              className="btn-google"
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
              </svg>
              {mode === 'signup' ? 'Sign up with Google' : 'Sign in with Google'}
            </button>

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

            <p className="login-switch-text" style={{ marginTop: '0.75rem' }}>
              <button type="button" className="login-switch-link" style={{ color: 'var(--naatya-text-muted)', fontSize: '0.8rem' }} onClick={() => switchMode('admin')}>
                Access Admin Portal
              </button>
            </p>
          </>
        ) : (
          <p className="login-switch-text" style={{ marginTop: '1.5rem' }}>
            <button type="button" className="login-switch-link" onClick={() => switchMode('login')}>
              Back to Member Portal
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
