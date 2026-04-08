import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/axios';

export default function RegisterPage() {
  const { register } = useAuth();

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await register(email, username, password);
      setVerificationSent(true);
    } catch (err: any) {
      const data = err?.response?.data;
      const msg = data?.message;

      if (data?.errorCode === 'EMAIL_NOT_VERIFIED') {
        setPendingVerificationEmail(email);
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
    if (!pendingVerificationEmail || resendLoading) return;
    setResendLoading(true);
    try {
      await api.post('/auth/resend-verification', { email: pendingVerificationEmail });
      setResendSent(true);
    } finally {
      setResendLoading(false);
    }
  }

  if (pendingVerificationEmail) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-950 text-3xl">
            ⚠️
          </div>
          <h1 className="text-xl font-bold">Please verify your account</h1>
          <p className="text-sm text-gray-400">
            <span className="text-gray-200">{pendingVerificationEmail}</span> is already
            registered but hasn't been verified yet.
            <br />
            Check your inbox for the original link, or request a new one below.
          </p>
          {resendSent ? (
            <p className="rounded bg-indigo-950 px-4 py-3 text-sm text-indigo-300">
              Verification email sent — check your inbox.
            </p>
          ) : (
            <button
              onClick={handleResend}
              disabled={resendLoading}
              className="btn-primary w-full"
            >
              {resendLoading ? 'Sending…' : 'Resend verification email'}
            </button>
          )}
          <Link to="/login" className="inline-block text-sm text-indigo-400 hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  if (verificationSent) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-950 text-3xl">
            ✉️
          </div>
          <h1 className="text-xl font-bold">Check your inbox</h1>
          <p className="text-sm text-gray-400">
            We sent a verification link to{' '}
            <span className="text-gray-200">{email}</span>.
            <br />
            Click the link in the email to activate your account.
          </p>
          <p className="text-xs text-gray-600">
            Didn't receive it? Check your spam folder or try registering again.
          </p>
          <Link to="/login" className="inline-block text-sm text-indigo-400 hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
          <p className="mt-1 text-sm text-gray-400">Start stashing your snippets</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          {error && (
            <p className="rounded bg-red-950 px-3 py-2 text-sm text-red-400">{error}</p>
          )}

          <div className="space-y-1">
            <label htmlFor="email" className="block text-xs text-gray-400">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="username" className="block text-xs text-gray-400">
              Username
            </label>
            <input
              id="username"
              type="text"
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
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
              minLength={8}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="confirmPassword" className="block text-xs text-gray-400">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              className={`input ${confirmPassword && confirmPassword !== password ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            {confirmPassword && confirmPassword !== password && (
              <p className="text-xs text-red-400">Passwords do not match.</p>
            )}
          </div>

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-400 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
