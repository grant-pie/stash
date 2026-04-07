interface PaginationProps {
  page: number;
  total: number;
  limit: number;
  onChange: (page: number) => void;
}

export default function Pagination({ page, total, limit, onChange }: PaginationProps) {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between text-sm text-gray-400">
      <span>
        {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
      </span>
      <div className="flex gap-1">
        <button
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="btn-ghost px-2 py-1 text-xs disabled:opacity-30"
        >
          Previous
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
          .reduce<(number | '...')[]>((acc, p, idx, arr) => {
            if (idx > 0 && typeof arr[idx - 1] === 'number' && (p as number) - (arr[idx - 1] as number) > 1) {
              acc.push('...');
            }
            acc.push(p);
            return acc;
          }, [])
          .map((p, i) =>
            p === '...' ? (
              <span key={`ellipsis-${i}`} className="px-2 py-1 text-gray-600">
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onChange(p as number)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  p === page
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:bg-surface-3 hover:text-gray-100'
                }`}
              >
                {p}
              </button>
            ),
          )}
        <button
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          className="btn-ghost px-2 py-1 text-xs disabled:opacity-30"
        >
          Next
        </button>
      </div>
    </div>
  );
}
