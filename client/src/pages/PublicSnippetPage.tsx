import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import api from '@/lib/axios';
import type { Snippet } from '@/types';
import Navbar from '@/components/Navbar';

export default function PublicSnippetPage() {
  const { id } = useParams<{ id: string }>();
  const codeRef = useRef<HTMLElement>(null);

  const [snippet, setSnippet] = useState<Snippet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api
      .get<Snippet>(`/snippets/public/${id}`)
      .then(({ data }) => setSnippet(data))
      .catch(() => setError('Snippet not found or is not public.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (codeRef.current && snippet) hljs.highlightElement(codeRef.current);
  }, [snippet]);

  async function handleCopy() {
    if (!snippet) return;
    await navigator.clipboard.writeText(snippet.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return <p className="p-8 text-sm text-gray-500">Loading…</p>;
  if (error || !snippet)
    return <p className="p-8 text-sm text-red-400">{error || 'Not found'}</p>;

  const date = new Date(snippet.createdAt).toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const tags = (Array.isArray(snippet.tags) ? snippet.tags : []).filter(Boolean);

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        <Link
          to="/feed"
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-100 transition-colors"
        >
          ← Back to feed
        </Link>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{snippet.title}</h1>
          {snippet.description && (
            <p className="text-gray-400">{snippet.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
            <span className="rounded bg-surface-3 px-2 py-0.5 text-indigo-300 text-xs">
              {snippet.language}
            </span>
            {snippet.user && (
              <span>by <span className="text-gray-300">{snippet.user.username}</span></span>
            )}
            <span>{date}</span>
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
      </main>
    </div>
  );
}
