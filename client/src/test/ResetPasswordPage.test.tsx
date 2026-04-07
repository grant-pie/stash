import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ResetPasswordPage from '@/pages/ResetPasswordPage';

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

function renderPage(search = '?token=valid-token-123') {
  return render(
    <MemoryRouter initialEntries={[`/reset-password${search}`]}>
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/login" element={<div>Login page</div>} />
        <Route path="/forgot-password" element={<div>Forgot password page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ResetPasswordPage', () => {
  beforeEach(() => mockPost.mockReset());

  describe('when no token is in the URL', () => {
    it('shows the "Invalid link" error state', () => {
      renderPage('');
      expect(screen.getByText(/invalid link/i)).toBeInTheDocument();
    });

    it('shows a link to request a new reset link', () => {
      renderPage('');
      expect(screen.getByRole('link', { name: /request a new link/i })).toHaveAttribute(
        'href',
        '/forgot-password',
      );
    });

    it('does not render the password form', () => {
      renderPage('');
      expect(screen.queryByLabelText(/new password/i)).not.toBeInTheDocument();
    });
  });

  describe('when a token is present', () => {
    it('renders the new password and confirm password inputs', () => {
      renderPage();
      // Use exact labels to avoid /new password/i matching both fields
      expect(screen.getByLabelText('New password')).toBeInTheDocument();
      expect(screen.getByLabelText('Confirm new password')).toBeInTheDocument();
    });

    it('shows an inline mismatch hint as the user types', async () => {
      renderPage();
      await userEvent.type(screen.getByLabelText('New password'), 'password1');
      await userEvent.type(screen.getByLabelText('Confirm new password'), 'different');
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });

    it('does not call the API when passwords mismatch on submit', async () => {
      renderPage();
      await userEvent.type(screen.getByLabelText('New password'), 'password1');
      await userEvent.type(screen.getByLabelText('Confirm new password'), 'password2');
      await userEvent.click(screen.getByRole('button', { name: /reset password/i }));
      expect(mockPost).not.toHaveBeenCalled();
    });

    it('calls POST /auth/reset-password with token and password', async () => {
      mockPost.mockResolvedValueOnce({ data: {} });
      renderPage();

      await userEvent.type(screen.getByLabelText('New password'), 'newpassword1');
      await userEvent.type(screen.getByLabelText('Confirm new password'), 'newpassword1');
      await userEvent.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() =>
        expect(mockPost).toHaveBeenCalledWith('/auth/reset-password', {
          token: 'valid-token-123',
          password: 'newpassword1',
        }),
      );
    });

    it('shows the success state after a successful reset', async () => {
      mockPost.mockResolvedValueOnce({ data: {} });
      renderPage();

      await userEvent.type(screen.getByLabelText('New password'), 'newpassword1');
      await userEvent.type(screen.getByLabelText('Confirm new password'), 'newpassword1');
      await userEvent.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() =>
        expect(screen.getByText(/password reset!/i)).toBeInTheDocument(),
      );
    });

    it('success state shows a Sign in link to /login', async () => {
      mockPost.mockResolvedValueOnce({ data: {} });
      renderPage();

      await userEvent.type(screen.getByLabelText('New password'), 'newpassword1');
      await userEvent.type(screen.getByLabelText('Confirm new password'), 'newpassword1');
      await userEvent.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() =>
        expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login'),
      );
    });

    it('shows an error message when the API call fails', async () => {
      mockPost.mockRejectedValueOnce({
        response: { data: { message: 'This reset link is invalid or has expired.' } },
      });
      renderPage();

      await userEvent.type(screen.getByLabelText('New password'), 'newpassword1');
      await userEvent.type(screen.getByLabelText('Confirm new password'), 'newpassword1');
      await userEvent.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() =>
        expect(screen.getByText(/invalid or has expired/i)).toBeInTheDocument(),
      );
    });
  });
});
