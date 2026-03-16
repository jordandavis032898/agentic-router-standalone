import { useState } from 'react';
import * as api from '../api';

export default function Auth({ onAuthenticated }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = isSignup
        ? await api.signup({ email, password, name })
        : await api.login({ email, password });

      if (data?.access_token && onAuthenticated) {
        onAuthenticated(data);
      }
    } catch (err) {
      setError(api.getErrorMessage(err, 'Authentication failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">
          {isSignup ? 'Create account' : 'Sign in'}
        </h1>
        <p className="auth-subtitle">
          {isSignup
            ? 'Create an account to access the platform.'
            : 'Enter your credentials to continue.'}
        </p>
        {error && (
          <p className="auth-error auth-error-global" role="alert">
            {error}
          </p>
        )}
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {isSignup && (
            <div className="auth-field">
              <label htmlFor="auth-name">Name</label>
              <input
                id="auth-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                placeholder="Your name"
              />
            </div>
          )}
          <div className="auth-field">
            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="auth-field">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              placeholder="••••••••"
            />
          </div>
          <button type="submit" className="btn-primary auth-submit" disabled={loading}>
            {loading ? 'Please wait…' : isSignup ? 'Sign up' : 'Sign in'}
          </button>
        </form>
        <p className="auth-switch">
          {isSignup ? 'Already have an account? ' : "Don't have an account? "}
          <button
            type="button"
            className="auth-link"
            onClick={() => {
              setIsSignup(!isSignup);
              setError(null);
            }}
          >
            {isSignup ? 'Sign in' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  );
}
