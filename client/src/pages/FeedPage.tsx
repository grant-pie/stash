import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/axios';
import type { Snippet, SnippetFilters, PaginatedResponse } from '@/types';
import Navbar from '@/components/Navbar';
import Pagination from '@/components/Pagination';
import { useAuth } from '@/contexts/AuthContext';

const LANGUAGES = [
  'TypeScript', 'JavaScript', 'Python', 'Rust', 'Go',
  'CSS', 'HTML', 'SQL', 'Bash', 'Other',
];

const LANGUAGE_COLORS: Record<string, string> = {
  typescript: 'bg-blue-500', javascript: 'bg-yellow-400', python: 'bg-green-500',
  rust: 'bg-orange-500', go: 'bg-cyan-400', css: 'bg-pink-500',
  html: 'bg-red-500', sql: 'bg-purple-500', bash: 'bg-gray-400',
};

const LIMIT = 12;

export default function FeedPage() {
  const { user } = useAuth();
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
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
      const { data } = await api.get<PaginatedResponse<Snippet>>(`/snippets/public?${params.toString()}`);
      setSnippets(data.data);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSnippets(filters, page);
  }, [filters, page, fetchSnippets]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setFilters((f) => ({ ...f, search }));
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Public feed</h1>
          <p className="mt-1 text-sm text-gray-400">Snippets shared by the community</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <form onSubmit={handleSearchSubmit} className="flex gap-2 flex-1 min-w-48">
            <input
              type="search"
              className="input flex-1"
              placeholder="Search by title, description or tag…"
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
            onChange={(e) => {
              setPage(1);
              setFilters((f) => ({ ...f, language: e.target.value || undefined }));
            }}
          >
            <option value="">All languages</option>
            {LANGUAGES.map((l) => (
              <option key={l} value={l.toLowerCase()}>{l}</option>
            ))}
          </select>

          {(filters.search || filters.language) && (
            <button
              className="btn-ghost text-xs"
              onClick={() => { setPage(1); setFilters({}); setSearch(''); }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Results */}
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : snippets.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-gray-400">No public snippets yet.</p>
            {user && (
              <Link to="/snippets/new" className="mt-3 inline-block btn-primary text-sm">
                Share the first one
              </Link>
            )}
          </div>
        ) : (
          <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {snippets.map((snippet) => {
              const dotColor = LANGUAGE_COLORS[snippet.language.toLowerCase()] ?? 'bg-indigo-400';
              const date = new Date(snippet.createdAt).toLocaleDateString(undefined, {
                year: 'numeric', month: 'short', day: 'numeric',
              });
              const tags = (Array.isArray(snippet.tags) ? snippet.tags : []).filter(Boolean);

              return (
                <Link
                  key={snippet.id}
                  to={`/feed/${snippet.id}`}
                  className="card group flex flex-col gap-3 hover:border-gray-600 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-gray-100 group-hover:text-indigo-400 transition-colors line-clamp-1">
                      {snippet.title}
                    </span>
                    <span className="flex items-center gap-1.5 shrink-0 text-xs text-gray-400">
                      <span className={`inline-block h-2 w-2 rounded-full ${dotColor}`} />
                      {snippet.language}
                    </span>
                  </div>

                  {snippet.description && (
                    <p className="text-sm text-gray-400 line-clamp-2">{snippet.description}</p>
                  )}

                  <pre className="overflow-hidden rounded bg-surface-3 p-3 text-xs text-gray-300 line-clamp-4 font-mono">
                    <code>{snippet.content}</code>
                  </pre>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1">
                      {tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-indigo-950 px-2 py-0.5 text-xs text-indigo-300">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs text-gray-500">{snippet.user?.username}</p>
                      <p className="text-xs text-gray-600">{date}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          <Pagination page={page} total={total} limit={LIMIT} onChange={setPage} />
          </>
        )}
      </main>
    </div>
  );
}
