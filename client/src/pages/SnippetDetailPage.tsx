import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import api from '@/lib/axios';
import { getApiErrorMessage } from '@/lib/apiError';
import type { Snippet } from '@/types';
import ErrorState from '@/components/ErrorState';

export default function SnippetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const codeRef = useRef<HTMLElement>(null);

  const [snippet, setSnippet] = useState<Snippet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get<Snippet>(`/snippets/${id}`);
        setSnippet(data);
      } catch (err: any) {
        setError(
          getApiErrorMessage(err, 'Snippet not found.'),
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  useEffect(() => {
    if (codeRef.current && snippet) {
      hljs.highlightElement(codeRef.current);
    }
  }, [snippet]);

  async function handleDelete() {
    if (!confirm('Delete this snippet?')) return;
    await api.delete(`/snippets/${id}`);
    navigate('/my-snippets');
  }

  async function handleCopy() {
    if (!snippet) return;
    await navigator.clipboard.writeText(snippet.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return <p className="p-8 text-sm text-gray-500">Loading…</p>;
  if (error || !snippet)
    return (
      <div className="p-8">
        <ErrorState
          message={error || 'Snippet not found.'}
          onRetry={error && !error.includes('not found') ? () => window.location.reload() : undefined}
        />
      </div>
    );

  const date = new Date(snippet.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <header className="border-b border-gray-800 bg-surface-1">
        <div className="mx-auto flex max-w-4xl items-center px-4 py-3">
          <Link to="/" className="text-lg font-bold tracking-tight text-indigo-400">
            Stash
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        <Link
          to="/my-snippets"
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-100 transition-colors"
        >
          ← Back to my snippets.
        </Link>

        {/* Meta */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{snippet.title}</h1>
          {snippet.description && (
            <p className="text-gray-400">{snippet.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
            <span className="rounded bg-surface-3 px-2 py-0.5 text-indigo-300 text-xs">
              {snippet.language}
            </span>
            {snippet.isPublic ? (
              <span className="flex items-center gap-1 rounded-full bg-green-950 px-2.5 py-0.5 text-xs font-medium text-green-400">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400" />
                Public
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-full bg-gray-800 px-2.5 py-0.5 text-xs font-medium text-gray-400">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-gray-400" />
                Private
              </span>
            )}
            <span>{date}</span>
          </div>
          {(Array.isArray(snippet.tags) ? snippet.tags : []).filter(Boolean).length > 0 && (
            <div className="flex flex-wrap gap-1">
              {(Array.isArray(snippet.tags) ? snippet.tags : []).filter(Boolean).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-indigo-950 px-2 py-0.5 text-xs text-indigo-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Code block */}
        <div className="relative rounded-lg overflow-hidden border border-gray-800">
          <div className="flex items-center justify-between bg-surface-3 px-4 py-2">
            <span className="text-xs text-gray-500">{snippet.language}</span>
            <button onClick={handleCopy} className="btn-ghost text-xs py-1">
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <pre className="overflow-x-auto p-4 text-sm">
            <code ref={codeRef} className={`language-${snippet.language}`}>
              {snippet.content}
            </code>
          </pre>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Link to={`/snippets/${id}/edit`} className="btn-ghost text-xs">
            Edit
          </Link>
          <button onClick={handleDelete} className="btn-danger text-xs">
            Delete
          </button>
        </div>
      </main>
    </div>
  );
}
