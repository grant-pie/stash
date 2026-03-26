import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/axios';
import type { Snippet, SnippetFilters } from '@/types';
import SnippetCard from '@/components/SnippetCard';
import { useAuth } from '@/contexts/AuthContext';

const LANGUAGES = [
  'TypeScript', 'JavaScript', 'Python', 'Rust', 'Go',
  'CSS', 'HTML', 'SQL', 'Bash', 'Other',
];

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [allSnippets, setAllSnippets] = useState<Snippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<SnippetFilters>({});
  const [search, setSearch] = useState('');

  const fetchSnippets = useCallback(async (f: SnippetFilters) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (f.search) params.set('search', f.search);
      if (f.language) params.set('language', f.language);
      if (f.tag) params.set('tag', f.tag);
      const { data } = await api.get<Snippet[]>(`/snippets?${params.toString()}`);
      setSnippets(data);
      // Keep an unfiltered copy just for deriving the tag list
      if (!f.search && !f.language && !f.tag) setAllSnippets(data);
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
    fetchSnippets(filters);
  }, [filters, fetchSnippets]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFilters((f) => ({ ...f, search }));
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this snippet?')) return;
    await api.delete(`/snippets/${id}`);
    setSnippets((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <header className="border-b border-gray-800 bg-surface-1">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <span className="text-lg font-bold tracking-tight text-indigo-400">Stash</span>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">{user?.username}</span>
            <button onClick={logout} className="btn-ghost text-xs">
              Sign out
            </button>
            <Link to="/snippets/new" className="btn-primary text-xs">
              + New snippet
            </Link>
          </div>
        </div>
      </header>

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
            onChange={(e) =>
              setFilters((f) => ({ ...f, language: e.target.value || undefined }))
            }
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
                  onClick={() =>
                    setFilters((f) => ({
                      ...f,
                      tag: f.tag === tag ? undefined : tag,
                    }))
                  }
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {snippets.map((s) => (
              <SnippetCard key={s.id} snippet={s} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
