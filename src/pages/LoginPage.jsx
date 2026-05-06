import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import './LoginPage.css';

const SpectraLogo = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L3.34 7V17L12 22L20.66 17V7L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" />
    <path d="M12 2V7" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" />
    <path d="M3.34 7L7.67 9.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" />
    <path d="M20.66 7L16.33 9.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" />
    <path d="M3.34 17L7.67 14.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" />
    <path d="M20.66 17L16.33 14.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" />
    <path d="M12 22V17" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" />
    <path d="M12 7L16.33 9.5L12 12L7.67 9.5L12 7Z" fill="currentColor" fillOpacity="1.0" />
    <path d="M7.67 9.5V14.5L12 17V12L7.67 9.5Z" fill="currentColor" fillOpacity="0.7" />
    <path d="M16.33 9.5V14.5L12 17V12L16.33 9.5Z" fill="currentColor" fillOpacity="0.4" />
  </svg>
);

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, signup } = useAuth();
  const { addToast } = useChat();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
        addToast('Welcome back to Spectra!', 'success');
      } else {
        await signup(email, password, name);
        await login(email, password);
        addToast('Account created successfully!', 'success');
      }
      navigate('/chat');
    } catch (err) {
      setError(err.response?.data?.detail || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(p => !p);
    setError('');
    setEmail('');
    setPassword('');
    setName('');
  };

  return (
    <div className="login-page">
      {/* Background identical to landing hero */}
      <div className="login-bg">
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />
        <div className="login-orb login-orb-3" />
        <div className="login-grid" />
      </div>

      {/* Back to home nav */}
      <a href="/" className="login-back">
        <SpectraLogo />
        <span>Spectra AI</span>
      </a>

      {/* Card */}
      <div className="login-card">

        {/* Error */}
        {error && (
          <div className="login-error" role="alert">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {error}
          </div>
        )}

        {/* Form */}
        <form className="login-form" onSubmit={handleSubmit} noValidate>
          {!isLogin && (
            <div className="login-field">
              <label htmlFor="auth-name">Full Name</label>
              <input
                id="auth-name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
          )}

          <div className="login-field">
            <label htmlFor="auth-email">Email Address</label>
            <input
              id="auth-email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="login-field">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete={isLogin ? 'current-password' : 'new-password'}
            />
          </div>

          <button type="submit" className="login-submit-btn" disabled={loading}>
            {loading ? (
              <span className="login-spinner" />
            ) : (
              <>
                {isLogin ? 'Sign In' : 'Create Account'}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="login-divider">
          <span>or</span>
        </div>

        {/* Switch mode */}
        <div className="login-switch">
          {isLogin ? (
            <p>Don't have an account?{' '}
              <button type="button" onClick={switchMode}>Sign Up free</button>
            </p>
          ) : (
            <p>Already have an account?{' '}
              <button type="button" onClick={switchMode}>Sign In</button>
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
