import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import type { AuthResponse } from '@/types';

// Mock the axios instance so tests never hit the network
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

// Simple consumer that exposes AuthContext via the DOM
function AuthConsumer() {
  const { user, login, logout, register } = useAuth();
  return (
    <div>
      <span data-testid="username">{user?.username ?? 'none'}</span>
      <button onClick={() => login('alice@example.com', 'password')}>Login</button>
      <button onClick={logout}>Logout</button>
      <button onClick={() => register('alice@example.com', 'alice', 'password')}>Register</button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <AuthProvider>
      <AuthConsumer />
    </AuthProvider>,
  );
}

const fakeAuthResponse: AuthResponse = {
  access_token: 'tok123',
  user: { id: '1', email: 'alice@example.com', username: 'alice' },
};

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    mockPost.mockReset();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('starts with no user when localStorage is empty', async () => {
    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('username')).toHaveTextContent('none'));
  });

  it('restores the user from localStorage on mount', async () => {
    localStorage.setItem('user', JSON.stringify(fakeAuthResponse.user));
    renderWithProvider();
    await waitFor(() =>
      expect(screen.getByTestId('username')).toHaveTextContent('alice'),
    );
  });

  it('handles corrupt localStorage data gracefully', async () => {
    localStorage.setItem('user', 'not-valid-json');
    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('username')).toHaveTextContent('none'));
    expect(localStorage.getItem('user')).toBeNull();
  });

  describe('login', () => {
    it('sets the user and persists token on success', async () => {
      mockPost.mockResolvedValueOnce({ data: fakeAuthResponse });
      renderWithProvider();

      await userEvent.click(screen.getByRole('button', { name: 'Login' }));

      await waitFor(() =>
        expect(screen.getByTestId('username')).toHaveTextContent('alice'),
      );
      expect(localStorage.getItem('access_token')).toBe('tok123');
      expect(JSON.parse(localStorage.getItem('user')!)).toMatchObject({ username: 'alice' });
    });

    it('throws when the API call fails', async () => {
      mockPost.mockRejectedValueOnce(new Error('Invalid credentials'));
      renderWithProvider();

      // The component does not handle the error — we just confirm it propagates
      const { login } = (() => {
        let ctx!: ReturnType<typeof useAuth>;
        function Capture() { ctx = useAuth(); return null; }
        render(<AuthProvider><Capture /></AuthProvider>);
        return { login: ctx.login };
      })();

      await expect(login('bad@example.com', 'wrong')).rejects.toThrow();
    });
  });

  describe('logout', () => {
    it('clears the user and removes localStorage entries', async () => {
      localStorage.setItem('access_token', 'tok123');
      localStorage.setItem('user', JSON.stringify(fakeAuthResponse.user));

      renderWithProvider();
      await waitFor(() =>
        expect(screen.getByTestId('username')).toHaveTextContent('alice'),
      );

      await userEvent.click(screen.getByRole('button', { name: 'Logout' }));

      expect(screen.getByTestId('username')).toHaveTextContent('none');
      expect(localStorage.getItem('access_token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });
  });

  describe('auth:logout event', () => {
    it('clears the user when the event is fired (e.g. 401 interceptor)', async () => {
      localStorage.setItem('user', JSON.stringify(fakeAuthResponse.user));
      renderWithProvider();
      await waitFor(() =>
        expect(screen.getByTestId('username')).toHaveTextContent('alice'),
      );

      act(() => window.dispatchEvent(new Event('auth:logout')));

      await waitFor(() =>
        expect(screen.getByTestId('username')).toHaveTextContent('none'),
      );
    });
  });

  describe('register', () => {
    it('returns the server message without logging the user in', async () => {
      mockPost.mockResolvedValueOnce({ data: { message: 'Check your inbox.' } });

      let ctx!: ReturnType<typeof useAuth>;
      function Capture() { ctx = useAuth(); return null; }
      render(<AuthProvider><Capture /></AuthProvider>);

      const result = await act(() =>
        ctx.register('alice@example.com', 'alice', 'password'),
      );

      expect(result).toEqual({ message: 'Check your inbox.' });
      expect(ctx.user).toBeNull();
    });
  });
});
