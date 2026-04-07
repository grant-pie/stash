import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import VerifyEmailPage from '@/pages/VerifyEmailPage';

vi.mock('@/lib/axios', () => ({
  default: {
    get: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

import api from '@/lib/axios';
const mockGet = vi.mocked(api.get);

function renderPage(search = '?token=valid-token') {
  return render(
    <MemoryRouter initialEntries={[`/verify-email${search}`]}>
      <Routes>
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/login" element={<div>Login page</div>} />
        <Route path="/register" element={<div>Register page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('VerifyEmailPage', () => {
  beforeEach(() => mockGet.mockReset());

  // Fix: resolve the deferred promise after asserting loading state so React
  // can finish its async work before the next test's beforeEach runs.
  it('shows the loading indicator before the API responds', async () => {
    let resolve!: (v: any) => void;
    mockGet.mockReturnValue(new Promise((res) => { resolve = res; }));
    renderPage();
    expect(screen.getByText(/verifying your email/i)).toBeInTheDocument();
    resolve({ data: { message: 'ok' } });
    await waitFor(() =>
      expect(screen.queryByText(/verifying your email/i)).not.toBeInTheDocument(),
    );
  });

  // Fix: use getByRole('heading') to avoid matching the paragraph that also
  // contains "Email verified!" as part of the full message string.
  it('shows the success state when the API returns successfully', async () => {
    mockGet.mockResolvedValueOnce({ data: { message: 'Email verified! You can now sign in.' } });
    renderPage();

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /email verified!/i })).toBeInTheDocument(),
    );
  });

  it('displays the server message in the success state', async () => {
    mockGet.mockResolvedValueOnce({ data: { message: 'Email verified! You can now sign in.' } });
    renderPage();

    await waitFor(() =>
      expect(screen.getByText('Email verified! You can now sign in.')).toBeInTheDocument(),
    );
  });

  it('shows a Sign in link in the success state', async () => {
    mockGet.mockResolvedValueOnce({ data: { message: 'Email verified!' } });
    renderPage();

    await waitFor(() =>
      expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login'),
    );
  });

  it('shows the error state when the API call fails', async () => {
    mockGet.mockRejectedValueOnce({
      response: { data: { message: 'This verification link is invalid or has already been used.' } },
    });
    renderPage();

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /verification failed/i })).toBeInTheDocument(),
    );
  });

  it('shows the server error message in the failure state', async () => {
    mockGet.mockRejectedValueOnce({
      response: { data: { message: 'Link already used.' } },
    });
    renderPage();

    await waitFor(() => expect(screen.getByText('Link already used.')).toBeInTheDocument());
  });

  it('falls back to a generic error message when no response body', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'));
    renderPage();

    await waitFor(() =>
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument(),
    );
  });

  it('shows a "Back to register" link in the failure state', async () => {
    mockGet.mockRejectedValueOnce({ response: { data: { message: 'Bad token.' } } });
    renderPage();

    await waitFor(() =>
      expect(screen.getByRole('link', { name: /back to register/i })).toHaveAttribute('href', '/register'),
    );
  });

  it('shows an error immediately when there is no token in the URL', () => {
    renderPage('');
    expect(screen.getByRole('heading', { name: /verification failed/i })).toBeInTheDocument();
    expect(mockGet).not.toHaveBeenCalled();
  });
});
