import { Link } from 'react-router-dom';
import type { Snippet } from '@/types';

interface SnippetCardProps {
  snippet: Snippet;
  onDelete?: (id: string) => void;
}

const LANGUAGE_COLORS: Record<string, string> = {
  typescript: 'bg-blue-500',
  javascript: 'bg-yellow-400',
  python: 'bg-green-500',
  rust: 'bg-orange-500',
  go: 'bg-cyan-400',
  css: 'bg-pink-500',
  html: 'bg-red-500',
  sql: 'bg-purple-500',
  bash: 'bg-gray-400',
};

export default function SnippetCard({ snippet, onDelete }: SnippetCardProps) {
  const dotColor = LANGUAGE_COLORS[snippet.language.toLowerCase()] ?? 'bg-indigo-400';
  const date = new Date(snippet.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Link
      to={`/snippets/${snippet.id}`}
      className="card group flex flex-col gap-3 hover:border-gray-600 transition-colors cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold text-gray-100 group-hover:text-indigo-400 transition-colors line-clamp-1">
          {snippet.title}
        </span>
        <span className="flex items-center gap-1.5 shrink-0 text-xs text-gray-400">
          <span className={`inline-block h-2 w-2 rounded-full ${dotColor}`} />
          {snippet.language}
        </span>
      </div>

      {/* Description */}
      {snippet.description && (
        <p className="text-sm text-gray-400 line-clamp-2">{snippet.description}</p>
      )}

      {/* Code preview */}
      <pre className="overflow-hidden rounded bg-surface-3 p-3 text-xs text-gray-300 line-clamp-4 font-mono">
        <code>{snippet.content}</code>
      </pre>

      {/* Footer */}
      <div className="flex items-center justify-between">
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
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600">{date}</span>
          {onDelete && (
            <button
              onClick={(e) => {
                e.preventDefault();
                onDelete(snippet.id);
              }}
              className="hidden group-hover:inline-flex text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}
