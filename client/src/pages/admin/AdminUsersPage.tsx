import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/axios';
import type { AdminUser, PaginatedResponse, UserRole } from '@/types';
import Pagination from '@/components/Pagination';
import ErrorState from '@/components/ErrorState';

function RoleBadge({ role }: { role: UserRole }) {
  const styles: Record<UserRole, string> = {
    admin: 'bg-red-900/40 text-red-300 border border-red-800',
    moderator: 'bg-purple-900/40 text-purple-300 border border-purple-800',
    user: 'bg-gray-800 text-gray-400 border border-gray-700',
  };
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${styles[role] ?? styles.user}`}>
      {role}
    </span>
  );
}

export default function AdminUsersPage() {
  const [data, setData] = useState<PaginatedResponse<AdminUser> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [role, setRole] = useState('');
  const [suspended, setSuspended] = useState('');
  const [page, setPage] = useState(1);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (role) params.set('role', role);
      if (suspended !== '') params.set('isSuspended', suspended);
      params.set('page', String(page));
      params.set('limit', '20');
      const res = await api.get<PaginatedResponse<AdminUser>>(`/admin/users?${params}`);
      setData(res.data);
    } catch (err: any) {
      setError(
        err?.response
          ? (err.response.data?.message ?? 'Failed to load users.')
          : 'Could not reach the server. Check your connection and try again.',
      );
    } finally {
      setLoading(false);
    }
  }, [search, role, suspended, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  }

  function handleFilterChange(setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLSelectElement>) => {
      setter(e.target.value);
      setPage(1);
    };
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-100">Users</h1>
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
            placeholder="Search by ID, email or username…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button type="submit" className="btn-primary shrink-0">
            Search
          </button>
        </form>
        <select className="input w-auto" value={role} onChange={handleFilterChange(setRole)}>
          <option value="">All roles</option>
          <option value="user">User</option>
          <option value="moderator">Moderator</option>
          <option value="admin">Admin</option>
        </select>
        <select className="input w-auto" value={suspended} onChange={handleFilterChange(setSuspended)}>
          <option value="">All statuses</option>
          <option value="false">Active</option>
          <option value="true">Suspended</option>
        </select>
        {(search || role || suspended) && (
          <button
            className="btn-ghost text-xs"
            onClick={() => {
              setSearch('');
              setSearchInput('');
              setRole('');
              setSuspended('');
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
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Snippets</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-500">
                  Loading…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={7} className="px-4 py-6">
                  <ErrorState message={error} onRetry={fetchUsers} />
                </td>
              </tr>
            ) : !data || data.data.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-600 italic">
                  No users found
                </td>
              </tr>
            ) : (
              data.data.map((u) => (
                <tr key={u.id} className="hover:bg-surface-2 transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-500 font-mono" title={u.id}>
                    {u.id.slice(0, 8)}…
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-200">{u.username}</div>
                    <div className="text-xs text-gray-500">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <RoleBadge role={u.role} />
                  </td>
                  <td className="px-4 py-3">
                    {u.isSuspended ? (
                      <span className="rounded px-1.5 py-0.5 text-xs bg-red-900/40 text-red-300 border border-red-800">
                        Suspended
                      </span>
                    ) : (
                      <span className="rounded px-1.5 py-0.5 text-xs bg-green-900/30 text-green-400 border border-green-900">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400 tabular-nums">
                    {u.snippetCount}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/admin/users/${u.id}`}
                      className="text-xs text-indigo-400 hover:text-indigo-300"
                    >
                      View
                    </Link>
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
