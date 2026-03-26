import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // When the server tells us the email isn't verified, offer a direct link to register
  // (which will resend the verification email)
  const [showResendHint, setShowResendHint] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setShowResendHint(false);
    setLoading(true);
    try {
      await login(identifier, password);
      navigate('/');
    } catch (err: any) {
      const data = err?.response?.data;
      const msg = data?.message;

      if (data?.errorCode === 'EMAIL_NOT_VERIFIED') {
        setShowResendHint(true);
      }

      if (Array.isArray(msg)) {
        setError(msg.join(' · '));
      } else if (typeof msg === 'string') {
        setError(msg);
      } else {
        setError('Could not connect to the server. Please try again.');
      }

    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Sign in to Stash</h1>
          <p className="mt-1 text-sm text-gray-400">Your personal code snippet vault</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          {error && (
            <div className="rounded bg-red-950 px-3 py-2 text-sm text-red-400 space-y-1">
              <p>{error}</p>
              {showResendHint && (
                <p className="text-xs text-red-300">
                  Need a new link?{' '}
                  <Link
                    to="/register"
                    className="underline hover:text-white"
                  >
                    Resend verification email
                  </Link>
                </p>
              )}
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="identifier" className="block text-xs text-gray-400">
              Email or username
            </label>
            <input
              id="identifier"
              type="text"
              className="input"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              autoComplete="username"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="block text-xs text-gray-400">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <div className="flex items-center justify-end">
            <Link to="/forgot-password" className="text-xs text-indigo-400 hover:underline">
              Forgot password?
            </Link>
          </div>

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500">
          No account?{' '}
          <Link to="/register" className="text-indigo-400 hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
