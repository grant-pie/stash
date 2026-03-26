import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '@/lib/axios';

type Status = 'loading' | 'success' | 'error';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token found in the link.');
      return;
    }

    const controller = new AbortController();

    api
      .get<{ message: string }>(`/auth/verify-email?token=${token}`, {
        signal: controller.signal,
      })
      .then(({ data }) => {
        setMessage(data.message);
        setStatus('success');
      })
      .catch((err) => {
        // Ignore the cancellation that StrictMode triggers on the first mount
        if (err?.name === 'CanceledError') return;
        setMessage(
          err?.response?.data?.message ?? 'Something went wrong. Please try again.',
        );
        setStatus('error');
      });

    return () => controller.abort();
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-4 text-center">
        {status === 'loading' && (
          <p className="text-sm text-gray-400">Verifying your email…</p>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-950 text-3xl">
              ✓
            </div>
            <h1 className="text-xl font-bold text-green-400">Email verified!</h1>
            <p className="text-sm text-gray-400">{message}</p>
            <Link to="/login" className="btn-primary inline-flex">
              Sign in
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-950 text-3xl">
              ✕
            </div>
            <h1 className="text-xl font-bold text-red-400">Verification failed</h1>
            <p className="text-sm text-gray-400">{message}</p>
            <Link to="/register" className="btn-ghost inline-flex text-sm">
              Back to register
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
