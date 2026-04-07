import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminUserDetailPage from '@/pages/admin/AdminUserDetailPage';
import * as AuthContext from '@/contexts/AuthContext';
import type { AdminUser } from '@/types';

vi.mock('@/lib/axios', () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

import api from '@/lib/axios';
const mockGet = vi.mocked(api.get);
const mockPatch = vi.mocked(api.patch);
const mockDelete = vi.mocked(api.delete);

const fakeUser: AdminUser = {
  id: 'user-1',
  email: 'alice@example.com',
  username: 'alice',
  role: 'user',
  isSuspended: false,
  suspendedAt: null,
  suspendReason: null,
  createdAt: '2024-01-10T00:00:00Z',
  snippetCount: 8,
};

function mockAuth(userId = 'admin-99') {
  vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
    user: { id: userId, email: 'admin@example.com', username: 'adminuser', role: 'admin' },
    isAdmin: true,
    isLoading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  });
}

function renderPage(userId = 'user-1') {
  return render(
    <MemoryRouter initialEntries={[`/admin/users/${userId}`]}>
      <Routes>
        <Route path="/admin/users/:id" element={<AdminUserDetailPage />} />
        <Route path="/admin/users" element={<div>Users list</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AdminUserDetailPage', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPatch.mockReset();
    mockDelete.mockReset();
    mockAuth();
    mockGet.mockResolvedValue({ data: fakeUser });
  });

  it('renders username, email, role, and snippet count', async () => {
    renderPage();
    // 'alice' appears in breadcrumb + profile; 'user' appears in badge + <option>
    await waitFor(() => expect(screen.getAllByText('alice').length).toBeGreaterThanOrEqual(1));
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getAllByText('user').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/8 snippets/i)).toBeInTheDocument();
  });

  it('renders a breadcrumb link back to /admin/users', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Users' })).toHaveAttribute('href', '/admin/users'),
    );
  });

  it('role select is pre-populated with the current role', async () => {
    renderPage();
    await waitFor(() => {
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('user');
    });
  });

  it('"Save" role button is disabled when the selected role matches the current role', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^save$/i })).toBeDisabled(),
    );
  });

  it('"Save" role button is enabled when the role selection changes', async () => {
    renderPage();
    await waitFor(() => screen.getByRole('combobox'));

    await userEvent.selectOptions(screen.getByRole('combobox'), 'moderator');
    expect(screen.getByRole('button', { name: /^save$/i })).not.toBeDisabled();
  });

  it('calls PATCH with the new role when Save is clicked', async () => {
    mockPatch.mockResolvedValueOnce({ data: { ...fakeUser, role: 'moderator' } });
    renderPage();
    await waitFor(() => screen.getByRole('combobox'));

    await userEvent.selectOptions(screen.getByRole('combobox'), 'moderator');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith('/admin/users/user-1', { role: 'moderator' }),
    );
  });

  it('shows reason input and Suspend button for active users', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /suspend user/i })).toBeInTheDocument(),
    );
    expect(screen.getByPlaceholderText(/reason/i)).toBeInTheDocument();
  });

  it('calls PATCH with isSuspended=true and reason when Suspend is clicked', async () => {
    mockPatch.mockResolvedValueOnce({ data: { ...fakeUser, isSuspended: true, suspendReason: 'spam' } });
    renderPage();
    await waitFor(() => screen.getByRole('button', { name: /suspend user/i }));

    await userEvent.type(screen.getByPlaceholderText(/reason/i), 'spam');
    await userEvent.click(screen.getByRole('button', { name: /suspend user/i }));

    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith('/admin/users/user-1', {
        isSuspended: true,
        suspendReason: 'spam',
      }),
    );
  });

  it('shows "Lift Suspension" button for suspended users', async () => {
    mockGet.mockResolvedValueOnce({
      data: { ...fakeUser, isSuspended: true, suspendReason: 'spam', suspendedAt: '2024-04-01T00:00:00Z' },
    });
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /lift suspension/i })).toBeInTheDocument(),
    );
  });

  it('calls PATCH with isSuspended=false when Lift Suspension is clicked', async () => {
    mockGet.mockResolvedValueOnce({
      data: { ...fakeUser, isSuspended: true, suspendReason: 'spam' },
    });
    mockPatch.mockResolvedValueOnce({ data: { ...fakeUser, isSuspended: false } });
    renderPage();
    await waitFor(() => screen.getByRole('button', { name: /lift suspension/i }));

    await userEvent.click(screen.getByRole('button', { name: /lift suspension/i }));

    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith('/admin/users/user-1', { isSuspended: false }),
    );
  });

  it('shows "You" badge and disables all actions when viewing own account', async () => {
    mockAuth('user-1'); // current admin ID matches the user being viewed
    renderPage();
    await waitFor(() => expect(screen.getByText('You')).toBeInTheDocument());

    expect(screen.getByRole('button', { name: /^save$/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /suspend user/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /delete account/i })).toBeDisabled();
  });

  it('calls DELETE and navigates to /admin/users on confirmed deletion', async () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
    mockDelete.mockResolvedValueOnce({});
    renderPage();
    await waitFor(() => screen.getByRole('button', { name: /delete account/i }));

    await userEvent.click(screen.getByRole('button', { name: /delete account/i }));

    await waitFor(() =>
      expect(mockDelete).toHaveBeenCalledWith('/admin/users/user-1'),
    );
    await waitFor(() =>
      expect(screen.getByText('Users list')).toBeInTheDocument(),
    );
  });

  it('does NOT call DELETE when confirmation is declined', async () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
    renderPage();
    await waitFor(() => screen.getByRole('button', { name: /delete account/i }));

    await userEvent.click(screen.getByRole('button', { name: /delete account/i }));

    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('shows an error state when the user is not found', async () => {
    mockGet.mockRejectedValueOnce({ response: { status: 404 } });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/user not found/i)).toBeInTheDocument(),
    );
  });
});
