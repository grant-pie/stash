import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import api from '@/lib/axios';
import { getApiErrorMessage } from '@/lib/apiError';
import type { Snippet } from '@/types';
import ErrorState from '@/components/ErrorState';

export default function AdminSnippetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const codeRef = useRef<HTMLElement>(null);

  const [snippet, setSnippet] = useState<Snippet & { user?: { id: string; username: string } } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [visibilityLoading, setVisibilityLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    api.get(`/admin/snippets/${id}`)
      .then(({ data }) => setSnippet(data))
      .catch((err: any) => setError(getApiErrorMessage(err, 'Snippet not found.')))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (codeRef.current && snippet) hljs.highlightElement(codeRef.current);
  }, [snippet]);

  async function handleToggleVisibility() {
    if (!snippet) return;
    setVisibilityLoading(true);
    try {
      await api.patch(`/admin/snippets/${id}/visibility`, { isPublic: !snippet.isPublic });
      setSnippet((s) => s ? { ...s, isPublic: !s.isPublic } : s);
    } finally {
      setVisibilityLoading(false);
    }
  }

  async function handleDelete() {
    if (!snippet) return;
    if (!confirm(`Delete "${snippet.title}"? This cannot be undone.`)) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/admin/snippets/${id}`);
      navigate('/admin/snippets', { replace: true });
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleCopy() {
    if (!snippet) return;
    await navigator.clipboard.writeText(snippet.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="text-gray-500 text-sm">Loading…</span>
      </div>
    );
  }

  if (error || !snippet) {
    return (
      <div className="p-6">
        <ErrorState message={error || 'Snippet not found.'} />
        <div className="mt-2 text-center">
          <Link to="/admin/snippets" className="text-indigo-400 text-sm hover:text-indigo-300">
            Back to snippets
          </Link>
        </div>
      </div>
    );
  }

  const date = new Date(snippet.createdAt).toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const tags = (Array.isArray(snippet.tags) ? snippet.tags : []).filter(Boolean);

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/admin/snippets" className="hover:text-gray-300">Snippets</Link>
        <span>/</span>
        <span className="text-gray-300 truncate">{snippet.title}</span>
      </div>

      {/* Header */}
      <div className="card space-y-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1 min-w-0">
            <h1 className="text-lg font-semibold text-gray-100 truncate">{snippet.title}</h1>
            {snippet.description && (
              <p className="text-sm text-gray-400">{snippet.description}</p>
            )}
          </div>
          <span
            className={`shrink-0 rounded px-2 py-0.5 text-xs border ${
              snippet.isPublic
                ? 'bg-green-900/30 text-green-400 border-green-900'
                : 'bg-gray-800 text-gray-400 border-gray-700'
            }`}
          >
            {snippet.isPublic ? 'Public' : 'Private'}
          </span>
        </div>

        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
          <span>
            Language:{' '}
            <span className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-gray-300">
              {snippet.language}
            </span>
          </span>
          {snippet.user && (
            <span>
              Author:{' '}
              <Link
                to={`/admin/users/${snippet.user.id}`}
                className="text-indigo-400 hover:text-indigo-300"
              >
                {snippet.user.username}
              </Link>
            </span>
          )}
          <span>Created: {date}</span>
          <span className="font-mono" title={snippet.id}>ID: {snippet.id.slice(0, 8)}…</span>
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.map((tag) => (
              <span key={tag} className="rounded-full bg-indigo-950 px-2 py-0.5 text-xs text-indigo-300">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Code */}
      <div className="rounded-lg overflow-hidden border border-gray-800">
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
      <div className="card space-y-3">
        <h2 className="text-sm font-semibold text-gray-300">Visibility</h2>
        <p className="text-xs text-gray-500">
          {snippet.isPublic
            ? 'This snippet is visible in the public feed.'
            : 'This snippet is private and only visible to its owner.'}
        </p>
        <button
          className="btn-ghost text-sm border border-gray-700"
          onClick={handleToggleVisibility}
          disabled={visibilityLoading}
        >
          {visibilityLoading
            ? 'Saving…'
            : snippet.isPublic
            ? 'Make Private'
            : 'Make Public'}
        </button>
      </div>

      {/* Danger Zone */}
      <div className="card space-y-3 border-red-900/50">
        <h2 className="text-sm font-semibold text-red-400">Danger Zone</h2>
        <p className="text-xs text-gray-500">
          Permanently deletes this snippet. This action cannot be undone.
        </p>
        <button
          className="btn-danger text-sm"
          onClick={handleDelete}
          disabled={deleteLoading}
        >
          {deleteLoading ? 'Deleting…' : 'Delete Snippet'}
        </button>
      </div>
    </div>
  );
}
