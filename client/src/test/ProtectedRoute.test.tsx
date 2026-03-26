import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProtectedRoute from '@/components/ProtectedRoute';
import * as AuthContext from '@/contexts/AuthContext';

function mockAuth(overrides: Partial<ReturnType<typeof AuthContext.useAuth>> = {}) {
  vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
    user: null,
    isLoading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  });
}

function renderWithRoutes(initialPath = '/protected') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/protected" element={<div>Protected content</div>} />
        </Route>
        <Route path="/login" element={<div>Login page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  describe('while loading', () => {
    beforeEach(() => mockAuth({ isLoading: true }));

    it('renders the loading indicator', () => {
      renderWithRoutes();
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('does not render protected content or redirect', () => {
      renderWithRoutes();
      expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
      expect(screen.queryByText('Login page')).not.toBeInTheDocument();
    });
  });

  describe('when not authenticated', () => {
    beforeEach(() => mockAuth({ user: null, isLoading: false }));

    it('redirects to /login', () => {
      renderWithRoutes();
      expect(screen.getByText('Login page')).toBeInTheDocument();
    });

    it('does not render protected content', () => {
      renderWithRoutes();
      expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    });
  });

  describe('when authenticated', () => {
    beforeEach(() =>
      mockAuth({
        user: { id: '1', email: 'a@b.com', username: 'alice' },
        isLoading: false,
      }),
    );

    it('renders the protected content', () => {
      renderWithRoutes();
      expect(screen.getByText('Protected content')).toBeInTheDocument();
    });

    it('does not redirect to login', () => {
      renderWithRoutes();
      expect(screen.queryByText('Login page')).not.toBeInTheDocument();
    });
  });
});
