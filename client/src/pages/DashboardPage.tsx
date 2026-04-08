import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/axios';
import type { Snippet, SnippetFilters, PaginatedResponse } from '@/types';
import SnippetCard from '@/components/SnippetCard';
import Navbar from '@/components/Navbar';
import Pagination from '@/components/Pagination';

const LANGUAGES = [
  'TypeScript', 'JavaScript', 'Python', 'Rust', 'Go',
  'CSS', 'HTML', 'SQL', 'Bash', 'Other',
];

const LIMIT = 12;

export default function DashboardPage() {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [allSnippets, setAllSnippets] = useState<Snippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<SnippetFilters>({});
  const [search, setSearch] = useState('');

  const fetchSnippets = useCallback(async (f: SnippetFilters, p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (f.search) params.set('search', f.search);
      if (f.language) params.set('language', f.language);
      if (f.tag) params.set('tag', f.tag);
      params.set('page', String(p));
      params.set('limit', String(LIMIT));
      const { data } = await api.get<PaginatedResponse<Snippet>>(`/snippets?${params.toString()}`);
      setSnippets(data.data);
      setTotal(data.total);
      // Keep an unfiltered copy just for deriving the tag list
      if (!f.search && !f.language && !f.tag) setAllSnippets(data.data);
    } finally {
      setLoading(false);
    }
  }, []);

  const allTags = Array.from(
    new Set(
      allSnippets.flatMap((s) =>
        (Array.isArray(s.tags) ? s.tags : []).filter(Boolean),
      ),
    ),
  );

  useEffect(() => {
    fetchSnippets(filters, page);
  }, [filters, page, fetchSnippets]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setFilters((f) => ({ ...f, search }));
  }

  function handleFilterChange(patch: Partial<SnippetFilters>) {
    setPage(1);
    setFilters((f) => ({ ...f, ...patch }));
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this snippet?')) return;
    await api.delete(`/snippets/${id}`);
    // Re-fetch the current page so counts stay accurate
    fetchSnippets(filters, page);
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        {/* Filters bar */}
        <div className="flex flex-wrap gap-3">
          <form onSubmit={handleSearchSubmit} className="flex gap-2 flex-1 min-w-48">
            <input
              type="search"
              className="input flex-1"
              placeholder="Search snippets…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit" className="btn-primary shrink-0">
              Search
            </button>
          </form>

          <select
            className="input w-auto"
            value={filters.language ?? ''}
            onChange={(e) => handleFilterChange({ language: e.target.value || undefined })}
          >
            <option value="">All languages</option>
            {LANGUAGES.map((l) => (
              <option key={l} value={l.toLowerCase()}>
                {l}
              </option>
            ))}
          </select>

          {(filters.search || filters.language || filters.tag) && (
            <button
              className="btn-ghost text-xs"
              onClick={() => {
                setPage(1);
                setFilters({});
                setSearch('');
              }}
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Tag filter pills */}
        {allSnippets.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500 shrink-0">Tags:</span>
            {allTags.length === 0 ? (
              <span className="text-xs text-gray-600 italic">no tags yet</span>
            ) : (
              allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleFilterChange({ tag: filters.tag === tag ? undefined : tag })}

                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    filters.tag === tag
                      ? 'bg-indigo-600 text-white'
                      : 'bg-indigo-950 text-indigo-300 hover:bg-indigo-900'
                  }`}
                >
                  {tag}
                </button>
              ))
            )}
          </div>
        )}

        {/* Results */}
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : snippets.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <p className="text-gray-400">No snippets found</p>
            <Link to="/snippets/new" className="btn-primary">
              Create your first snippet
            </Link>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {snippets.map((s) => (
                <SnippetCard key={s.id} snippet={s} onDelete={handleDelete} />
              ))}
            </div>
            <Pagination page={page} total={total} limit={LIMIT} onChange={setPage} />
          </>
        )}
      </main>
    </div>
  );
}
