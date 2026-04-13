import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoginPage from '@/pages/LoginPage';
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

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

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

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<div>Register page</div>} />
        <Route path="/forgot-password" element={<div>Forgot password page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => mockNavigate.mockClear());

  it('renders the identifier and password inputs', () => {
    mockAuth();
    renderLogin();
    expect(screen.getByLabelText(/email or username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
  });

  it('renders the sign in submit button', () => {
    mockAuth();
    renderLogin();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('renders the Forgot password link', () => {
    mockAuth();
    renderLogin();
    expect(screen.getByRole('link', { name: /forgot password/i })).toHaveAttribute('href', '/forgot-password');
  });

  it('renders the Create one / Register link', () => {
    mockAuth();
    renderLogin();
    expect(screen.getByRole('link', { name: /create one/i })).toHaveAttribute('href', '/register');
  });

  it('calls login() with identifier and password on submit', async () => {
    const mockLogin = vi.fn().mockResolvedValue(undefined);
    mockAuth({ login: mockLogin });
    renderLogin();

    await userEvent.type(screen.getByLabelText(/email or username/i), 'alice');
    await userEvent.type(screen.getByLabelText(/^password$/i), 'secret123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('alice', 'secret123'));
  });

  it('navigates to / on successful login', async () => {
    mockAuth({ login: vi.fn().mockResolvedValue(undefined) });
    renderLogin();

    await userEvent.type(screen.getByLabelText(/email or username/i), 'alice');
    await userEvent.type(screen.getByLabelText(/^password$/i), 'secret123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'));
  });

  it('shows an error message when login fails', async () => {
    const err = { response: { data: { message: 'Invalid credentials.' } } };
    mockAuth({ login: vi.fn().mockRejectedValue(err) });
    renderLogin();

    await userEvent.type(screen.getByLabelText(/email or username/i), 'alice');
    await userEvent.type(screen.getByLabelText(/^password$/i), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() =>
      expect(screen.getByText('Invalid credentials.')).toBeInTheDocument(),
    );
  });

  it('does not show the resend hint for other errors', async () => {
    const err = { response: { data: { message: 'Invalid credentials.', errorCode: 'INVALID_CREDS' } } };
    mockAuth({ login: vi.fn().mockRejectedValue(err) });
    renderLogin();

    await userEvent.type(screen.getByLabelText(/email or username/i), 'alice');
    await userEvent.type(screen.getByLabelText(/^password$/i), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(screen.getByText('Invalid credentials.')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /resend verification email/i })).not.toBeInTheDocument();
  });

  describe('EMAIL_NOT_VERIFIED — verify screen', () => {
    const notVerifiedErr = {
      response: {
        data: { message: 'Please verify your email.', errorCode: 'EMAIL_NOT_VERIFIED' },
      },
    };

    async function triggerNotVerified(identifier = 'alice@example.com') {
      mockAuth({ login: vi.fn().mockRejectedValue(notVerifiedErr) });
      renderLogin();
      await userEvent.type(screen.getByLabelText(/email or username/i), identifier);
      await userEvent.type(screen.getByLabelText(/^password$/i), 'pass');
      await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
      await waitFor(() =>
        expect(screen.getByText(/please verify your account/i)).toBeInTheDocument(),
      );
    }

    beforeEach(() => mockPost.mockReset());

    it('shows the "Please verify your account" heading', async () => {
      await triggerNotVerified();
      expect(screen.getByText(/please verify your account/i)).toBeInTheDocument();
    });

    it('pre-fills the email input when the identifier looks like an email', async () => {
      await triggerNotVerified('alice@example.com');
      expect(screen.getByDisplayValue('alice@example.com')).toBeInTheDocument();
    });

    it('leaves the email input empty when the identifier is a username', async () => {
      await triggerNotVerified('alice');
      const input = screen.getByPlaceholderText(/your email address/i) as HTMLInputElement;
      expect(input.value).toBe('');
    });

    it('shows the "Resend verification email" button', async () => {
      await triggerNotVerified();
      expect(screen.getByRole('button', { name: /resend verification email/i })).toBeInTheDocument();
    });

    it('clicking "Resend verification email" POSTs to /auth/resend-verification', async () => {
      mockPost.mockResolvedValueOnce({ data: {} });
      await triggerNotVerified();
      await userEvent.click(screen.getByRole('button', { name: /resend verification email/i }));
      await waitFor(() =>
        expect(mockPost).toHaveBeenCalledWith('/auth/resend-verification', { email: 'alice@example.com' }),
      );
    });

    it('shows confirmation message after successful resend', async () => {
      mockPost.mockResolvedValueOnce({ data: {} });
      await triggerNotVerified();
      await userEvent.click(screen.getByRole('button', { name: /resend verification email/i }));
      await waitFor(() =>
        expect(screen.getByText(/verification email sent/i)).toBeInTheDocument(),
      );
    });

    it('"Back to sign in" button returns to the login form', async () => {
      await triggerNotVerified();
      await userEvent.click(screen.getByRole('button', { name: /back to sign in/i }));
      await waitFor(() =>
        expect(screen.getByLabelText(/email or username/i)).toBeInTheDocument(),
      );
    });

    it('does not navigate away when resend is clicked', async () => {
      mockPost.mockResolvedValueOnce({ data: {} });
      await triggerNotVerified();
      await userEvent.click(screen.getByRole('button', { name: /resend verification email/i }));
      await waitFor(() => screen.getByText(/verification email sent/i));
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it('shows a fallback message when the error has no message property', async () => {
    mockAuth({ login: vi.fn().mockRejectedValue(new Error('Network error')) });
    renderLogin();

    await userEvent.type(screen.getByLabelText(/email or username/i), 'alice');
    await userEvent.type(screen.getByLabelText(/^password$/i), 'pass');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() =>
      expect(screen.getByText(/could not connect/i)).toBeInTheDocument(),
    );
  });
});
