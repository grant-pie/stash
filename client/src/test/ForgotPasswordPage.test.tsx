import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';

vi.mock('@/lib/axios', () => ({
  default: {
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

import api from '@/lib/axios';
const mockPost = vi.mocked(api.post);

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/forgot-password']}>
      <Routes>
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/login" element={<div>Login page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ForgotPasswordPage', () => {
  beforeEach(() => mockPost.mockReset());

  it('renders the email input and submit button', () => {
    renderPage();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
  });

  it('renders the Sign in link', () => {
    renderPage();
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login');
  });

  it('calls POST /auth/forgot-password with the entered email', async () => {
    mockPost.mockResolvedValueOnce({ data: {} });
    renderPage();

    await userEvent.type(screen.getByLabelText(/email/i), 'alice@example.com');
    await userEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith('/auth/forgot-password', { email: 'alice@example.com' }),
    );
  });

  it('shows the success state after submission', async () => {
    mockPost.mockResolvedValueOnce({ data: {} });
    renderPage();

    await userEvent.type(screen.getByLabelText(/email/i), 'alice@example.com');
    await userEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() =>
      expect(screen.getByText(/check your inbox/i)).toBeInTheDocument(),
    );
  });

  it('displays the submitted email in the success message', async () => {
    mockPost.mockResolvedValueOnce({ data: {} });
    renderPage();

    await userEvent.type(screen.getByLabelText(/email/i), 'alice@example.com');
    await userEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() =>
      expect(screen.getByText('alice@example.com')).toBeInTheDocument(),
    );
  });

  it('shows a "try again" button in the success state that reverts to form', async () => {
    mockPost.mockResolvedValue({ data: {} });
    renderPage();

    await userEvent.type(screen.getByLabelText(/email/i), 'alice@example.com');
    await userEvent.click(screen.getByRole('button', { name: /send reset link/i }));
    await waitFor(() => expect(screen.getByText(/check your inbox/i)).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
  });

  it('shows a Back to sign in link in the success state', async () => {
    mockPost.mockResolvedValueOnce({ data: {} });
    renderPage();

    await userEvent.type(screen.getByLabelText(/email/i), 'alice@example.com');
    await userEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() =>
      expect(screen.getByRole('link', { name: /back to sign in/i })).toBeInTheDocument(),
    );
  });

  it('shows an error message when the API call fails', async () => {
    mockPost.mockRejectedValueOnce({ response: { data: { message: 'Server error' } } });
    renderPage();

    await userEvent.type(screen.getByLabelText(/email/i), 'alice@example.com');
    await userEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => expect(screen.getByText('Server error')).toBeInTheDocument());
  });
});
