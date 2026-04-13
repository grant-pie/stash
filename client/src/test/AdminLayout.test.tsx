import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminLayout from '@/layouts/AdminLayout';
import * as AuthContext from '@/contexts/AuthContext';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockLogout = vi.fn();

function mockAuth(overrides: Partial<ReturnType<typeof AuthContext.useAuth>> = {}) {
  vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
    user: { id: '1', email: 'admin@example.com', username: 'adminuser', role: 'admin' },
    isAdmin: true,
    isModerator: false,
    isLoading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: mockLogout,
    ...overrides,
  });
}

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<div>Page content</div>} />
        </Route>
        <Route path="/feed" element={<div>Feed page</div>} />
        <Route path="/my-snippets" element={<div>My snippets</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AdminLayout', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockLogout.mockClear();
    mockAuth();
  });

  it('renders the Stash logo', () => {
    renderLayout();
    expect(screen.getByRole('link', { name: 'Stash' })).toBeInTheDocument();
  });

  it('renders the Admin badge', () => {
    renderLayout();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('renders all four navigation links', () => {
    renderLayout();
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Users' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Snippets' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Audit Log' })).toBeInTheDocument();
  });

  it('Dashboard link points to /admin', () => {
    renderLayout();
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/admin');
  });

  it('Users link points to /admin/users', () => {
    renderLayout();
    expect(screen.getByRole('link', { name: 'Users' })).toHaveAttribute('href', '/admin/users');
  });

  it('Snippets link points to /admin/snippets', () => {
    renderLayout();
    expect(screen.getByRole('link', { name: 'Snippets' })).toHaveAttribute('href', '/admin/snippets');
  });

  it('Audit Log link points to /admin/audit-logs', () => {
    renderLayout();
    expect(screen.getByRole('link', { name: 'Audit Log' })).toHaveAttribute('href', '/admin/audit-logs');
  });

  it('displays the logged-in username in the footer', () => {
    renderLayout();
    expect(screen.getByText('adminuser')).toBeInTheDocument();
  });

  it('"Back to app" link points to /my-snippets', () => {
    renderLayout();
    expect(screen.getByRole('link', { name: 'Back to app' })).toHaveAttribute('href', '/my-snippets');
  });

  it('Sign out button calls logout and navigates to /feed', async () => {
    renderLayout();
    await userEvent.click(screen.getByRole('button', { name: /sign out/i }));
    expect(mockLogout).toHaveBeenCalledOnce();
    expect(mockNavigate).toHaveBeenCalledWith('/feed', { replace: true });
  });

  it('renders child page content via Outlet', () => {
    renderLayout();
    expect(screen.getByText('Page content')).toBeInTheDocument();
  });

  describe('when logged in as moderator', () => {
    beforeEach(() => {
      mockAuth({
        user: { id: '2', email: 'mod@example.com', username: 'moduser', role: 'moderator' },
        isAdmin: false,
        isModerator: true,
      });
    });

    it('renders the "Mod" badge instead of "Admin"', () => {
      renderLayout();
      expect(screen.getByText('Mod')).toBeInTheDocument();
      expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    });

    it('renders Dashboard and Snippets nav links', () => {
      renderLayout();
      expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Snippets' })).toBeInTheDocument();
    });

    it('does not render Users nav link', () => {
      renderLayout();
      expect(screen.queryByRole('link', { name: 'Users' })).not.toBeInTheDocument();
    });

    it('does not render Audit Log nav link', () => {
      renderLayout();
      expect(screen.queryByRole('link', { name: 'Audit Log' })).not.toBeInTheDocument();
    });
  });
});
