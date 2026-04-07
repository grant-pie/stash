import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage';
import type { AdminStats, PaginatedResponse, AuditLog } from '@/types';

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

const fakeStats: AdminStats = {
  totalUsers: 42,
  totalSnippets: 138,
  newUsersThisWeek: 7,
  publicSnippets: 55,
  suspendedUsers: 2,
  topLanguages: [
    { language: 'typescript', count: 60 },
    { language: 'python', count: 30 },
  ],
};

const fakeLogsResponse: PaginatedResponse<AuditLog> = {
  data: [
    {
      id: 'log-1',
      adminId: 'admin-1',
      admin: { id: 'admin-1', username: 'adminuser', role: 'admin' },
      action: 'USER_SUSPENDED',
      targetType: 'user',
      targetId: 'user-1',
      metadata: { suspendReason: 'spam' },
      ipAddress: '127.0.0.1',
      createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 min ago
    },
  ],
  total: 1,
  page: 1,
  limit: 8,
};

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminDashboardPage />
    </MemoryRouter>,
  );
}

describe('AdminDashboardPage', () => {
  beforeEach(() => mockGet.mockReset());

  // Fix: resolve the deferred promise after asserting so React can finish
  // its async work before the next test's beforeEach runs.
  it('shows loading state before data resolves', async () => {
    let resolve!: (v: any) => void;
    mockGet.mockReturnValue(new Promise((res) => { resolve = res; }));
    renderPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    resolve({ data: fakeStats });
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
  });

  it('renders all five stat cards with correct values', async () => {
    mockGet.mockResolvedValue({ data: fakeStats });
    // Second call (logs) — override just to avoid unhandled promise
    mockGet
      .mockResolvedValueOnce({ data: fakeStats })
      .mockResolvedValueOnce({ data: fakeLogsResponse });
    renderPage();

    await waitFor(() => expect(screen.getByText('42')).toBeInTheDocument());
    expect(screen.getByText('138')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('55')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders top languages list', async () => {
    mockGet
      .mockResolvedValueOnce({ data: fakeStats })
      .mockResolvedValueOnce({ data: fakeLogsResponse });
    renderPage();

    await waitFor(() => expect(screen.getByText('typescript')).toBeInTheDocument());
    expect(screen.getByText('python')).toBeInTheDocument();
  });

  it('renders recent audit log entries with action badge and admin username', async () => {
    mockGet
      .mockResolvedValueOnce({ data: fakeStats })
      .mockResolvedValueOnce({ data: fakeLogsResponse });
    renderPage();

    await waitFor(() =>
      expect(screen.getByText('USER_SUSPENDED')).toBeInTheDocument(),
    );
    expect(screen.getByText(/adminuser/)).toBeInTheDocument();
  });

  it('shows "No activity yet" when the audit log is empty', async () => {
    mockGet
      .mockResolvedValueOnce({ data: fakeStats })
      .mockResolvedValueOnce({ data: { ...fakeLogsResponse, data: [], total: 0 } });
    renderPage();

    await waitFor(() =>
      expect(screen.getByText(/no activity yet/i)).toBeInTheDocument(),
    );
  });

  it('renders the "View all" link to /admin/audit-logs', async () => {
    mockGet
      .mockResolvedValueOnce({ data: fakeStats })
      .mockResolvedValueOnce({ data: fakeLogsResponse });
    renderPage();

    await waitFor(() =>
      expect(screen.getByRole('link', { name: /view all/i })).toHaveAttribute('href', '/admin/audit-logs'),
    );
  });

  it('renders the "Manage Users" quick link to /admin/users', async () => {
    mockGet
      .mockResolvedValueOnce({ data: fakeStats })
      .mockResolvedValueOnce({ data: fakeLogsResponse });
    renderPage();

    await waitFor(() =>
      expect(screen.getByRole('link', { name: /manage users/i })).toHaveAttribute('href', '/admin/users'),
    );
  });

  describe('timeAgo formatting (via rendered audit log)', () => {
    it('shows "just now" for a log entry from less than a minute ago', async () => {
      const justNowLog = {
        ...fakeLogsResponse.data[0],
        createdAt: new Date(Date.now() - 30 * 1000).toISOString(),
      };
      mockGet
        .mockResolvedValueOnce({ data: fakeStats })
        .mockResolvedValueOnce({ data: { ...fakeLogsResponse, data: [justNowLog] } });
      renderPage();

      await waitFor(() => expect(screen.getByText('just now')).toBeInTheDocument());
    });

    it('shows "Xm ago" for a log entry from minutes ago', async () => {
      const minsAgoLog = {
        ...fakeLogsResponse.data[0],
        createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      };
      mockGet
        .mockResolvedValueOnce({ data: fakeStats })
        .mockResolvedValueOnce({ data: { ...fakeLogsResponse, data: [minsAgoLog] } });
      renderPage();

      await waitFor(() => expect(screen.getByText('15m ago')).toBeInTheDocument());
    });

    it('shows "Xh ago" for a log entry from hours ago', async () => {
      const hoursAgoLog = {
        ...fakeLogsResponse.data[0],
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      };
      mockGet
        .mockResolvedValueOnce({ data: fakeStats })
        .mockResolvedValueOnce({ data: { ...fakeLogsResponse, data: [hoursAgoLog] } });
      renderPage();

      await waitFor(() => expect(screen.getByText('3h ago')).toBeInTheDocument());
    });

    it('shows "Xd ago" for a log entry from days ago', async () => {
      const daysAgoLog = {
        ...fakeLogsResponse.data[0],
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      };
      mockGet
        .mockResolvedValueOnce({ data: fakeStats })
        .mockResolvedValueOnce({ data: { ...fakeLogsResponse, data: [daysAgoLog] } });
      renderPage();

      await waitFor(() => expect(screen.getByText('3d ago')).toBeInTheDocument());
    });
  });
});
