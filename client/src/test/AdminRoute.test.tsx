import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminRoute from '@/components/AdminRoute';
import * as AuthContext from '@/contexts/AuthContext';

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

function renderWithRoutes(initialPath = '/admin') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<div>Admin content</div>} />
        </Route>
        <Route path="/login" element={<div>Login page</div>} />
        <Route path="/feed" element={<div>Feed page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AdminRoute', () => {
  describe('while loading', () => {
    beforeEach(() => mockAuth({ isLoading: true }));

    it('renders the loading indicator', () => {
      renderWithRoutes();
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('does not render admin content or redirect', () => {
      renderWithRoutes();
      expect(screen.queryByText('Admin content')).not.toBeInTheDocument();
      expect(screen.queryByText('Login page')).not.toBeInTheDocument();
      expect(screen.queryByText('Feed page')).not.toBeInTheDocument();
    });
  });

  describe('when not authenticated', () => {
    beforeEach(() => mockAuth({ user: null, isAdmin: false, isLoading: false }));

    it('redirects to /login', () => {
      renderWithRoutes();
      expect(screen.getByText('Login page')).toBeInTheDocument();
    });

    it('does not render admin content', () => {
      renderWithRoutes();
      expect(screen.queryByText('Admin content')).not.toBeInTheDocument();
    });
  });

  describe('when authenticated but not admin or moderator', () => {
    beforeEach(() =>
      mockAuth({
        user: { id: '1', email: 'a@b.com', username: 'alice', role: 'user' },
        isAdmin: false,
        isModerator: false,
        isLoading: false,
      }),
    );

    it('redirects to /feed', () => {
      renderWithRoutes();
      expect(screen.getByText('Feed page')).toBeInTheDocument();
    });

    it('does not render admin content', () => {
      renderWithRoutes();
      expect(screen.queryByText('Admin content')).not.toBeInTheDocument();
    });
  });

  describe('when authenticated as moderator', () => {
    beforeEach(() =>
      mockAuth({
        user: { id: '3', email: 'mod@example.com', username: 'moduser', role: 'moderator' },
        isAdmin: false,
        isModerator: true,
        isLoading: false,
      }),
    );

    it('renders the admin content', () => {
      renderWithRoutes();
      expect(screen.getByText('Admin content')).toBeInTheDocument();
    });

    it('does not redirect to login or feed', () => {
      renderWithRoutes();
      expect(screen.queryByText('Login page')).not.toBeInTheDocument();
      expect(screen.queryByText('Feed page')).not.toBeInTheDocument();
    });
  });

  describe('when authenticated as admin', () => {
    beforeEach(() =>
      mockAuth({
        user: { id: '2', email: 'admin@example.com', username: 'adminuser', role: 'admin' },
        isAdmin: true,
        isLoading: false,
      }),
    );

    it('renders the admin content', () => {
      renderWithRoutes();
      expect(screen.getByText('Admin content')).toBeInTheDocument();
    });

    it('does not redirect', () => {
      renderWithRoutes();
      expect(screen.queryByText('Login page')).not.toBeInTheDocument();
      expect(screen.queryByText('Feed page')).not.toBeInTheDocument();
    });
  });
});
