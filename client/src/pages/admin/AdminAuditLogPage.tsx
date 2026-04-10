import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/axios';
import type { AuditLog, PaginatedResponse } from '@/types';
import Pagination from '@/components/Pagination';
import ErrorState from '@/components/ErrorState';

const ACTIONS = [
  'USER_ROLE_CHANGED',
  'USER_SUSPENDED',
  'USER_UNSUSPENDED',
  'USER_DELETED',
  'SNIPPET_DELETED',
  'SNIPPET_VISIBILITY_CHANGED',
];

const ACTION_COLORS: Record<string, string> = {
  USER_SUSPENDED: 'bg-red-900/40 text-red-300',
  USER_UNSUSPENDED: 'bg-green-900/40 text-green-300',
  USER_DELETED: 'bg-red-900/40 text-red-300',
  USER_ROLE_CHANGED: 'bg-indigo-900/40 text-indigo-300',
  SNIPPET_DELETED: 'bg-amber-900/40 text-amber-300',
  SNIPPET_VISIBILITY_CHANGED: 'bg-yellow-900/40 text-yellow-300',
};

function MetadataCell({ metadata }: { metadata: Record<string, unknown> | null }) {
  if (!metadata || Object.keys(metadata).length === 0) return <span className="text-gray-600">—</span>;

  return (
    <div className="flex flex-wrap gap-1">
      {Object.entries(metadata).map(([k, v]) => (
        <span key={k} className="rounded bg-surface-3 px-1.5 py-0.5 text-xs font-mono text-gray-400">
          {k}: {String(v)}
        </span>
      ))}
    </div>
  );
}

export default function AdminAuditLogPage() {
  const [data, setData] = useState<PaginatedResponse<AuditLog> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [action, setAction] = useState('');
  const [targetType, setTargetType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (action) params.set('action', action);
      if (targetType) params.set('targetType', targetType);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      params.set('page', String(page));
      params.set('limit', '25');
      const res = await api.get<PaginatedResponse<AuditLog>>(`/admin/audit-logs?${params}`);
      setData(res.data);
    } catch (err: any) {
      setError(
        err?.response
          ? (err.response.data?.message ?? 'Failed to load audit logs.')
          : 'Could not reach the server. Check your connection and try again.',
      );
    } finally {
      setLoading(false);
    }
  }, [action, targetType, from, to, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  function clearFilters() {
    setAction('');
    setTargetType('');
    setFrom('');
    setTo('');
    setPage(1);
  }

  const hasFilters = action || targetType || from || to;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-100">Audit Log</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Immutable record of all admin actions{data ? ` — ${data.total} entries` : ''}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <select
          className="input w-auto"
          value={action}
          onChange={(e) => { setAction(e.target.value); setPage(1); }}
        >
          <option value="">All actions</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select
          className="input w-auto"
          value={targetType}
          onChange={(e) => { setTargetType(e.target.value); setPage(1); }}
        >
          <option value="">All targets</option>
          <option value="user">User</option>
          <option value="snippet">Snippet</option>
        </select>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">From</label>
          <input
            type="date"
            className="input w-auto"
            value={from}
            onChange={(e) => { setFrom(e.target.value); setPage(1); }}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">To</label>
          <input
            type="date"
            className="input w-auto"
            value={to}
            onChange={(e) => { setTo(e.target.value); setPage(1); }}
          />
        </div>
        {hasFilters && (
          <button className="btn-ghost text-xs" onClick={clearFilters}>
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Admin</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Target</th>
              <th className="px-4 py-3">Details</th>
              <th className="px-4 py-3">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500">
                  Loading…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="px-4 py-6">
                  <ErrorState message={error} onRetry={fetchLogs} />
                </td>
              </tr>
            ) : !data || data.data.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-600 italic">
                  No audit log entries found
                </td>
              </tr>
            ) : (
              data.data.map((log) => (
                <tr key={log.id} className="hover:bg-surface-2 transition-colors align-top">
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {log.admin?.username ?? (
                      <span className="italic text-gray-600">deleted</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-mono ${
                        ACTION_COLORS[log.action] ?? 'bg-gray-800 text-gray-400'
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className="text-gray-500">{log.targetType}/</span>
                    <span className="font-mono text-gray-400 text-xs">
                      {log.targetId.slice(0, 8)}…
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <MetadataCell metadata={log.metadata} />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 font-mono">
                    {log.ipAddress ?? '—'}
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
