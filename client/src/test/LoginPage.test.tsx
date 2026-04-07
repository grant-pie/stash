import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoginPage from '@/pages/LoginPage';
import * as AuthContext from '@/contexts/AuthContext';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

function mockAuth(overrides: Partial<ReturnType<typeof AuthContext.useAuth>> = {}) {
  vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
    user: null,
    isAdmin: false,
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

  it('shows the resend verification hint when errorCode is EMAIL_NOT_VERIFIED', async () => {
    const err = {
      response: {
        data: {
          message: 'Please verify your email.',
          errorCode: 'EMAIL_NOT_VERIFIED',
        },
      },
    };
    mockAuth({ login: vi.fn().mockRejectedValue(err) });
    renderLogin();

    await userEvent.type(screen.getByLabelText(/email or username/i), 'alice');
    await userEvent.type(screen.getByLabelText(/^password$/i), 'pass');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() =>
      expect(screen.getByRole('link', { name: /resend verification email/i })).toBeInTheDocument(),
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
    expect(screen.queryByRole('link', { name: /resend verification email/i })).not.toBeInTheDocument();
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
