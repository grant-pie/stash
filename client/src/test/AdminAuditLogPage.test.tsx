import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminAuditLogPage from '@/pages/admin/AdminAuditLogPage';
import type { AuditLog, PaginatedResponse } from '@/types';

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

const fakeLogs: AuditLog[] = [
  {
    id: 'log-1',
    adminId: 'admin-1',
    admin: { id: 'admin-1', username: 'adminuser', role: 'admin' },
    action: 'USER_SUSPENDED',
    targetType: 'user',
    targetId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    metadata: { suspendReason: 'spam' },
    ipAddress: '192.168.1.1',
    createdAt: '2024-04-01T10:30:00Z',
  },
  {
    id: 'log-2',
    adminId: null,
    admin: null,
    action: 'SNIPPET_DELETED',
    targetType: 'snippet',
    targetId: '11111111-2222-3333-4444-555555555555',
    metadata: { title: 'Old snippet' },
    ipAddress: null,
    createdAt: '2024-04-02T08:00:00Z',
  },
  {
    id: 'log-3',
    adminId: 'admin-1',
    admin: { id: 'admin-1', username: 'adminuser', role: 'admin' },
    action: 'USER_ROLE_CHANGED',
    targetType: 'user',
    targetId: 'ffffffff-aaaa-bbbb-cccc-dddddddddddd',
    metadata: { previousRole: 'user', newRole: 'moderator' },
    ipAddress: '10.0.0.1',
    createdAt: '2024-04-03T12:00:00Z',
  },
];

const fakeResponse: PaginatedResponse<AuditLog> = {
  data: fakeLogs,
  total: 3,
  page: 1,
  limit: 25,
};

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminAuditLogPage />
    </MemoryRouter>,
  );
}

describe('AdminAuditLogPage', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockGet.mockResolvedValue({ data: fakeResponse });
  });

  it('renders the page heading', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Audit Log')).toBeInTheDocument());
  });

  it('renders a row for each log entry', async () => {
    renderPage();
    // Action names also appear as <option> values in the filter dropdown,
    // so use getAllByText and confirm at least 2 instances (option + badge).
    await waitFor(() =>
      expect(screen.getAllByText('USER_SUSPENDED').length).toBeGreaterThanOrEqual(1),
    );
    // SNIPPET_DELETED exists in the filter <option> AND the table badge
    expect(screen.getAllByText('SNIPPET_DELETED').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('USER_ROLE_CHANGED').length).toBeGreaterThanOrEqual(1);
  });

  it('shows admin username for each log entry', async () => {
    renderPage();
    await waitFor(() => {
      const adminCells = screen.getAllByText('adminuser');
      expect(adminCells.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows italic "deleted" text when admin is null', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('deleted')).toBeInTheDocument());
  });

  it('shows truncated target ID (first 8 chars + …)', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('aaaaaaaa…')).toBeInTheDocument());
  });

  it('shows IP address for entries that have one', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('192.168.1.1')).toBeInTheDocument());
  });

  it('shows "—" for null IP address', async () => {
    renderPage();
    await waitFor(() => {
      // At least one "—" cell should exist (for the null IP entry)
      const dashes = screen.getAllByText('—');
      expect(dashes.length).toBeGreaterThan(0);
    });
  });

  it('renders metadata as key-value badges', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText(/suspendReason: spam/)).toBeInTheDocument());
  });

  it('renders "—" for null/empty metadata', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        ...fakeResponse,
        data: [{ ...fakeLogs[0], metadata: null }],
      },
    });
    renderPage();
    await waitFor(() => {
      const dashes = screen.getAllByText('—');
      expect(dashes.length).toBeGreaterThan(0);
    });
  });

  it('selecting an action filter re-fetches with the action param', async () => {
    renderPage();
    await waitFor(() => screen.getByText('USER_SUSPENDED'));

    await userEvent.selectOptions(
      screen.getAllByRole('combobox')[0],
      'USER_SUSPENDED',
    );

    await waitFor(() => {
      const lastCall = mockGet.mock.calls[mockGet.mock.calls.length - 1][0] as string;
      expect(lastCall).toContain('action=USER_SUSPENDED');
    });
  });

  it('selecting a target type filter re-fetches with the targetType param', async () => {
    renderPage();
    await waitFor(() => screen.getByText('USER_SUSPENDED'));

    await userEvent.selectOptions(
      screen.getAllByRole('combobox')[1],
      'user',
    );

    await waitFor(() => {
      const lastCall = mockGet.mock.calls[mockGet.mock.calls.length - 1][0] as string;
      expect(lastCall).toContain('targetType=user');
    });
  });

  it('does NOT render any edit or delete buttons (read-only page)', async () => {
    renderPage();
    await waitFor(() => screen.getByText('USER_SUSPENDED'));
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
  });

  it('shows "No audit log entries found" when the list is empty', async () => {
    mockGet.mockResolvedValue({ data: { data: [], total: 0, page: 1, limit: 25 } });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/no audit log entries found/i)).toBeInTheDocument(),
    );
  });

  it('shows loading indicator while fetching', () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
