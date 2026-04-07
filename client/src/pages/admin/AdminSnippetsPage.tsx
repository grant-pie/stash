import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/axios';
import type { Snippet, PaginatedResponse } from '@/types';
import Pagination from '@/components/Pagination';

export default function AdminSnippetsPage() {
  const [data, setData] = useState<PaginatedResponse<Snippet & { user?: { username: string } }> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [language, setLanguage] = useState('');
  const [visibility, setVisibility] = useState('');
  const [page, setPage] = useState(1);

  const fetchSnippets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (language) params.set('language', language);
      if (visibility !== '') params.set('isPublic', visibility);
      params.set('page', String(page));
      params.set('limit', '20');
      const res = await api.get<PaginatedResponse<Snippet & { user?: { username: string } }>>(
        `/admin/snippets?${params}`,
      );
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }, [search, language, visibility, page]);

  useEffect(() => {
    fetchSnippets();
  }, [fetchSnippets]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  }

  async function handleToggleVisibility(id: string, currentValue: boolean) {
    await api.patch(`/admin/snippets/${id}/visibility`, { isPublic: !currentValue });
    setData((prev) =>
      prev
        ? {
            ...prev,
            data: prev.data.map((s) =>
              s.id === id ? { ...s, isPublic: !currentValue } : s,
            ),
          }
        : prev,
    );
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete snippet "${title}"? This cannot be undone.`)) return;
    await api.delete(`/admin/snippets/${id}`);
    setData((prev) =>
      prev
        ? { ...prev, data: prev.data.filter((s) => s.id !== id), total: prev.total - 1 }
        : prev,
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-100">Snippets</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {data ? `${data.total} total` : ''}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-48">
          <input
            type="search"
            className="input flex-1"
            placeholder="Search by title or description…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button type="submit" className="btn-primary shrink-0">
            Search
          </button>
        </form>
        <input
          type="text"
          className="input w-36"
          placeholder="Language"
          value={language}
          onChange={(e) => { setLanguage(e.target.value); setPage(1); }}
        />
        <select
          className="input w-auto"
          value={visibility}
          onChange={(e) => { setVisibility(e.target.value); setPage(1); }}
        >
          <option value="">All snippets</option>
          <option value="true">Public only</option>
          <option value="false">Private only</option>
        </select>
        {(search || language || visibility) && (
          <button
            className="btn-ghost text-xs"
            onClick={() => {
              setSearch('');
              setSearchInput('');
              setLanguage('');
              setVisibility('');
              setPage(1);
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Language</th>
              <th className="px-4 py-3">Author</th>
              <th className="px-4 py-3">Visibility</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500">
                  Loading…
                </td>
              </tr>
            ) : !data || data.data.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-600 italic">
                  No snippets found
                </td>
              </tr>
            ) : (
              data.data.map((s) => (
                <tr key={s.id} className="hover:bg-surface-2 transition-colors">
                  <td className="px-4 py-3 max-w-xs">
                    <span className="font-medium text-gray-200 truncate block">{s.title}</span>
                    {s.description && (
                      <span className="text-xs text-gray-500 truncate block">{s.description}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-surface-3 px-1.5 py-0.5 text-xs font-mono text-gray-300">
                      {s.language}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {s.user?.username ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleVisibility(s.id, s.isPublic)}
                      className={`rounded px-1.5 py-0.5 text-xs border transition-colors ${
                        s.isPublic
                          ? 'bg-green-900/30 text-green-400 border-green-900 hover:bg-red-900/30 hover:text-red-400 hover:border-red-900'
                          : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-green-900/30 hover:text-green-400 hover:border-green-900'
                      }`}
                      title={s.isPublic ? 'Click to make private' : 'Click to make public'}
                    >
                      {s.isPublic ? 'Public' : 'Private'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(s.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(s.id, s.title)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data && (
        <Pagination
          page={data.page}
          total={data.total}
          limit={data.limit}
          onChange={setPage}
        />
      )}
    </div>
  );
}
