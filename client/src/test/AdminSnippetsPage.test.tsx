import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminSnippetsPage from '@/pages/admin/AdminSnippetsPage';
import type { Snippet, PaginatedResponse } from '@/types';

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

type SnippetWithUser = Snippet & { user?: { username: string } };

const fakeSnippets: SnippetWithUser[] = [
  {
    id: 'snip-1',
    title: 'Utility Function',
    description: 'A reusable helper',
    language: 'typescript',
    content: 'export const noop = () => {};',
    tags: ['utility'],
    isPublic: true,
    userId: 'user-1',
    user: { username: 'alice' },
    createdAt: '2024-03-01T00:00:00Z',
    updatedAt: '2024-03-01T00:00:00Z',
  },
  {
    id: 'snip-2',
    title: 'Private Config',
    description: null,
    language: 'python',
    content: 'SECRET = "abc"',
    tags: [],
    isPublic: false,
    userId: 'user-2',
    user: { username: 'bob' },
    createdAt: '2024-03-05T00:00:00Z',
    updatedAt: '2024-03-05T00:00:00Z',
  },
];

const fakeResponse: PaginatedResponse<SnippetWithUser> = {
  data: fakeSnippets,
  total: 2,
  page: 1,
  limit: 20,
};

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminSnippetsPage />
    </MemoryRouter>,
  );
}

describe('AdminSnippetsPage', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPatch.mockReset();
    mockDelete.mockReset();
    mockGet.mockResolvedValue({ data: fakeResponse });
  });

  it('renders snippet titles', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Utility Function')).toBeInTheDocument());
    expect(screen.getByText('Private Config')).toBeInTheDocument();
  });

  it('shows language badges', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('typescript')).toBeInTheDocument());
    expect(screen.getByText('python')).toBeInTheDocument();
  });

  it('shows author usernames', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('alice')).toBeInTheDocument());
    expect(screen.getByText('bob')).toBeInTheDocument();
  });

  it('shows "Public" visibility badge for public snippets', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Public' })).toBeInTheDocument());
  });

  it('shows "Private" visibility badge for private snippets', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Private' })).toBeInTheDocument());
  });

  it('clicking visibility button calls PATCH with toggled isPublic value', async () => {
    mockPatch.mockResolvedValueOnce({ data: { ...fakeSnippets[0], isPublic: false } });
    renderPage();
    await waitFor(() => screen.getByRole('button', { name: 'Public' }));

    await userEvent.click(screen.getByRole('button', { name: 'Public' }));

    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith('/admin/snippets/snip-1/visibility', { isPublic: false }),
    );
  });

  it('updates the visibility badge in-place after toggle without re-fetch', async () => {
    const originalCallCount = 0;
    mockPatch.mockResolvedValueOnce({ data: { ...fakeSnippets[0], isPublic: false } });
    renderPage();
    await waitFor(() => screen.getByRole('button', { name: 'Public' }));

    const callsBefore = mockGet.mock.calls.length;
    await userEvent.click(screen.getByRole('button', { name: 'Public' }));

    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Private' }).length).toBe(2));
    expect(mockGet.mock.calls.length).toBe(callsBefore); // no additional GET
  });

  it('submitting the search form re-fetches with the search param', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Utility Function'));

    await userEvent.type(screen.getByPlaceholderText(/search by title/i), 'config');
    await userEvent.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() => {
      const lastCall = mockGet.mock.calls[mockGet.mock.calls.length - 1][0] as string;
      expect(lastCall).toContain('search=config');
    });
  });

  it('calls DELETE after confirmed deletion', async () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
    mockDelete.mockResolvedValueOnce({});
    renderPage();
    await waitFor(() => screen.getAllByRole('button', { name: /delete/i }));

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    await userEvent.click(deleteButtons[0]);

    await waitFor(() =>
      expect(mockDelete).toHaveBeenCalledWith('/admin/snippets/snip-1'),
    );
  });

  it('removes the deleted snippet row from the table', async () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
    mockDelete.mockResolvedValueOnce({});
    renderPage();
    await waitFor(() => screen.getByText('Utility Function'));

    await userEvent.click(screen.getAllByRole('button', { name: /delete/i })[0]);

    await waitFor(() =>
      expect(screen.queryByText('Utility Function')).not.toBeInTheDocument(),
    );
  });

  it('does NOT call DELETE when confirmation is declined', async () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
    renderPage();
    await waitFor(() => screen.getAllByRole('button', { name: /delete/i }));

    await userEvent.click(screen.getAllByRole('button', { name: /delete/i })[0]);

    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('shows "No snippets found" when the list is empty', async () => {
    mockGet.mockResolvedValue({ data: { data: [], total: 0, page: 1, limit: 20 } });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/no snippets found/i)).toBeInTheDocument(),
    );
  });

  it('shows loading indicator while fetching', () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
