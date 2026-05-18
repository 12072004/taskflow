import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2 } from 'lucide-react';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const handle = async e => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await signup(form.name, form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="sidebar-logo" style={{ padding: '0 0 40px', borderBottom: 'none' }}>
          <div className="logo-mark">T</div>
          <span className="logo-text">TaskFlow</span>
        </div>

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, marginBottom: 6 }}>
          {mode === 'login' ? 'Welcome back' : 'Create your account'}
        </h1>
        <p className="text-muted" style={{ marginBottom: 32, fontSize: 14 }}>
          {mode === 'login' ? 'Sign in to continue to your workspace.' : 'Start managing projects with your team.'}
        </p>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handle}>
          {mode === 'signup' && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" placeholder="Your name" value={form.name} onChange={set('name')} required />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" placeholder="you@company.com" value={form.email} onChange={set('email')} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" placeholder={mode === 'signup' ? 'Min. 6 characters' : '••••••••'} value={form.password} onChange={set('password')} required minLength={6} />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8, padding: '12px', fontSize: 15, justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="divider" />
        <p className="text-muted text-sm" style={{ textAlign: 'center' }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
            onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError(''); }}>
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>

      <div className="auth-right">
        <div style={{ textAlign: 'center', padding: 40, maxWidth: 500 }}>
          <div className="auth-hero-text">Build<br />together,<br />ship faster.</div>
          <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start', maxWidth: 320, margin: '40px auto 0' }}>
            {['Role-based access control', 'Kanban & list task views', 'Overdue tracking dashboard', 'Team collaboration tools'].map(f => (
              <div key={f} className="flex-row" style={{ gap: 12 }}>
                <CheckCircle2 size={18} color="var(--success)" style={{ flexShrink: 0 }} />
                <span style={{ color: 'var(--text2)', fontSize: 14 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
