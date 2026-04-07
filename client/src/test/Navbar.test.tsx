import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Navbar from '@/components/Navbar';
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

function renderNavbar() {
  return render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>,
  );
}

describe('Navbar', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  describe('when logged out', () => {
    beforeEach(() => mockAuth());

    it('renders the Stash logo linking to /feed', () => {
      renderNavbar();
      const logo = screen.getByRole('link', { name: 'Stash' });
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute('href', '/feed');
    });

    it('renders the Feed nav link', () => {
      renderNavbar();
      expect(screen.getByRole('link', { name: 'Feed' })).toBeInTheDocument();
    });

    it('does not render My Snippets', () => {
      renderNavbar();
      expect(screen.queryByRole('link', { name: 'My Snippets' })).not.toBeInTheDocument();
    });

    it('renders Sign in and Register links', () => {
      renderNavbar();
      expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Register' })).toBeInTheDocument();
    });

    it('does not render Sign out or New snippet', () => {
      renderNavbar();
      expect(screen.queryByRole('button', { name: /sign out/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /new snippet/i })).not.toBeInTheDocument();
    });
  });

  describe('when logged in', () => {
    const mockLogout = vi.fn();

    beforeEach(() =>
      mockAuth({
        user: { id: '1', email: 'a@b.com', username: 'alice', role: 'user' },
        logout: mockLogout,
      }),
    );

    it('renders My Snippets link', () => {
      renderNavbar();
      expect(screen.getByRole('link', { name: 'My Snippets' })).toBeInTheDocument();
    });

    it('renders the username', () => {
      renderNavbar();
      expect(screen.getByText('alice')).toBeInTheDocument();
    });

    it('renders + New snippet link', () => {
      renderNavbar();
      expect(screen.getByRole('link', { name: /new snippet/i })).toBeInTheDocument();
    });

    it('does not render Sign in or Register', () => {
      renderNavbar();
      expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Register' })).not.toBeInTheDocument();
    });

    it('calls logout and navigates to /feed when Sign out is clicked', async () => {
      renderNavbar();
      await userEvent.click(screen.getByRole('button', { name: /sign out/i }));
      expect(mockLogout).toHaveBeenCalledOnce();
      expect(mockNavigate).toHaveBeenCalledWith('/feed', { replace: true });
    });

    it('does not render the Admin link for a non-admin user', () => {
      renderNavbar();
      expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
    });
  });

  describe('when logged in as admin', () => {
    beforeEach(() =>
      mockAuth({
        user: { id: '2', email: 'admin@example.com', username: 'adminuser', role: 'admin' },
        isAdmin: true,
      }),
    );

    it('renders the Admin nav link', () => {
      renderNavbar();
      expect(screen.getByRole('link', { name: 'Admin' })).toBeInTheDocument();
    });

    it('Admin link points to /admin', () => {
      renderNavbar();
      expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
    });
  });
});
