import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminUsersPage from '@/pages/admin/AdminUsersPage';
import type { AdminUser, PaginatedResponse } from '@/types';

vi.mock('@/lib/axios', () => ({
  default: {
    get: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

import api from '@/lib/axios';
const mockGet = vi.mocked(api.get);

const fakeUsers: AdminUser[] = [
  {
    id: 'user-1',
    email: 'alice@example.com',
    username: 'alice',
    role: 'user',
    isSuspended: false,
    createdAt: '2024-01-10T00:00:00Z',
    snippetCount: 5,
  },
  {
    id: 'user-2',
    email: 'bob@example.com',
    username: 'bob',
    role: 'moderator',
    isSuspended: true,
    createdAt: '2024-02-20T00:00:00Z',
    snippetCount: 12,
  },
  {
    id: 'user-3',
    email: 'carol@example.com',
    username: 'carol',
    role: 'admin',
    isSuspended: false,
    createdAt: '2024-03-01T00:00:00Z',
    snippetCount: 0,
  },
];

const fakeResponse: PaginatedResponse<AdminUser> = {
  data: fakeUsers,
  total: 3,
  page: 1,
  limit: 20,
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin/users']}>
      <Routes>
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/users/:id" element={<div>User detail</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AdminUsersPage', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockGet.mockResolvedValue({ data: fakeResponse });
  });

  it('renders the page heading', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Users')).toBeInTheDocument());
  });

  it('renders a row for each user', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('alice')).toBeInTheDocument());
    expect(screen.getByText('bob')).toBeInTheDocument();
    expect(screen.getByText('carol')).toBeInTheDocument();
  });

  it('shows email address for each user', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('alice@example.com')).toBeInTheDocument());
  });

  it('shows snippet counts', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('5')).toBeInTheDocument());
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('renders "Active" badge for non-suspended users', async () => {
    renderPage();
    await waitFor(() => {
      const activeBadges = screen.getAllByText('Active');
      expect(activeBadges.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders "Suspended" badge for suspended users', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Suspended')).toBeInTheDocument());
  });

  it('renders role badges for all users', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('user')).toBeInTheDocument();
      expect(screen.getByText('moderator')).toBeInTheDocument();
      expect(screen.getByText('admin')).toBeInTheDocument();
    });
  });

  it('each row has a "View" link pointing to /admin/users/:id', async () => {
    renderPage();
    await waitFor(() => {
      const viewLinks = screen.getAllByRole('link', { name: 'View' });
      expect(viewLinks[0]).toHaveAttribute('href', '/admin/users/user-1');
    });
  });

  it('submitting the search form re-fetches with the search param', async () => {
    renderPage();
    await waitFor(() => screen.getByText('alice'));

    await userEvent.type(screen.getByPlaceholderText(/search by email or username/i), 'bob');
    await userEvent.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() => {
      const calls = mockGet.mock.calls;
      const lastCall = calls[calls.length - 1][0] as string;
      expect(lastCall).toContain('search=bob');
    });
  });

  it('selecting a role filter re-fetches with the role param', async () => {
    renderPage();
    await waitFor(() => screen.getByText('alice'));

    await userEvent.selectOptions(screen.getByRole('combobox', { name: '' }), 'admin');

    await waitFor(() => {
      const calls = mockGet.mock.calls;
      const lastCall = calls[calls.length - 1][0] as string;
      expect(lastCall).toContain('role=admin');
    });
  });

  it('shows "No users found" when the list is empty', async () => {
    mockGet.mockResolvedValue({ data: { data: [], total: 0, page: 1, limit: 20 } });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/no users found/i)).toBeInTheDocument(),
    );
  });

  it('shows loading indicator while fetching', () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
