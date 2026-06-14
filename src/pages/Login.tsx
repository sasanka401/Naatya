import { useState } from 'react';
import { Layers, User, Lock } from 'lucide-react';
import { showToast } from '../components/Toast';

interface Props {
  onLogin: () => void;
}

export function Login({ onLogin }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) {
      showToast('Please enter both username and password.', 'warning');
      return;
    }
    if (username === 'admin' && password === 'admin') {
      showToast('Login successful! Welcome back.', 'success');
      setTimeout(onLogin, 800);
    } else {
      showToast('Invalid credentials. Try admin / admin', 'danger');
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <Layers size={36} color="#fff" />
        </div>
        <h1 className="login-title">NAATYA</h1>
        <p className="login-subtitle">Theatre Production Management System</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <div className="input-wrap">
              <span className="input-icon"><User size={16} /></span>
              <input
                type="text"
                className="form-input"
                placeholder="Enter username"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-wrap">
              <span className="input-icon"><Lock size={16} /></span>
              <input
                type="password"
                className="form-input"
                placeholder="Enter password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>
          <button type="submit" className="btn-login">Sign In</button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.8rem', color: 'var(--naatya-text-muted)' }}>
          Demo credentials: admin / admin
        </p>
      </div>
    </div>
  );
}
