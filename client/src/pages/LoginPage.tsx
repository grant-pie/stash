import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/axios';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Verify screen state — null means not active, string (possibly empty) means active
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(identifier, password);
      navigate('/');
    } catch (err: any) {
      const data = err?.response?.data;
      const msg = data?.message;

      if (data?.errorCode === 'EMAIL_NOT_VERIFIED') {
        // Pre-fill with the identifier if it looks like an email
        setPendingEmail(identifier.includes('@') ? identifier : '');
        return;
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

  async function handleResend() {
    if (!pendingEmail || resendLoading) return;
    setResendLoading(true);
    try {
      await api.post('/auth/resend-verification', { email: pendingEmail });
      setResendSent(true);
    } finally {
      setResendLoading(false);
    }
  }

  if (pendingEmail !== null) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-950 text-3xl">
            ⚠️
          </div>
          <h1 className="text-xl font-bold">Please verify your account</h1>
          <p className="text-sm text-gray-400">
            Your email address hasn't been verified yet.
            <br />
            Check your inbox for the original link, or request a new one below.
          </p>
          {!resendSent && (
            <div className="space-y-2">
              <input
                type="email"
                className="input w-full text-center"
                placeholder="Your email address"
                value={pendingEmail}
                onChange={(e) => setPendingEmail(e.target.value)}
              />
            </div>
          )}
          {resendSent ? (
            <p className="rounded bg-indigo-950 px-4 py-3 text-sm text-indigo-300">
              Verification email sent — check your inbox.
            </p>
          ) : (
            <button
              onClick={handleResend}
              disabled={resendLoading || !pendingEmail}
              className="btn-primary w-full"
            >
              {resendLoading ? 'Sending…' : 'Resend verification email'}
            </button>
          )}
          <button
            onClick={() => { setPendingEmail(null); setResendSent(false); }}
            className="inline-block text-sm text-indigo-400 hover:underline"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
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
            <p className="rounded bg-red-950 px-3 py-2 text-sm text-red-400">{error}</p>
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
