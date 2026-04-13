import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RegisterPage from '@/pages/RegisterPage';
import * as AuthContext from '@/contexts/AuthContext';

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

function mockAuth(overrides: Partial<ReturnType<typeof AuthContext.useAuth>> = {}) {
  vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
    user: null,
    isAdmin: false,
    isModerator: false,
    isLoading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  });
}

function renderRegister() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<div>Login page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RegisterPage', () => {
  beforeEach(() => mockAuth());

  it('renders all form fields', () => {
    renderRegister();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^username$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it('renders the Sign in link', () => {
    renderRegister();
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login');
  });

  it('shows an inline password mismatch hint as the user types', async () => {
    renderRegister();
    await userEvent.type(screen.getByLabelText(/^password$/i), 'password1');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'different');
    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
  });

  it('does not call register() when passwords mismatch on submit', async () => {
    const mockRegister = vi.fn();
    mockAuth({ register: mockRegister });
    renderRegister();

    await userEvent.type(screen.getByLabelText(/^email$/i), 'alice@example.com');
    await userEvent.type(screen.getByLabelText(/^username$/i), 'alice');
    await userEvent.type(screen.getByLabelText(/^password$/i), 'password1');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'password2');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('shows a form-level error message when passwords do not match on submit', async () => {
    renderRegister();

    await userEvent.type(screen.getByLabelText(/^email$/i), 'alice@example.com');
    await userEvent.type(screen.getByLabelText(/^username$/i), 'alice');
    await userEvent.type(screen.getByLabelText(/^password$/i), 'password1');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'password2');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    // The submit handler also shows the error at the top of the form
    expect(screen.getAllByText(/passwords do not match/i).length).toBeGreaterThan(0);
  });

  it('shows the "Check your inbox" state on successful registration', async () => {
    const mockRegister = vi.fn().mockResolvedValue({ message: 'Check your inbox.' });
    mockAuth({ register: mockRegister });
    renderRegister();

    await userEvent.type(screen.getByLabelText(/^email$/i), 'alice@example.com');
    await userEvent.type(screen.getByLabelText(/^username$/i), 'alice');
    await userEvent.type(screen.getByLabelText(/^password$/i), 'password1');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'password1');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() =>
      expect(screen.getByText(/check your inbox/i)).toBeInTheDocument(),
    );
  });

  it('displays the submitted email in the success state', async () => {
    const mockRegister = vi.fn().mockResolvedValue({ message: 'done' });
    mockAuth({ register: mockRegister });
    renderRegister();

    await userEvent.type(screen.getByLabelText(/^email$/i), 'alice@example.com');
    await userEvent.type(screen.getByLabelText(/^username$/i), 'alice');
    await userEvent.type(screen.getByLabelText(/^password$/i), 'password1');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'password1');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() =>
      expect(screen.getByText('alice@example.com')).toBeInTheDocument(),
    );
  });

  it('treats EMAIL_NOT_VERIFIED error by showing the "Please verify" screen', async () => {
    const err = { response: { data: { errorCode: 'EMAIL_NOT_VERIFIED', message: 'Not verified' } } };
    mockAuth({ register: vi.fn().mockRejectedValue(err) });
    renderRegister();

    await userEvent.type(screen.getByLabelText(/^email$/i), 'alice@example.com');
    await userEvent.type(screen.getByLabelText(/^username$/i), 'alice');
    await userEvent.type(screen.getByLabelText(/^password$/i), 'password1');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'password1');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() =>
      expect(screen.getByText(/please verify your account/i)).toBeInTheDocument(),
    );
  });

  describe('EMAIL_NOT_VERIFIED — verify screen', () => {
    const notVerifiedErr = {
      response: { data: { errorCode: 'EMAIL_NOT_VERIFIED', message: 'Not verified' } },
    };

    async function triggerVerifyScreen() {
      mockAuth({ register: vi.fn().mockRejectedValue(notVerifiedErr) });
      renderRegister();
      await userEvent.type(screen.getByLabelText(/^email$/i), 'alice@example.com');
      await userEvent.type(screen.getByLabelText(/^username$/i), 'alice');
      await userEvent.type(screen.getByLabelText(/^password$/i), 'password1');
      await userEvent.type(screen.getByLabelText(/confirm password/i), 'password1');
      await userEvent.click(screen.getByRole('button', { name: /create account/i }));
      await waitFor(() =>
        expect(screen.getByText(/please verify your account/i)).toBeInTheDocument(),
      );
    }

    beforeEach(() => mockPost.mockReset());

    it('shows the submitted email address on the verify screen', async () => {
      await triggerVerifyScreen();
      expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    });

    it('shows the "Resend verification email" button', async () => {
      await triggerVerifyScreen();
      expect(
        screen.getByRole('button', { name: /resend verification email/i }),
      ).toBeInTheDocument();
    });

    it('clicking resend POSTs to /auth/resend-verification with the email', async () => {
      mockPost.mockResolvedValueOnce({ data: {} });
      await triggerVerifyScreen();
      await userEvent.click(screen.getByRole('button', { name: /resend verification email/i }));
      await waitFor(() =>
        expect(mockPost).toHaveBeenCalledWith('/auth/resend-verification', {
          email: 'alice@example.com',
        }),
      );
    });

    it('shows a confirmation message after successful resend', async () => {
      mockPost.mockResolvedValueOnce({ data: {} });
      await triggerVerifyScreen();
      await userEvent.click(screen.getByRole('button', { name: /resend verification email/i }));
      await waitFor(() =>
        expect(screen.getByText(/verification email sent/i)).toBeInTheDocument(),
      );
    });

    it('hides the resend button after a successful resend', async () => {
      mockPost.mockResolvedValueOnce({ data: {} });
      await triggerVerifyScreen();
      await userEvent.click(screen.getByRole('button', { name: /resend verification email/i }));
      await waitFor(() =>
        expect(
          screen.queryByRole('button', { name: /resend verification email/i }),
        ).not.toBeInTheDocument(),
      );
    });

    it('"Back to sign in" link navigates to /login', async () => {
      await triggerVerifyScreen();
      expect(screen.getByRole('link', { name: /back to sign in/i })).toHaveAttribute(
        'href',
        '/login',
      );
    });
  });

  it('displays a server error message on other failures', async () => {
    const err = { response: { data: { message: 'An account with this email already exists.' } } };
    mockAuth({ register: vi.fn().mockRejectedValue(err) });
    renderRegister();

    await userEvent.type(screen.getByLabelText(/^email$/i), 'alice@example.com');
    await userEvent.type(screen.getByLabelText(/^username$/i), 'alice');
    await userEvent.type(screen.getByLabelText(/^password$/i), 'password1');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'password1');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() =>
      expect(screen.getByText(/an account with this email already exists/i)).toBeInTheDocument(),
    );
  });
});
